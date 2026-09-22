import gzip
import shutil
from pathlib import Path


FRONTEND = Path(__file__).resolve().parent / "frontend"
TARGETS = ["styles.css", "script.js"]

print(f"📁 Папка: {FRONTEND}\n")

for name in TARGETS:
    src = FRONTEND / name
    dst = FRONTEND / f"{name}.gz"
    if not src.exists():
        print(f"⚠️  {name} не найден")
        continue
    with open(src, "rb") as f_in, gzip.open(dst, "wb", compresslevel=9) as f_out:
        shutil.copyfileobj(f_in, f_out)
    orig = src.stat().st_size
    comp = dst.stat().st_size
    print(f"✅ {name}: {orig:,} → {comp:,} байт (экономия {100-comp/orig*100:.1f}%)")

print("\n🎉 Готово.")