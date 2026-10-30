/**
 * @file Puente Excel → Cucumber. Se ejecuta ANTES de cada corrida (sin navegador).
 * Capa: scripts (orquestador; la lógica vive en src/controller).
 *
 *   1. Lee los features fuente y el Excel.
 *   2. Valida todo (esquema, columnas, tipos, IdFila duplicados, hojas ↔ features ↔ registro).
 *   3. Aplica los filtros del menú (FILTRO_CASO, FILTRO_FILA; FILTRO_TAG lo aplica Cucumber).
 *   4. Toma el bloqueo de ejecución (falla si otra corrida está activa).
 *   5. Escribe .run/rows.json, .run/run.json y .run/features/ (una fila = un escenario).
 *
 * Termina con código 1 si hay errores, para que el .bat no ejecute la suite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ENV, PATHS, ROOT_DIR } from '../src/config/env.js';
import { readWorkbook } from '../src/controller/excel-reader.js';
import { parseFeatures } from '../src/controller/feature-parser.js';
import { NON_CASE_SHEETS, formatErrors, validate } from '../src/controller/validator.js';
import { applyFilters, filtersFromEnv } from '../src/controller/filters.js';
import { generateFeature } from '../src/controller/feature-generator.js';
import { writeRun } from '../src/controller/run-store.js';
import { acquireRunLock } from '../src/controller/run-lock.js';
import { CASES } from '../src/registry/cases.js';
import { computeWeekDates } from '../src/utils/dates.js';

/** @param {string} message */
function fail(message) {
  console.error(`\n[prepare-data] ${message}\n`);
  process.exit(1);
}

const features = parseFeatures(PATHS.featuresSource);
if (!features.length) fail('No hay features en la carpeta features/. Aún no hay casos implementados.');

const sheets = await readWorkbook(PATHS.excelInput).catch((/** @type {Error} */ e) => fail(e.message));
const errors = validate(/** @type {any} */ (sheets), features, CASES);
if (errors.length) fail(`El Excel tiene ${errors.length} error(es); corrígelos y vuelve a ejecutar:\n${formatErrors(errors)}`);

/** @type {import('../src/models/types.js').Fila[]} */
const all = /** @type {import('../src/controller/excel-reader.js').HojaLeida[]} */ (sheets)
  .filter((s) => !NON_CASE_SHEETS.includes(s.name))
  .flatMap((s) =>
    s.rows.map((r) => ({
      testCaseId: s.name,
      idFila: r.values.IdFila,
      descripcion: r.values.Descripcion,
      filaExcel: r.filaExcel,
      datos: r.values,
    })),
  );
const enabled = all.filter((r) => r.datos.Ejecutar === 'SI');
const filtros = filtersFromEnv();
const { rows, error } = applyFilters(enabled, all, filtros);
if (error) fail(error);
if (!rows.length) fail('No hay filas con Ejecutar = SI que coincidan con el filtro elegido.');

// Identificación de la corrida: carpeta de reportes única y sufijo para los datos QA-HLC-*.
const now = new Date();
const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
const runId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const sufijo = `${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
let semanasAdelante = 0;
try {
  semanasAdelante = ENV.semanasAdelante;
} catch (e) {
  fail(/** @type {Error} */ (e).message);
}
const fechas = computeWeekDates(now, semanasAdelante);
const reportDir = path.posix.join('reports', runId);
// Único aunque dos preparaciones coincidan en el mismo segundo.
const token = `${runId}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

// Bloqueo de ejecución ANTES de escribir nada en .run/: si otra corrida está activa, no se
// toca su run.json, sus filas ni sus features.
try {
  acquireRunLock({ token, runId }, 'preparada');
} catch (e) {
  fail(/** @type {Error} */ (e).message);
}

// .run/features se regenera completo en cada corrida.
fs.rmSync(PATHS.runFeatures, { recursive: true, force: true });
let total = 0;
for (const feature of features) {
  const caseRows = rows.filter((r) => r.testCaseId === feature.caseId);
  if (!caseRows.length) continue;
  const { text, scenarios } = generateFeature(feature, caseRows, fechas);
  const target = path.join(PATHS.runFeatures, feature.relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, 'utf8');
  total += scenarios;
}
if (total !== rows.length) {
  fail(`Se esperaban ${rows.length} escenarios y se generaron ${total}. Revisa la columna Modo de las filas.`);
}

writeRun(
  { runId, token, reportDir, sufijo, fechas, filtros: /** @type {Record<string, string>} */ (filtros) },
  Object.fromEntries(rows.map((r) => [r.idFila, r])),
);
fs.mkdirSync(path.join(ROOT_DIR, reportDir), { recursive: true });

const casos = [...new Set(rows.map((r) => r.testCaseId))];
console.log(
  [
    '',
    '[prepare-data] Excel validado correctamente.',
    `  Casos: ${casos.join(', ')}`,
    `  Filas a ejecutar: ${rows.length}`,
    `  Fechas de la corrida: LUN = ${fechas.LUN}, MAR = ${fechas.MAR}` +
      (semanasAdelante ? ` (SEMANAS_ADELANTE = ${semanasAdelante})` : ''),
    `  Reportes en: ${reportDir}`,
    '',
  ].join('\n'),
);
