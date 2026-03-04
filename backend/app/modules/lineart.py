"""Generate line art from a photo using OpenAI gpt-image-1."""
import base64
from pathlib import Path

import openai

from .. import config


def generate(image_path: Path, prompt: str) -> bytes:
    """Accept a photo path, return PNG bytes of the line art version."""
    client = openai.OpenAI(api_key=config.OPENAI_API_KEY)

    with open(image_path, "rb") as f:
        response = client.images.edit(
            model="gpt-image-1",
            image=f,
            prompt=prompt,
        )

    return base64.b64decode(response.data[0].b64_json)
