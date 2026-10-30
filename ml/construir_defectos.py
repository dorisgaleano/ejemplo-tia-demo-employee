#!/usr/bin/env python3
"""
Construye el dataset de defectos para el análisis exploratorio del Entregable 5.

Fuente de la estructura: los 14 escenarios certificados (docs/CERTIFICACION.md) y las
corridas documentadas allí. La ETIQUETA es SIMULADA con una semilla fija, siguiendo las
causas de fallo que el propio documento registra:

  · autocompletado ambiguo en Assign Leave (corrida 2026-10-21_12-36-18: fallaron las 6 filas ASSIGN),
  · precondición ocupada por otro usuario de la demo compartida (2026-10-22_16-25-38: 0/14),
  · dos ejecuciones simultáneas compartiendo .run/run.json (2026-10-22_16-33-28: 9/14),
  · lentitud del servidor en Assign Leave (hasta ~95 s por fila).

No hay histórico real de defectos: el dataset es un ejercicio de método, no un modelo
desplegable. Así se declara en el documento del entregable.

    python3 ml/construir_defectos.py   →  ml/defectos.csv
"""
from __future__ import annotations

import csv
import random
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "ml" / "defectos.csv"
SEMILLA = 20261023

# --------------------------------------------------------------- escenarios (14 filas)
# campos: caso, modo, dias_licencia, num_cupos, saldo_justo, usa_api, autocompletado, num_pasos
ESCENARIOS = [
    ("HLC-TC-003-01", "HLC-TC-003", "ASSIGN", 1, 0, False, True, True, 6),
    ("HLC-TC-004-01", "HLC-TC-004", "APPLY", 1, 1, False, False, False, 6),
    ("HLC-TC-006-01", "HLC-TC-006", "APPLY", 2, 1, True, True, False, 6),
    ("HLC-TC-006-02", "HLC-TC-006", "ASSIGN", 2, 1, True, True, True, 7),
    ("HLC-TC-007-01", "HLC-TC-007", "APPLY", 2, 1, False, True, False, 7),
    ("HLC-TC-007-02", "HLC-TC-007", "ASSIGN", 2, 1, False, True, True, 7),
    ("HLC-TC-008-01", "HLC-TC-008", "APPLY", 1, 1, True, True, False, 7),
    ("HLC-TC-008-02", "HLC-TC-008", "ASSIGN", 1, 1, True, True, True, 7),
    ("HLC-TC-009-01", "HLC-TC-009", "APPLY", 2, 1, True, True, False, 7),
    ("HLC-TC-010-01", "HLC-TC-010", "APPLY", 2, 1, False, False, False, 6),
    ("HLC-TC-010-02", "HLC-TC-010", "ASSIGN", 2, 1, False, False, True, 7),
    ("HLC-TC-011-01", "HLC-TC-011", "APPLY", 1, 3, True, True, False, 8),
    ("HLC-TC-014-01", "HLC-TC-014", "APPLY", 2, 1, True, True, False, 7),
    ("HLC-TC-014-02", "HLC-TC-014", "ASSIGN", 2, 1, True, True, True, 7),
]

# --------------------------------------------------------------- corridas documentadas
# (id de corrida, tasa base de fallo del escenario, sesgo a ASSIGN, bloqueo del ambiente)
#
# `bloqueo_ambiente = 1` marca las corridas que NO midieron el escenario: la precondición
# estaba ocupada por otro usuario de la demo o dos ejecuciones compartieron .run/run.json.
# Esas filas se conservan en el CSV pero se EXCLUYEN del modelo: predecir un bloqueo no es
# predecir un defecto, y mezclarlos hace que el modelo aprenda ruido del ambiente.
CORRIDAS = [
    ("2026-10-20_21-40-11", 0.03, 1.0, 0),
    ("2026-10-20_22-18-04", 0.03, 1.0, 0),
    ("2026-10-20_22-44-06", 0.05, 1.0, 0),
    ("2026-10-20_23-07-35", 0.05, 1.0, 0),
    ("2026-10-20_23-21-26", 0.08, 1.6, 0),
    ("2026-10-21_08-07-21", 0.03, 1.0, 0),
    # El autocompletado devolvió 4 coincidencias "John … Doe": fallan solo las filas ASSIGN.
    ("2026-10-21_12-36-18", 0.02, 12.0, 0),
    ("2026-10-21_19-39-12", 0.03, 1.0, 0),
    # Otro usuario de la demo ocupó LUN/MAR: falla la precondición en todas las filas.
    ("2026-10-22_16-25-38", 0.95, 1.0, 1),
    # Dos corridas simultáneas compartiendo .run/run.json.
    ("2026-10-22_16-33-28", 0.55, 1.4, 1),
    ("2026-10-22_16-46-50", 0.03, 1.0, 0),
]

MEDIA_SEG = {"APPLY": 30.0, "ASSIGN": 90.0}

# Factor de calibración: con las tasas documentadas (~3-8 % por corrida) el ejercicio quedaría
# con ~11 positivos de 126 filas y las métricas no serían estables. Se escala para obtener una
# masa crítica de ~15 %, que es lo que se declara en el documento. Es una decisión del ejercicio,
# no una medición: el dataset es simulado.


def probabilidad(modo: str, saldo_justo: bool, autocompletado: bool, base: float, sesgo_assign: float) -> float:
    """Probabilidad de fallo simulada a partir de las causas documentadas."""
    p = base
    if modo == "ASSIGN":
        p *= sesgo_assign
        # El autocompletado por nombre es la causa registrada de los fallos de Assign.
        p *= 2.2 if autocompletado else 1.0
    if saldo_justo:
        p *= 1.3  # los bordes de saldo producen más rechazos inesperados
    return min(p * 1.8, 0.98)


def main() -> None:
    rng = random.Random(SEMILLA)
    filas = []
    for corrida, base, sesgo, bloqueo in CORRIDAS:
        for esc, caso, modo, dias, cupos, saldo_justo, usa_api, autocompletado, pasos in ESCENARIOS:
            p = probabilidad(modo, saldo_justo, autocompletado, base, sesgo)
            # En una corrida bloqueada la fila no llega a ejecutarse: cuenta como no exitosa.
            defectuoso = 1 if (bloqueo or rng.random() < p) else 0
            duracion = MEDIA_SEG[modo] * (1 + rng.gauss(0, 0.18)) + (25 if defectuoso else 0)
            filas.append({
                "corrida": corrida,
                "escenario": esc,
                "caso": caso,
                "modo": modo,
                "dias_licencia": dias,
                "num_cupos": cupos,
                "saldo_justo": int(saldo_justo),
                "usa_api": int(usa_api),
                "requiere_autocompletado": int(autocompletado),
                "num_pasos": pasos,
                "depende_demo_compartida": 1,
                "bloqueo_ambiente": bloqueo,
                "duracion_seg": round(duracion, 1),
                "defectuoso": defectuoso,
            })

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    with SALIDA.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        writer.writeheader()
        writer.writerows(filas)

    utiles = [f for f in filas if not f["bloqueo_ambiente"]]
    tasa = sum(f["defectuoso"] for f in utiles) / len(utiles)
    print(f"[defectos] {len(filas)} filas ({len(CORRIDAS)} corridas × {len(ESCENARIOS)} escenarios)")
    print(f"[defectos] {len(utiles)} filas utilizables · tasa de defecto simulada: {tasa:.1%}")
    print(f"[defectos] {len(filas) - len(utiles)} filas de corridas bloqueadas (excluidas del modelo)")
    print(f"[defectos] → {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

