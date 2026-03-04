#!/usr/bin/env python3
"""
compare_renders.py — Benchmark multiple AI image-generation providers for lamp renders.

Usage (run from the backend/ directory):
    python scripts/compare_renders.py --src path/to/customer_photo.jpg

Optional flags:
    --ref  path/to/reference_lamp.jpg   (default: lampara_referencia.jpg at project root)
    --out  path/to/output_dir           (default: scripts/compare_output/<timestamp>)
    --jobs openai-edit-prod,stability-ultra,...  (comma-separated; default: all detected)

Providers enabled automatically when an API key is present in backend/.env:

    OPENAI_API_KEY        → gpt-image-1 (3 prompt variants, quality=medium & high)
                            + dall-e-3 (text-only)
    STABILITY_API_KEY     → stable-image-ultra img2img
                            + sd3.5-medium img2img
    REPLICATE_API_TOKEN   → flux-1.1-pro text2img
                            + flux-dev img2img
    FAL_KEY               → fal-ai/flux/dev img2img
    IDEOGRAM_API_KEY      → ideogram-v2 text2img
    GOOGLE_API_KEY        → google-imagen-3 text2img

Results are saved to the output directory as individual PNGs plus a self-contained
HTML report with embedded images, timing, cost estimates, and a 1–5 star rating UI.
"""

import argparse
import base64
import io
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

import httpx
from dotenv import load_dotenv
from PIL import Image

# ── Bootstrap ─────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent          # backend/
load_dotenv(ROOT / ".env")

# ── Prompts ───────────────────────────────────────────────────────────────────

PROMPT_PROD = (
    "The first image is a photo of one or more people. "
    "The second image is a reference photo of a finished acrylic LED lamp product. "
    "Using the people in the first photo as the subject, create a photorealistic product render "
    "of a finished acrylic LED lamp. "
    "The acrylic panel should feature a minimalist black and white line art engraving of the people, "
    "keeping their pose, expressions, hair and body outlines faithfully. "
    "The acrylic panel shape should follow the organic silhouette of the figures. "
    "Match the visual style, size and LED base shown in the reference image as closely as possible. "
    "The lamp is placed naturally on a wooden desk or table, with soft ambient room lighting. "
    "The LED base glows with soft blue-white light that illuminates the engraved lines on the acrylic. "
    "The scene feels warm and cozy, like a bedroom shelf or nightstand. "
    "Photorealistic, high quality, natural lighting, subtle reflections on the table surface."
)

PROMPT_SHORT = (
    "Create a photorealistic product render of a custom acrylic LED lamp. "
    "Using the people shown in the first image, engrave their silhouette onto a clear acrylic panel "
    "shaped to follow their outlines. Follow the lamp design in the second image for size and LED base. "
    "The lamp sits on a wooden surface, LED base glowing soft white. Cozy room, warm ambient light."
)

PROMPT_PRODUCT = (
    "Professional e-commerce product photo of a custom acrylic LED night-light. "
    "The acrylic panel has a laser-engraved black-and-white silhouette of the people from the first image. "
    "Lamp design matches the reference in the second image. "
    "Clean background, warm light from LED base, elegant wooden surface, sharply in focus, photo-realistic."
)

PROMPTS: dict[str, str] = {
    "prod": PROMPT_PROD,
    "short": PROMPT_SHORT,
    "product": PROMPT_PRODUCT,
}


# ── Image helpers ─────────────────────────────────────────────────────────────

def _to_png(image_bytes: bytes, max_size: int = 1024) -> bytes:
    """Resize and convert any image to RGBA PNG, max max_size px on each side."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _named_bytesio(data: bytes, name: str) -> io.BytesIO:
    """Return a BytesIO with a .name attribute (required by the OpenAI SDK)."""
    buf = io.BytesIO(data)
    buf.name = name
    return buf


# ── Provider functions ────────────────────────────────────────────────────────
# Each function signature: (src: bytes, ref: bytes | None, **kwargs) -> bytes
# They raise an exception on failure; the caller catches and records the error.


def job_openai_edit(src: bytes, ref: bytes | None, **kwargs) -> bytes:
    """OpenAI gpt-image-1 images.edit — current production model."""
    import openai

    prompt_key: str = kwargs.get("prompt_key", "prod")
    quality: str = kwargs.get("quality", "medium")

    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    src_file = _named_bytesio(_to_png(src), "source.png")
    images = [src_file]
    if ref:
        ref_file = _named_bytesio(_to_png(ref), "reference.png")
        images.append(ref_file)

    try:
        response = client.images.edit(
            model="gpt-image-1",
            image=images if len(images) > 1 else images[0],
            prompt=PROMPTS[prompt_key],
            quality=quality,
            size="1024x1024",
        )
    finally:
        for f in images:
            f.close()

    return base64.b64decode(response.data[0].b64_json)


def job_stability(src: bytes, ref: bytes | None, **kwargs) -> bytes:
    """Stability AI stable-image via REST API (img2img)."""
    endpoint: str = kwargs.get("endpoint", "ultra")
    strength: float = float(kwargs.get("strength", 0.65))

    api_key = os.environ["STABILITY_API_KEY"]
    url = f"https://api.stability.ai/v2beta/stable-image/generate/{endpoint}"
    src_png = _to_png(src)

    if endpoint == "sd3":
        # SD3 uses mode=image-to-image
        data = {
            "prompt": PROMPTS["short"],
            "mode": "image-to-image",
            "strength": str(strength),
            "model": "sd3.5-medium",
            "output_format": "png",
        }
    else:
        # Ultra: pass image + strength
        data = {
            "prompt": PROMPTS["short"],
            "strength": str(strength),
            "output_format": "png",
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "image/*",
    }
    files = {"image": ("source.png", src_png, "image/png")}

    with httpx.Client(timeout=120) as client:
        resp = client.post(url, headers=headers, data=data, files=files)

    if resp.status_code != 200:
        raise RuntimeError(f"Stability API {resp.status_code}: {resp.text[:400]}")

    return resp.content  # raw PNG bytes


def job_replicate(src: bytes, ref: bytes | None, **kwargs) -> bytes:
    """Replicate predictions API — Flux img2img models."""
    model: str = kwargs.get("model", "black-forest-labs/flux-dev")

    api_token = os.environ["REPLICATE_API_TOKEN"]
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
        "Prefer": "wait",           # ask Replicate to block up to 60s
    }

    src_b64 = base64.b64encode(_to_png(src)).decode()
    input_payload: dict = {
        "prompt": PROMPTS["short"],
        "image": f"data:image/png;base64,{src_b64}",
        "prompt_strength": 0.75,
        "aspect_ratio": "1:1",
        "output_format": "png",
        "num_outputs": 1,
    }

    with httpx.Client(timeout=90) as client:
        create_resp = client.post(
            f"https://api.replicate.com/v1/models/{model}/predictions",
            headers=headers,
            json={"input": input_payload},
        )

    if create_resp.status_code not in (200, 201):
        raise RuntimeError(f"Replicate create {create_resp.status_code}: {create_resp.text[:400]}")

    pred = create_resp.json()

    # If Prefer:wait returned a completed prediction immediately, use it
    if pred.get("status") == "succeeded":
        output = pred["output"]
    else:
        # Poll until done (max 3 min)
        pred_id = pred["id"]
        output = None
        for _ in range(90):
            time.sleep(2)
            with httpx.Client(timeout=30) as poll_client:
                poll = poll_client.get(
                    f"https://api.replicate.com/v1/predictions/{pred_id}",
                    headers={"Authorization": f"Bearer {api_token}"},
                )
            data = poll.json()
            status = data.get("status")
            if status == "succeeded":
                output = data["output"]
                break
            if status in ("failed", "canceled"):
                raise RuntimeError(f"Replicate {status}: {data.get('error', 'unknown')}")
        if output is None:
            raise RuntimeError("Replicate prediction timed out after ~3 minutes")

    img_url = output[0] if isinstance(output, list) else output
    with httpx.Client(timeout=60) as client:
        return client.get(img_url).content


def job_fal(src: bytes, ref: bytes | None, **kwargs) -> bytes:
    """fal.ai — Flux Dev image-to-image."""
    model: str = kwargs.get("model", "fal-ai/flux/dev")

    fal_key = os.environ["FAL_KEY"]
    src_b64 = base64.b64encode(_to_png(src)).decode()

    payload: dict = {
        "prompt": PROMPTS["short"],
        "image_url": f"data:image/png;base64,{src_b64}",
        "strength": 0.75,
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
        "num_images": 1,
        "image_size": "square_hd",
    }

    with httpx.Client(timeout=180) as client:
        resp = client.post(
            f"https://fal.run/{model}",
            headers={
                "Authorization": f"Key {fal_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code != 200:
        raise RuntimeError(f"fal.ai {resp.status_code}: {resp.text[:400]}")

    result = resp.json()
    images = result.get("images", [])
    if not images:
        raise RuntimeError("fal.ai returned no images")

    img_url: str = images[0].get("url", "")
    if img_url.startswith("data:"):
        _, b64data = img_url.split(",", 1)
        return base64.b64decode(b64data)

    with httpx.Client(timeout=60) as client:
        return client.get(img_url).content




# ── Job registry ──────────────────────────────────────────────────────────────

@dataclass
class Job:
    id: str
    name: str
    fn: Callable
    env_key: str
    kwargs: dict = field(default_factory=dict)
    cost_usd: float = 0.0
    notes: str = ""
    type: str = "img2img"   # "img2img" | "text2img"


ALL_JOBS: list[Job] = [
    # ── OpenAI ───────────────────────────────────────────────────────────────
    Job(
        id="openai-edit-prod",
        name="gpt-image-1 · Prompt A (producción actual)",
        fn=job_openai_edit,
        env_key="OPENAI_API_KEY",
        kwargs={"prompt_key": "prod", "quality": "medium"},
        cost_usd=0.07,
        notes="gpt-image-1 edit · quality=medium · prompt actual de producción · 1024×1024",
        type="img2img",
    ),
    Job(
        id="openai-edit-short",
        name="gpt-image-1 · Prompt B (conciso)",
        fn=job_openai_edit,
        env_key="OPENAI_API_KEY",
        kwargs={"prompt_key": "short", "quality": "medium"},
        cost_usd=0.07,
        notes="gpt-image-1 edit · quality=medium · prompt más corto",
        type="img2img",
    ),
    Job(
        id="openai-edit-product",
        name="gpt-image-1 · Prompt C (e-commerce)",
        fn=job_openai_edit,
        env_key="OPENAI_API_KEY",
        kwargs={"prompt_key": "product", "quality": "medium"},
        cost_usd=0.07,
        notes="gpt-image-1 edit · quality=medium · prompt orientado a foto de producto",
        type="img2img",
    ),
    Job(
        id="openai-edit-high",
        name="gpt-image-1 · Calidad alta",
        fn=job_openai_edit,
        env_key="OPENAI_API_KEY",
        kwargs={"prompt_key": "prod", "quality": "high"},
        cost_usd=0.19,
        notes="gpt-image-1 edit · quality=HIGH · prompt A · mayor calidad/costo",
        type="img2img",
    ),
    # ── Stability AI ─────────────────────────────────────────────────────────
    Job(
        id="stability-ultra",
        name="Stability · stable-image-ultra",
        fn=job_stability,
        env_key="STABILITY_API_KEY",
        kwargs={"endpoint": "ultra", "strength": 0.65},
        cost_usd=0.08,
        notes="stable-image-ultra · img2img · strength=0.65",
        type="img2img",
    ),
    Job(
        id="stability-sd3",
        name="Stability · SD3.5 Medium",
        fn=job_stability,
        env_key="STABILITY_API_KEY",
        kwargs={"endpoint": "sd3", "strength": 0.65},
        cost_usd=0.065,
        notes="stable-diffusion-3.5-medium · img2img · strength=0.65",
        type="img2img",
    ),
    # ── Replicate ─────────────────────────────────────────────────────────────
    Job(
        id="replicate-flux-dev-i2i",
        name="Flux Dev img2img (Replicate)",
        fn=job_replicate,
        env_key="REPLICATE_API_TOKEN",
        kwargs={"model": "black-forest-labs/flux-dev", "use_image": True},
        cost_usd=0.025,
        notes="flux-dev · img2img · prompt_strength=0.75",
        type="img2img",
    ),
    # ── fal.ai ────────────────────────────────────────────────────────────────
    Job(
        id="fal-flux-dev-i2i",
        name="Flux Dev img2img (fal.ai)",
        fn=job_fal,
        env_key="FAL_KEY",
        kwargs={"model": "fal-ai/flux/dev"},
        cost_usd=0.025,
        notes="fal-ai/flux/dev · img2img · strength=0.75 · 28 pasos",
        type="img2img",
    ),
]


# ── Runner ────────────────────────────────────────────────────────────────────

@dataclass
class Result:
    job: Job
    image_bytes: bytes | None = None
    elapsed_s: float = 0.0
    error: str | None = None


def run_job(job: Job, src: bytes, ref: bytes | None) -> Result:
    result = Result(job=job)
    t0 = time.perf_counter()
    try:
        result.image_bytes = job.fn(src, ref, **job.kwargs)
        result.elapsed_s = time.perf_counter() - t0
    except Exception as exc:
        result.elapsed_s = time.perf_counter() - t0
        result.error = str(exc)
    return result


# ── HTML report ───────────────────────────────────────────────────────────────

def _img_to_b64_png(data: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(data))
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return base64.b64encode(data).decode()


_HTML_PAGE = """\
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comparativa de generación — Lamps AI</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d0d0d; color: #d8d8d8; padding: 28px 24px;
  min-height: 100vh;
}
h1  { font-size: 1.55rem; color: #fff; margin-bottom: 2px; }
.meta { font-size: 0.78rem; color: #666; margin-bottom: 32px; }
.inputs { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 40px; }
.input-card { background: #181818; border: 1px solid #252525; border-radius: 10px; padding: 12px; width: 220px; }
.input-card label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: .06em; color: #555; display: block; margin-bottom: 6px; }
.input-card img { width: 196px; height: 196px; object-fit: cover; border-radius: 6px; display: block; }
.section-title { font-size: 1rem; font-weight: 600; color: #aaa; margin-bottom: 16px; border-bottom: 1px solid #1f1f1f; padding-bottom: 8px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; margin-bottom: 48px; }
.card { background: #181818; border: 1px solid #252525; border-radius: 12px; overflow: hidden; transition: border-color .15s; }
.card:hover { border-color: #3a3a3a; }
.card.error { opacity: .55; }
.card-img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; }
.card-body { padding: 14px; }
.card-title { font-size: .9rem; font-weight: 600; color: #eee; margin-bottom: 3px; line-height: 1.35; }
.card-notes { font-size: .69rem; color: #555; margin-bottom: 10px; line-height: 1.4; }
.badges { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
.badge { font-size: .67rem; padding: 2px 9px; border-radius: 20px; font-weight: 500; }
.b-type  { background: #0f2340; color: #5fa0e8; }
.b-cost  { background: #0f2a0f; color: #5ccc5c; }
.b-time  { background: #2a1f06; color: #d4943a; }
.b-err   { background: #2a0606; color: #e06060; }
.error-msg { font-size: .73rem; color: #d05050; background: #1a0808; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; word-break: break-all; margin-top: 8px; }
/* --- Star rating --- */
.stars { display: flex; gap: 3px; margin-top: 10px; }
.star { font-size: 1.35rem; cursor: pointer; color: #333; transition: color .1s; user-select: none; }
.star.lit { color: #e8a020; }
/* --- Export panel --- */
#export-btn {
  margin-top: 16px; padding: 10px 22px;
  background: #1a4a8a; color: #e0eaf8; border: none;
  border-radius: 8px; cursor: pointer; font-size: .88rem;
}
#export-btn:hover { background: #2a5aa0; }
#export-out {
  display: none; margin-top: 14px; background: #111; border-radius: 8px;
  padding: 14px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: .78rem;
  color: #a0c8a0; white-space: pre; overflow: auto; max-height: 360px;
}
</style>
</head>
<body>

<h1>Comparativa de generación de imágenes — Lamps AI</h1>
<p class="meta">
  Generado el {date} &nbsp;·&nbsp;
  {n_ok} exitosos / {n_total} trabajos &nbsp;·&nbsp;
  Costo estimado total: <strong style="color:#5ccc5c">${total_cost:.2f}</strong>
</p>

<div class="inputs">
  <div class="input-card">
    <label>Foto fuente (cliente)</label>
    <img src="data:image/png;base64,{src_b64}" alt="Fuente">
  </div>
  {ref_card}
</div>

<div class="section-title">Resultados por proveedor / modelo</div>
<div class="grid">
{cards}
</div>

<p style="font-size:.82rem;color:#666;margin-bottom:8px;">
  Puntúa cada resultado con estrellas y luego exporta para comparar.
</p>
<button id="export-btn" onclick="exportRatings()">Exportar puntuaciones (JSON)</button>
<pre id="export-out"></pre>

<script>
const ratings = {};
const nameMap  = {};

document.querySelectorAll('.stars').forEach(function(el) {
  var jobId   = el.dataset.job;
  var jobName = el.dataset.name;
  nameMap[jobId] = jobName;
  el.querySelectorAll('.star').forEach(function(star) {
    star.addEventListener('click', function() {
      var val = parseInt(this.dataset.val);
      ratings[jobId] = val;
      el.querySelectorAll('.star').forEach(function(s) {
        s.classList.toggle('lit', parseInt(s.dataset.val) <= val);
      });
    });
  });
});

function exportRatings() {
  var out = Object.keys(ratings).map(function(id) {
    return { id: id, name: nameMap[id] || id, stars: ratings[id] };
  });
  out.sort(function(a, b) { return b.stars - a.stars; });
  var el = document.getElementById('export-out');
  el.textContent = JSON.stringify(out, null, 2);
  el.style.display = 'block';
}
</script>
</body>
</html>
"""

_CARD_OK = """\
  <div class="card">
    <img class="card-img" src="data:image/png;base64,{img_b64}" alt="{name}" loading="lazy">
    <div class="card-body">
      <div class="card-title">{name}</div>
      <div class="card-notes">{notes}</div>
      <div class="badges">
        <span class="badge b-type">{type_label}</span>
        <span class="badge b-cost">≈ ${cost:.2f}</span>
        <span class="badge b-time">{elapsed:.1f}s</span>
      </div>
      <div class="stars" data-job="{id}" data-name="{name}">
        <span class="star" data-val="1">★</span>
        <span class="star" data-val="2">★</span>
        <span class="star" data-val="3">★</span>
        <span class="star" data-val="4">★</span>
        <span class="star" data-val="5">★</span>
      </div>
    </div>
  </div>"""

_CARD_ERR = """\
  <div class="card error">
    <div class="card-body" style="padding-top:24px;">
      <div class="card-title">{name}</div>
      <div class="card-notes">{notes}</div>
      <div class="badges">
        <span class="badge b-type">{type_label}</span>
        <span class="badge b-err">Error</span>
        <span class="badge b-time">{elapsed:.1f}s</span>
      </div>
      <div class="error-msg">{error}</div>
    </div>
  </div>"""

_REF_CARD = """\
  <div class="input-card">
    <label>Foto referencia (lámpara)</label>
    <img src="data:image/png;base64,{ref_b64}" alt="Referencia">
  </div>"""


def build_report(
    results: list[Result],
    src: bytes,
    ref: bytes | None,
    out_dir: Path,
) -> Path:
    cards_html: list[str] = []
    n_ok = 0
    total_cost = 0.0

    for r in results:
        type_label = "img → img" if r.job.type == "img2img" else "texto → img"
        if r.error:
            cards_html.append(_CARD_ERR.format(
                name=r.job.name,
                notes=r.job.notes,
                type_label=type_label,
                elapsed=r.elapsed_s,
                error=r.error[:500],
                id=r.job.id,
            ))
        else:
            n_ok += 1
            total_cost += r.job.cost_usd
            img_b64 = _img_to_b64_png(r.image_bytes)
            cards_html.append(_CARD_OK.format(
                img_b64=img_b64,
                name=r.job.name,
                notes=r.job.notes,
                type_label=type_label,
                cost=r.job.cost_usd,
                elapsed=r.elapsed_s,
                id=r.job.id,
            ))

    ref_card = ""
    if ref:
        ref_card = _REF_CARD.format(ref_b64=_img_to_b64_png(ref))

    html = _HTML_PAGE.format(
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        n_ok=n_ok,
        n_total=len(results),
        total_cost=total_cost,
        src_b64=_img_to_b64_png(src),
        ref_card=ref_card,
        cards="\n".join(cards_html),
    )

    report_path = out_dir / "report.html"
    report_path.write_text(html, encoding="utf-8")
    return report_path


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Benchmark AI image-generation providers for lamp renders",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--src", required=True, help="Path to the customer source photo")
    parser.add_argument(
        "--ref",
        default=str(ROOT / "lampara_referencia.jpg"),
        help="Path to reference lamp photo (default: lampara_referencia.jpg)",
    )
    parser.add_argument("--out", default="", help="Output directory (auto-generated if empty)")
    parser.add_argument(
        "--jobs",
        default="",
        help="Comma-separated job IDs to run (default: all with available API keys). "
             "Available IDs: " + ", ".join(j.id for j in ALL_JOBS),
    )
    args = parser.parse_args()

    # ── Validate inputs ───────────────────────────────────────────────────────
    src_path = Path(args.src)
    if not src_path.exists():
        print(f"[ERROR] Source photo not found: {src_path}", file=sys.stderr)
        sys.exit(1)

    src_bytes = src_path.read_bytes()
    ref_bytes: bytes | None = None
    ref_path = Path(args.ref)
    if ref_path.exists():
        ref_bytes = ref_path.read_bytes()
        print(f"[INFO]  Reference lamp photo: {ref_path}")
    else:
        print(f"[WARN]  Reference photo not found ({ref_path}) — running without it")

    # ── Filter jobs ───────────────────────────────────────────────────────────
    requested_ids = {s.strip() for s in args.jobs.split(",") if s.strip()}
    jobs_to_run: list[Job] = []
    skipped_no_key: list[str] = []

    for job in ALL_JOBS:
        if requested_ids and job.id not in requested_ids:
            continue
        if not os.environ.get(job.env_key):
            skipped_no_key.append(f"{job.name} ({job.env_key})")
            continue
        jobs_to_run.append(job)

    if skipped_no_key:
        print("\n[SKIP] The following jobs were skipped — set their API key in .env to enable them:")
        for s in skipped_no_key:
            print(f"         · {s}")

    if not jobs_to_run:
        print(
            "\n[ERROR] No jobs to run. Set at least OPENAI_API_KEY in backend/.env",
            file=sys.stderr,
        )
        sys.exit(1)

    # ── Output directory ──────────────────────────────────────────────────────
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(args.out) if args.out else Path(__file__).parent / "compare_output" / ts
    out_dir.mkdir(parents=True, exist_ok=True)

    # ── Print plan ────────────────────────────────────────────────────────────
    print(f"\nSource photo : {src_path.name}")
    print(f"Output dir   : {out_dir}")
    print(f"Jobs to run  : {len(jobs_to_run)}\n")
    for j in jobs_to_run:
        type_tag = "img2img" if j.type == "img2img" else "txt2img"
        print(f"  [{type_tag}] {j.name}  (≈${j.cost_usd:.2f})")

    total_est = sum(j.cost_usd for j in jobs_to_run)
    print(f"\n  Estimated cost: ${total_est:.2f}\n")

    # ── Run all jobs in parallel (max 4 concurrent to avoid rate limits) ──────
    results: list[Result] = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_map = {
            executor.submit(run_job, job, src_bytes, ref_bytes): job
            for job in jobs_to_run
        }
        for future in as_completed(future_map):
            r: Result = future.result()
            if r.error:
                status = f"✗  ERROR  ({r.elapsed_s:.1f}s): {r.error[:100]}"
            else:
                status = f"✓  OK     ({r.elapsed_s:.1f}s)  ≈${r.job.cost_usd:.2f}"
                (out_dir / f"{r.job.id}.png").write_bytes(r.image_bytes)
            print(f"  {r.job.name:<45} {status}")
            results.append(r)

    # Sort back to original order for the report
    order = {j.id: i for i, j in enumerate(jobs_to_run)}
    results.sort(key=lambda r: order.get(r.job.id, 999))

    # ── Build HTML report ─────────────────────────────────────────────────────
    report_path = build_report(results, src_bytes, ref_bytes, out_dir)

    ok_results  = [r for r in results if not r.error]
    err_results = [r for r in results if r.error]

    print(f"\n{'─'*55}")
    print(f"  Éxitos  : {len(ok_results)}")
    print(f"  Errores : {len(err_results)}")
    print(f"  Costo   : ≈${sum(r.job.cost_usd for r in ok_results):.2f}")
    print(f"\n  Reporte : {report_path}")
    print(f"  Imágenes: {out_dir}")
    print(f"{'─'*55}\n")

    print("Abre report.html en el navegador para comparar y puntuar los resultados.")


if __name__ == "__main__":
    main()
