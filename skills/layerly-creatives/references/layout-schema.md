# layout.json reference

A layout is one JSON file. Layers are listed **bottom to top** (first = furthest back).
Coordinates are pixels from the top-left corner; any `x`, `y`, `width`, `height` may also be a
percentage string like `"50%"`. Colors are `#RRGGBB` or `#RRGGBBAA` (alpha).

```json
{
  "name": "citrus-summer-sale",
  "preset": "ig-portrait",
  "background": { "type": "gradient", "from": "#0E2A26", "to": "#1F6B5A", "angle": 60 },
  "layers": [ ... ]
}
```

## Canvas

| key | meaning |
|---|---|
| `preset` | size shortcut (below). Or give `width` + `height` explicitly. |
| `background` | shorthand for a first full-canvas layer: `"#FFFFFF"`, `{"type":"color","color":"#000"}`, `{"type":"gradient","from":"#000","to":"#333","angle":90}` or `{"type":"image","src":"bg.png","fit":"cover","blur":0}` |

Presets: `ig-post` 1080×1080 · `ig-portrait` 1080×1350 · `ig-story` / `reel-cover` 1080×1920 ·
`fb-feed` 1080×1350 · `fb-ad` 1200×628 · `linkedin` 1200×627 · `x-post` 1600×900 ·
`youtube-thumb` 1280×720 · `pinterest` 1000×1500 · `a4-poster` 2480×3508

## Keys every layer accepts

| key | default | meaning |
|---|---|---|
| `type` | — | `image`, `text`, `rect`, `ellipse`, `gradient` |
| `name` | auto | layer name shown in Photoshop |
| `x`, `y` | 0 | top-left position |
| `width`, `height` | canvas / auto | box size |
| `opacity` | 1 | 0–1 |
| `blend` | normal | `multiply`, `screen`, `overlay`, `soft light`, `hard light`, `darken`, `lighten`, `difference`, `color dodge`, `color burn`, `linear dodge`, `linear burn`, `hue`, `saturation`, `color`, `luminosity` |
| `hidden` | false | layer exists but is switched off |
| `group` | — | folder name; consecutive layers with the same group are put in one folder |
| `shadow` | — | drop shadow `{"color":"#000000","opacity":0.5,"distance":12,"angle":120,"blur":24}` → becomes a real Layer Style in the PSD |

## `image`

```json
{ "type": "image", "name": "Product", "src": "product.png",
  "x": 240, "y": 300, "width": 600, "height": 640, "fit": "contain",
  "radius": 0, "blur": 0, "flip": false, "scale": 1 }
```
`fit`: `cover` (fill box, crop overflow), `contain` (fit inside box), `stretch`, `none` (natural size, centered).
`cleanEdges`: `2` (or `{"erode": 2, "feather": 1}`) shrinks the cutout's alpha by N px and feathers
it — removes white halos, color fringe and visible selection-outline "wires" on pasted cutouts.
Use on every cutout that was cropped from a flat image. `scatter` applies it by default.
Omit `width`/`height` to use the image's own size × `scale`. `radius` rounds corners. `src` is
relative to the layout file. Transparent PNGs keep their transparency (product cutouts).

## `text`

```json
{ "type": "text", "name": "Headline", "text": "TASTE THE\nSUN",
  "x": 90, "y": 160, "width": 900, "font": "Poppins-Bold", "size": 132,
  "color": "#FFFFFF", "align": "left", "lineHeight": 0.95, "tracking": -20, "uppercase": false }
```
- `width` is the wrap width; text wraps at spaces, `\n` forces a line break. Omit `width` for no wrapping.
- `align`: `left`, `center`, `right` (inside the box).
- `size` in px. `lineHeight` is a multiplier (1.0 = tight, 1.3 = airy). `tracking` is in 1/1000 em, same as Photoshop (100 = wide, -20 = tight).
- `font`: bundled `Poppins-Bold`, `Poppins-Medium`, `Poppins-Regular`, or a `.ttf/.otf` path, or an installed font name. The PSD stores the font's PostScript name so Photoshop re-renders it if that font is installed.
- Becomes an editable type layer in build_psd.js (rasterized in the Python fallback).

## `rect` / `ellipse`

```json
{ "type": "rect", "name": "CTA button", "x": 90, "y": 1150, "width": 400, "height": 104,
  "color": "#F2C94C", "radius": 52, "stroke": { "color": "#FFFFFF", "width": 4 } }
```
Full-bleed color blocks, buttons, badges, dividers, tint overlays (use `#000000` with `opacity`).

## `gradient`

```json
{ "type": "gradient", "name": "Fade", "x": 0, "y": "55%", "width": "100%", "height": "45%",
  "from": "#00000000", "to": "#000000CC", "angle": 90 }
```
`angle` 0 = left→right, 90 = top→bottom. Use `stops` for more colors:
`"stops": [[0, "#FF7A00"], [0.5, "#FF2D95"], [1, "#4B00FF"]]`. A bottom fade over a photo is the
standard trick for keeping white text readable.

## `grid` — product deal cards (flyers, weekly offers, catalogs)

One block that expands into a card per item, each in its own folder with its own layers
(card background, title, product image, price tag, price, note, badge):

```json
{ "type": "grid", "name": "Deals", "x": 40, "y": 480, "width": 1000, "height": 700,
  "cols": 5, "rows": 2, "gap": 14,
  "card":  { "color": "#FFFFFF", "radius": 16 },
  "title": { "size": 17, "color": "#111111", "font": "Poppins-Bold" },
  "price": { "size": 34, "color": "#FFFFFF", "bg": "#D62828" },
  "note":  { "size": 14, "color": "#333333" },
  "badgeColor": "#F9D23C", "badgeTextColor": "#111111",
  "items": [
    { "image": "onion.png", "title": "BROWN ONION\n5KG", "price": "$6.99" },
    { "image": "rice.png",  "title": "RUCHI SONA MASURI\nRICE 5KG", "price": "$8.50", "note": "ONLY" },
    { "image": "beans.png", "title": "MIXED BEANS 1KG", "price": "$3.99", "badge": "SAVE\n$1" }
  ] }
```
- `rows` defaults to what the items need. `card.color: "none"` gives cards without a background.
- `price.bg` draws a colored tag behind the price; omit it for plain colored text.
- `note` sits under the price ("ONLY", "SAVE $2.00"); `badge` is a round sticker over the image.
- Every item needs its own product image (one cutout per product).

## Rotation, blur, masks (any layer)

| key | meaning |
|---|---|
| `rotate` | degrees counter-clockwise around the element's center. Text stays editable — the angle is stored in the type layer. A thin `rect` with `rotate` makes a strikethrough or underline. |
| `blur` | gaussian blur in px — depth-of-field for scattered elements |
| `mask` | real, editable layer mask written into the PSD (preview shows the result): |

```json
"mask": { "type": "fade", "angle": 90, "start": 0.75, "end": 0.98 }   // fade the bottom into the bg
"mask": { "type": "ellipse", "feather": 60 }                          // soft vignette holdout
"mask": { "type": "rect", "feather": 30, "inset": 20 }                // soft-edged crop
"mask": { "src": "custom-mask.png" }                                  // white = visible
```
Use a bottom `fade` mask on hero photos so they melt into the background instead of ending in a
hard rectangle edge.

## `scatter` — floating elements (posters, hero art)

Copies of cutouts thrown across an area with varied size, angle, blur and opacity — chess pieces,
petals, coffee beans, confetti. Deterministic per `seed`; each copy is its own layer in a folder.

```json
{ "type": "scatter", "name": "Floating pieces", "x": 0, "y": 0, "width": "100%", "height": "100%",
  "images": ["pawn.png", "rook.png", "knight.png"], "count": 10,
  "sizeRange": [80, 260], "rotateRange": [-45, 45], "blurRange": [0, 6],
  "opacityRange": [0.9, 1], "avoid": [450, 700, 260], "seed": 7 }
```
`avoid` = [cx, cy, radius] keeps a zone clear (the hero's face). Bigger blur on bigger/nearer
pieces sells depth.

## Design rules that keep results professional

- Leave a safe margin of ~8% (90 px on a 1080 canvas) on all sides; keep text out of the bottom 15% on stories/Reels (UI overlays it).
- One dominant element, one headline, one CTA. Eyebrow → headline → support → CTA is the reliable hierarchy.
- Headline 90–140 px on a 1080 canvas; body 28–36 px; CTA text 32–40 px with `tracking` 40–80.
- Contrast: put text on a solid block, a gradient fade, or a blurred/darkened photo — never directly on a busy image.
- Two type weights maximum (e.g. Poppins-Bold for display, Poppins-Regular for body).
- Brand color for the CTA only; neutrals everywhere else so the CTA pops.

## Full example

```json
{
  "name": "citrus-summer-sale",
  "preset": "ig-portrait",
  "background": { "type": "gradient", "from": "#0E2A26", "to": "#1F6B5A", "angle": 60 },
  "layers": [
    { "type": "ellipse", "name": "Glow", "x": 190, "y": 330, "width": 700, "height": 700, "color": "#F2C94C", "opacity": 0.35, "blend": "screen" },
    { "type": "image", "name": "Product", "src": "product.png", "fit": "contain", "x": 240, "y": 300, "width": 600, "height": 640, "group": "Product",
      "shadow": { "color": "#000000", "opacity": 0.55, "distance": 24, "angle": 120, "blur": 40 } },
    { "type": "text", "name": "Eyebrow", "text": "LIMITED SUMMER DROP", "x": 90, "y": 110, "width": 900, "font": "Poppins-Medium", "size": 34, "color": "#F2C94C", "tracking": 200, "group": "Text" },
    { "type": "text", "name": "Headline", "text": "TASTE THE SUN", "x": 90, "y": 160, "width": 900, "font": "Poppins-Bold", "size": 132, "color": "#FFFFFF", "lineHeight": 0.95, "tracking": -20, "group": "Text",
      "shadow": { "color": "#000000", "opacity": 0.4, "distance": 10, "angle": 120, "blur": 24 } },
    { "type": "rect", "name": "CTA button", "x": 90, "y": 1150, "width": 400, "height": 104, "color": "#F2C94C", "radius": 52, "group": "CTA" },
    { "type": "text", "name": "CTA text", "text": "SHOP NOW", "x": 90, "y": 1179, "width": 400, "font": "Poppins-Bold", "size": 36, "color": "#0E2A26", "align": "center", "tracking": 60, "group": "CTA" },
    { "type": "text", "name": "Offer", "text": "30% off all citrus flavours\nuntil Sunday", "x": 520, "y": 1150, "width": 470, "font": "Poppins-Regular", "size": 30, "color": "#FFFFFF", "align": "right", "lineHeight": 1.3, "group": "CTA" }
  ]
}
```
