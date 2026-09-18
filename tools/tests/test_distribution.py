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
