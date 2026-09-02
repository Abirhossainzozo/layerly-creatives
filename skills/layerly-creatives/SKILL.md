---
name: layerly-creatives
description: Design social media creatives, ads, posters and banners and deliver them as a layered .psd (editable text layers, folders, drop-shadow layer styles) plus a PNG preview, with no Photoshop needed. Use this whenever someone asks for a design "as a PSD", "with layers", "editable in Photoshop / Photopea / GIMP", a static ad, Instagram post, story, Reel cover, Facebook ad, LinkedIn banner, YouTube thumbnail, poster or any graphic they will edit later — even if they don't say the word PSD.
license: PolyForm-Noncommercial-1.0.0 (commercial license available)
---

# Layerly Creatives

Turn a brief into a finished design where every element sits on its own named, editable layer.
You describe the design as a small `layout.json`; the scripts render it and write the `.psd`.

```
brief  →  images (generate or reuse)  →  layout.json  →  render_layers.py  →  preview.png
                                                        →  build_psd.js     →  design.psd
```

## 0. Know your environment (10 seconds)

- `node --version` works → use `scripts/build_psd.js` (editable type layers, real layer styles, folders).
- Only Python → use `scripts/build_psd.py` (same layers, but text is rasterized). Tell the user.
- Images: use whatever image generator the chat has (ChatGPT image generation, Adobe/Canva
  connectors, Nano Banana). If a terminal has `GEMINI_API_KEY` or `OPENAI_API_KEY`,
  `scripts/gen_image.py` generates images. Backgrounds can be gradients and shapes, but the
  product itself must be a real image (see step 2).

Never open or read `assets/fonts/*`, `scripts/vendor/*` or generated PNGs into the chat -
they are executed or copied, not read. Only SKILL.md and `references/*.md` are for reading.

## 1. Collect the brief (ask only what is missing)

Format/preset · product or subject · headline · support line · CTA · brand colors · fonts ·
mood (bold / minimal / luxury / playful). Default to `ig-portrait` (1080×1350) when unsure —
it works on Instagram feed and Facebook. Use `ig-story` for stories/Reels, `fb-ad` for link ads.

## 2. Get the images

- Product / hero image is mandatory and must be a real image: the user's photo, or one you
  generate ("studio photo of <product>, isolated on transparent background, no text"). Never
  build a product, pack, bottle, plate or food out of `rect`/`ellipse` primitives — it reads as a
  placeholder and the design quality collapses. If no image tool exists and the user has not
  uploaded one, stop and ask for the product photo before building.
- Shapes are for backgrounds, glows, buttons, badges, dividers and tint overlays only.
- Background: either a generated scene (prompt for the mood, "no text, no logos, leave empty
  space on the left for a headline") or a `gradient` background — solid gradients + one glow
  ellipse read as premium and never fight the text.
- Logos: always the user's file placed as an `image` layer; never redraw a logo as text.
- Save images next to `layout.json`; reference them by relative path.

## 2b. A reference design was given → replicate it, don't reinterpret it

When the user uploads a design and says "like this", the job is a faithful rebuild: same canvas
ratio, same sections in the same places, same number of product cards in the same grid, same
color scheme, same type hierarchy (caps, weights, badges, strips). Change only what the user
tells you to change (their brand, products, prices, contact). Do not "improve" the composition.

Procedure:
1. Inventory the reference top → bottom: every element with its approximate position and size
   as a percentage of the canvas, its colors, and its text style. Count the product cards.
2. Collect assets. One image per product/logo/mascot as a separate cutout — never one scene
   image containing everything: a single picture cannot be layered, and it is not the design.
   Real branded products (rice bags, snack packs, drinks) must come from the user's photos;
   generated packaging of real brands is wrong. Ask for them once, listing exactly what is needed.
3. Build the layout with the same coordinates: `grid` for the deal cards, `rect`/`ellipse` for
   strips, badges and buttons, `text` for every line, `image` for every cutout. Decorative
   elements (megaphone, lightning, starburst) are generated as transparent cutouts or left out —
   never painted into a background image.
4. Render, then compare preview and reference side by side. Check element count, positions,
   colors, and that every price/name is present. Fix and re-render until they match.
5. Run `python3 scripts/audit_cutouts.py build/layers.json build/audit.png` and VIEW it: every
   cutout on grey, every plate alone. A cutout that drags sky, skin or jacket along, an outline
   wire, or a plate with smears/blobs where objects were removed means the extraction failed —
   regenerate that asset with the image tool instead of shipping it. Never call a file
   "shape-accurate" or "clean" that you have not looked at this way.

Product pictures taken from the reference itself: crop the product only — never a card region
that contains the old title, weight or price, because that text ends up baked under the new
price tag (the classic "overlapping prices" bug). If the product can't be cropped clean, ask
the user for the photo. All names, weights, prices and notes are typed as `text` layers, never
left inside an image.

A brand kit is: logo PNG (transparent), product photos, brand colors as hex, font files (.ttf/.otf,
pass the path via `font`). Use the logo file as an `image` layer; never redraw it.

**Reference given as a link:** look at it first, whichever way works —
1. a browsing / fetch tool in the chat (Claude's web_fetch, ChatGPT with Web search on): open the
   link and view the image;
2. a terminal with internet: `python3 scripts/fetch_reference.py <url> reference.jpg`, then view it;
3. neither (ChatGPT's sandbox has no internet, or the link needs a login — Facebook, Instagram,
   Drive, Canva): say so in one line and ask the user to upload the image. Never guess a design
   you have not seen.


## 2c. Photo-composite posters (movie-poster / editorial style)

References like a cinematic sports or film poster are photo composites. The recipe:
1. Full bleed — one background scene covers the whole canvas; type sits ON the image, never in a
   separate white band above it.
2. Hero: a clean cutout, large (60–75% of canvas height), with a bottom `fade` mask so it blends
   into the scene instead of ending in a rectangle.
3. One oversized foreground element breaking scale (the giant hand + piece) — its own layer,
   slight `blur` on the nearest part sells the depth.
4. `scatter` for floating elements with rotation and blur ranges — never paste them straight,
   same-size, unrotated.
5. Grade: 1–2 full-canvas `gradient` layers in `multiply`/`screen`/`soft light` at low opacity to
   unify the colors.
6. Wordmarks in script/calligraphy: generate as a transparent-background PNG and place as an
   `image` layer (say it is not editable text); all functional text (names, dates, credits)
   stays as editable `text` layers.

## 2d. "Exact recreation" honesty rules

- NEVER paste the reference image as a top "preview" layer over fake layers underneath. A PSD
  that only looks right because the flat reference covers everything is a deception, not a
  layered file.
- A cutout means clean edges: no sky, no background rectangle, no visible selection outline
  around it. Put `"cleanEdges": 2` on every cutout cropped from a flat image (kills halos and
  outline wires); check edges at 300% in the preview before delivering. If a clean cutout
  cannot be made from the flat reference, regenerate the asset (same object, same angle,
  transparent background) or ask the user for it — and say which elements were regenerated.
- Removing objects from a flat image needs real generative fill (the image tool's edit mode);
  algorithmic inpainting leaves smears. If no generative edit is available, keep the object in
  the plate and say the layer is not separable.
- Fancy lettering that cannot be matched with available fonts: recreate it as a generated
  transparent PNG, and add a hidden editable `text` layer with the same words behind it as a
  courtesy — hidden layers must be labeled "(hidden: editable fallback)" in the name.

## 3. Write layout.json

Read `references/layout-schema.md` for every option (a complete working example lives in
`assets/example/layout.json`). Layers are listed bottom → top. Skeleton:

```json
{
  "name": "brand-campaign-ig",
  "preset": "ig-portrait",
  "background": { "type": "gradient", "from": "#0E2A26", "to": "#1F6B5A", "angle": 60 },
  "layers": [
    { "type": "image", "name": "Product", "src": "product.png", "fit": "contain", "x": 240, "y": 300, "width": 600, "height": 640, "group": "Product",
      "shadow": { "opacity": 0.5, "distance": 24, "blur": 40 } },
    { "type": "text", "name": "Headline", "text": "TASTE THE SUN", "x": 90, "y": 160, "width": 900, "font": "Poppins-Bold", "size": 132, "color": "#FFFFFF", "lineHeight": 0.95, "group": "Text" },
    { "type": "rect", "name": "CTA button", "x": 90, "y": 1150, "width": 400, "height": 104, "color": "#F2C94C", "radius": 52, "group": "CTA" },
    { "type": "text", "name": "CTA text", "text": "SHOP NOW", "x": 90, "y": 1179, "width": 400, "font": "Poppins-Bold", "size": 36, "color": "#0E2A26", "align": "center", "tracking": 60, "group": "CTA" }
  ]
}
```

Use `group` to make folders (Background / Product / Text / CTA is a good default). For flyers
with many products use one `grid` layer — it expands into a folder per card. Give every
layer a human name — that is what the user sees in the Layers panel.

## 4. Render, look, fix, repeat

```bash
python3 scripts/render_layers.py layout.json build/
```
The renderer ends with a **QA report**: text overlapping text, text sitting on an image, text
too wide for its box, text off-canvas, and low-contrast text (e.g. white notes on a cream card).
Every QA line is a real defect the user will see — fix each one in `layout.json` and re-render
until it prints "QA: no overlaps, contrast or overflow problems found". Then open
`build/preview.png` and actually look at it (view the image): safe margins, product not covered,
CTA readable, headline not wrapping awkwardly, prices aligned across cards. Show the preview to
the user before building the PSD when the brief was vague; skip the round-trip when they asked
for a quick result. Never build the PSD with open QA warnings.

## 5. Build the PSD

```bash
node scripts/build_psd.js build/layers.json out/<name>.psd       # preferred
python3 scripts/build_psd.py build/layers.json out/<name>.psd    # fallback, no Node
```

## 6. Deliver the files (platform matters — files saved elsewhere are invisible to the user)

| where you are running | save the PSD, preview.png and fonts to | then |
|---|---|---|
| ChatGPT | `/mnt/data/<name>.psd` | put a markdown link for each file in your reply: `[Download <name>.psd](sandbox:/mnt/data/<name>.psd)` — the Outputs side panel is not a download button |
| Claude.ai / Claude desktop | `/mnt/user-data/outputs/<name>.psd` | call `present_files` on every file |
| Claude Code / Codex / terminal | `./out/<name>.psd` | print the absolute path |

Copy the fonts used (`build/layers.json` → `fonts`) next to the PSD. If the user does not have
Poppins installed, Photoshop substitutes it, so say that the .ttf files are included.

Put `layout.json` inside the ZIP as the design source (it plus the images is enough to rebuild
the identical PSD in any app that has this skill). Do not paste the layout into the chat unless
the user asks for it or a download failed.

### If the user says the PSD/ZIP won't download (ChatGPT)

This is a known ChatGPT bug for non-image files, not a broken file. In order:
1. Re-issue the link in a fresh reply: copy the file again to `/mnt/data/` (sandbox files expire),
   then `[Download](sandbox:/mnt/data/<name>.psd)`. Offer both the raw `.psd` and a `.zip` of it —
   one of the two usually goes through.
2. Ask the user to click the link in the message body (not the Outputs panel) and to try once
   more a minute later; downloads often succeed on retry.
3. Only now print `layout.json` in a code block and tell the user: paste it into Claude, Codex
   or Claude Code with the same skill (plus the product image, which downloads fine) to get the
   PSD there.

## 7. Tell the user these two things

- Photoshop shows a one-time "some text layers need to be updated" prompt — click **Update**.
  This is normal for PSDs written outside Photoshop; Photopea and GIMP open it silently.
- Layers: folders per section, editable text (font/size/color/tracking), drop shadows as layer
  styles, product and shapes as pixel layers. Blend modes and opacity are preserved.

## Gotchas

- Shadows: `shadow` becomes a real Layer Style in build_psd.js; the Python fallback bakes it into
  a separate "<name> shadow" layer under the element.
- Very long headlines: lower `size` or raise `width` instead of adding manual `\n` breaks, so the
  type layer stays one editable block.
- Non-Latin scripts: Noto Sans Bengali (Bold/Regular) is bundled and picked automatically for
  Bangla text; for Arabic, Devanagari, etc. the renderer looks for a system font with the glyphs,
  or pass a `.ttf` path via `font`.
- Keep canvases ≤ 4000 px per side; the PSD grows with layer count × canvas size.
