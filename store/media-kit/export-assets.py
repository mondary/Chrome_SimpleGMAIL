#!/usr/bin/env python3
"""Create the promo images and motion exports from the local demo capture."""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / "store"
ASSETS = MEDIA / "assets"
SCREENSHOTS = MEDIA / "screenshots"
FRAMES = MEDIA / "media-kit/.frames"
FONT = "/System/Library/Fonts/Supplemental/Verdana.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Verdana Bold.ttf"
ASSETS.mkdir(parents=True, exist_ok=True)


def font(size, bold=False):
    path = FONT_BOLD if bold and Path(FONT_BOLD).exists() else FONT
    return ImageFont.truetype(path, size)


def rounded_image(image, size, radius=12):
    image = image.copy()
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, "#ffffff")
    x, y = (size[0] - image.width) // 2, (size[1] - image.height) // 2
    canvas.paste(image, (x, y))
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return canvas, mask


def promo_image(path, size, heading, subheading, tag, shot_box):
    image = Image.new("RGB", size, "#191a1e")
    draw = ImageDraw.Draw(image)
    w, h = size
    draw.rounded_rectangle((50, 48, 80, 78), radius=9, fill="#ffffff")
    icon = Image.open(ROOT / "archives/versions/05-simplify-2026.10.16/icons/32.png").convert("RGBA").resize((30, 30))
    image.paste(icon, (50, 48), icon)
    draw.text((92, 53), "PK GMAIL  /  SIMPLIFY STYLE", font=font(13, True), fill="#e4e4e5")
    draw.text((50, 116), tag.upper(), font=font(10, True), fill="#f18777")
    x, y, maxw, maxh = shot_box
    title_size = 52 if w > 1300 else 48
    title = font(title_size, True)
    lines = heading.split("\n")
    for i, line in enumerate(lines):
        draw.text((50, 154 + i * (title_size + 3)), line, font=title, fill="#ffffff")
    body_y = 154 + len(lines) * (title_size + 8)
    draw.multiline_text((52, body_y), subheading, font=font(16 if w > 1300 else 15), fill="#c2c3c7", spacing=7)
    draw.rounded_rectangle((50, h - 76, 253, h - 35), radius=4, fill="#df5949")
    draw.text((67, h - 63), "EXTENSION CHROME", font=font(11, True), fill="white")
    draw.text((50, h - 23), "ILLUSTRATION · COURRIELS FICTIFS", font=font(9, True), fill="#97999f")
    source = Image.open(SCREENSHOTS / "01-inbox.png").convert("RGB")
    crop = source.crop((0, 0, source.width, min(source.height, 720)))
    preview, mask = rounded_image(crop, (maxw, maxh), 9)
    image.paste(preview, (x, y), mask)
    ImageDraw.Draw(image).rounded_rectangle((x, y, x + maxw - 1, y + maxh - 1), radius=9, outline="#565860", width=2)
    image.save(path, optimize=True)


promo_image(ASSETS / "banner-1544x500.png", (1544, 500), "Gmail, avec", "de l’espace.", "Installation locale · sans compte tiers", (750, 75, 744, 360))
promo_image(ASSETS / "card-1200x630.png", (1200, 630), "Gmail, avec\nde l’espace.", "Une boîte plus lisible.\nVos courriels restent chez Gmail.", "Une autre façon de lire Gmail", (600, 210, 550, 350))

frames = sorted(FRAMES.glob("*.png"))
if not frames:
    raise SystemExit("Capture frames missing; run capture-extension.mjs first")
video = MEDIA / "videos/demo.mp4"
video.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-y", "-framerate", "12", "-i", str(FRAMES / "%04d.png"), "-vf", "crop=1280:720:0:40,fps=24,scale=1280:720:flags=lanczos", "-c:v", "libx264", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

gifs = MEDIA / "gifs"
gifs.mkdir(parents=True, exist_ok=True)
for name, width in (("demo-large.gif", 800), ("demo-compact.gif", 480)):
    out = gifs / name
    vf = f"fps=10,scale={width}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=112[p];[b][p]paletteuse=dither=bayer"
    subprocess.run(["ffmpeg", "-y", "-i", str(video), "-vf", vf, "-loop", "0", str(out)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print(f"Created: {ASSETS / 'banner-1544x500.png'}, {ASSETS / 'card-1200x630.png'}, {video}")
