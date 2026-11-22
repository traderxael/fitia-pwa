"""Genera los iconos PNG de la PWA a partir del mismo dibujo del SVG."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent


def make(size: int, maskable: bool = False) -> Image.Image:
    scale = size / 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        d.rectangle((0, 0, size, size), fill="#FFC400")

    def tx(v):
        # En maskable, aleja el contenido del borde dentro de la zona segura.
        if maskable:
            v = 256 + (v - 256) * 0.8
        return v * scale

    box = (tx(32), tx(32), tx(480), tx(480))
    radius = 112 * scale * (0.8 if maskable else 1)
    if not maskable:
        d.rounded_rectangle(box, radius=radius, fill="#FFC400")

    d.rounded_rectangle((tx(128), tx(150), tx(384), tx(200)), radius=25 * scale, fill="#FFFFFF")
    d.rounded_rectangle((tx(128), tx(232), tx(318), tx(282)), radius=25 * scale, fill="#FFFFFF")
    r = 28 * scale
    cx, cy = tx(153), tx(346)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#FFFFFF")
    return img


make(512).save(OUT / "icon-512.png")
make(192).save(OUT / "icon-192.png")
make(512, maskable=True).save(OUT / "icon-maskable.png")
print("iconos generados")
