# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x (main branch and dist zips) | :white_check_mark: |

Only the latest code on `main` and the zips in `dist/` are maintained. If you installed an older
zip, re-download from `dist/` before reporting anything.

## Reporting a Vulnerability

Layerly Creatives runs locally inside your chat app's sandbox. It makes no network calls except
the optional `scripts/gen_image.py` (only when you provide your own API key) and
`scripts/fetch_reference.py` (only when you ask it to fetch a URL). No telemetry, no data leaves
your machine.

If you find a security issue (for example: unsafe file handling, a path traversal in the scripts,
or anything in the vendored JavaScript under `scripts/vendor/`):

1. Please do NOT open a public issue with the details.
2. Use GitHub's private reporting: Security tab, "Report a vulnerability" on this repository.
3. Expect a first reply within 7 days. If the report is valid, a fix ships in the next dist zip
   and you get credit in the release notes (unless you prefer to stay anonymous).

For non-security bugs (rendering, QA, PSD output), a normal public issue is perfect.
