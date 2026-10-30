/**
 * @file Filtros de ejecución recibidos desde el menú .bat (por variables de entorno).
 * Capa: controller (SRP: solo selecciona filas). El filtro por tag no se aplica aquí:
 * lo evalúa Cucumber (cucumber.mjs lee FILTRO_TAG).
 */

/**
 * @typedef {object} Filtros
 * @property {string} [caso] TestCaseId (FILTRO_CASO).
 * @property {string} [fila] IdFila (FILTRO_FILA).
 * @property {string} [tag]  Expresión de tags de Cucumber (FILTRO_TAG), solo informativa aquí.
 */

/** @returns {Filtros} */
export function filtersFromEnv() {
  /** @type {Filtros} */
  const f = {};
  if (process.env.FILTRO_CASO?.trim()) f.caso = process.env.FILTRO_CASO.trim().toUpperCase();
  if (process.env.FILTRO_FILA?.trim()) f.fila = process.env.FILTRO_FILA.trim().toUpperCase();
  if (process.env.FILTRO_TAG?.trim()) f.tag = process.env.FILTRO_TAG.trim();
  return f;
}

/**
 * Aplica los filtros sobre las filas habilitadas.
 * @param {import('../models/types.js').Fila[]} enabled Filas con Ejecutar = SI.
 * @param {import('../models/types.js').Fila[]} all Todas las filas (para mensajes precisos).
 * @param {Filtros} filtros
 * @returns {{rows: import('../models/types.js').Fila[], error?: string}}
 */
export function applyFilters(enabled, all, filtros) {
  let rows = enabled;
  if (filtros.caso) {
    if (!all.some((r) => r.testCaseId === filtros.caso)) {
      return { rows: [], error: `El caso ${filtros.caso} no existe en el Excel.` };
    }
    rows = rows.filter((r) => r.testCaseId === filtros.caso);
  }
  if (filtros.fila) {
    const found = all.find((r) => r.idFila === filtros.fila);
    if (!found) return { rows: [], error: `La fila ${filtros.fila} no existe en el Excel.` };
    if (!enabled.includes(found)) {
      return { rows: [], error: `La fila ${filtros.fila} tiene Ejecutar = NO. Cámbiala a SI para ejecutarla.` };
    }
    rows = rows.filter((r) => r.idFila === filtros.fila);
  }
  return { rows };
}
