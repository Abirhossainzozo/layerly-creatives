#!/usr/bin/env python3
"""
build_psd.py - FALLBACK writer: layered .psd from layers.json using only Pillow (no Node needed).

Usage:
    python3 build_psd.py <out_dir>/layers.json <output.psd>

Differences from build_psd.js (preferred):
  - every layer is a pixel layer: text is NOT editable as type, but each text sits on its own
    named layer so it can still be moved, recolored or replaced
  - drop shadows are baked into a separate "<name> shadow" layer under the element
  - layer folders are not created (names are prefixed with "Group / " instead)

Output opens in Photoshop, Photopea, GIMP, Affinity, Krita.
"""
import json
import os
import struct
import sys

from PIL import Image

BLEND_KEYS = {
    "normal": b"norm", "dissolve": b"diss", "darken": b"dark", "multiply": b"mul ",
    "color burn": b"idiv", "linear burn": b"lbrn", "lighten": b"lite", "screen": b"scrn",
    "color dodge": b"div ", "linear dodge": b"lddg", "overlay": b"over", "soft light": b"sLit",
    "hard light": b"hLit", "vivid light": b"vLit", "linear light": b"lLit", "pin light": b"pLit",
    "hard mix": b"hMix", "difference": b"diff", "exclusion": b"smud", "hue": b"hue ",
    "saturation": b"sat ", "color": b"colr", "luminosity": b"lum ",
}


def packbits(data):
    """PackBits (RLE) encode one row of bytes."""
    out = bytearray()
    i, n = 0, len(data)
    while i < n:
        j = i
        while j + 1 < n and data[j + 1] == data[i] and (j - i) < 126:
            j += 1
        run = j - i + 1
        if run >= 2:
            out.append(257 - run)
            out.append(data[i])
            i = j + 1
        else:
            j = i
            while j < n and (j - i) < 128:
                if j + 2 < n and data[j] == data[j + 1] == data[j + 2]:
                    break
                j += 1
            lit = data[i:j]
            out.append(len(lit) - 1)
            out.extend(lit)
            i = j
    return bytes(out)


def rle_channel(band_bytes, width, height):
    """Return (compressed bytes incl. compression flag + row counts, total length)."""
    rows = []
    for y in range(height):
        rows.append(packbits(band_bytes[y * width:(y + 1) * width]))
    counts = b"".join(struct.pack(">H", len(r)) for r in rows)
    body = struct.pack(">H", 1) + counts + b"".join(rows)
    return body


def pascal_string(name):
    raw = name.encode("latin-1", "replace")[:255]
    s = bytes([len(raw)]) + raw
    while len(s) % 4:
        s += b"\x00"
    return s


def layer_record_and_data(img, name, opacity, blend, hidden):
    """img: RGBA PIL image at full canvas size. Returns (record_bytes, channel_data_bytes)."""
    bbox = img.getchannel("A").getbbox()
    if bbox is None:
        bbox = (0, 0, 1, 1)
    left, top, right, bottom = bbox
    crop = img.crop(bbox)
    w, h = crop.size
    r, g, b, a = crop.split()
    channels = [(-1, a), (0, r), (1, g), (2, b)]
    datas = []
    rec = struct.pack(">iiii", top, left, bottom, right)
    rec += struct.pack(">H", len(channels))
    for cid, band in channels:
        body = rle_channel(band.tobytes(), w, h)
        datas.append(body)
        rec += struct.pack(">hI", cid, len(body))
    rec += b"8BIM" + BLEND_KEYS.get(blend, b"norm")
    flags = 8 | (2 if hidden else 0)
    rec += struct.pack(">BBBB", int(round(opacity * 255)), 0, flags, 0)
    extra = struct.pack(">I", 0)                       # no layer mask
    ranges = b"".join(struct.pack(">HHHH", 0, 0xFFFF, 0, 0xFFFF) for _ in range(5))
    extra += struct.pack(">I", len(ranges)) + ranges   # default blending ranges
    extra += pascal_string(name)
    rec += struct.pack(">I", len(extra)) + extra
    return rec, b"".join(datas)


def write_psd(path, width, height, layers, composite_rgb):
    records, datas = [], []
    for lay in layers:
        rec, dat = layer_record_and_data(lay["image"], lay["name"], lay["opacity"], lay["blend"], lay["hidden"])
        records.append(rec)
        datas.append(dat)
    layer_info = struct.pack(">h", len(layers)) + b"".join(records) + b"".join(datas)
    if len(layer_info) % 2:
        layer_info += b"\x00"
    lm = struct.pack(">I", len(layer_info)) + layer_info + struct.pack(">I", 0)  # + empty global mask
    if len(lm) % 2:
        lm += b"\x00"

    # merged image (RGB, RLE): all row counts first, then all rows, channel by channel
    comp = composite_rgb.convert("RGB")
    bands = [band.tobytes() for band in comp.split()]
    rows = []
    for band in bands:
        for y in range(height):
            rows.append(packbits(band[y * width:(y + 1) * width]))
    merged = struct.pack(">H", 1) + b"".join(struct.pack(">H", len(r)) for r in rows) + b"".join(rows)

    with open(path, "wb") as f:
        f.write(b"8BPS" + struct.pack(">H6xHIIHH", 1, 3, height, width, 8, 3))
        f.write(struct.pack(">I", 0))          # color mode data
        res_block = (b"8BIM" + struct.pack(">H", 0x03ED) + b"\x00\x00" + struct.pack(">I", 16)
                     + struct.pack(">IHHIHH", 72 << 16, 1, 1, 72 << 16, 1, 1))   # resolution info, 72 ppi
        f.write(struct.pack(">I", len(res_block)) + res_block)
        f.write(struct.pack(">I", len(lm)) + lm)
        f.write(merged)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    manifest_path, out_path = sys.argv[1], sys.argv[2]
    with open(manifest_path, "r", encoding="utf-8") as f:
        m = json.load(f)
    base = os.path.dirname(os.path.abspath(manifest_path))
    W, H = m["width"], m["height"]

    layers = []
    for e in m["layers"]:
        prefix = (e["group"] + " / ") if e.get("group") else ""
        if e.get("shadow"):
            layers.append({
                "image": Image.open(os.path.join(base, e["shadow"]["file"])).convert("RGBA"),
                "name": prefix + e["name"] + " shadow", "opacity": e.get("opacity", 1.0),
                "blend": "normal", "hidden": bool(e.get("hidden")),
            })
        img = Image.open(os.path.join(base, e["file"])).convert("RGBA")
        if e.get("mask"):
            from PIL import ImageChops
            m = Image.open(os.path.join(base, e["mask"]["file"])).convert("L")
            img.putalpha(ImageChops.multiply(img.getchannel("A"), m))
        layers.append({
            "image": img,
            "name": prefix + e["name"], "opacity": e.get("opacity", 1.0),
            "blend": e.get("blend", "normal"), "hidden": bool(e.get("hidden")),
        })
    composite = Image.open(os.path.join(base, m.get("composite", "composite.png")))
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    write_psd(out_path, W, H, layers, composite)
    print("wrote %s (%.1f MB, %d pixel layers) - text is rasterized in this fallback; use build_psd.js for editable text"
          % (out_path, os.path.getsize(out_path) / 1048576.0, len(layers)))


if __name__ == "__main__":
    main()
