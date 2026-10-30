#!/usr/bin/env python3
"""
Genera el dataset sintético del Entregable 5 con el MISMO esquema que el Excel manual.

Lee data/input/ia/esquema.json (exportado del registro de casos con
`node scripts/exportar-esquema.js`), de modo que hojas, columnas y orden no se escriben a
mano aquí: si el registro cambia, basta reexportar el esquema.

Uso:
    python3 ml/generar_datos_ia.py

Salida:
    data/input/ia/datos_pruebas_ia.xlsx

Las filas se diseñaron con las reglas de negocio del módulo Leave (vigencia de cupos,
reparto FIFO, saldo justo). El archivo resultante se valida con el validador real de la
suite: `node scripts/validar-dataset-ia.js`.
"""
from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

RAIZ = Path(__file__).resolve().parents[1]
ESQUEMA = RAIZ / "data" / "input" / "ia" / "esquema.json"
SALIDA = RAIZ / "data" / "input" / "ia" / "datos_pruebas_ia.xlsx"

# --------------------------------------------------------------------------- filas
# Cada fila está pensada para cubrir un borde distinto: saldo exacto, saldo +1 día,
# vigencia parcial del cupo, cupo menor que un día y reparto entre tres cupos.
FILAS: dict[str, list[dict[str, str]]] = {
    "HLC-TC-003": [
        {"IdFila": "HLC-TC-003-01", "Descripcion": "Assign MAR de un tipo sin cupos", "Modo": "ASSIGN",
         "FechaDesde": "MAR", "FechaHasta": "MAR", "DiasLicencia": "1"},
        {"IdFila": "HLC-TC-003-02", "Descripcion": "Assign LUN–MAR de dos días sin cupos: saldo negativo de dos días",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "MAR", "DiasLicencia": "2"},
        {"IdFila": "HLC-TC-003-03", "Descripcion": "Assign LUN de un día sin cupos: saldo negativo de un día",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "LUN", "DiasLicencia": "1"},
    ],
    "HLC-TC-004": [
        {"IdFila": "HLC-TC-004-01", "Descripcion": "Un día con saldo sobrado en un solo cupo", "Modo": "APPLY",
         "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "20", "Cupo1_Desde": "INICIO_PERIODO",
         "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1", "EstadoEsperado": "Pending Approval", "DiasUsados1": "1"},
        {"IdFila": "HLC-TC-004-02", "Descripcion": "Dos días con saldo sobrado: consumo de dos días en un cupo",
         "Modo": "APPLY", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "20",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2",
         "EstadoEsperado": "Pending Approval", "DiasUsados1": "2"},
        {"IdFila": "HLC-TC-004-03", "Descripcion": "Saldo exacto: un día con cupo de un día se acepta",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "1",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1",
         "EstadoEsperado": "Pending Approval", "DiasUsados1": "1"},
        {"IdFila": "HLC-TC-004-04", "Descripcion": "Cupo de cinco días y dos solicitados: saldo restante positivo",
         "Modo": "APPLY", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "5",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2",
         "EstadoEsperado": "Pending Approval", "DiasUsados1": "2"},
        {"IdFila": "HLC-TC-004-05", "Descripcion": "Cupo de diez días y un día solicitado desde MAR",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "10",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1",
         "EstadoEsperado": "Pending Approval", "DiasUsados1": "1"},
    ],
    "HLC-TC-006": [
        {"IdFila": "HLC-TC-006-01", "Descripcion": "Apply LUN–MAR con cupo desde MAR: rechazo", "Modo": "APPLY",
         "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "20", "Cupo1_Desde": "MAR",
         "Cupo1_Hasta": "FIN_PERIODO"},
        {"IdFila": "HLC-TC-006-02", "Descripcion": "Assign LUN–MAR con cupo desde MAR: consume solo MAR",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "20",
         "Cupo1_Desde": "MAR", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2", "DiasUsados1": "1"},
        {"IdFila": "HLC-TC-006-03", "Descripcion": "Apply de un solo día previo al cupo: rechazo",
         "Modo": "APPLY", "FechaDesde": "LUN", "FechaHasta": "LUN", "Cupo1_Dias": "20",
         "Cupo1_Desde": "MAR", "Cupo1_Hasta": "FIN_PERIODO"},
        {"IdFila": "HLC-TC-006-04", "Descripcion": "Assign de un día previo al cupo: no consume cupo",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "LUN", "Cupo1_Dias": "20",
         "Cupo1_Desde": "MAR", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1", "DiasUsados1": "0"},
    ],
    "HLC-TC-007": [
        {"IdFila": "HLC-TC-007-01", "Descripcion": "Apply LUN–MAR con cupo hasta LUN: rechazo", "Modo": "APPLY",
         "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "20", "Cupo1_Desde": "INICIO_PERIODO",
         "Cupo1_Hasta": "LUN"},
        {"IdFila": "HLC-TC-007-02", "Descripcion": "Assign LUN–MAR con cupo hasta LUN: consume solo LUN",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "20",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "LUN", "DiasLicencia": "2", "DiasUsados1": "1"},
    ],
    "HLC-TC-008": [
        {"IdFila": "HLC-TC-008-01", "Descripcion": "Apply MAR (día completo) con cupo de 0.5: rechazo",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.5",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO"},
        {"IdFila": "HLC-TC-008-02", "Descripcion": "Assign MAR (día completo) con cupo de 0.5: consume 0.5",
         "Modo": "ASSIGN", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.5",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1", "DiasUsados1": "0.5"},
        {"IdFila": "HLC-TC-008-03", "Descripcion": "Borde inferior: cupo de 0.25 y un día completo: rechazo",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.25",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO"},
        {"IdFila": "HLC-TC-008-04", "Descripcion": "Borde inferior en Assign: cupo de 0.25, consume 0.25",
         "Modo": "ASSIGN", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.25",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1", "DiasUsados1": "0.25"},
        {"IdFila": "HLC-TC-008-05", "Descripcion": "Dos días asignados con cupo de 0.5: consume solo 0.5",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "0.5",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2", "DiasUsados1": "0.5"},
    ],
    "HLC-TC-009": [
        {"IdFila": "HLC-TC-009-01", "Descripcion": "Apply LUN–MAR con cupo de 2 días: agota el saldo",
         "Modo": "APPLY", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "2",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2",
         "EstadoEsperado": "Pending Approval", "DiasUsados1": "2", "SaldoEsperado": "0"},
        {"IdFila": "HLC-TC-009-02", "Descripcion": "Apply de un día con cupo de un día: saldo exactamente cero",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "1",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "1",
         "EstadoEsperado": "Pending Approval", "DiasUsados1": "1", "SaldoEsperado": "0"},
    ],
    "HLC-TC-010": [
        {"IdFila": "HLC-TC-010-01", "Descripcion": "Apply LUN–MAR con cupo de 1 día: rechazo", "Modo": "APPLY",
         "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "1", "Cupo1_Desde": "INICIO_PERIODO",
         "Cupo1_Hasta": "FIN_PERIODO"},
        {"IdFila": "HLC-TC-010-02", "Descripcion": "Assign LUN–MAR con cupo de 1 día: consume 1", "Modo": "ASSIGN",
         "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "1", "Cupo1_Desde": "INICIO_PERIODO",
         "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2", "DiasUsados1": "1"},
    ],
    "HLC-TC-011": [
        {"IdFila": "HLC-TC-011-01", "Descripcion": "Apply MAR con cupos 0.25/0.25/5: reparto FIFO", "Modo": "APPLY",
         "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.25", "Cupo1_Desde": "INICIO_PERIODO",
         "Cupo1_Hasta": "FIN_PERIODO", "Cupo2_Dias": "0.25", "Cupo2_Desde": "INICIO_PERIODO+1M",
         "Cupo2_Hasta": "FIN_PERIODO", "Cupo3_Dias": "5", "Cupo3_Desde": "INICIO_PERIODO+2M",
         "Cupo3_Hasta": "FIN_PERIODO", "DiasLicencia": "1", "DiasUsados1": "0.25",
         "DiasUsados2": "0.25", "DiasUsados3": "0.5"},
        {"IdFila": "HLC-TC-011-02", "Descripcion": "Apply MAR con cupos 0.25/0.25/0.5: el tercero cubre el resto",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.25",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "Cupo2_Dias": "0.25",
         "Cupo2_Desde": "INICIO_PERIODO+1M", "Cupo2_Hasta": "FIN_PERIODO", "Cupo3_Dias": "0.5",
         "Cupo3_Desde": "INICIO_PERIODO+2M", "Cupo3_Hasta": "FIN_PERIODO", "DiasLicencia": "1",
         "DiasUsados1": "0.25", "DiasUsados2": "0.25", "DiasUsados3": "0.5"},
        {"IdFila": "HLC-TC-011-03", "Descripcion": "Apply MAR con cupos 0.5/0.25/5: orden de consumo invertido",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.5",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "Cupo2_Dias": "0.25",
         "Cupo2_Desde": "INICIO_PERIODO+1M", "Cupo2_Hasta": "FIN_PERIODO", "Cupo3_Dias": "5",
         "Cupo3_Desde": "INICIO_PERIODO+2M", "Cupo3_Hasta": "FIN_PERIODO", "DiasLicencia": "1",
         "DiasUsados1": "0.5", "DiasUsados2": "0.25", "DiasUsados3": "0.25"},
        {"IdFila": "HLC-TC-011-04", "Descripcion": "Apply MAR con cupos 0.25/0.5/5: el segundo cubre 0.5",
         "Modo": "APPLY", "FechaDesde": "MAR", "FechaHasta": "MAR", "Cupo1_Dias": "0.25",
         "Cupo1_Desde": "INICIO_PERIODO", "Cupo1_Hasta": "FIN_PERIODO", "Cupo2_Dias": "0.5",
         "Cupo2_Desde": "INICIO_PERIODO+1M", "Cupo2_Hasta": "FIN_PERIODO", "Cupo3_Dias": "5",
         "Cupo3_Desde": "INICIO_PERIODO+2M", "Cupo3_Hasta": "FIN_PERIODO", "DiasLicencia": "1",
         "DiasUsados1": "0.25", "DiasUsados2": "0.5", "DiasUsados3": "0.25"},
    ],
    "HLC-TC-014": [
        {"IdFila": "HLC-TC-014-01", "Descripcion": "Apply LUN–MAR con cupo de 1 día desde MAR: rechazo",
         "Modo": "APPLY", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "1",
         "Cupo1_Desde": "MAR", "Cupo1_Hasta": "FIN_PERIODO"},
        {"IdFila": "HLC-TC-014-02", "Descripcion": "Assign LUN–MAR con cupo de 1 día desde MAR: consume solo MAR",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "1",
         "Cupo1_Desde": "MAR", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2", "DiasUsados1": "1"},
        {"IdFila": "HLC-TC-014-03", "Descripcion": "Assign LUN–MAR con cupo de 2 días desde MAR: consume 1 de 2",
         "Modo": "ASSIGN", "FechaDesde": "LUN", "FechaHasta": "MAR", "Cupo1_Dias": "2",
         "Cupo1_Desde": "MAR", "Cupo1_Hasta": "FIN_PERIODO", "DiasLicencia": "2", "DiasUsados1": "1"},
    ],
}

# --------------------------------------------------------------------------- formato
CABECERA = Font(bold=True, color="FFFFFF")
FONDO_CABECERA = PatternFill("solid", fgColor="2D5F8A")


def escribir_hoja(ws, columnas: list[str], filas: list[dict[str, str]]) -> None:
    ws.append(columnas)
    for celda in ws[1]:
        celda.font = CABECERA
        celda.fill = FONDO_CABECERA
        celda.alignment = Alignment(vertical="center")
    for fila in filas:
        ws.append([fila.get(c, "") for c in columnas])
    ws.freeze_panes = "A2"
    for i, col in enumerate(columnas, start=1):
        ancho = max(len(col), *(len(str(f.get(col, ""))) for f in filas)) if filas else len(col)
        ws.column_dimensions[get_column_letter(i)].width = min(max(ancho + 2, 10), 60)


def main() -> None:
    esquema = json.loads(ESQUEMA.read_text(encoding="utf-8"))
    wb = Workbook()

    # Primera hoja: trazabilidad del origen (el validador ignora "Instrucciones").
    inst = wb.active
    inst.title = "Instrucciones"
    inst.append(["Origen", "Dataset sintético generado con IA para el Entregable 5 — no contiene datos de personas reales"])
    inst.append(["Generado por", "ml/generar_datos_ia.py a partir de data/input/ia/esquema.json"])
    inst.append(["Esquema", "Idéntico a data/input/datos_pruebas.xlsx (hojas, columnas y orden del registro de casos)"])
    inst.append(["Uso", "Copia este archivo sobre datos_pruebas.xlsx solo si quieres ejecutar estas filas; el set manual no se modifica"])
    inst.append([])
    inst.append(["Columna", "Qué significa"])
    for col, doc in esquema["columnas"].items():
        inst.append([col, doc["descripcion"]])
    inst.column_dimensions["A"].width = 22
    inst.column_dimensions["B"].width = 110
    for fila in inst.iter_rows(min_row=1, max_row=5):
        for celda in fila:
            celda.font = Font(bold=True) if celda.column == 1 else Font()

    total = 0
    for caso in esquema["casos"]:
        filas = FILAS[caso["id"]]
        faltan = set(filas[0].keys()) - set(caso["columnas"])
        if faltan:
            raise SystemExit(f"{caso['id']}: columnas no declaradas en el registro: {sorted(faltan)}")
        ws = wb.create_sheet(caso["id"])
        # Ejecutar = SI en todas: son propuestas pensadas para poder ejecutarse.
        escribir_hoja(ws, caso["columnas"], [{"Ejecutar": "SI", **f} for f in filas])
        total += len(filas)

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    wb.save(SALIDA)
    print(f"[datos-ia] {total} filas en {len(esquema['casos'])} hojas → {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

