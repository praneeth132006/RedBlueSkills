'use strict';
// Offline integrity and completeness checks for the installed library.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

function verify(root = path.resolve(__dirname, '..')) {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const pkg = read('package.json');
  const cat = read('catalog.json');
  const provenance = read('provenance.json');
  const sbom = read('sbom.cdx.json');
  assert.strictEqual(cat.count, cat.skills.length, 'catalog count mismatch');
  assert.strictEqual(provenance.package.version, pkg.version, 'provenance version mismatch');
  assert.strictEqual(sbom.metadata.component.version, pkg.version, 'SBOM version mismatch');
  assert.strictEqual(provenance.skills.length, cat.count, 'provenance count mismatch');
  assert.strictEqual(sbom.components.length, cat.count, 'SBOM count mismatch');
  const names = new Map(cat.skills.map((s) => [s.name, s]));
  const hashes = new Map(provenance.skills.map((s) => [s.name, s]));
  assert.strictEqual(names.size, cat.count, 'duplicate skill name');
  assert.strictEqual(hashes.size, cat.count, 'duplicate provenance name');
  const skillRoot = fs.realpathSync(path.join(root, 'skills')) + path.sep;
  for (const skill of cat.skills) {
    assert.strictEqual(typeof skill.path, 'string', 'invalid skill path');
    const file = fs.realpathSync(path.resolve(root, skill.path));
    assert(file.startsWith(skillRoot), `skill outside library: ${skill.name}`);
    const entry = hashes.get(skill.name);
    assert(entry && entry.path === skill.path, `missing provenance: ${skill.name}`);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.strictEqual(hash, entry.sha256, `content hash mismatch: ${skill.name}`);
    const component = sbom.components.find((c) => c.name === skill.name);
    assert(component && component.hashes.some((h) => h.alg === 'SHA-256' && h.content === hash),
      `SBOM hash mismatch: ${skill.name}`);
    for (const partner of skill.pairs_with) {
      const other = names.get(partner);
      assert(other && other.pairs_with.includes(skill.name), `broken pairing: ${skill.name}`);
    }
  }
  for (const file of ['ETHICS.md', 'LICENSE', 'orchestrators/attack-my-application/SKILL.md']) {
    assert(fs.statSync(path.join(root, file)).isFile(), `missing ${file}`);
  }
  return { version: pkg.version, skills: cat.count };
}

module.exports = { verify };
if (require.main === module) {
  try {
    const result = verify();
    if (!process.argv.includes('--quiet')) console.log(`Verified v${result.version}: ${result.skills} skill files, hashes, and pairings.\nThis checks package integrity, not live-target security behavior.`);
  } catch (err) {
    console.error(`Package verification failed: ${err.message}`);
    process.exitCode = 1;
  }
}
