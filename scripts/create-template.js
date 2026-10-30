/**
 * @file Crea o completa la plantilla data/input/datos_pruebas.xlsx a partir del registro de casos.
 * Capa: scripts (herramienta de preparación, no forma parte de la ejecución).
 *
 * No destructivo: si el archivo ya existe, SOLO agrega las hojas de casos que falten y
 * regenera la hoja "Instrucciones"; nunca modifica las hojas de casos existentes (los datos
 * del usuario se conservan).
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { PATHS } from '../src/config/env.js';
import { CASES } from '../src/registry/cases.js';
import { COLUMN_DOCS, DATE_HELP } from '../src/registry/columns.js';

/** Filas preparadas con validación y desbloqueadas para edición. */
const EDITABLE_ROWS = 200;

/** Listas desplegables por columna. */
const LISTS = /** @type {Record<string, string[]>} */ ({
  Ejecutar: ['SI', 'NO'],
  Modo: ['APPLY', 'ASSIGN'],
  Jornada: ['Completa'],
  ResultadoEsperado: ['CREADA', 'RECHAZADA'],
});

const HEADER_FILL = /** @type {ExcelJS.Fill} */ ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } });

const workbook = new ExcelJS.Workbook();
const exists = fs.existsSync(PATHS.excelInput);
if (exists) await workbook.xlsx.readFile(PATHS.excelInput);

const added = [];
for (const caso of CASES) {
  if (workbook.getWorksheet(caso.id)) continue;
  addCaseSheet(caso);
  added.push(caso.id);
}
writeInstructions();

fs.mkdirSync(path.dirname(PATHS.excelInput), { recursive: true });
await workbook.xlsx.writeFile(PATHS.excelInput);
console.log(
  `[template] ${exists ? 'Actualizada' : 'Creada'}: ${PATHS.excelInput}\n` +
    `  Hojas de casos agregadas: ${added.length ? added.join(', ') : 'ninguna'}`,
);

/** @param {import('../src/registry/cases.js').CasoRegistrado} caso */
function addCaseSheet(caso) {
  const ws = workbook.addWorksheet(caso.id, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = caso.columnas.map((c) => ({ header: c, key: c, width: Math.max(12, c.length + 4) }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.note = COLUMN_DOCS[String(cell.value)]?.descripcion ?? '';
  });
  for (const fila of caso.filasEjemplo) ws.addRow(fila);

  caso.columnas.forEach((col, i) => {
    const column = ws.getColumn(i + 1);
    for (let r = 2; r <= EDITABLE_ROWS + 1; r += 1) {
      const cell = ws.getCell(r, i + 1);
      // Las filas de datos quedan desbloqueadas; el encabezado queda protegido.
      cell.protection = { locked: false };
      // Formato texto: evita que Excel convierta "MAR" o "0.5" en fechas/otros formatos.
      cell.numFmt = '@';
      if (LISTS[col]) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: col !== 'Ejecutar',
          formulae: [`"${LISTS[col].join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Valor no permitido',
          error: `Elige uno de: ${LISTS[col].join(', ')}`,
        };
      }
    }
    column.width = Math.max(column.width ?? 12, 14);
  });
  // Protección sin clave: evita borrar encabezados por accidente (no es una medida de seguridad).
  ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, autoFilter: true });
}

function writeInstructions() {
  const old = workbook.getWorksheet('Instrucciones');
  if (old) workbook.removeWorksheet(old.id);
  const ws = workbook.addWorksheet('Instrucciones');
  // La hoja de instrucciones va primero.
  ws.orderNo = 0;
  ws.columns = [
    { header: 'Columna', key: 'col', width: 22 },
    { header: 'Qué significa', key: 'desc', width: 70 },
    { header: 'Ejemplo', key: 'ej', width: 22 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).eachCell((c) => (c.fill = HEADER_FILL));

  const used = new Set(CASES.flatMap((c) => c.columnas));
  for (const [col, doc] of Object.entries(COLUMN_DOCS)) {
    if (used.has(col)) ws.addRow({ col, desc: doc.descripcion, ej: doc.ejemplo });
  }
  ws.addRow({});
  ws.addRow({ col: 'Fechas', desc: DATE_HELP[0] });
  for (const line of DATE_HELP.slice(1)) ws.addRow({ desc: line });
  ws.addRow({});
  ws.addRow({ col: 'Reglas generales', desc: 'Una hoja por caso; su nombre es el ID del caso (ej. HLC-TC-004).' });
  ws.addRow({ desc: 'Cada fila con Ejecutar = SI es una ejecución independiente del escenario.' });
  ws.addRow({ desc: 'No escribas contraseñas en este archivo: la clave del Admin está en el archivo .env.' });
  ws.addRow({ desc: 'Los encabezados están protegidos; agrega filas debajo de las existentes.' });
  ws.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
}
