# Security controls lab

Run `python3 _lab/security-controls/validate.py` from the checkout, or
`redblueskills lab security-controls` from an installed package. Python 3.10+
stdlib only; no dependencies, network, model downloads, live credentials, or
external services. File writes stay in temporary directories cleaned on exit.

The 16 unittest cases include positive controls, negative controls, boundary
values, and deliberately vulnerable contrasts for three red/blue skill pairs:

| Test class | Red | Blue |
|---|---|---|
| `JWTControls` | `api-jwt-validation-abuse` | `api-jwt-validation-hardening` |
| `UploadControls` | `web-file-upload-abuse` | `web-file-upload-hardening` |
| `ArtifactControls` | `llm-artifact-supply-chain-assessment` | `llm-artifact-supply-chain-hardening` |

The fixtures exercise real HMAC/digest comparisons and temporary file storage,
but are deliberately limited teaching implementations. They are not reusable
production JWT middleware, upload handlers, or model loaders. See each skill's
Validation section for exactly what is covered and what still needs integration
testing. `validated` refers to this named fixture, not all possible deployments.

A failing unittest produces a nonzero exit. Tests use a fixed clock and public
fixture key; never substitute production credentials.
