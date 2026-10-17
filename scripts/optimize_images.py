# -*- coding: utf-8 -*-
"""
Оптимизация исходников из папки «моё-портфолио» в весовые файлы для сайта.

Запуск:  py scripts/optimize_images.py

Что делает:
  * аватарки  -> assets/img/works/avatars/<slug>-thumb.webp (640) и -full.webp (1400)
  * баннеры   -> assets/img/works/banners/<slug>-thumb.webp (960) и -full.webp (1920)
  * портрет   -> assets/img/ui/nellz-portrait-640.webp / -1000.webp
  * обложка   -> assets/img/ui/youtube-cover-thumb.webp / -full.webp
  * значок    -> favicon.ico, favicon-32.png, apple-touch-icon.png (из brand-monogram.png)
  * og-image  -> assets/img/og-image.jpg (1200x630, для превью ссылки в соцсетях)

Оригиналы не изменяются. Скрипт идемпотентный — можно запускать повторно.
"""

from __future__ import annotations

import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "моё-портфолио"
OUT = ROOT / "assets" / "img"
UI = OUT / "ui"

WEBP_QUALITY = 84
WEBP_METHOD = 6

# --- сопоставление исходников и «слагов» (латиница, kebab-case) ---------------

AVATARS = [
    ("Малян.png", "malyan"),
    ("ALPHA SNOS.jpg", "alpha-snos"),
    ("DataScope.png", "datascope"),
    ("DUROVKGQ.png", "durovkgq"),
    ("FLAIS STARS.png", "flais-stars"),
    ("FOREST_ABA.png", "forest-aba"),
    ("FUEL OTC.png", "fuel-otc"),
    ("HYDRO-REBORN2.png", "hydro-reborn-2"),
    ("lavestore.png", "lavestore"),
    ("Lostheavenstore.png", "lostheaven-store"),
    ("qzamo-store.png", "qzamo-store"),
    ("STARBACK1.png", "starback-1"),
    ("witu444.png", "witu444"),
]

BANNERS = [
    ("CRYSTAL_PAGE.png", "crystal-page"),
    ("FOREST_BANNER.png", "forest-banner"),
    ("HYDRO-REBORN.png", "hydro-reborn"),
    ("RD-NEW-BANNER.png", "rd-new-banner"),
    ("STARBACK2.png", "starback-2"),
]

PERSONAL_PREFIX = "МОЯ АВААТАРКА"
VIDEO_COVER_PREFIX = "ПРЕВЬЮ_АВАТАРКА"

# --- палитра сайта (совпадает с css) -----------------------------------------

CANVAS = (5, 6, 10)
VIOLET = (139, 124, 246)
CHROME_TOP = (255, 255, 255)
CHROME_BOTTOM = (142, 160, 191)
MUTED = (155, 160, 174)


def log(msg: str) -> None:
    print(msg, flush=True)


def find_by_prefix(folder: pathlib.Path, prefix: str) -> pathlib.Path:
    for f in sorted(folder.iterdir()):
        if f.is_file() and f.name.startswith(prefix):
            return f
    raise FileNotFoundError(f"Не найден файл с префиксом «{prefix}» в {folder}")


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Вписать изображение в квадрат/прямоугольник с обрезкой по центру."""
    tw, th = size
    im = im.convert("RGB")
    ratio = max(tw / im.width, th / im.height)
    new = (round(im.width * ratio), round(im.height * ratio))
    im = im.resize(new, Image.Resampling.LANCZOS)
    left = (im.width - tw) // 2
    top = (im.height - th) // 2
    return im.crop((left, top, left + tw, top + th))


def fit(im: Image.Image, max_side: int) -> Image.Image:
    """Уменьшить по длинной стороне, не растягивая (если уже меньше — не трогать)."""
    im = im.convert("RGB")
    if max(im.size) <= max_side:
        return im
    ratio = max_side / max(im.size)
    return im.resize((round(im.width * ratio), round(im.height * ratio)), Image.Resampling.LANCZOS)


def save_webp(im: Image.Image, path: pathlib.Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    log(f"  {path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} KB  {im.width}x{im.height}")


def build_works() -> None:
    log("\nАватарки:")
    for name, slug in AVATARS:
        with Image.open(SRC / "аватарки" / name) as im:
            save_webp(fit(im, 640), OUT / "works" / "avatars" / f"{slug}-thumb.webp")
            save_webp(fit(im, 1400), OUT / "works" / "avatars" / f"{slug}-full.webp")

    log("\nБаннеры:")
    for name, slug in BANNERS:
        with Image.open(SRC / "баннеры" / name) as im:
            save_webp(fit(im, 960), OUT / "works" / "banners" / f"{slug}-thumb.webp")
            save_webp(fit(im, 1920), OUT / "works" / "banners" / f"{slug}-full.webp")


def build_ui() -> None:
    log("\nUI-графика:")

    with Image.open(find_by_prefix(SRC / "аватарки", PERSONAL_PREFIX)) as im:
        save_webp(fit(im, 640), UI / "nellz-portrait-640.webp")
        save_webp(fit(im, 1000), UI / "nellz-portrait-1000.webp")

    with Image.open(find_by_prefix(SRC / "баннеры", VIDEO_COVER_PREFIX)) as im:
        save_webp(fit(im, 720), UI / "youtube-cover-thumb.webp")
        save_webp(fit(im, 1280), UI / "youtube-cover-full.webp")


def build_icons() -> None:
    log("\nЗначки:")
    monogram = Image.open(UI / "brand-monogram.png").convert("RGBA")
    square = monogram.resize((512, 512), Image.Resampling.LANCZOS)

    # favicon.ico — белый знак на прозрачном фоне
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    square.save(ROOT / "favicon.ico", sizes=ico_sizes)
    log(f"  favicon.ico  {(ROOT / 'favicon.ico').stat().st_size / 1024:.1f} KB")
    square.resize((32, 32), Image.Resampling.LANCZOS).save(UI / "favicon-32.png")
    log(f"  assets/img/ui/favicon-32.png")

    # apple-touch-icon — знак на непрозрачном тёмном фоне со скруглением
    bg = Image.new("RGBA", (512, 512), CANVAS + (255,))
    bg.alpha_composite(square)
    mask = Image.new("L", (512, 512), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 511, 511), radius=96, fill=255)
    touch = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    touch.paste(bg, (0, 0), mask)
    touch.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / "apple-touch-icon.png")
    log(f"  apple-touch-icon.png")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    for candidate in (name, "arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    grad = Image.new("RGB", (1, h))
    px = grad.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return grad.resize((w, h), Image.Resampling.BILINEAR)


def radial_glow(size: tuple[int, int], color: tuple[int, int, int], strength: float) -> Image.Image:
    """Мягкое свечение: радиальный градиент как маска для цветного слоя."""
    mask = Image.radial_gradient("L").resize(size, Image.Resampling.BILINEAR)
    mask = mask.point(lambda v: round((255 - v) * strength))
    layer = Image.new("RGB", size, color)
    return layer, mask


def build_og_image() -> None:
    log("\nOG-превью:")
    w, h = 1200, 630
    canvas = Image.new("RGB", (w, h), CANVAS)

    # свечение сверху
    layer, mask = radial_glow((w, h), VIOLET, 0.30)
    canvas.paste(layer, (0, 0), mask)

    # чертёжная сетка
    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, w, 60):
        gd.line([(x, 0), (x, h)], fill=(255, 255, 255, 12), width=1)
    for y in range(0, h, 60):
        gd.line([(0, y), (w, y)], fill=(255, 255, 255, 12), width=1)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), grid).convert("RGB")

    draw = ImageDraw.Draw(canvas)

    # монограмм
    mono = Image.open(UI / "brand-monogram.png").convert("RGBA").resize((132, 132), Image.Resampling.LANCZOS)
    mono_box = (86, 74, 86 + 132, 74 + 132)
    plate = Image.new("RGBA", (152, 152), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle(
        (0, 0, 151, 151), radius=40, fill=(255, 255, 255, 14), outline=(255, 255, 255, 28), width=2
    )
    plate.alpha_composite(mono, (10, 10))
    canvas = canvas.convert("RGBA")
    canvas.alpha_composite(plate, (76, 64))
    canvas = canvas.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    # хромированный логотип
    title_font = font("segoeuib.ttf", 84)
    title = "NELLZ DESIGN"
    tx, ty = 86, 262
    mask_title = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask_title).text((tx, ty), title, font=title_font, fill=255)
    canvas.paste(vertical_gradient((w, h), CHROME_TOP, CHROME_BOTTOM), (0, 0), mask_title)

    draw = ImageDraw.Draw(canvas)
    draw.text(
        (86, 372),
        "Аватарки · Баннеры · Анимированные эмодзи для Telegram",
        font=font("segoeui.ttf", 30),
        fill=MUTED,
    )

    # нижняя строка с акцентом
    draw.line([(86, 470), (1114, 470)], fill=(255, 255, 255, 26), width=1)
    draw.text((86, 498), "400+ работ", font=font("segoeui.ttf", 26), fill=(255, 255, 255))
    draw.text((300, 498), "·", font=font("segoeui.ttf", 26), fill=MUTED)
    draw.text((326, 498), "300+ отзывов", font=font("segoeui.ttf", 26), fill=(255, 255, 255))
    draw.text((562, 498), "·", font=font("segoeui.ttf", 26), fill=MUTED)
    draw.text((588, 498), "опыт 2+ года", font=font("segoeui.ttf", 26), fill=(255, 255, 255))

    draw.text((86, 556), "nellzdsg.github.io/nellz-design", font=font("consola.ttf", 24), fill=VIOLET)

    UI.mkdir(parents=True, exist_ok=True)
    path = UI / "og-image.jpg"
    canvas.save(path, "JPEG", quality=88, optimize=True, progressive=True)
    log(f"  assets/img/ui/og-image.jpg  {path.stat().st_size / 1024:.0f} KB  {w}x{h}")


def main() -> None:
    if not SRC.exists():
        sys.exit(f"Не найдена папка с исходниками: {SRC}")
    build_works()
    build_ui()
    build_icons()
    build_og_image()
    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    log(f"\nГотово. Всего в assets/img: {total / 1024 / 1024:.1f} МБ")


if __name__ == "__main__":
    main()
