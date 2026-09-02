#!/usr/bin/env python3
"""
fetch_reference.py - download a reference/product image from a URL (needs internet access).

Usage:
    python3 fetch_reference.py <url> <out_file>

Works in terminals and agents with network access (Claude Code, Codex CLI). ChatGPT's Python
sandbox has no internet: there, open the link with the browsing tool and view it, or ask the
user to upload the file. Saves the image as given (jpg/png/webp); convert with Pillow if needed.
"""
import sys
import urllib.request


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    url, out = sys.argv[1], sys.argv[2]
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (psd-builder)"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            ctype = resp.headers.get("Content-Type", "")
    except Exception as e:
        sys.exit("Could not download %s (%s). No internet here, or the link needs a login - ask the user to upload the image." % (url, e))
    if "text/html" in ctype:
        sys.exit("The link is a web page, not an image. Open it in a browser/browsing tool and save the design image, or ask the user to upload it.")
    with open(out, "wb") as f:
        f.write(data)
    print("saved %s (%d KB, %s)" % (out, len(data) // 1024, ctype))


if __name__ == "__main__":
    main()
