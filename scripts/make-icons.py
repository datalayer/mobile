# Copyright (c) 2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Draws the app's icon, Android adaptive icon and splash image from the LOOP
eyes (Primer Addons' `loopEyes`, the same geometry the app and the web draw).

Usage: python scripts/make-icons.py   (writes assets/*.png; needs Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"

# Primer Addons, colors/loopColors.ts.
INK = "#1D1D1F"
INK_DARK = "#F5F5F7"
WHITE = "#FFFFFF"
BLACK = "#131314"
DEVELOPMENT = "#7ADBB8"  # loopBrand
PREVIEW = "#8CCBF9"  # brightPop, the sky

# Primer Addons, theme/loopEyes.ts: the view, the eyes, the stroke, the pupils, gaze "aside".
VIEW = (52, 32)
EYE_RX, EYE_RY, CENTRES, MIDDLE = 10.2, 13.6, (13, 39), 16
STROKE, PUPIL = 4, 5.2
REACH = (EYE_RX - STROKE / 2 - PUPIL - 0.5, EYE_RY - STROKE / 2 - PUPIL - 0.5)
GAZE = (-0.7, 0.25)

SUPERSAMPLE = 4


def eyes(size: int, width: float, ink: str, white: str, background: str | None) -> Image.Image:
    """A square of `size` pixels with the eyes `width` pixels wide in its middle."""
    big = size * SUPERSAMPLE
    image = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    scale = width * SUPERSAMPLE / VIEW[0]
    left = (big - VIEW[0] * scale) / 2
    top = (big - VIEW[1] * scale) / 2

    def box(cx: float, cy: float, rx: float, ry: float):
        return (left + (cx - rx) * scale, top + (cy - ry) * scale, left + (cx + rx) * scale, top + (cy + ry) * scale)

    for cx in CENTRES:
        draw.ellipse(box(cx, MIDDLE, EYE_RX + STROKE / 2, EYE_RY + STROKE / 2), fill=ink)
        draw.ellipse(box(cx, MIDDLE, EYE_RX - STROKE / 2, EYE_RY - STROKE / 2), fill=white)
        draw.ellipse(box(cx + GAZE[0] * REACH[0], MIDDLE + GAZE[1] * REACH[1], PUPIL, PUPIL), fill=ink)
    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    # The store icon: opaque, the eyes on white.
    eyes(1024, 600, INK, WHITE, WHITE).convert("RGB").save(ASSETS / "icon.png")
    # Development and preview builds install beside it: the LOOP mint and sky behind the same eyes.
    eyes(1024, 600, INK, WHITE, DEVELOPMENT).convert("RGB").save(ASSETS / "icon-development.png")
    eyes(1024, 600, INK, WHITE, PREVIEW).convert("RGB").save(ASSETS / "icon-preview.png")
    # Android's adaptive foreground: transparent, inside the 66% safe zone.
    eyes(1024, 520, INK, WHITE, None).save(ASSETS / "adaptive-icon.png")
    # Android 13+ themed (monochrome) icon: the shape only.
    eyes(1024, 520, WHITE, (0, 0, 0, 0), None).save(ASSETS / "adaptive-icon-monochrome.png")
    # The splash image, light and dark, on a transparent square.
    eyes(512, 400, INK, WHITE, None).save(ASSETS / "splash-icon.png")
    eyes(512, 400, INK_DARK, BLACK, None).save(ASSETS / "splash-icon-dark.png")


if __name__ == "__main__":
    main()
