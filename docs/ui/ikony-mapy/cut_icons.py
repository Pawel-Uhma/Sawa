"""Cut the off-white background from generated map icons and export small PNGs.

Usage: python3 -I cut_icons.py <src_dir> <out_dir> name=src.png [name=src.png ...]
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SIZE = 96  # px; drawn at pixelRatio 2 → 48 css px max on the map
STROKE = 4  # white outline (px at SIZE) so mint shapes read on the light basemap


def cut(path: Path) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)

    # Background = pixels close to bg colour that are connected to the image border.
    near = dist < 28
    labels, _ = ndimage.label(near)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    edge_labels = edge_labels[edge_labels != 0]
    background = np.isin(labels, edge_labels)

    # Soft edge: ramp alpha over the distance band just outside the background mask.
    alpha = np.where(background, 0.0, 1.0)
    ring = ndimage.binary_dilation(background, iterations=2) & ~background
    alpha[ring] = np.clip((dist[ring] - 12) / 40, 0, 1)

    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    bbox = img.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    img = img.crop(bbox)

    # Square canvas with room for the stroke, then downscale.
    side = max(img.size)
    pad = int(side * 0.08)
    canvas = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
    canvas.paste(img, ((canvas.width - img.width) // 2, (canvas.height - img.height) // 2), img)
    small = canvas.resize((SIZE, SIZE), Image.LANCZOS)

    a = np.asarray(small.getchannel("A")) > 60
    halo = ndimage.binary_dilation(a, structure=ndimage.generate_binary_structure(2, 2), iterations=STROKE)
    halo_img = Image.fromarray((ndimage.gaussian_filter(halo.astype(np.float32), 0.8) * 255).astype(np.uint8))
    out = Image.new("RGBA", small.size, (255, 255, 255, 0))
    out.putalpha(halo_img)
    out.alpha_composite(small)
    return out


def main() -> None:
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for pair in sys.argv[3:]:
        name, src = pair.split("=")
        cut(src_dir / src).save(out_dir / f"{name}.png", optimize=True)
        print(name, (out_dir / f"{name}.png").stat().st_size)


if __name__ == "__main__":
    main()
