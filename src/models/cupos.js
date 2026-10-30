/**
 * @file Lectura de la definición de cupos de una fila del Excel (columnas CupoN_*).
 * Capa: models.
 */

/**
 * Definición de un cupo tal como viene del Excel (fechas aún como tokens).
 * @typedef {object} CupoDefinido
 * @property {number} dias
 * @property {string} desde Token o fecha (ej. "INICIO_PERIODO").
 * @property {string} hasta Token o fecha (ej. "FIN_PERIODO").
 */

/** Máximo de cupos por tipo que admiten los casos (HLC-TC-011 usa tres). */
const MAX_CUPOS = 3;

/**
 * @param {import('./types.js').Fila} row
 * @returns {CupoDefinido[]} Cupos en orden (Cupo1, Cupo2...); vacío si el tipo no tiene cupo.
 */
export function cuposDeLaFila(row) {
  const cupos = [];
  for (let i = 1; i <= MAX_CUPOS; i += 1) {
    const dias = row.datos[`Cupo${i}_Dias`];
    if (!dias) continue;
    cupos.push({ dias: Number(dias), desde: row.datos[`Cupo${i}_Desde`], hasta: row.datos[`Cupo${i}_Hasta`] });
  }
  return cupos;
}
