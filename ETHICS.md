# Responsible use policy

RedBlueSkills contains dual-use security knowledge. The same technique that helps
a defender understand and detect an attack can cause harm if used against systems
without permission. Using this repository means accepting the rules below.

## You may

- Test systems you **own**, or that you have **explicit written authorization** to
  test (a signed SOW, rules of engagement, or a bug-bounty program that covers the
  target and the technique).
- Build, tune, and operate **defenses** for systems you run.
- Learn, teach, and research in **lab environments**, CTFs, and other targets that
  are intended to be attacked.

## You may not

- Use any offensive skill against systems you do not own or are not authorized to
  test — including "just testing," "to see if it works," or exceeding the scope of
  an authorization you do have.
- Use this material to access, damage, exfiltrate, or disrupt data or systems
  unlawfully.
- Contribute content whose **primary purpose** is causing harm: malware,
  ransomware, denial-of-service tooling, mass or indiscriminate exploitation,
  credential theft against real users, or techniques designed solely to evade
  defenses on systems you do not own.

## Content standards for contributors

Every skill must:

- **Lead with authorization.** The `## Authorization & scope` section is required
  and must state that use is limited to authorized targets, with concrete scope
  checks.
- **Prefer proof over damage.** Offensive procedures demonstrate impact with the
  least intrusive evidence (e.g. a row count over a full data dump; a benign
  marker over a working payload).
- **Ship its defense.** Offensive skills must pair with a detection or hardening
  skill so the knowledge strengthens defenders, not just attackers.
- **Exclude live secrets and real target data.** Payloads and examples are
  illustrative and scoped.

Maintainers will decline or remove content that violates these standards,
regardless of technical merit.

## Legal

This material is provided under [Apache-2.0](LICENSE) with no warranty. Laws
governing security testing vary by jurisdiction (e.g. the U.S. CFAA, the UK
Computer Misuse Act, and equivalents worldwide). **You are solely responsible**
for ensuring your use is lawful and authorized. The authors and contributors
accept no liability for misuse.

To report abuse of this project or a security issue, see [`SECURITY.md`](SECURITY.md).
