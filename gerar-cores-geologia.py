"""Gera data/geologia_cores.json a partir de data/geologia_brasil.sld (estilo QGIS)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLD = ROOT / "data" / "geologia_brasil.sld"
OUT = ROOT / "data" / "geologia_cores.json"

def main():
    text = SLD.read_text(encoding="utf-8")
    colors = {}
    for rule in re.findall(r"<se:Rule>.*?</se:Rule>", text, flags=re.DOTALL):
        name = re.search(r"<se:Name>([^<]+)</se:Name>", rule)
        fill = re.search(r'name="fill">([^<]+)<', rule)
        if name and fill:
            colors[name.group(1)] = fill.group(1)
    OUT.write_text(json.dumps(colors, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"OK: {len(colors)} cores -> {OUT}")

if __name__ == "__main__":
    main()
