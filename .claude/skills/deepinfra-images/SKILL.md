---
name: deepinfra-images
description: Generate images (illustrations, thumbnails, cover art, diagrams-as-pictures) with DeepInfra's FLUX models. Use when the user asks to create, make or generate an image or picture for this site or a video.
---

# DeepInfra image generation

Generates one PNG per call with `scripts/generate_image.py`, using DeepInfra's OpenAI-compatible images endpoint.

## Before you run it

1. The key must be in the environment as `DEEPINFRA_API_KEY`. Never write the key into a file, a command you echo, a commit or a chat reply. If it is missing, tell the user to run `export DEEPINFRA_API_KEY=...` in their shell (or `! export ...` in this session) and stop.
2. Write the prompt in plain English and describe the subject, style and composition. Avoid real people's names, logos and brand marks.

## Run it

```
python3 scripts/generate_image.py "<prompt>" [--size 1024x1024] [--model black-forest-labs/FLUX-1-schnell] [--out images/generated/<name>.png]
```

- Default model: `black-forest-labs/FLUX-1-schnell` (fast, cheap). For higher quality, pass another FLUX model ID from DeepInfra, such as `black-forest-labs/FLUX-1.1-pro` or `black-forest-labs/FLUX-2-pro`. Check the model's own page on deepinfra.com for its ID and price.
- Default output: `images/generated/<date>-<prompt-slug>.png`. Pass `--out` to name it.
- The script prints the saved path. Show it to the user.

## Rules for this repo

- Label generated images as AI-generated wherever they appear on a page.
- Never present a generated image as a photo of Erdem or of a real customer.
- Image costs are per image and set by DeepInfra. Do not generate in a loop; one image per request unless the user asks for more.
- To use an image on a page, reference the saved file path in the HTML and commit it with the page.
