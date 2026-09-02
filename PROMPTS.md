# Prompt library

Copy, edit the bracketed parts, paste into a chat that has layerly-creatives installed.
Every prompt ends by asking for the preview and QA result — keep that line; it is what makes the
skill check its own work before building the PSD.

## 1. Smoke test (no images needed)

```
Use the layerly-creatives skill.

Make an Instagram portrait ad (1080x1350) for a fictional coffee brand "Kalo Coffee".
- Background: dark gradient, #1B0F0A to #4A2A18, with one soft warm glow ellipse
- Eyebrow: "SMALL BATCH • DHAKA ROASTED"
- Headline: "WAKE UP BOLD."
- Support line: "Single-origin arabica, roasted this week."
- Price badge: circle, "৳650" and "250G"
- CTA button: "ORDER NOW" in brand color #E0A458
- Footer: "kalocoffee.com • Free delivery in Dhaka"

Fonts: Poppins. Show me the preview first, then give me the layered PSD with editable text
layers, and tell me the QA result.
```

## 2. Product ad with your own photo

```
Use layerly-creatives. Instagram portrait ad for [brand]. Use the attached photo as the product
cutout, centered, with a drop shadow. Headline "[headline]", support line "[line]",
CTA "[cta]", brand colors [#hex] and [#hex], mood: [premium / playful / minimal].
Preview first, then the PSD, and tell me the QA result.
```

## 3. Static ad set (3 variants for testing)

```
Use layerly-creatives. Make 3 static ad variants (1080x1080) for [product], same brand kit
(attached logo + product photo, colors [#hex], font Poppins):
A) benefit-led headline, B) price/offer-led, C) social-proof-led ("[review quote]").
Same layout skeleton, different headline and badge. One PSD per variant plus previews.
```

## 4. Weekly deals flyer (many products)

```
Use layerly-creatives with the `grid` block. Grocery flyer 1080x1350 like the attached reference:
logo top-left, headline "[WEEKLY MEGA DEALS]", validity strip "[dates]", then a 5x2 grid of
product cards, footer with phone / hours / address. Products and prices:
1. [name] – [price] – [note]
2. ...
Use the attached product photos (one per product, in order). Preview, QA, then PSD.
```

## 5. Replicate a reference design (your brand, their layout)

```
Use layerly-creatives. Replicate the attached design exactly — same canvas ratio, sections,
positions, hierarchy and colors — but with my brand: logo attached, product photos
attached, brand colors [#hex]/[#hex], and this copy: [headline], [support], [cta].
Change nothing else. Compare your preview with the reference side by side before building.
```

## 6. Exact recreation of a flat image as real layers

```
Use layerly-creatives in exact-recreation mode on the attached image.
- People and anything they hold stay together in ONE plate layer from the original image.
- Remove ONLY the loose objects ([list them]) from the plate with the image tool's edit /
  generative fill. No algorithmic inpainting.
- Generate each removed object as its own transparent PNG matching type, angle and lighting,
  place at the original position/size/rotation, cleanEdges: 2 on all.
- Title/logo/credits as their own cutout layers; add hidden editable text fallbacks.
- Run the audit sheet and show me every cutout on grey and the plate alone BEFORE the PSD.
```

## 7. New concept from the same ingredients

```
Use layerly-creatives. New concept with the same ingredients: reuse the clean plate of [subject]
unchanged, the object cutouts, the title words and the logo.
Concept: "[name it]" — [camera angle], [environment], [sky/color palette], objects
[scattered / falling / orbiting] with strong depth blur, [lighting]. Headline "[text]" as
editable text. Keep [subject] the largest element. Preview + audit sheet before the PSD.
```

## 8. Story / Reel cover

```
Use layerly-creatives, preset ig-story. Reel cover for "[topic]": full-bleed background from the
attached photo with a bottom fade mask, big headline "[text]" in the upper third, small
handle "@[name]" at the bottom above the safe zone. Preview, QA, PSD.
```

## Tips that change results

- Say the format (`ig-portrait`, `ig-story`, `fb-ad`, `a4-poster`) or the pixel size.
- Give a mood word: premium, playful, minimal, bold, editorial.
- Upload real product photos and the real logo. Generated versions of real brands are wrong.
- For anything with people, keep them as one plate; don't ask to separate hair from sky.
- If the download fails in ChatGPT, ask for the link in the message and retry once.
