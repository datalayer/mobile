# Copyright (c) 2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Draws the app's icon, the Android adaptive icon and the splash image from the
Datalayer mark, `assets/datalayer-mark.svg` (the icons package's
`data1/datalayer.svg`, the mark the desktop app and the web carry): the icon is
the Datalayer visual, not the eyes (the user, 5 November 2026, on the first
TestFlight build; the launch screen showed the logo since 25 October 2026).
The PNGs exist because Android draws the icon and the splash natively, before
the app's code runs, and Expo's icon and splash take a PNG only.

Usage: python scripts/make-icons.py   (writes assets/*.png; needs Pillow and Inkscape)
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets"
MARK = ASSETS / "datalayer-mark.svg"

WHITE = "#FFFFFF"
# Light tints of the brand's mint and sky (Primer Addons' loopBrand and brightPop),
# so the green mark still reads on the development and preview icons installed beside the store one.
DEVELOPMENT = "#DDF5EA"
PREVIEW = "#DCEFFD"

SIZE = 1024


def render_mark(size: int) -> Image.Image:
    """The mark as a transparent square of `size` pixels, as Inkscape draws the SVG."""
    with tempfile.TemporaryDirectory() as folder:
        out = Path(folder) / "mark.png"
        subprocess.run(
            [
                "inkscape",
                str(MARK),
                "--export-type=png",
                f"--export-filename={out}",
                "-w",
                str(size),
                "-h",
                str(size),
            ],
            check=True,
            capture_output=True,
        )
        return Image.open(out).convert("RGBA").copy()


def composed(mark: Image.Image, width: int, background) -> Image.Image:
    """A square with the mark `width` pixels wide in its middle, on `background` (a colour, or None for transparent)."""
    image = Image.new("RGBA", (SIZE, SIZE), background or (0, 0, 0, 0))
    small = mark.resize((width, width), Image.LANCZOS)
    offset = (SIZE - width) // 2
    image.alpha_composite(small, (offset, offset))
    return image


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    mark = render_mark(SIZE)
    # The store icon: opaque, the mark on white; the platforms round the corners.
    composed(mark, 640, WHITE).convert("RGB").save(ASSETS / "icon.png")
    # Development and preview builds install beside it: tinted backgrounds behind the same mark.
    composed(mark, 640, DEVELOPMENT).convert("RGB").save(ASSETS / "icon-development.png")
    composed(mark, 640, PREVIEW).convert("RGB").save(ASSETS / "icon-preview.png")
    # Android's adaptive foreground: transparent, inside the 66% safe zone.
    composed(mark, 520, None).save(ASSETS / "adaptive-icon.png")
    # Android 13+ themed (monochrome) icon: the mark's shape only, white.
    shape = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shape.paste(WHITE, mask=composed(mark, 520, None).getchannel("A"))
    shape.save(ASSETS / "adaptive-icon-monochrome.png")
    # The splash image, light and dark: the mark full-bleed on a transparent
    # square, reads on both backgrounds (app.config.ts).
    for name in ("splash-icon.png", "splash-icon-dark.png"):
        mark.save(ASSETS / name)


if __name__ == "__main__":
    main()
