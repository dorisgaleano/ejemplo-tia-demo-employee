#!/usr/bin/env python3
"""
Variante del dataset SIN darle al modelo el esquema ni las reglas de negocio.

Reproduce lo que devuelve un primer prompt del tipo "genera 15 filas de prueba para el
módulo de licencias de OrangeHRM": columnas inventadas, fechas en lenguaje natural, modos
en español y números con coma decimal. Se conserva como EVIDENCIA de la primera iteración
para poder comparar contra el dataset que sí recibió el esquema.

No se ejecuta nunca: solo se valida, para medir cuántas filas sobreviven al validador real.
    node scripts/validar-dataset-ia.js data/input/ia/datos_pruebas_ia_sin_reglas.xlsx
"""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "data" / "input" / "ia" / "datos_pruebas_ia_sin_reglas.xlsx"

# Errores típicos, uno por fila: así el reporte del validador muestra el motivo de cada una.
HOJAS: dict[str, tuple[list[str], list[list[str]]]] = {
    "HLC-TC-004": (
        ["Ejecutar", "IdFila", "Descripcion", "Modo", "FechaDesde", "FechaHasta", "Cupo1_Dias",
         "Cupo1_Desde", "Cupo1_Hasta", "DiasLicencia", "EstadoEsperado", "DiasUsados1"],
        [
            # IdFila sin prefijo del caso y modo en español.
            ["SI", "1", "Solicitud normal", "SOLICITAR", "2026-11-02", "2026-11-02", "20",
             "INICIO_PERIODO", "FIN_PERIODO", "1", "Pending Approval", "1"],
            # Fecha en lenguaje natural.
            ["SI", "HLC-TC-004-02", "Solicitud la próxima semana", "APPLY", "próximo lunes",
             "próximo martes", "20", "INICIO_PERIODO", "FIN_PERIODO", "2", "Pending Approval", "2"],
            # Número con coma decimal y unidad incluida.
            ["SI", "HLC-TC-004-03", "Medio día", "APPLY", "MAR", "MAR", "20",
             "INICIO_PERIODO", "FIN_PERIODO", "1,5 días", "Pending Approval", "1,5"],
            # Fecha absoluta en formato local dentro de una columna de vigencia.
            ["SI", "HLC-TC-004-04", "Cupo del mes", "APPLY", "MAR", "MAR", "20",
             "01/11/2026", "31/12/2026", "1", "Pending Approval", "1"],
            # Falta la descripción (columna obligatoria).
            ["SI", "HLC-TC-004-05", "", "APPLY", "MAR", "MAR", "20",
             "INICIO_PERIODO", "FIN_PERIODO", "1", "Pending Approval", "1"],
        ],
    ),
    "HLC-TC-006": (
        ["Ejecutar", "IdFila", "Descripcion", "Modo", "FechaDesde", "FechaHasta", "Cupo1_Dias",
         "Cupo1_Desde", "Cupo1_Hasta", "DiasLicencia", "DiasUsados1"],
        [
            # IdFila repetido respecto a la hoja anterior y fecha fuera de formato.
            ["SI", "HLC-TC-004-01", "Apply con cupo desde el martes", "APPLY", "lunes", "martes",
             "20", "MAR", "FIN_PERIODO", "", ""],
            ["SI", "HLC-TC-006-02", "Assign con cupo desde el martes", "ASSIGN", "LUN", "MAR",
             "20", "MAR", "FIN_PERIODO", "dos", "1"],
        ],
    ),
    "HLC-TC-011": (
        ["Ejecutar", "IdFila", "Descripcion", "Modo", "FechaDesde", "FechaHasta", "Cupo1_Dias",
         "Cupo2_Dias", "Cupo3_Dias", "DiasLicencia", "DiasUsados1", "DiasUsados2", "DiasUsados3"],
        [
            # Esquema reducido: sin las columnas de vigencia que exige el feature.
            ["SI", "HLC-TC-011-01", "Un día entre tres cupos", "APPLY", "MAR", "MAR", "0.25",
             "0.25", "5", "1", "0.25", "0.25", "0.5"],
            ["SI", "HLC-TC-011-02", "Un día entre tres cupos (variante)", "APPLY", "MAR", "MAR",
             "0.25", "0.25", "5", "1", "1", "0", "-1"],
        ],
    ),
    "Licencias": (
        ["Ejecutar", "IdFila", "Descripcion"],
        [
            # Hoja que no corresponde a ningún feature registrado.
            ["SI", "HLC-TC-099-01", "Casos varios de licencias"],
        ],
    ),
}


def main() -> None:
    wb = Workbook()
    wb.remove(wb.active)
    total = 0
    for nombre, (columnas, filas) in HOJAS.items():
        ws = wb.create_sheet(nombre)
        ws.append(columnas)
        for fila in filas:
            ws.append(fila)
            total += 1
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    wb.save(SALIDA)
    print(f"[datos-ia] variante sin reglas: {total} filas → {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

