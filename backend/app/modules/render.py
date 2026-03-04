"""Generate a photorealistic lamp render using OpenAI gpt-image-1."""
import base64
from pathlib import Path

import openai

from .. import config


def generate(lineart_path: Path, reference_path: Path, prompt: str) -> bytes:
    """Accept line art + reference photo, return PNG bytes of the render."""
    client = openai.OpenAI(api_key=config.OPENAI_API_KEY)

    images = [open(lineart_path, "rb")]
    if reference_path.exists():
        images.append(open(reference_path, "rb"))

    try:
        response = client.images.edit(
            model="gpt-image-1",
            image=images,
            prompt=prompt,
        )
    finally:
        for f in images:
            f.close()

    return base64.b64decode(response.data[0].b64_json)
