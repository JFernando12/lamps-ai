"""
Test script: generate line art from photos using different prompts and quality levels.
Results saved to backend/testing/output/
Usage: uv run python -m testing.test_lineart_prompts  (from backend/ folder)
"""
import base64
import concurrent.futures
import os
import time
from pathlib import Path

import openai
from dotenv import load_dotenv

load_dotenv()

client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

PHOTOS_DIR = Path(__file__).parent / "photos"
OUTPUT_DIR = Path(__file__).parent / "output"

OUTPUT_DIR.mkdir(exist_ok=True)

PHOTOS = sorted(PHOTOS_DIR.glob("*.jpg"))

# ── Prompts ────────────────────────────────────────────────────────────────────

PROMPTS = {
    "A_contour_lines": (
        "Convert this photo into a clean black and white line art drawing. "
        "IMPORTANT: ignore the background completely — only draw the people in the foreground. "
        "Use only thin black lines on a pure white background — no fills, no shading, no gray tones. "
        "Trace the exact outer silhouette of the people: every curve of the hair, face, shoulders, arms and body. "
        "Pay special attention to the faces: draw them with care and accuracy — "
        "precise eye shape, nose bridge, lips, jawline and facial proportions must look attractive and faithful to the photo. "
        "Also draw internal detail lines for hair strands, clothing folds and fingers. "
        "The result must look like a skilled artist's contour illustration. "
        "White background, black lines only, no background elements whatsoever."
    ),
    "B_clean_faces": (
        "Convert this photo into a clean black and white line art drawing. "
        "IMPORTANT: ignore the background completely — only draw the people in the foreground. "
        "Use only thin black lines on a pure white background — no fills, no shading, no gray tones. "
        "Trace the exact outer silhouette of the people: every curve of the hair, face, shoulders, arms and body. "
        "For the faces, draw ONLY the essential defining lines: clean jaw and face outline, elegant almond-shaped eyes, "
        "minimal nose (just the tip and nostrils), clean lip contour. "
        "DO NOT draw wrinkles, expression lines, laugh lines, crow's feet, forehead lines, skin texture or any aging marks. "
        "The face must look smooth, youthful and flattering — like a skilled portrait illustrator who idealized the subject slightly. "
        "Hair: flowing detailed strokes following the hair direction. "
        "Body: clean clothing edges and silhouette lines. "
        "The result must look elegant and attractive. White background, black lines only, no background elements."
    ),
}

QUALITIES = ["high"]

# ── Worker function ────────────────────────────────────────────────────────────

def run_one(photo: Path, prompt_name: str, prompt_text: str, quality: str) -> str:
    out_name = f"{photo.stem}__{prompt_name}__q{quality}.png"
    out_path = OUTPUT_DIR / out_name

    if out_path.exists():
        return f"[SKIP] {out_name} already exists"

    for attempt in range(4):
        try:
            with open(photo, "rb") as img_f:
                response = client.images.edit(
                    model="gpt-image-1",
                    image=img_f,
                    prompt=prompt_text,
                    quality=quality,
                    size="1024x1024",
                )
            image_bytes = base64.b64decode(response.data[0].b64_json)
            out_path.write_bytes(image_bytes)
            return f"[OK]   {out_name}"
        except openai.RateLimitError:
            if attempt < 3:
                wait = 35 * (attempt + 1)
                print(f"[WAIT] {out_name} — rate limit, retrying in {wait}s (attempt {attempt+1}/4)...")
                time.sleep(wait)
            else:
                return f"[ERR]  {out_name}: rate limit after 4 attempts"
        except Exception as e:
            return f"[ERR]  {out_name}: {e}"


# ── Build task list ────────────────────────────────────────────────────────────

tasks = [
    (photo, p_name, p_text, quality)
    for photo in PHOTOS
    for p_name, p_text in PROMPTS.items()
    for quality in QUALITIES
]

total = len(tasks)
print(f"Starting {total} generations ({len(PHOTOS)} photos × {len(PROMPTS)} prompts × {len(QUALITIES)} quality levels)")
print(f"Output folder: {OUTPUT_DIR}\n")

# ── Run in parallel (thread pool — openai calls are I/O bound) ─────────────────

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    futures = {executor.submit(run_one, *t): t for t in tasks}
    completed = 0
    for future in concurrent.futures.as_completed(futures):
        completed += 1
        print(f"({completed}/{total}) {future.result()}")

print("\nDone. Open backend/testing/output/ to review results.")
