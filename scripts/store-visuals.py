#!/usr/bin/env python3
"""The store's phone screenshots, framed: a caption on the app's green over
the capture CI took (`store-screenshots` artifact, 1080 x 1920), the capture
scaled under it with rounded corners and running off the bottom edge.

Usage: scripts/store-visuals.py <artifact dir> [<out dir>]
Default out dir: visuals/screenshots. Needs Pillow and Roboto (Debian's
fonts-roboto). The phone outputs are 1080 x 1920 (9:16, every side >= 1080,
as Play asks for promotion); the tablet outputs are landscape, 16:9 — the
caption at the left, the capture at the right — 1920 x 1080 for the 7-inch
field (`tablet-7/`) and 2560 x 1440 for the 10-inch field (`tablet-10/`),
since the app is a phone app and a tablet shows it the same.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
GREEN = (22, 160, 133)  # --bgColor-accent-emphasis, src/theme/primer.ts
INK = (255, 255, 255)
PAPER = (232, 245, 240)
FONT_BOLD = "/usr/share/fonts/truetype/roboto/unhinted/RobotoTTF/Roboto-Bold.ttf"
FONT_MEDIUM = "/usr/share/fonts/truetype/roboto/unhinted/RobotoTTF/Roboto-Medium.ttf"

# (output name, capture, title, subtitle, rows to drop from the capture: (from, to) or None)
SHOTS = [
    ("01-inbox", "store-02-inbox", "Every approval,\nin your pocket", "What your agents ask before they act, oldest first.", None),
    ("02-approval", "store-03-approval", "The whole request,\nbefore you answer", "Who asks, why, and exactly what it would do.", None),
    ("03-decide", "store-04-decide", "Approve or reject\nin one tap", "A note if you want one. The agent carries on, or stops.", None),
    # The first card of the Agents list is the e2e account's test application: dropped.
    ("04-agents", "store-05-agents", "Your applications,\nlive", "Everything you keep running on Datalayer, and what it does.", (384, 688)),
    ("05-settings", "store-10-settings", "In your name,\non your terms", "Who your applications may reach for you. Notifications carry no content.", None),
]


def splice(image: Image.Image, drop: tuple[int, int] | None) -> Image.Image:
    if not drop:
        return image
    footer_top = image.height - 191  # The tab bar (white from row 1729 of 1920), which stays at the bottom.
    top = image.crop((0, 0, image.width, drop[0]))
    rest = image.crop((0, drop[1], image.width, footer_top))
    out = Image.new("RGB", image.size, (255, 255, 255))
    out.paste(top, (0, 0))
    out.paste(rest, (0, drop[0]))
    out.paste(image.crop((0, footer_top, image.width, image.height)), (0, footer_top))
    return out


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def frame(capture: Image.Image, title: str, subtitle: str) -> Image.Image:
    canvas = Image.new("RGB", (W, H), GREEN)
    draw = ImageDraw.Draw(canvas)
    bold = ImageFont.truetype(FONT_BOLD, 76)
    medium = ImageFont.truetype(FONT_MEDIUM, 36)
    y = 110
    for line in title.split("\n"):
        draw.text((72, y), line, font=bold, fill=INK)
        y += 90
    y += 14
    # Wrap the subtitle to the column.
    words, line, lines = subtitle.split(), "", []
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=medium) > W - 144:
            lines.append(line)
            line = word
        else:
            line = trial
    lines.append(line)
    for text in lines:
        draw.text((72, y), text, font=medium, fill=INK)
        y += 48
    # The capture, scaled to the width of the column, running off the bottom.
    top = max(y + 56, 470)
    scale = (W - 144) / capture.width
    shot = capture.resize((W - 144, int(capture.height * scale)), Image.LANCZOS)
    shot = rounded(shot, 56)
    # A soft edge under the device.
    pad = Image.new("RGBA", (shot.width + 12, shot.height + 12), (0, 0, 0, 0))
    ImageDraw.Draw(pad).rounded_rectangle((0, 0, pad.width - 1, pad.height - 1), radius=62, fill=(0, 0, 0, 60))
    canvas.paste(pad, (72 - 6, top + 10), pad)
    canvas.paste(shot, (72, top), shot)
    return canvas


def frame_wide(capture: Image.Image, title: str, subtitle: str, size: tuple[int, int]) -> Image.Image:
    """The tablet fields, landscape: the words on the left half, the capture on the right."""
    width, height = size
    k = height / 1080  # Everything scales with the 7-inch canvas.
    canvas = Image.new("RGB", size, GREEN)
    draw = ImageDraw.Draw(canvas)
    bold = ImageFont.truetype(FONT_BOLD, int(84 * k))
    medium = ImageFont.truetype(FONT_MEDIUM, int(38 * k))
    margin = int(96 * k)
    column = width // 2 - margin - int(40 * k)
    y = int(300 * k)
    for line in title.split("\n"):
        draw.text((margin, y), line, font=bold, fill=INK)
        y += int(100 * k)
    y += int(20 * k)
    words, line, lines = subtitle.split(), "", []
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=medium) > column:
            lines.append(line)
            line = word
        else:
            line = trial
    lines.append(line)
    for text in lines:
        draw.text((margin, y), text, font=medium, fill=INK)
        y += int(52 * k)
    # The capture: its top at the canvas' upper margin, its foot off the edge.
    top = int(120 * k)
    shot_w = int(560 * k)
    shot = capture.resize((shot_w, int(capture.height * shot_w / capture.width)), Image.LANCZOS)
    shot = rounded(shot, int(48 * k))
    x = width - margin - shot_w
    pad = Image.new("RGBA", (shot.width + 12, shot.height + 12), (0, 0, 0, 0))
    ImageDraw.Draw(pad).rounded_rectangle((0, 0, pad.width - 1, pad.height - 1), radius=int(54 * k), fill=(0, 0, 0, 60))
    canvas.paste(pad, (x - 6, top + 10), pad)
    canvas.paste(shot, (x, top), shot)
    return canvas


TABLETS = {"tablet-7": (1920, 1080), "tablet-10": (2560, 1440)}


def main() -> int:
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "visuals" / "screenshots"
    out.mkdir(parents=True, exist_ok=True)
    for folder in TABLETS:
        (out / folder).mkdir(exist_ok=True)
    for name, capture, title, subtitle, drop in SHOTS:
        image = Image.open(src / f"{capture}.png").convert("RGB")
        assert image.size == (W, H), (capture, image.size)
        spliced = splice(image, drop)
        frame(spliced, title, subtitle).save(out / f"{name}.png", optimize=True)
        print(out / f"{name}.png")
        for folder, size in TABLETS.items():
            frame_wide(spliced, title, subtitle, size).save(out / folder / f"{name}.png", optimize=True)
            print(out / folder / f"{name}.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
