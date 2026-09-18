"""Exercise the shipped CLI and load every skill through the MCP transport."""
import json
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def cli(*args):
    return subprocess.run(['node', str(REPO / 'bin/cli.js'), *map(str, args)], capture_output=True, text=True)


def test_init_installs_complete_library(tmp_path):
    result = cli('init', '--dest', tmp_path)
    assert result.returncode == 0, result.stderr
    catalog = json.loads((tmp_path / 'catalog.json').read_text())
    for row in catalog['skills']:
        assert (tmp_path / row['path']).read_bytes() == (REPO / row['path']).read_bytes()
    assert (tmp_path / 'ETHICS.md').is_file()
    assert (tmp_path / 'orchestrators/attack-my-application/SKILL.md').is_file()


def test_add_catalog_only_advertises_installed_skills(tmp_path):
    for name in ('web-ssrf', 'llm-output-dlp'):
        result = cli('add', name, '--dest', tmp_path)
        assert result.returncode == 0, result.stderr
    catalog = json.loads((tmp_path / 'catalog.json').read_text())
    assert catalog['count'] == 4
    names = {r['name'] for r in catalog['skills']}
    for row in catalog['skills']:
        assert (tmp_path / row['path']).is_file()
        assert set(row['pairs_with']) <= names
    assert (tmp_path / 'ETHICS.md').is_file()


def test_mixed_unknown_names_fail_before_copying(tmp_path):
    result = cli('add', 'web-ssrf', 'missing-skill', '--dest', tmp_path)
    assert result.returncode != 0
    assert not list(tmp_path.iterdir())


def test_mcp_loads_every_skill():
    catalog = json.loads((REPO / 'catalog.json').read_text())
    requests = [dict(jsonrpc='2.0', id=i, method='tools/call',
                     params=dict(name='get_skill', arguments=dict(name=row['name'])))
                for i, row in enumerate(catalog['skills'])]
    result = subprocess.run(['node', str(REPO / 'bin/mcp.js')],
                            input=''.join(json.dumps(r) + '\n' for r in requests),
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    replies = [json.loads(line) for line in result.stdout.splitlines()]
    assert len(replies) == len(requests)
    for row, response in zip(catalog['skills'], replies):
        assert not response['result'].get('isError')
        payload = json.loads(response['result']['content'][0]['text'])
        assert payload['body'] == (REPO / row['path']).read_text()


def test_missing_destination_value_is_an_error():
    assert cli('init', '--dest').returncode != 0


def test_symlink_install_does_not_overwrite_outside_file(tmp_path):
    outside = tmp_path / 'outside'
    outside.write_text('keep me')
    dest = tmp_path / 'install'
    dest.mkdir()
    (dest / 'ETHICS.md').symlink_to(outside)
    result = cli('init', '--dest', dest)
    assert result.returncode != 0
    assert outside.read_text() == 'keep me'


def test_partial_install_rejects_symlink_parent(tmp_path):
    outside = tmp_path / 'outside'
    outside.mkdir()
    dest = tmp_path / 'install'
    dest.mkdir()
    (dest / 'skills').symlink_to(outside, target_is_directory=True)
    assert cli('add', 'web-ssrf', '--dest', dest).returncode != 0
    assert not list(outside.iterdir())


def test_source_overlap_rejected():
    result = cli('init', '--dest', REPO / 'skills' / 'recursive-install')
    assert result.returncode != 0
    assert not (REPO / 'skills' / 'recursive-install').exists()


def test_mcp_recovers_from_invalid_requests_and_does_not_reply_to_notifications():
    messages = [None, [], 42, {'id': 1, 'method': 'ping'},
                {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call', 'params': []},
                {'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {'name': 'get_skill', 'arguments': {}}},
                {'jsonrpc': '2.0', 'id': 4, 'method': 'tools/call', 'params': {'name': 'constructor'}},
                {'jsonrpc': '2.0', 'id': 5, 'method': 'tools/call', 'params': {'name': 'get_skill', 'arguments': {'name': []}}},
                {'jsonrpc': '2.0', 'method': 'ping'},
                {'jsonrpc': '2.0', 'method': 'notifications/initialized'},
                {'jsonrpc': '2.0', 'id': 6, 'method': 'ping'}]
    result = subprocess.run(['node', str(REPO / 'bin/mcp.js')], input=''.join(json.dumps(m) + '\n' for m in messages), capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stderr
    replies = [json.loads(line) for line in result.stdout.splitlines()]
    assert len(replies) == len(messages) - 2
    assert all('error' in reply for reply in replies[:-1])
    assert replies[-1] == {'jsonrpc': '2.0', 'id': 6, 'result': {}}


def test_actual_tarball_installs_and_runs_all_offline_labs(tmp_path):
    import tarfile
    pack = subprocess.run(['npm', 'pack', '--json', '--pack-destination', str(tmp_path)], cwd=REPO, capture_output=True, text=True, timeout=60)
    assert pack.returncode == 0, pack.stderr
    archive = tmp_path / json.loads(pack.stdout)[0]['filename']
    with tarfile.open(archive) as packed:
        names = packed.getnames()
    assert not any('__pycache__' in name or name.endswith(('.pyc', '.env', '.npmrc')) for name in names)
    assert 'package/_lab/security-controls/validate.py' in names
    prefix = tmp_path / 'consumer'
    install = subprocess.run(['npm', 'install', '--prefix', str(prefix), '--offline', '--ignore-scripts', '--no-audit', '--no-fund', str(archive)], capture_output=True, text=True, timeout=60)
    assert install.returncode == 0, install.stderr
    root = prefix / 'node_modules' / 'redblueskills'
    command = ['node', str(root / 'bin/cli.js')]
    for args in [('verify',), ('--version',), ('lab', 'security-controls'), ('lab', 'llm-local'), ('lab', 'ci-local'), ('init', '--dest', str(tmp_path / 'agent'))]:
        result = subprocess.run(command + list(args), cwd=tmp_path, capture_output=True, text=True, timeout=30)
        assert result.returncode == 0, result.stderr + result.stdout
    catalog = json.loads((root / 'catalog.json').read_text())
    assert len(list((tmp_path / 'agent' / 'skills').rglob('SKILL.md'))) == catalog['count']
    request = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': 'get_catalog'}}
    response = subprocess.run(['node', str(root / 'bin/mcp.js')], input=json.dumps(request) + '\n', capture_output=True, text=True, timeout=10)
    payload = json.loads(json.loads(response.stdout)['result']['content'][0]['text'])
    assert payload == catalog
    # Integrity verification must actually detect altered installed skill bytes.
    skill = root / catalog['skills'][0]['path']
    skill.write_text(skill.read_text() + '\nchanged\n')
    failed = subprocess.run(command + ['verify'], capture_output=True, text=True)
    assert failed.returncode != 0
    assert 'hash mismatch' in failed.stderr
