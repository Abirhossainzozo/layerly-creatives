#!/usr/bin/env python3
"""
render_layers.py - render a layout.json into per-layer PNGs + a flattened preview.

Usage:
    python3 render_layers.py <layout.json> <out_dir>

Produces inside <out_dir>:
    layers/NN_<name>.png        one full-canvas RGBA PNG per layer
    layers/NN_<name>_shadow.png baked drop shadow (only when a layer has "shadow")
    layers.json                 layer list + text metadata, consumed by build_psd.js / build_psd.py
    preview.png                 flattened composite (what the design looks like)

Only needs Pillow. Uses numpy for blend modes when available (optional).
See ../references/layout-schema.md for the layout format.
"""
import json
import math
import os
import re
import struct
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

try:
    import numpy as np
except Exception:  # numpy is optional
    np = None

HERE = os.path.dirname(os.path.abspath(__file__))
BUNDLED_FONT_DIR = os.path.join(HERE, "..", "assets", "fonts")


def ensure_bundled_fonts():
    """Make sure the bundled .ttf files exist; if only fonts_b64.py shipped, write them out."""
    global BUNDLED_FONT_DIR
    import glob
    import tempfile
    if glob.glob(os.path.join(BUNDLED_FONT_DIR, "*.ttf")):
        return
    src = os.path.join(BUNDLED_FONT_DIR, "fonts_b64.py")
    if not os.path.isfile(src):
        return
    ns = {}
    with open(src, "r", encoding="utf-8") as f:
        exec(f.read(), ns)
    fonts = ns.get("FONTS", {})
    target = BUNDLED_FONT_DIR
    try:
        os.makedirs(target, exist_ok=True)
        open(os.path.join(target, ".write_test"), "w").close()
        os.remove(os.path.join(target, ".write_test"))
    except Exception:
        target = os.path.join(tempfile.gettempdir(), "psd-builder-fonts")
        os.makedirs(target, exist_ok=True)
    import base64
    import zlib
    for name, b64 in fonts.items():
        out = os.path.join(target, name)
        if not os.path.isfile(out):
            raw = base64.b64decode(b64)
            try:
                raw = zlib.decompress(raw)
            except Exception:
                pass  # older plain-base64 payloads
            with open(out, "wb") as f:
                f.write(raw)
    BUNDLED_FONT_DIR = target
    if target not in FONT_DIRS:
        FONT_DIRS.insert(0, target)

PRESETS = {
    "ig-post": (1080, 1080),
    "ig-portrait": (1080, 1350),
    "ig-story": (1080, 1920),
    "reel-cover": (1080, 1920),
    "fb-feed": (1080, 1350),
    "fb-ad": (1200, 628),
    "linkedin": (1200, 627),
    "x-post": (1600, 900),
    "youtube-thumb": (1280, 720),
    "pinterest": (1000, 1500),
    "a4-poster": (2480, 3508),
}

FONT_DIRS = [
    BUNDLED_FONT_DIR,
    os.path.expanduser("~/.fonts"),
    os.path.expanduser("~/Library/Fonts"),
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    "/Library/Fonts",
    "/System/Library/Fonts",
    "C:/Windows/Fonts",
]

BLEND_ALIASES = {
    "normal": "normal", "multiply": "multiply", "screen": "screen", "overlay": "overlay",
    "darken": "darken", "lighten": "lighten", "soft light": "soft light", "softlight": "soft light",
    "hard light": "hard light", "hardlight": "hard light", "color burn": "color burn",
    "color dodge": "color dodge", "linear burn": "linear burn", "linear dodge": "linear dodge",
    "difference": "difference", "exclusion": "exclusion", "hue": "hue", "saturation": "saturation",
    "color": "color", "luminosity": "luminosity",
}


# ----------------------------------------------------------------------------- helpers

def die(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


def parse_color(value, default=(0, 0, 0, 255)):
    """'#RGB', '#RRGGBB', '#RRGGBBAA', 'rgba(r,g,b,a)' or [r,g,b(,a)] -> (r,g,b,a)."""
    if value is None:
        return default
    if isinstance(value, (list, tuple)):
        v = list(value) + [255] * (4 - len(value))
        if isinstance(v[3], float) and v[3] <= 1.0:
            v[3] = int(round(v[3] * 255))
        return tuple(int(c) for c in v[:4])
    s = str(value).strip()
    m = re.match(r"rgba?\(([^)]+)\)", s, re.I)
    if m:
        parts = [p.strip() for p in m.group(1).split(",")]
        r, g, b = (int(float(p)) for p in parts[:3])
        a = 255
        if len(parts) > 3:
            a = float(parts[3])
            a = int(round(a * 255)) if a <= 1.0 else int(a)
        return (r, g, b, a)
    s = s.lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) == 6:
        s += "FF"
    if len(s) != 8:
        die("Bad color value: %r" % value)
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4, 6))


def hex_color(rgba):
    return "#%02X%02X%02X" % rgba[:3]


def pct(v, total):
    """Accept numbers or percentage strings like '50%'."""
    if isinstance(v, str) and v.strip().endswith("%"):
        return float(v.strip()[:-1]) / 100.0 * total
    return float(v)


def rect_of(layer, W, H):
    x = pct(layer.get("x", 0), W)
    y = pct(layer.get("y", 0), H)
    w = pct(layer.get("width", W - x), W)
    h = pct(layer.get("height", H - y), H)
    return x, y, w, h


def safe_name(name):
    return re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_") or "layer"


# ----------------------------------------------------------------------------- fonts

def _read_postscript_name(path):
    """Read nameID 6 (PostScript name) straight from the TTF/OTF 'name' table."""
    try:
        with open(path, "rb") as f:
            data = f.read()
        tag = data[:4]
        offset = 0
        if tag == b"ttcf":  # font collection: use first font
            offset = struct.unpack(">I", data[12:16])[0]
        num_tables = struct.unpack(">H", data[offset + 4:offset + 6])[0]
        pos = offset + 12
        name_off = None
        for _ in range(num_tables):
            t, _cs, off, _ln = struct.unpack(">4sIII", data[pos:pos + 16])
            if t == b"name":
                name_off = off
                break
            pos += 16
        if name_off is None:
            return None
        count, string_off = struct.unpack(">HH", data[name_off + 2:name_off + 6])
        best = None
        for i in range(count):
            rec = name_off + 6 + i * 12
            pid, eid, lid, nid, ln, so = struct.unpack(">HHHHHH", data[rec:rec + 12])
            if nid != 6:
                continue
            raw = data[name_off + string_off + so:name_off + string_off + so + ln]
            if pid == 3 or (pid == 0):
                val = raw.decode("utf-16-be", "ignore")
                best = val  # prefer windows/unicode entry
                if pid == 3:
                    break
            elif best is None:
                best = raw.decode("latin-1", "ignore")
        return best
    except Exception:
        return None


def find_font_file(spec):
    """spec may be a path, a bundled name (Poppins-Bold), or a system font name."""
    if not spec:
        spec = "Poppins-Bold"
    if os.path.isfile(spec):
        return spec
    candidates = [spec, spec + ".ttf", spec + ".otf", spec + ".TTF", spec + ".OTF"]
    for d in FONT_DIRS:
        if not os.path.isdir(d):
            continue
        for root, _dirs, files in os.walk(d):
            lower = {f.lower(): f for f in files}
            for c in candidates:
                if c.lower() in lower:
                    return os.path.join(root, lower[c.lower()])
    # loose match: strip spaces, compare
    key = re.sub(r"[\s_-]", "", spec).lower()
    for d in FONT_DIRS:
        if not os.path.isdir(d):
            continue
        for root, _dirs, files in os.walk(d):
            for f in files:
                if f.lower().endswith((".ttf", ".otf")) and re.sub(r"[\s_-]", "", f).lower().startswith(key):
                    return os.path.join(root, f)
    return None


_font_cache = {}

# Unicode block -> keywords to look for in system font file names
SCRIPT_HINTS = [
    ((0x0980, 0x09FF), ["Bengali", "Bangla", "Kalpurush", "SolaimanLipi", "Nikosh", "SiyamRupali", "Mukti"]),
    ((0x0900, 0x097F), ["Devanagari", "Mangal", "Kohinoor"]),
    ((0x0600, 0x06FF), ["Arabic", "Naskh", "Amiri", "Cairo", "Tajawal"]),
    ((0x0590, 0x05FF), ["Hebrew"]),
    ((0x0E00, 0x0E7F), ["Thai"]),
    ((0x0400, 0x04FF), ["DejaVuSans", "NotoSans-", "Roboto", "Arial"]),
    ((0x0370, 0x03FF), ["DejaVuSans", "NotoSans-", "Arial"]),
    ((0x0A80, 0x0AFF), ["Gujarati"]),
    ((0x0B80, 0x0BFF), ["Tamil"]),
    ((0x0C00, 0x0C7F), ["Telugu"]),
    ((0x0C80, 0x0CFF), ["Kannada"]),
    ((0x0D00, 0x0D7F), ["Malayalam"]),
    ((0x0A00, 0x0A7F), ["Gurmukhi", "Punjabi"]),
    ((0x1000, 0x109F), ["Myanmar"]),
    ((0x3040, 0x30FF), ["JP", "Japanese", "Gothic", "CJK"]),
    ((0xAC00, 0xD7AF), ["KR", "Korean", "CJK"]),
    ((0x4E00, 0x9FFF), ["SC", "TC", "CJK", "wqy"]),
]


def _font_covers(path, text):
    """True if the font file has glyphs for every non-space char (needs fontTools; else assume yes)."""
    try:
        from fontTools.ttLib import TTFont
    except Exception:
        return True
    try:
        cmap = TTFont(path, lazy=True).getBestCmap() or {}
        return all(ord(ch) in cmap for ch in text if not ch.isspace())
    except Exception:
        return True


def _find_font_for_script(text):
    for (lo, hi), keys in SCRIPT_HINTS:
        if any(lo <= ord(ch) <= hi for ch in text):
            for d in FONT_DIRS:
                if not os.path.isdir(d):
                    continue
                for root, _dirs, files in os.walk(d):
                    for f in sorted(files):
                        if f.lower().endswith((".ttf", ".otf", ".ttc")) and any(k.lower() in f.lower() for k in keys):
                            if _font_covers(os.path.join(root, f), text):
                                return os.path.join(root, f)
    return None


def load_font(spec, size, text=""):
    path = find_font_file(spec)
    if path and text and not _font_covers(path, text):
        alt = _find_font_for_script(text)
        if alt:
            print("NOTE: %r lacks glyphs for this text, using %s" % (spec, os.path.basename(alt)), file=sys.stderr)
            path = alt
        else:
            print("WARNING: %r lacks glyphs for some characters; pass a font that supports this script" % spec, file=sys.stderr)
    if path is None:
        fallback = os.path.join(BUNDLED_FONT_DIR, "Poppins-Bold.ttf")
        print("WARNING: font %r not found, using bundled Poppins-Bold" % spec, file=sys.stderr)
        path = fallback if os.path.isfile(fallback) else None
    key = (path, size)
    if key not in _font_cache:
        if path is None:
            _font_cache[key] = (ImageFont.load_default(), None, "ArialMT")
        else:
            font = ImageFont.truetype(path, int(round(size)))
            ps = _read_postscript_name(path)
            if not ps:
                fam, sty = font.getname()
                ps = "%s-%s" % (fam.replace(" ", ""), sty.replace(" ", ""))
            _font_cache[key] = (font, path, ps)
    return _font_cache[key]


# ----------------------------------------------------------------------------- drawing

def fit_image(img, w, h, mode):
    w, h = max(1, int(round(w))), max(1, int(round(h)))
    img = img.convert("RGBA")
    if mode == "stretch":
        return img.resize((w, h), Image.LANCZOS)
    if mode == "none":
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(img, ((w - img.width) // 2, (h - img.height) // 2))
        return canvas
    scale = max(w / img.width, h / img.height) if mode == "cover" else min(w / img.width, h / img.height)
    nw, nh = max(1, int(round(img.width * scale))), max(1, int(round(img.height * scale)))
    img = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(img, ((w - nw) // 2, (h - nh) // 2))
    return canvas


def rounded_mask(w, h, radius):
    w, h = int(round(w)), int(round(h))
    scale = 4
    m = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius=int(radius * scale), fill=255)
    return m.resize((w, h), Image.LANCZOS)


def gradient_image(w, h, stops, angle):
    """Linear gradient. angle 0 = left->right, 90 = top->bottom."""
    w, h = max(1, int(round(w))), max(1, int(round(h)))
    a = math.radians(angle)
    dx, dy = math.cos(a), math.sin(a)
    # project corners to find span
    corners = [(0, 0), (w, 0), (0, h), (w, h)]
    proj = [cx * dx + cy * dy for cx, cy in corners]
    pmin, pmax = min(proj), max(proj)
    span = (pmax - pmin) or 1.0
    stops = sorted(stops, key=lambda s: s[0])
    if np is not None:
        ys, xs = np.mgrid[0:h, 0:w]
        t = ((xs * dx + ys * dy) - pmin) / span
        t = np.clip(t, 0, 1)
        out = np.zeros((h, w, 4), dtype=np.float32)
        pos = [s[0] for s in stops]
        for ch in range(4):
            vals = [s[1][ch] for s in stops]
            out[..., ch] = np.interp(t, pos, vals)
        return Image.fromarray(out.astype(np.uint8), "RGBA")
    # slow fallback without numpy: draw line by line along the gradient axis
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = min(1.0, max(0.0, ((x * dx + y * dy) - pmin) / span))
            # find segment
            for i in range(len(stops) - 1):
                p0, c0 = stops[i]
                p1, c1 = stops[i + 1]
                if t <= p1 or i == len(stops) - 2:
                    f = 0 if p1 == p0 else (t - p0) / (p1 - p0)
                    f = min(1.0, max(0.0, f))
                    px[x, y] = tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(4))
                    break
    return img


def wrap_text(text, font, max_width, tracking_px):
    lines = []
    for para in text.split("\n"):
        words = para.split(" ")
        cur = ""
        for word in words:
            trial = word if not cur else cur + " " + word
            if max_width is None or measure(trial, font, tracking_px) <= max_width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def measure(s, font, tracking_px):
    if not s:
        return 0.0
    return font.getlength(s) + tracking_px * max(0, len(s) - 1)


def draw_line(draw, x, y_base, s, font, fill, tracking_px):
    if abs(tracking_px) < 0.01:
        draw.text((x, y_base), s, font=font, fill=fill, anchor="ls")
        return
    cx = x
    for ch in s:
        draw.text((cx, y_base), ch, font=font, fill=fill, anchor="ls")
        cx += font.getlength(ch) + tracking_px


def render_text_layer(layer, W, H):
    size = float(layer.get("size", 64))
    text_for_font = str(layer.get("text", ""))
    font, font_path, ps_name = load_font(layer.get("font", "Poppins-Bold"), size, text_for_font)
    color = parse_color(layer.get("color", "#FFFFFF"))
    align = layer.get("align", "left")
    line_height = float(layer.get("lineHeight", 1.15))
    tracking = float(layer.get("tracking", 0))          # 1/1000 em, like Photoshop
    tracking_px = tracking / 1000.0 * size
    x = pct(layer.get("x", 0), W)
    y = pct(layer.get("y", 0), H)
    box_w = layer.get("width")
    box_w = pct(box_w, W) if box_w is not None else None
    text = str(layer.get("text", ""))
    if layer.get("uppercase"):
        text = text.upper()
    lines = wrap_text(text, font, box_w, tracking_px)
    ascent, descent = font.getmetrics()
    advance = size * line_height
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    baseline0 = y + ascent
    widths = [measure(s, font, tracking_px) for s in lines]
    ref_w = box_w if box_w is not None else max(widths + [0])
    if box_w is None:
        # without a wrap width, x is the anchor point: left edge, center, or right edge
        if align == "center":
            x = x - ref_w / 2.0
        elif align == "right":
            x = x - ref_w
    for i, s in enumerate(lines):
        lw = widths[i]
        if align == "center":
            lx = x + (ref_w - lw) / 2.0
        elif align == "right":
            lx = x + ref_w - lw
        else:
            lx = x
        draw_line(draw, lx, baseline0 + i * advance, s, font, color, tracking_px)
    # anchor for the PSD point-text origin
    if align == "center":
        origin_x = x + ref_w / 2.0
    elif align == "right":
        origin_x = x + ref_w
    else:
        origin_x = x
    meta = {
        "rotate": float(layer.get("rotate", 0)),
        "text": "\n".join(lines),
        "font": ps_name,
        "fontFile": font_path,
        "size": size,
        "color": hex_color(color),
        "align": align,
        "leading": size * line_height,
        "tracking": tracking,
        "originX": origin_x,
        "baselineY": baseline0,
        "box": [x, y, (box_w if box_w is not None else ref_w), len(lines) * advance],
    }
    return img, meta


def render_shape_layer(layer, W, H):
    x, y, w, h = rect_of(layer, W, H)
    t = layer["type"]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if t == "gradient":
        if "stops" in layer:
            stops = [(float(s[0]), parse_color(s[1])) for s in layer["stops"]]
        else:
            stops = [(0.0, parse_color(layer.get("from", "#000000"))), (1.0, parse_color(layer.get("to", "#00000000")))]
        g = gradient_image(w, h, stops, float(layer.get("angle", 90)))
        if layer.get("radius"):
            g.putalpha(ImageChops.multiply(g.getchannel("A"), rounded_mask(w, h, layer["radius"])))
        img.paste(g, (int(round(x)), int(round(y))), g)
        return img
    color = parse_color(layer.get("color", "#FFFFFF"))
    scale = 4  # supersample for smooth edges
    shp = Image.new("RGBA", (max(1, int(round(w * scale))), max(1, int(round(h * scale)))), (0, 0, 0, 0))
    d = ImageDraw.Draw(shp)
    box = [0, 0, shp.width - 1, shp.height - 1]
    if t == "ellipse":
        d.ellipse(box, fill=color)
    else:
        r = float(layer.get("radius", 0)) * scale
        if r > 0:
            d.rounded_rectangle(box, radius=int(r), fill=color)
        else:
            d.rectangle(box, fill=color)
    stroke = layer.get("stroke")
    if stroke:
        sw = int(float(stroke.get("width", 4)) * scale)
        sc = parse_color(stroke.get("color", "#FFFFFF"))
        if t == "ellipse":
            d.ellipse(box, outline=sc, width=sw)
        else:
            r = float(layer.get("radius", 0)) * scale
            d.rounded_rectangle(box, radius=int(r), outline=sc, width=sw) if r > 0 else d.rectangle(box, outline=sc, width=sw)
    shp = shp.resize((max(1, int(round(w))), max(1, int(round(h)))), Image.LANCZOS)
    img.paste(shp, (int(round(x)), int(round(y))), shp)
    return img


def render_image_layer(layer, W, H, base_dir):
    src = layer.get("src")
    if not src:
        die("image layer %r has no 'src'" % layer.get("name"))
    path = src if os.path.isabs(src) else os.path.join(base_dir, src)
    if not os.path.isfile(path):
        die("image file not found: %s" % path)
    src_img = Image.open(path).convert("RGBA")
    x, y, w, h = rect_of(layer, W, H)
    if layer.get("width") is None and layer.get("height") is None:
        w, h = src_img.width * float(layer.get("scale", 1)), src_img.height * float(layer.get("scale", 1))
    fitted = fit_image(src_img, w, h, layer.get("fit", "cover"))
    if layer.get("flip"):
        fitted = fitted.transpose(Image.FLIP_LEFT_RIGHT)
    if layer.get("radius"):
        fitted.putalpha(ImageChops.multiply(fitted.getchannel("A"), rounded_mask(fitted.width, fitted.height, layer["radius"])))
    if layer.get("cleanEdges"):
        # kill halos, fringe and visible selection outlines: erode the alpha edge, then feather it
        ce = layer["cleanEdges"]
        erode = int(ce.get("erode", 2)) if isinstance(ce, dict) else int(ce)
        feather = float(ce.get("feather", 1.0)) if isinstance(ce, dict) else 1.0
        a = fitted.getchannel("A")
        a = a.point(lambda v: 255 if v > 128 else 0)          # hard edge first
        if erode > 0:
            a = a.filter(ImageFilter.MinFilter(2 * erode + 1))  # shrink by `erode` px
        if feather > 0:
            a = a.filter(ImageFilter.GaussianBlur(feather))
        fitted.putalpha(a)
    if layer.get("blur"):
        fitted = fitted.filter(ImageFilter.GaussianBlur(float(layer["blur"])))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    img.paste(fitted, (int(round(x)), int(round(y))), fitted)
    return img


def make_shadow(layer_img, shadow):
    """Bake a drop shadow from a layer's alpha (used for preview + Python fallback)."""
    color = parse_color(shadow.get("color", "#000000"))
    opacity = float(shadow.get("opacity", 0.5))
    distance = float(shadow.get("distance", 10))
    angle = float(shadow.get("angle", 120))
    blur = float(shadow.get("blur", shadow.get("size", 20)))
    dx = -math.cos(math.radians(angle)) * distance
    dy = math.sin(math.radians(angle)) * distance
    alpha = layer_img.getchannel("A")
    if blur > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(blur / 2.0))
    alpha = alpha.point(lambda v: int(v * opacity))
    shifted = ImageChops.offset(alpha, int(round(dx)), int(round(dy)))
    sh = Image.new("RGBA", layer_img.size, color[:3] + (0,))
    sh.putalpha(shifted)
    return sh


def composite(base, layer_img, opacity, blend):
    """Composite RGBA layer onto RGBA base with opacity and (approximate) blend mode."""
    if opacity < 1.0:
        a = layer_img.getchannel("A").point(lambda v: int(v * opacity))
        layer_img = layer_img.copy()
        layer_img.putalpha(a)
    blend = BLEND_ALIASES.get(str(blend).lower(), "normal")
    if blend == "normal" or np is None:
        if blend != "normal":
            print("NOTE: blend mode %r previewed as normal (numpy not installed)" % blend, file=sys.stderr)
        return Image.alpha_composite(base, layer_img)
    b = np.asarray(base).astype(np.float32) / 255.0
    l = np.asarray(layer_img).astype(np.float32) / 255.0
    br, lr = b[..., :3], l[..., :3]
    if blend == "multiply":
        mixed = br * lr
    elif blend == "screen":
        mixed = 1 - (1 - br) * (1 - lr)
    elif blend == "overlay":
        mixed = np.where(br <= 0.5, 2 * br * lr, 1 - 2 * (1 - br) * (1 - lr))
    elif blend == "soft light":
        mixed = (1 - 2 * lr) * br * br + 2 * lr * br
    elif blend == "hard light":
        mixed = np.where(lr <= 0.5, 2 * br * lr, 1 - 2 * (1 - br) * (1 - lr))
    elif blend == "darken":
        mixed = np.minimum(br, lr)
    elif blend == "lighten":
        mixed = np.maximum(br, lr)
    elif blend == "difference":
        mixed = np.abs(br - lr)
    elif blend == "color dodge":
        mixed = np.where(lr >= 1, 1, np.minimum(1, br / np.maximum(1 - lr, 1e-6)))
    elif blend == "color burn":
        mixed = np.where(lr <= 0, 0, 1 - np.minimum(1, (1 - br) / np.maximum(lr, 1e-6)))
    elif blend == "linear dodge":
        mixed = np.minimum(1, br + lr)
    elif blend == "linear burn":
        mixed = np.maximum(0, br + lr - 1)
    else:
        print("NOTE: blend mode %r previewed as normal" % blend, file=sys.stderr)
        return Image.alpha_composite(base, layer_img)
    # where the base is transparent, use the layer color directly
    ba = b[..., 3:4]
    mixed = mixed * ba + lr * (1 - ba)
    la = l[..., 3:4]
    out_rgb = br * (1 - la) + mixed * la
    out_a = ba + la * (1 - ba)
    out = np.concatenate([out_rgb, out_a], axis=-1)
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")




def build_mask(mask_spec, layer_img, W, H, base_dir):
    """Return an L-mode mask image (255 = visible) covering the full canvas."""
    bbox = layer_img.getchannel("A").getbbox() or (0, 0, W, H)
    l, t, r, b = bbox
    m = Image.new("L", (W, H), 255)
    if "src" in mask_spec:
        path = mask_spec["src"]
        path = path if os.path.isabs(path) else os.path.join(base_dir, path)
        mm = Image.open(path).convert("L").resize((r - l, b - t), Image.LANCZOS)
        m.paste(mm, (l, t))
        return m
    mtype = mask_spec.get("type", "fade")
    if mtype == "fade":
        angle = float(mask_spec.get("angle", 90))   # 90 = fades out downward
        start = float(mask_spec.get("start", 0.5))  # where the fade begins (0..1 across the bbox)
        end = float(mask_spec.get("end", 1.0))
        stops = [(0.0, (255, 255, 255, 255)), (max(0.0, min(start, 0.999)), (255, 255, 255, 255)),
                 (max(start + 0.001, min(end, 1.0)), (0, 0, 0, 255)), (1.0, (0, 0, 0, 255))]
        g = gradient_image(r - l, b - t, stops, angle).convert("L")
        m.paste(g, (l, t))
    elif mtype == "ellipse":
        feather = float(mask_spec.get("feather", 40))
        e = Image.new("L", (r - l, b - t), 0)
        ImageDraw.Draw(e).ellipse([0, 0, r - l - 1, b - t - 1], fill=255)
        if feather > 0:
            e = e.filter(ImageFilter.GaussianBlur(feather))
        m.paste(e, (l, t))
        m = ImageChops.darker(m, Image.new("L", (W, H), 255))
        full = Image.new("L", (W, H), 0)
        full.paste(m.crop(bbox), (l, t))
        return full
    elif mtype == "rect":
        feather = float(mask_spec.get("feather", 30))
        inset = float(mask_spec.get("inset", 0))
        e = Image.new("L", (r - l, b - t), 0)
        ImageDraw.Draw(e).rectangle([inset, inset, r - l - 1 - inset, b - t - 1 - inset], fill=255)
        if feather > 0:
            e = e.filter(ImageFilter.GaussianBlur(feather))
        full = Image.new("L", (W, H), 0)
        full.paste(e, (l, t))
        return full
    return m


def apply_rotate(img, layer, W, H):
    deg = float(layer.get("rotate", 0))
    if not deg:
        return img
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return img
    cx, cy = (bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0
    return img.rotate(deg, resample=Image.BICUBIC, center=(cx, cy))

# ----------------------------------------------------------------------------- QA checks

def _lum(c):
    def ch(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def contrast_ratio(c1, c2):
    l1, l2 = _lum(c1), _lum(c2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def bbox_overlap(a, b):
    """Return overlap area of two (l, t, r, b) boxes."""
    l, t = max(a[0], b[0]), max(a[1], b[1])
    r, btm = min(a[2], b[2]), min(a[3], b[3])
    return max(0, r - l) * max(0, btm - t)


def background_under(preview, bbox, alpha):
    """Average color of the composite behind a layer's opaque pixels (what the text sits on)."""
    region = preview.crop(bbox).convert("RGB")
    mask = alpha.crop(bbox)
    if np is not None:
        arr = np.asarray(region).astype(np.float32)
        m = np.asarray(mask) > 40
        if m.sum() < 10:
            m = np.ones(m.shape, dtype=bool)
        sel = arr[m]
        return tuple(int(v) for v in sel.mean(axis=0))
    stat = region.resize((1, 1), Image.BOX).getpixel((0, 0))
    return tuple(stat[:3])


def run_qa(records, W, H):
    """records: list of dicts {name, type, group, bbox, box, color, bg, hidden}. Returns warnings."""
    warns = []
    texts = [r for r in records if r["type"] == "text" and not r["hidden"] and r["bbox"]]
    images = [r for r in records if r["type"] == "image" and not r["hidden"] and r["bbox"]
              and (r["bbox"][2] - r["bbox"][0]) * (r["bbox"][3] - r["bbox"][1]) < 0.40 * W * H]  # backgrounds/heroes excluded; contrast check covers text on them
    for i, t in enumerate(texts):
        l, tp, r, b = t["bbox"]
        if l < 0 or tp < 0 or r > W or b > H:
            warns.append("OFF-CANVAS: text '%s' runs outside the canvas" % t["name"])
        if t["box"] and (r - l) > t["box"][2] + 2:
            warns.append("TOO WIDE: text '%s' is wider than its width box (%dpx > %dpx) - a word does not fit; lower size or widen" % (t["name"], r - l, t["box"][2]))
        if t.get("bg") is not None and t.get("color") is not None:
            cr = contrast_ratio(t["color"], t["bg"])
            if cr < 2.5:
                warns.append("LOW CONTRAST: text '%s' %s on background ~#%02X%02X%02X (ratio %.1f) - change the text color or add a solid shape behind it" % (t["name"], hex_color(t["color"] + (255,)), t["bg"][0], t["bg"][1], t["bg"][2], cr))
        for u in texts[i + 1:]:
            ov = bbox_overlap(t["bbox"], u["bbox"])
            if ov > 0.03 * min((r - l) * (b - tp), (u["bbox"][2] - u["bbox"][0]) * (u["bbox"][3] - u["bbox"][1])):
                warns.append("OVERLAP: text '%s' overlaps text '%s' - move one or reduce size" % (t["name"], u["name"]))
        for im in images:
            ov = bbox_overlap(t["bbox"], im["bbox"])
            if ov > 0.15 * (r - l) * (b - tp):
                warns.append("OVERLAP: text '%s' sits on image '%s' - move the text or the image" % (t["name"], im["name"]))
    return warns

# ----------------------------------------------------------------------------- main

def expand_background(layout):
    bg = layout.get("background")
    if not bg:
        return []
    if isinstance(bg, str):
        bg = {"type": "color", "color": bg}
    t = bg.get("type", "color")
    if t == "color":
        return [{"type": "rect", "name": "Background", "x": 0, "y": 0, "width": layout["width"], "height": layout["height"], "color": bg.get("color", "#FFFFFF")}]
    if t == "gradient":
        d = {"type": "gradient", "name": "Background", "x": 0, "y": 0, "width": layout["width"], "height": layout["height"]}
        for k in ("from", "to", "stops", "angle"):
            if k in bg:
                d[k] = bg[k]
        return [d]
    if t == "image":
        return [{"type": "image", "name": "Background", "src": bg["src"], "fit": bg.get("fit", "cover"), "x": 0, "y": 0, "width": layout["width"], "height": layout["height"], "blur": bg.get("blur", 0)}]
    die("unknown background type %r" % t)


def expand_grid(layer, W, H):
    """Expand a `grid` layer into per-card layers (each card gets its own group)."""
    x, y, w, h = rect_of(layer, W, H)
    cols = int(layer.get("cols", 3))
    items = layer.get("items", [])
    rows = int(layer.get("rows", max(1, -(-len(items) // cols))))
    gap = float(layer.get("gap", 16))
    cw = (w - gap * (cols - 1)) / cols
    ch = (h - gap * (rows - 1)) / rows
    card = layer.get("card", {})
    title = layer.get("title", {})
    price = layer.get("price", {})
    note = layer.get("note", {})
    pad = float(layer.get("padding", cw * 0.06))
    gname = layer.get("name", "Grid")
    out = []
    for i, item in enumerate(items[:rows * cols]):
        r, c = divmod(i, cols)
        cx, cy = x + c * (cw + gap), y + r * (ch + gap)
        grp = "%s / %d %s" % (gname, i + 1, item.get("title", "").split("\n")[0][:18])
        # card background
        if card.get("color", "#FFFFFF") not in (None, "none"):
            d = {"type": "rect", "name": "Card", "x": cx, "y": cy, "width": cw, "height": ch,
                 "color": card.get("color", "#FFFFFF"), "radius": card.get("radius", 14), "group": grp}
            if card.get("stroke"):
                d["stroke"] = card["stroke"]
            if card.get("shadow"):
                d["shadow"] = card["shadow"]
            out.append(d)
        tsize = float(title.get("size", max(14, cw * 0.075)))
        tlines = int(title.get("lines", 2))
        title_h = tsize * float(title.get("lineHeight", 1.1)) * tlines
        psize = float(price.get("size", max(18, cw * 0.17)))
        price_h = psize * 1.35
        nsize = float(note.get("size", max(12, cw * 0.065)))
        any_note = any(it.get("note") for it in items)
        note_h = nsize * 1.4 if any_note else 0   # reserved on every card so prices line up
        note_gap = pad * 0.3 if any_note else 0
        # title (top)
        if item.get("title"):
            out.append({"type": "text", "name": "Title", "text": item["title"], "x": cx + pad, "y": cy + pad,
                        "width": cw - 2 * pad, "font": title.get("font", "Poppins-Bold"), "size": tsize,
                        "color": title.get("color", "#111111"), "align": title.get("align", "center"),
                        "lineHeight": title.get("lineHeight", 1.1), "uppercase": title.get("uppercase", False), "group": grp})
        # product image (middle band)
        img_top = cy + pad + title_h + pad * 0.5
        img_bottom = cy + ch - pad - price_h - note_h - note_gap - pad * 0.5
        if item.get("image") and img_bottom - img_top > 10:
            out.append({"type": "image", "name": "Product", "src": item["image"], "fit": "contain",
                        "x": cx + pad, "y": img_top, "width": cw - 2 * pad, "height": img_bottom - img_top, "group": grp})
        # price block (bottom)
        if item.get("price"):
            py = cy + ch - pad - price_h - note_h - note_gap
            if price.get("bg"):
                out.append({"type": "rect", "name": "Price tag", "x": cx + pad, "y": py, "width": cw - 2 * pad,
                            "height": price_h, "color": price["bg"], "radius": price.get("radius", 10), "group": grp})
            out.append({"type": "text", "name": "Price", "text": item["price"], "x": cx + pad, "y": py + price_h * 0.02,
                        "width": cw - 2 * pad, "font": price.get("font", "Poppins-Bold"), "size": psize,
                        "color": price.get("color", "#D62828"), "align": price.get("align", "center"), "group": grp})
        if item.get("note"):
            out.append({"type": "text", "name": "Note", "text": item["note"], "x": cx + pad, "y": cy + ch - pad - note_h + nsize * 0.1,
                        "width": cw - 2 * pad, "font": note.get("font", "Poppins-Medium"), "size": nsize,
                        "color": note.get("color", "#333333"), "align": note.get("align", "center"), "group": grp})
        if item.get("badge"):
            b = item["badge"]
            bs = float(layer.get("badgeSize", cw * 0.32))
            # sits over the right side of the image band, clear of the title and price
            bx = cx + cw - bs - pad * 0.4
            by = img_top + (img_bottom - img_top) * 0.5 - bs * 0.5
            out.append({"type": "ellipse", "name": "Badge", "x": bx, "y": by, "width": bs, "height": bs,
                        "color": layer.get("badgeColor", "#F9D23C"), "group": grp})
            out.append({"type": "text", "name": "Badge text", "text": b, "x": bx, "y": by + bs * 0.28, "width": bs,
                        "font": "Poppins-Bold", "size": bs * 0.22, "color": layer.get("badgeTextColor", "#111111"),
                        "align": "center", "lineHeight": 1.0, "group": grp})
    return out



def expand_scatter(layer, W, H):
    """Scatter copies of cutout images across an area with varied size/angle/blur (floating elements)."""
    import random
    rng = random.Random(layer.get("seed", 7))
    x, y, w, h = rect_of(layer, W, H)
    images = layer.get("images") or ([layer["src"]] if layer.get("src") else [])
    if not images:
        die("scatter layer %r needs 'images'" % layer.get("name"))
    count = int(layer.get("count", 8))
    smin, smax = layer.get("sizeRange", [90, 240])
    rmin, rmax = layer.get("rotateRange", [-35, 35])
    bmin, bmax = layer.get("blurRange", [0, 0])
    omin, omax = layer.get("opacityRange", [1.0, 1.0])
    avoid = layer.get("avoid")  # [cx, cy, radius] to keep clear (e.g. the hero face)
    gname = layer.get("name", "Scatter")
    out = []
    placed = []
    for i in range(count):
        src = images[i % len(images)]
        for _try in range(40):
            size = rng.uniform(smin, smax)
            px = rng.uniform(x, x + w - size)
            py = rng.uniform(y, y + h - size)
            cx, cy = px + size / 2, py + size / 2
            if avoid and (cx - avoid[0]) ** 2 + (cy - avoid[1]) ** 2 < (avoid[2] + size / 2) ** 2:
                continue
            if all((cx - q[0]) ** 2 + (cy - q[1]) ** 2 > ((size + q[2]) * 0.42) ** 2 for q in placed):
                break
        placed.append((cx, cy, size))
        out.append({"type": "image", "name": "%s %d" % (os.path.splitext(os.path.basename(src))[0].title(), i + 1),
                    "src": src, "fit": "contain", "x": px, "y": py, "width": size, "height": size,
                    "rotate": rng.uniform(rmin, rmax), "blur": rng.uniform(bmin, bmax),
                    "opacity": rng.uniform(omin, omax), "group": gname,
                    "cleanEdges": layer.get("cleanEdges", 2)})
    return out

def expand_layers(layers, W, H):
    out = []
    for layer in layers:
        if layer.get("type") == "grid":
            out.extend(expand_grid(layer, W, H))
        elif layer.get("type") == "scatter":
            out.extend(expand_scatter(layer, W, H))
        else:
            out.append(layer)
    return out


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    layout_path, out_dir = sys.argv[1], sys.argv[2]
    ensure_bundled_fonts()
    with open(layout_path, "r", encoding="utf-8") as f:
        layout = json.load(f)
    base_dir = os.path.dirname(os.path.abspath(layout_path))

    if "preset" in layout and layout["preset"] in PRESETS:
        layout.setdefault("width", PRESETS[layout["preset"]][0])
        layout.setdefault("height", PRESETS[layout["preset"]][1])
    W, H = int(layout.get("width", 1080)), int(layout.get("height", 1080))
    layout["width"], layout["height"] = W, H

    layers = expand_background(layout) + expand_layers(list(layout.get("layers", [])), W, H)
    if not layers:
        die("layout has no layers")

    layers_dir = os.path.join(out_dir, "layers")
    os.makedirs(layers_dir, exist_ok=True)
    preview = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out_layers = []
    used_fonts = {}
    qa_records = []

    for i, layer in enumerate(layers):
        t = layer.get("type", "image")
        name = layer.get("name") or "%s %d" % (t.capitalize(), i + 1)
        meta = None
        if t == "text":
            img, meta = render_text_layer(layer, W, H)
            if meta["fontFile"]:
                used_fonts[meta["font"]] = meta["fontFile"]
        elif t in ("rect", "ellipse", "gradient"):
            img = render_shape_layer(layer, W, H)
        elif t == "image":
            img = render_image_layer(layer, W, H, base_dir)
        else:
            die("unknown layer type %r" % t)

        img = apply_rotate(img, layer, W, H)
        if t != "image" and layer.get("blur"):
            img = img.filter(ImageFilter.GaussianBlur(float(layer["blur"])))
        opacity = float(layer.get("opacity", 1.0))
        blend = BLEND_ALIASES.get(str(layer.get("blend", "normal")).lower(), "normal")
        hidden = bool(layer.get("hidden", False))
        fname = "%02d_%s.png" % (i + 1, safe_name(name))
        entry = {
            "index": i + 1, "name": name, "type": t, "file": "layers/" + fname,
            "opacity": opacity, "blend": blend, "hidden": hidden, "group": layer.get("group"),
        }
        mask_img = None
        if layer.get("mask"):
            mask_img = build_mask(layer["mask"], img, W, H, base_dir)
            mname = "%02d_%s_mask.png" % (i + 1, safe_name(name))
            mask_img.save(os.path.join(layers_dir, mname), optimize=False)
            entry["mask"] = {"file": "layers/" + mname}
        img.save(os.path.join(layers_dir, fname), optimize=False)
        shadow = layer.get("shadow")
        if shadow:
            sh = make_shadow(img, shadow)
            sname = "%02d_%s_shadow.png" % (i + 1, safe_name(name))
            sh.save(os.path.join(layers_dir, sname), optimize=False)
            entry["shadow"] = {
                "file": "layers/" + sname,
                "color": hex_color(parse_color(shadow.get("color", "#000000"))),
                "opacity": float(shadow.get("opacity", 0.5)),
                "distance": float(shadow.get("distance", 10)),
                "angle": float(shadow.get("angle", 120)),
                "size": float(shadow.get("blur", shadow.get("size", 20))),
            }
            if not hidden:
                preview = composite(preview, sh, opacity, "normal")
        if meta:
            entry["text"] = meta
        alpha = img.getchannel("A")
        bbox = alpha.getbbox()
        rec = {"name": name, "type": t, "group": layer.get("group"), "bbox": bbox, "hidden": hidden,
               "box": meta["box"] if meta else None, "color": None, "bg": None}
        if meta and bbox and not hidden:
            rec["color"] = parse_color(layer.get("color", "#FFFFFF"))[:3]
            rec["bg"] = background_under(Image.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, 255)), preview), bbox, alpha)
        qa_records.append(rec)
        if not hidden:
            shown = img
            if mask_img is not None:
                shown = img.copy()
                shown.putalpha(ImageChops.multiply(img.getchannel("A"), mask_img))
            preview = composite(preview, shown, opacity, blend)
        out_layers.append(entry)
        print("rendered %s" % fname)

    preview_path = os.path.join(out_dir, "preview.png")
    preview.save(preview_path)
    # a flattened-on-white copy for the PSD composite
    flat = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    flat = Image.alpha_composite(flat, preview)
    flat.save(os.path.join(out_dir, "composite.png"))

    warnings = run_qa(qa_records, W, H)
    manifest = {
        "name": layout.get("name", "design"),
        "width": W, "height": H,
        "preview": "preview.png", "composite": "composite.png",
        "fonts": used_fonts,
        "qa": warnings,
        "layers": out_layers,
    }
    with open(os.path.join(out_dir, "layers.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("preview: %s" % preview_path)
    print("manifest: %s" % os.path.join(out_dir, "layers.json"))
    if warnings:
        print("\nQA: %d problem(s) to fix before building the PSD:" % len(warnings))
        for w in warnings:
            print("  - " + w)
    else:
        print("\nQA: no overlaps, contrast or overflow problems found")


if __name__ == "__main__":
    main()
