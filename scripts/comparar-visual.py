#!/usr/bin/env python3
"""
Comparación de dos corridas visuales: cuánto cambió cada pantalla, píxel a píxel.

Es el respaldo local de Percy (que necesita token y servicio) y sirve para dos cosas:
  · medir el RUIDO de la demo: dos corridas sin cambios no deberían diferir;
  · demostrar la DETECCIÓN: un cambio de estilo controlado debe marcar solo lo afectado.

    python3 scripts/comparar-visual.py <dir_base> <dir_nueva> [--salida=DIR]

Salida: un PNG de diferencia por pantalla (rojo = cambió) y un resumen JSON + tabla.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops

# Un píxel cuenta como cambiado si algún canal difiere en más de este valor. Evita que el
# antialiasing y la compresión del navegador inflen el porcentaje.
UMBRAL = 12


def comparar(base: Path, nueva: Path, salida: Path) -> dict:
    salida.mkdir(parents=True, exist_ok=True)
    filas = []
    for img_base in sorted(base.glob("*.png")):
        img_nueva = nueva / img_base.name
        if not img_nueva.exists():
            filas.append({"pantalla": img_base.stem, "estado": "FALTA", "cambio_pct": None})
            continue
        a = Image.open(img_base).convert("RGB")
        b = Image.open(img_nueva).convert("RGB")
        if a.size != b.size:
            filas.append({"pantalla": img_base.stem, "estado": "TAMAÑO DISTINTO", "cambio_pct": None})
            continue

        diff = ImageChops.difference(a, b).convert("L")
        mascara = diff.point(lambda v: 255 if v > UMBRAL else 0)
        cambiados = sum(1 for v in mascara.getdata() if v)
        total = a.size[0] * a.size[1]
        pct = round(cambiados / total * 100, 3)

        # Imagen de diferencia: la pantalla nueva atenuada y en rojo lo que cambió.
        tenue = Image.blend(b, Image.new("RGB", b.size, (255, 255, 255)), 0.65)
        tenue.paste((220, 38, 38), mask=mascara)
        tenue.save(salida / f"{img_base.stem}_diff.png")

        filas.append({
            "pantalla": img_base.stem,
            "estado": "DIFERENTE" if cambiados else "IGUAL",
            "cambio_pct": pct,
            "pixeles": cambiados,
        })
    return {"base": str(base), "nueva": str(nueva), "umbral": UMBRAL, "pantallas": filas}


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(1)
    base, nueva = Path(sys.argv[1]), Path(sys.argv[2])
    salida = Path(sys.argv[3].split("=", 1)[1]) if len(sys.argv) > 3 else nueva / "diff"
    resumen = comparar(base, nueva, salida)

    print(f"\n[comparar] {base.name}  →  {nueva.name}   (umbral {resumen['umbral']})")
    print(f"{'Pantalla':<20}{'Estado':<12}{'Cambio'}")
    print("-" * 46)
    for f in resumen["pantallas"]:
        pct = f"{f['cambio_pct']:.3f} %" if f["cambio_pct"] is not None else "—"
        print(f"{f['pantalla']:<20}{f['estado']:<12}{pct}")
    detectadas = sum(1 for f in resumen["pantallas"] if f["estado"] != "IGUAL")
    print(f"\nPantallas con diferencia: {detectadas} de {len(resumen['pantallas'])}")
    print(f"Diferencias en: {salida}\n")

    (salida / "resumen.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False), "utf-8")


if __name__ == "__main__":
    main()

