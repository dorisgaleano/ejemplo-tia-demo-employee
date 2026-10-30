/**
 * @file Lectura/escritura de los archivos de la corrida en .run/ (run.json y rows.json).
 * Capa: controller. prepare-data los escribe; los hooks y el reporte los leen.
 */
import fs from 'node:fs';
import { PATHS } from '../config/env.js';

/**
 * @param {import('../models/types.js').InfoCorrida} info
 * @param {Record<string, import('../models/types.js').Fila>} rows
 */
export function writeRun(info, rows) {
  fs.mkdirSync(PATHS.runDir, { recursive: true });
  fs.writeFileSync(PATHS.runInfoFile, JSON.stringify(info, null, 2), 'utf8');
  fs.writeFileSync(PATHS.rowsFile, JSON.stringify(rows, null, 2), 'utf8');
}

/** @returns {import('../models/types.js').InfoCorrida} */
export function readRunInfo() {
  return readJson(PATHS.runInfoFile);
}

/** @type {Record<string, import('../models/types.js').Fila> | undefined} */
let rowsCache;

/**
 * Devuelve la fila de una ejecución por su IdFila.
 * @param {string} idFila
 * @returns {import('../models/types.js').Fila}
 */
export function readRow(idFila) {
  rowsCache ??= readJson(PATHS.rowsFile);
  const row = rowsCache[idFila];
  if (!row) throw new Error(`La fila ${idFila} no está en .run/rows.json. Ejecuta primero prepare-data.`);
  return row;
}

/** @param {string} file */
function readJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`No existe ${file}. Ejecuta primero "npm run prepare-data" (o usa el menú .bat).`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
