/**
 * @file Validación del Excel contra los features y el registro, ANTES de abrir el navegador.
 * Capa: controller (SRP: solo detecta problemas; no filtra ni genera).
 * Cada error indica hoja, fila y columna en lenguaje entendible para el usuario final.
 */
import { COLUMN_RULES, REQUIRED_COLUMNS } from './column-rules.js';

/** Hojas que no son de casos. */
export const NON_CASE_SHEETS = ['Instrucciones'];

/**
 * @typedef {object} ErrorValidacion
 * @property {string} hoja
 * @property {number} [fila]
 * @property {string} [columna]
 * @property {string} mensaje
 */

/**
 * @param {import('./excel-reader.js').HojaLeida[]} sheets
 * @param {import('./feature-parser.js').FeatureFuente[]} features
 * @param {import('../registry/cases.js').CasoRegistrado[]} registry
 * @returns {ErrorValidacion[]}
 */
export function validate(sheets, features, registry) {
  /** @type {ErrorValidacion[]} */
  const errors = [];
  const registered = new Set(registry.map((c) => c.id));
  const caseSheets = sheets.filter((s) => !NON_CASE_SHEETS.includes(s.name));
  const featureByCase = new Map();

  for (const f of features) {
    const where = { hoja: `(feature ${f.relPath})` };
    if (!f.caseId) {
      errors.push({ ...where, mensaje: 'El feature no tiene tag de caso (ej. @HLC-TC-004) antes de "Característica:".' });
      continue;
    }
    if (featureByCase.has(f.caseId)) {
      errors.push({ ...where, mensaje: `El caso ${f.caseId} ya está en ${featureByCase.get(f.caseId).relPath}.` });
    }
    featureByCase.set(f.caseId, f);
    if (!registered.has(f.caseId)) {
      errors.push({ ...where, mensaje: `El caso ${f.caseId} no está registrado en src/registry/cases.js.` });
    }
    if (!f.blocks.length) {
      errors.push({ ...where, mensaje: 'El feature no tiene ningún bloque "@excel Ejemplos:".' });
    }
    if (!caseSheets.some((s) => s.name === f.caseId)) {
      errors.push({ hoja: f.caseId, mensaje: `Falta la hoja "${f.caseId}" en el Excel (la pide ${f.relPath}).` });
    }
  }

  const seenIds = new Map();
  for (const sheet of caseSheets) {
    const feature = featureByCase.get(sheet.name);
    if (!feature) {
      errors.push({ hoja: sheet.name, mensaje: 'La hoja no corresponde a ningún feature de un caso registrado.' });
      continue;
    }
    for (const col of REQUIRED_COLUMNS) {
      if (!sheet.headers.includes(col)) errors.push({ hoja: sheet.name, columna: col, mensaje: 'Falta esta columna obligatoria.' });
    }
    const neededByFeature = new Set(feature.blocks.flatMap((/** @type {any} */ b) => b.headers));
    for (const col of neededByFeature) {
      if (!sheet.headers.includes(col)) {
        errors.push({ hoja: sheet.name, columna: col, mensaje: 'Falta esta columna: la usan los Ejemplos del feature.' });
      }
    }
    const modos = feature.blocks.map((/** @type {any} */ b) => b.modo).filter(Boolean);

    for (const { filaExcel, values } of sheet.rows) {
      const at = (/** @type {string} */ columna, /** @type {string} */ mensaje) =>
        errors.push({ hoja: sheet.name, fila: filaExcel, columna, mensaje });
      const id = values.IdFila ?? '';
      if (id) {
        if (!id.startsWith(`${sheet.name}-`)) at('IdFila', `debe empezar por "${sheet.name}-" (ej. ${sheet.name}-01).`);
        if (seenIds.has(id)) at('IdFila', `"${id}" está repetido (también en ${seenIds.get(id)}).`);
        seenIds.set(id, `${sheet.name} fila ${filaExcel}`);
      }
      // Las filas con Ejecutar = NO solo se validan en lo mínimo: pueden estar en borrador.
      const enabled = values.Ejecutar === 'SI';
      for (const [col, value] of Object.entries(values)) {
        for (const rule of COLUMN_RULES.filter((r) => r.column.test(col))) {
          if (!enabled && col !== 'Ejecutar' && col !== 'IdFila') continue;
          if (!value) {
            if (rule.required) at(col, 'no puede estar vacía.');
            continue;
          }
          const problem = rule.check(value);
          if (problem) at(col, `valor "${value}" inválido: ${problem}.`);
        }
      }
      if (enabled && modos.length && values.Modo && !modos.includes(values.Modo)) {
        at('Modo', `el feature solo tiene escenarios para: ${modos.join(', ')}.`);
      }
    }
  }
  return errors;
}

/**
 * Formatea los errores para la consola.
 * @param {ErrorValidacion[]} errors
 * @returns {string}
 */
export function formatErrors(errors) {
  return errors
    .map((e) => {
      const where = [`Hoja "${e.hoja}"`, e.fila ? `fila ${e.fila}` : '', e.columna ? `columna "${e.columna}"` : '']
        .filter(Boolean)
        .join(', ');
      return `  ✗ ${where}: ${e.mensaje}`;
    })
    .join('\n');
}
