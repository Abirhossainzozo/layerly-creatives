# Contributing

Bugs and feature requests: open an issue with the `layout.json` that reproduces it and the QA output.

Adding a layer type or feature:
1. Implement it in `skills/layerly-creatives/scripts/render_layers.py` (and `build_psd.js` if the PSD needs it).
2. Document it in `skills/layerly-creatives/references/layout-schema.md`.
3. Add a small test layout under `skills/layerly-creatives/assets/example/`.
4. Run `./validate-skills.sh` before opening the PR.

Keep `SKILL.md` short; details go in `references/`. No em dashes in docs.
