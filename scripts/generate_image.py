#!/usr/bin/env python3
"""Generate one image with DeepInfra's OpenAI-compatible images endpoint.

Usage:
  DEEPINFRA_API_KEY=... python3 scripts/generate_image.py "a prompt" [--size 1024x1024] [--model ID] [--out PATH]

Standard library only. The key is read from DEEPINFRA_API_KEY, or from Azure Key Vault
(dp-kv-deliverypilot, secret deepinfra-api-key) when that is not set. It is never printed or written to disk.
Default output: images/generated/<date>-<prompt-slug>.png
"""
import argparse
import base64
import datetime
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

URL = "https://api.deepinfra.com/v1/openai/images/generations"


def key_from_vault():
    """Read the DeepInfra key from Azure Key Vault (dp-kv-deliverypilot, secret deepinfra-api-key).

    The value is returned to the caller only; it is never printed or written to disk.
    """
    try:
        out = subprocess.run(
            ["az", "keyvault", "secret", "show", "--vault-name", "dp-kv-deliverypilot",
             "-n", "deepinfra-api-key", "--query", "value", "-o", "tsv"],
            capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return out.stdout.strip() or None


def main():
    p = argparse.ArgumentParser(description="Generate an image with DeepInfra")
    p.add_argument("prompt")
    p.add_argument("--size", default="1024x1024")
    p.add_argument("--model", default="black-forest-labs/FLUX-2-pro")
    p.add_argument("--out", help="output file path (.png)")
    a = p.parse_args()

    key = os.environ.get("DEEPINFRA_API_KEY") or key_from_vault()
    if not key:
        sys.exit("Set DEEPINFRA_API_KEY, or sign in to Azure (az login) so the key can be read from Key Vault.")

    body = json.dumps({
        "model": a.model,
        "prompt": a.prompt,
        "size": a.size,
        "n": 1,
        "response_format": "b64_json",
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"DeepInfra error {e.code}: {e.read()[:300].decode(errors='replace')}")

    item = (data.get("data") or [{}])[0]
    if item.get("b64_json"):
        raw = base64.b64decode(item["b64_json"])
    elif item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=180) as r:
            raw = r.read()
    else:
        sys.exit("No image in the DeepInfra response.")

    if a.out:
        out = pathlib.Path(a.out)
    else:
        slug = re.sub(r"[^a-z0-9]+", "-", a.prompt.lower()).strip("-")[:40] or "image"
        out = pathlib.Path("images/generated") / f"{datetime.date.today()}-{slug}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(raw)
    print(out)


if __name__ == "__main__":
    main()
