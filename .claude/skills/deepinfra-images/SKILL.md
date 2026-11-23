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
python3 scripts/generate_image.py "<prompt>" [--size 1024x1024] [--model black-forest-labs/FLUX-2-pro] [--out images/generated/<name>.png]
```

- Default model: `black-forest-labs/FLUX-2-pro` (about $0.015 per image, the best text and detail of the cheap options tested). Keep each image under $0.10. For a faster, cheaper draft, pass `--model black-forest-labs/FLUX-1-schnell`. Check the model's page on deepinfra.com for current prices before a batch.
- Default output: `images/generated/<date>-<prompt-slug>.png`. Pass `--out` to name it.
- The script prints the saved path. Show it to the user.

## Rules for this repo

- Label generated images as AI-generated wherever they appear on a page.
- Never present a generated image as a photo of Erdem or of a real customer.
- Image costs are per image and set by DeepInfra. Do not generate in a loop; one image per request unless the user asks for more.
- To use an image on a page, reference the saved file path in the HTML and commit it with the page.

- Text in images is often misspelled, especially URLs. Put exact words (names, URLs, prices) in real HTML text beside the image, not only inside it.
