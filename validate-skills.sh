#!/usr/bin/env bash
# Renders the bundled example, runs QA, and writes a PSD. Run before opening a PR.
set -e
cd "$(dirname "$0")/skills/layerly-creatives"
python3 scripts/render_layers.py assets/example/layout.json /tmp/layerly-validate
if command -v node >/dev/null 2>&1; then
  node scripts/build_psd.js /tmp/layerly-validate/layers.json /tmp/layerly-validate/example.psd
else
  python3 scripts/build_psd.py /tmp/layerly-validate/layers.json /tmp/layerly-validate/example.psd
fi
echo "OK: /tmp/layerly-validate/example.psd"
