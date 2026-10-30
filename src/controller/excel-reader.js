/**
 * @file Lectura del Excel de entrada con exceljs.
 * Capa: controller (SRP: solo lee y normaliza; no valida ni filtra).
 * Cada hoja se convierte en encabezados + filas con todos los valores como texto,
 * para que el validador trabaje con un formato único sin importar el tipo de celda.
 */
import fs from 'node:fs';
import ExcelJS from 'exceljs';

/**
 * @typedef {object} HojaLeida
 * @property {string} name
 * @property {string[]} headers Encabezados de la fila 1.
 * @property {{filaExcel: number, values: Record<string, string>}[]} rows Filas no vacías.
 */

/**
 * @param {string} file Ruta del .xlsx.
 * @returns {Promise<HojaLeida[]>}
 * @throws {Error} Si el archivo no existe o está abierto/bloqueado.
 */
export async function readWorkbook(file) {
  if (!fs.existsSync(file)) throw new Error(`No se encontró el Excel de datos: ${file}`);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(file);
  } catch (error) {
    throw new Error(`No se pudo leer el Excel (¿está dañado?): ${/** @type {Error} */ (error).message}`);
  }
  return workbook.worksheets.map((ws) => {
    /** @type {string[]} */
    const headers = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = cellText(cell.value);
    });
    const rows = [];
    for (let r = 2; r <= ws.rowCount; r += 1) {
      const row = ws.getRow(r);
      /** @type {Record<string, string>} */
      const values = {};
      headers.forEach((h, i) => {
        if (h) values[h] = cellText(row.getCell(i + 1).value);
      });
      if (Object.values(values).some((v) => v !== '')) rows.push({ filaExcel: r, values });
    }
    return { name: ws.name, headers: headers.filter(Boolean), rows };
  });
}

/**
 * Convierte cualquier valor de celda de exceljs a texto.
 * @param {ExcelJS.CellValue} value
 * @returns {string}
 */
function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // Excel guarda fechas sin zona horaria; exceljs las entrega como UTC.
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((t) => t.text).join('').trim();
    if ('result' in value) return cellText(/** @type {ExcelJS.CellValue} */ (value.result));
    if ('text' in value) return String(value.text).trim();
    return '';
  }
  return String(value).trim();
}
