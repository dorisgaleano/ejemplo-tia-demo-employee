/**
 * @file Contratos (tipos JSDoc) compartidos por todas las capas.
 * Capa: models. No contiene lógica; solo describe la forma de los datos y las interfaces.
 */

/**
 * Una fila habilitada del Excel, tal como queda en .run/rows.json.
 * @typedef {object} Fila
 * @property {string} testCaseId  Nombre de la hoja = tag del feature (ej. "HLC-TC-004").
 * @property {string} idFila      Identificador único (ej. "HLC-TC-004-01").
 * @property {string} descripcion Propósito de la iteración.
 * @property {number} filaExcel   Número de fila en la hoja (para mensajes de error).
 * @property {Record<string, string>} datos Todas las columnas de la fila como texto.
 */

/**
 * Información de la corrida actual, generada por prepare-data en .run/run.json.
 * @typedef {object} InfoCorrida
 * @property {string} runId      Marca de tiempo AAAA-MM-DD_HH-mm-ss.
 * @property {string} token      Identificador único de la corrida (dueña del bloqueo de ejecución).
 * @property {string} reportDir  Carpeta de reportes de la corrida (relativa a la raíz).
 * @property {string} sufijo     Sufijo único para nombres de datos de prueba (ej. "1020153000").
 * @property {{LUN: string, MAR: string}} fechas Fechas calculadas (AAAA-MM-DD).
 * @property {Record<string, string>} filtros Filtros aplicados (caso, fila, tag).
 */

/**
 * Actividad que un Actor puede ejecutar (Task o Interaction).
 * @typedef {object} Activity
 * @property {(actor: import('../screenplay/actors/Actor.js').Actor) => Promise<void>} performAs
 */

/**
 * Pregunta sobre el estado observable del sistema.
 * @template T
 * @typedef {object} Question
 * @property {(actor: import('../screenplay/actors/Actor.js').Actor) => Promise<T>} answeredBy
 */

/** Mime del adjunto con el resumen de cada fila (hooks lo escribe; el reporte lo lee). */
export const EVIDENCE_MIME = 'application/vnd.hlc.evidencias+json';
