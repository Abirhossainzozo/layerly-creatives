#!/usr/bin/env python3
"""
gen_image.py - OPTIONAL helper: generate an image with an API key (Gemini "Nano Banana" or OpenAI).

Only useful where the script can reach the internet AND a key is set (Claude Code, Codex, a terminal).
In chat apps, generate images with the app's own image tool instead and save them next to layout.json.

Usage:
    python3 gen_image.py --prompt "studio photo of a green glass bottle, white background" --out product.png
    python3 gen_image.py --provider openai --size 1024x1536 --transparent --prompt "..." --out cutout.png
    python3 gen_image.py --provider gemini --aspect 4:5 --prompt "..." --out bg.png

Environment:
    GEMINI_API_KEY   -> provider gemini  (model from IMAGE_MODEL, default gemini-2.5-flash-image)
    OPENAI_API_KEY   -> provider openai  (model from IMAGE_MODEL, default gpt-image-1)
If a request fails with a model error, set IMAGE_MODEL to a current model name from the provider docs.
"""
import argparse
import base64
import json
import os
import sys
import urllib.request


def post_json(url, payload, headers):
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def gen_gemini(prompt, aspect, out):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY is not set")
    model = os.environ.get("IMAGE_MODEL", "gemini-2.5-flash-image")
    url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s" % (model, key)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    if aspect:
        payload["generationConfig"]["imageConfig"] = {"aspectRatio": aspect}
    data = post_json(url, payload, {"Content-Type": "application/json"})
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData")
            if inline and inline.get("data"):
                with open(out, "wb") as f:
                    f.write(base64.b64decode(inline["data"]))
                return
    sys.exit("No image in Gemini response: %s" % json.dumps(data)[:500])


def gen_openai(prompt, size, transparent, out):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY is not set")
    model = os.environ.get("IMAGE_MODEL", "gpt-image-1")
    payload = {"model": model, "prompt": prompt, "size": size or "1024x1024", "n": 1}
    if transparent:
        payload["background"] = "transparent"
        payload["output_format"] = "png"
    data = post_json("https://api.openai.com/v1/images/generations", payload,
                     {"Content-Type": "application/json", "Authorization": "Bearer " + key})
    try:
        b64 = data["data"][0]["b64_json"]
    except Exception:
        sys.exit("No image in OpenAI response: %s" % json.dumps(data)[:500])
    with open(out, "wb") as f:
        f.write(base64.b64decode(b64))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--provider", choices=["gemini", "openai"], default=None)
    ap.add_argument("--size", default=None, help="openai: 1024x1024, 1024x1536, 1536x1024")
    ap.add_argument("--aspect", default=None, help="gemini: 1:1, 4:5, 9:16, 16:9 ...")
    ap.add_argument("--transparent", action="store_true", help="openai: transparent background (cutouts)")
    a = ap.parse_args()
    provider = a.provider or ("gemini" if os.environ.get("GEMINI_API_KEY") else "openai" if os.environ.get("OPENAI_API_KEY") else None)
    if not provider:
        sys.exit("Set GEMINI_API_KEY or OPENAI_API_KEY (or generate the image in your chat app and save it instead).")
    if provider == "gemini":
        gen_gemini(a.prompt, a.aspect, a.out)
    else:
        gen_openai(a.prompt, a.size, a.transparent, a.out)
    print("saved", a.out)


if __name__ == "__main__":
    main()
