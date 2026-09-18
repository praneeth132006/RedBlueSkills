# v1.1 research and validation scope

Reviewed 2026-09-18. Six new skills fill three focused gaps; they do not imply
complete coverage of every deployment or every risk within a framework category.

| Pair | Primary basis | Local evidence | Still needs integration testing |
|---|---|---|---|
| JWT validation | [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html), [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html), [CWE-347](https://cwe.mitre.org/data/definitions/347.html) | HMAC verification, header policy, issuer/audience/time checks, malformed and valid tokens | Actual JWT library, issuer, JWKS rotation, asymmetric keys, route authorization |
| File uploads | [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [input validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), [CWE-434](https://cwe.mitre.org/data/definitions/434.html) | Inert disallowed names, content/size boundaries, unique temporary files | Streaming limits, actual parsers, HTTP headers, quarantine, download authorization |
| LLM artifacts | [OWASP LLM03:2025](https://genai.owasp.org/llmrisk/llm032025-supply-chain/), [Transformers custom models](https://huggingface.co/docs/transformers/custom_models), [CWE-494](https://cwe.mitre.org/data/definitions/494.html) | Actual digest comparison and independently trusted manifest; metadata replacement failures | Registry/signature verification, model behavior, dependency advisories, actual loaders |

The JWT skill specializes the existing broad authentication skill. The upload
pair handles admission/storage, distinct from the existing path traversal and XSS
pairs. Artifact admission covers LLM03 acquisition risk, while the existing
LLM04 pair concerns training/retrieval corpus ingestion. The orchestrator routes
each by observed preconditions.

The new fixture executes no downloaded code and uses no real model, network,
production credentials, or application data. Negative tests alone are insufficient:
each pair also has a successful allowed-input control. The upload fixture only
supports text. The JWT fixture only supports its narrow synthetic HS256 profile.
Neither is intended as a production implementation.

Run `redblueskills lab security-controls` from the npm package or
`python3 _lab/security-controls/validate.py` from the repository. The metadata
records `codex-local-validation` as the automated validator; it does not assert an
independent human review. Existing maturity stamps are not refreshed by package
integrity tests.

Release checks additionally exercise the packed npm artifact, CLI installs,
all skill retrieval through MCP, hashes, pairings, malformed protocol inputs,
and all three offline labs. `redblueskills verify` proves consistency with the
bundled manifest, not authenticity against a maliciously replaced manifest;
use the signed GitHub release artifacts for independent provenance verification.
