#!/usr/bin/env python3
"""
audit_cutouts.py - contact sheet of every image layer on a grey square + each full-canvas plate alone.

Usage:
    python3 audit_cutouts.py <out_dir>/layers.json <out_dir>/audit.png

Look at the sheet before delivering an "exact" rebuild:
  - a cutout that carries sky, skin, jacket or a visible outline wire is NOT a cutout -> regenerate it
  - a plate with smears, blobs or holes where objects were removed is NOT clean -> regenerate it
"""
import json
import os
import sys

from PIL import Image, ImageDraw


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    m = json.load(open(sys.argv[1]))
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    W, H = m["width"], m["height"]
    tiles = []
    for e in m["layers"]:
        if e["type"] != "image" or e.get("hidden"):
            continue
        im = Image.open(os.path.join(base, e["file"])).convert("RGBA")
        bbox = im.getchannel("A").getbbox()
        if not bbox:
            continue
        area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
        crop = im.crop(bbox)
        if area >= 0.4 * W * H:          # plate / hero: show alone, small
            crop.thumbnail((360, 360))
            label = "PLATE: " + e["name"]
        else:                            # cutout: on grey, enlarged
            s = max(1, int(260 / max(crop.size)))
            crop = crop.resize((crop.width * s, crop.height * s), Image.LANCZOS)
            label = e["name"]
        bg = Image.new("RGBA", (crop.width + 20, crop.height + 40), (110, 110, 110, 255))
        bg.alpha_composite(crop, (10, 30))
        ImageDraw.Draw(bg).text((8, 8), label[:40], fill=(255, 255, 255, 255))
        tiles.append(bg)
    if not tiles:
        sys.exit("no image layers to audit")
    cols = 4
    cw, ch = max(t.width for t in tiles), max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (cw + 10), rows * (ch + 10)), (25, 25, 25))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * (cw + 10), (i // cols) * (ch + 10)))
    sheet.save(sys.argv[2])
    print("audit sheet: %s (%d image layers). View it. Any cutout carrying background = regenerate." % (sys.argv[2], len(tiles)))


if __name__ == "__main__":
    main()
