# -*- coding: utf-8 -*-
"""
Распаковка анимированных эмодзи Telegram (.tgs) в обычный Lottie JSON,
который умеет проигрывать lottie-web.

.tgs — это обычный gzip от Lottie JSON, поэтому распаковка = gunzip.

Запуск:  py scripts/prepare_lottie.py
Результат: js/lottie/emoji-1.json ... emoji-N.json
"""

from __future__ import annotations

import gzip
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "моё-портфолио" / "анимированные эмодзи"
OUT = ROOT / "js" / "lottie"


def main() -> None:
    if not SRC.is_dir():
        sys.exit(f"Не найдена папка с эмодзи: {SRC}")

    files = sorted(f for f in SRC.iterdir() if f.suffix.lower() == ".tgs")
    if not files:
        sys.exit("В папке нет файлов .tgs")

    OUT.mkdir(parents=True, exist_ok=True)

    for index, path in enumerate(files, start=1):
        with gzip.open(path, "rb") as fh:
            data = json.load(fh)

        target = OUT / f"emoji-{index}.json"
        # separators без пробелов — файл меньше, читаемость не важна
        target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(
            f"  {target.relative_to(ROOT)}  {target.stat().st_size / 1024:.0f} KB  "
            f"{data.get('w')}x{data.get('h')} @{data.get('fr')}fps, кадров: {data.get('op')}, "
            f"слоёв: {len(data.get('layers', []))}",
            flush=True,
        )

    print(f"\nГотово: {len(files)} анимации")


if __name__ == "__main__":
    main()
