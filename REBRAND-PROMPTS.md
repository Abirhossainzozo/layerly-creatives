# Rebrand prompts

The two jobs agencies ask for most, and the prompts that do them with the skill.

- **Re-skin**: same design, same layout, same products and copy. Only the person, the brand name,
  the logo and (optionally) the colors change. Use it when a client wants "this exact flyer, for my
  shop".
- **Same concept**: keep the idea and the context (a person standing out in a crowd, a newspaper
  held up, a before/after desk) but change everything else: new photo, new layout, new copy, new
  colors. Use it when you liked the concept but need a fresh execution.

Both run in a chat that has the skill and an image tool (ChatGPT works). Attach the design, paste
the prompt, fill the brackets.

Palette used below: primary blue `#1F5EFF`, deep navy `#0B1B3A`, ice `#EAF0FF`, CTA accent
`#FFD23F`. Change it to the client's colors when you use these for real work.

---

## Master prompt A: Re-skin

```
Use layerly-creatives in exact-recreation mode on the attached design.
Keep the composition, grid, hierarchy, products, prices and copy exactly.
Change only:
1. People: replace every person with a fictional [describe person], same pose, same crop, same
   lighting, using the image tool. No real person's likeness.
2. Brand: replace the logo and brand name with "[NEW BRAND]". Rebuild the logo as an editable text
   layer plus a simple icon generated as a transparent PNG if the original had one.
3. Contact details: phone [PHONE], address [ADDRESS], website [URL].
4. Colors: [keep the original palette / recolor to #1F5EFF, #0B1B3A, #EAF0FF, CTA #FFD23F].
Every word as an editable text layer. Every product as its own cutout with cleanEdges: 2.
Show the preview and the audit sheet before building the PSD.
```

## Master prompt B: Same concept, new execution

```
Use layerly-creatives. Same concept as the attached design, everything else new.
Concept to keep: [one sentence, e.g. "one person in a bright suit stands out in a crowd of grey
suits, shot from above"].
Change: generate a new hero image with the image tool (fictional [describe person], new setting,
new angle), new layout, new headline "[HEADLINE]", support "[SUPPORT]", CTA "[CTA]", brand
"[NEW BRAND]", palette #1F5EFF, #0B1B3A, #EAF0FF, CTA #FFD23F. Same format ([1080x1350]).
Do not copy the original's layout, fonts or wording. Every word as an editable text layer.
Show the preview, then the PSD.
```

---

## Per-image prompts

Paste the master prompt and replace the brackets with these values. Where a line says "no
person", skip step 1.

### 1. Kacha Bazar weekly flyer (both versions you uploaded are the same design)

**Re-skin:** no person · brand "NILA MART" with a simple blue basket icon · phone +1 234 567 890,
12 Market Street, nilamart.com · colors: recolor to blue palette, keep red price tags for contrast.

**Same concept:** concept "a bold weekly grocery deals flyer with a hero headline, a validity
strip and a 5x2 grid of product cards" · headline "WEEKEND SUPER SAVER" · support "Fresh deals,
every weekend" · CTA "Shop in store or online" · brand "NILA MART" · 1080x1350. Use the `grid`
block; keep the ten products and prices from the attachment.

### 2. Dhaka Supermarket plantain deals

**Re-skin:** no person · brand "NILA MART" · phone, address, url as above · colors: recolor the
green headline blocks to #0B1B3A and the yellow accents to #FFD23F.

**Same concept:** concept "two versions of one fruit (green and ripe) on a wooden table with a
price badge for each and an offer-valid stamp in the middle" · headline "FROM GREEN TO GOLDEN" /
"PLANTAIN DEALS" · support "Fresh picks for every plate" · badges "3 for $2" and "1 for $1" · CTA
"Order online" · brand "NILA MART" · 1080x1350.

### 3. Herstory poster

**Re-skin:** person: fictional woman chess player, mid-20s, dark hair, navy blazer, holding a
wooden king toward the camera, same pose · brand "LAYERLY CREATIVES" instead of the media logo,
credit line removed · name line "YOUR NAME HERE" · colors: keep the sky, tint the title to
#0B1B3A and the strike to #FFD23F.

**Same concept:** concept "a portrait with the subject offering a chess piece to the camera while
pieces float around them; a crossed-out word above a new word" · headline "HISTORY" struck
through, "HERSTORY" in script above · support "Every piece. Its own layer." · brand "LAYERLY
CREATIVES" · 1080x1350. Use scatter for the floating pieces.

### 4. Digibramb: brand different in the crowd

**Re-skin:** person: fictional man in an electric blue suit and hat, same top-down pose, crowd in
grey · brand "NEXA DIGITAL | Digital Marketing" · colors: orange to #1F5EFF.

**Same concept:** concept "one person in a bright color stands out in a monochrome crowd, shot
from above" · headline "Brand" huge · above it "We know how to make your", below "impossible to
miss" · brand "NEXA DIGITAL" · 1080x1350, bottom fade mask on the photo.

### 5. Timeless: marketing that gets talked about

**Re-skin:** person: fictional woman with blue cat-eye sunglasses, black outfit, same pose holding
the newspaper · brand "NEXA DIGITAL AGENCY" everywhere the old name appears, including on the
newspaper · colors: red to #1F5EFF.

**Same concept:** concept "a person holds up a newspaper whose front page is the ad; hands with
cameras and phones enter from the sides" · headline "CREATIVES" / "THAT GET TALKED ABOUT" ·
newspaper: "THE LAYERLY TIMES", three bullets (data-driven strategy, creative execution, real
results), bar "START YOUR GROWTH JOURNEY" · brand "NEXA DIGITAL AGENCY" · 1080x1350.

### 6. Avante Capital: 9-tile finance grid

**Re-skin:** people: fictional business people in the same poses (man with tablet, two colleagues,
woman at laptop, meeting) · brand "NORTHLINE CAPITAL" with a simple arrow icon · colors: green to
#0B1B3A and #1F5EFF, cream cards to #EAF0FF, yellow accents to #FFD23F. Deliver nine tiles as
nine PSDs.

**Same concept:** concept "a nine-tile carousel for a finance consultancy, alternating photo tiles
and message tiles with a card shape and a small logo" · nine headlines: "Your financial future is
closer than you think", "Financial independence within reach", "Your money deserves smart
management", "Sole trader, LLC or corporation?", "Cash flow out of control?", "Is your company
registered?", "Formalize your business with confidence", "Stop working just to pay bills", "Taxes:
paying more than you should?" · brand "NORTHLINE CAPITAL" · 1080x1080 each.

### 7. Netroots: 9-tile tech grid

**Re-skin:** people: swap the person hiding behind the book and the visor person for fictional
equivalents, keep objects (chess hand, astronaut, laptop, statue) · brand "NEXA DIGITAL" with a
small "nd" monogram · colors: keep blue but shift to #1F5EFF; footer url nexadigital.com. Nine
PSDs.

**Same concept:** concept "a bold blue nine-tile carousel mixing one isolated object per tile with
one giant headline word" · headlines "DIGITAL", "STRATEGIES", "TRUST US", "CUSTOMERS?", "Looking
for a branding agency?", "GO DIGITAL", "WEBSITE", "MARKETING" with rotated pill tags, "UPGRADE?" ·
brand "NEXA DIGITAL" · 1080x1080 each.

### 8. KeepAm: avoiding it doesn't make it smaller

**Re-skin:** person: fictional man in a dark suit running toward the camera with a briefcase, same
pose, second smaller runner behind · brand "LAYERLY" top left, footer url layerly.app, button "Try
Layerly" · colors: teal to #1F5EFF · headline change: "Fixing it later" / "doesn't make it
smaller" · support "Every revision on a flat image is a re-roll. On a PSD it's a text edit."

**Same concept:** concept "a person flees a wave of paper that represents the problem" · paper =
printed ads with red revision stamps · headline "Fixing it later doesn't make it smaller" · CTA
"Try Layerly" · brand "LAYERLY" · 1080x1350.

### 9. Before / After desk

**Re-skin:** no person · brand "LAYERLY" · text "BEFORE" / "AFTER", bottom "FROM FLAT TO
FIXABLE", support "Layered PSDs from every AI creative", url layerly.app · colors: navy to
#0B1B3A, keep the light photo.

**Same concept:** concept "a top-down desk split down the middle, chaos on the left, order on the
right, a laptop on the seam" · left: crumpled flat printouts · right: neat layered stacks and a
layers panel on the laptop · same text as above · 1080x1350.

### 10. VNSK: great marketing is an investment

**Re-skin:** no person · brand "LAYERLY" monogram at top · headline "GREAT" / "CREATIVES" / "ARE
NOT A COST" / "THEY'RE AN INVESTMENT" · colors: orange to #1F5EFF, black to #0B1B3A · the
unrolled banner recolored blue with no readable text.

**Same concept:** concept "a phone on a plain surface with a long printed banner unrolling out of
the screen" · same headline · brand "LAYERLY" · 1080x1350.

### 11. KeepAm: no data, no problem

**Re-skin:** person: fictional person seen from behind in a green hoodie, same framing · brand
"LAYERLY" top left · headline "No designer? No problem." · support "Layerly turns AI creatives into
layered files your whole team can edit." · pill "Get the skill free | layerly.app" · colors: green
accents to #1F5EFF, screen glow to blue.

**Same concept:** concept "a person on a laptop at night with a glowing panel floating out of the
screen" · panel shows stacked design layers · same text as above · 1080x1350.

---

### After each run

1. Check the audit sheet: every cutout on grey, plate alone, no smears.
2. Open the PSD in Photopea: text layers editable, folders present.
3. Save the before/after pair; that pair is your sales page.
