"""Vectorize a PNG/JPG image to SVG using vtracer."""
from pathlib import Path

import vtracer


def vectorize(image_path: Path, output_path: Path | None = None) -> str:
    """Convert a raster image to SVG and return the SVG string."""
    svg = vtracer.convert_image_to_svg_py(
        str(image_path),
        colormode="binary",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=4,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=3,
    )

    if output_path:
        output_path.write_text(svg, encoding="utf-8")

    return svg
