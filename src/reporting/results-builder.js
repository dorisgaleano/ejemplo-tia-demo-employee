/**
 * @file Convierte el JSON de Cucumber en una fila de resultado por escenario (= fila del Excel).
 * Capa: reporting (SRP: solo interpreta el JSON; la escritura del .xlsx está en results-writer).
 */
import { EVIDENCE_MIME } from '../models/types.js';

/**
 * @typedef {object} Resultado
 * @property {string} testCaseId
 * @property {string} idFila
 * @property {string} escenario
 * @property {string} descripcion
 * @property {Record<string, string>} datos
 * @property {'PASÓ' | 'FALLÓ' | 'OMITIDO'} estado
 * @property {string} pasoFallido
 * @property {string} inicio
 * @property {string} fin
 * @property {number} duracionSeg
 * @property {string} error
 * @property {string} trace
 * @property {string} video
 * @property {string[]} screenshots
 * @property {string} limpieza
 */

/**
 * @param {any[]} cucumberJson Contenido de cucumber-report.json.
 * @returns {Resultado[]}
 */
export function buildResults(cucumberJson) {
  /** @type {Resultado[]} */
  const results = [];
  for (const feature of cucumberJson) {
    for (const element of feature.elements ?? []) {
      const tags = (element.tags ?? []).map((/** @type {{name: string}} */ t) => t.name);
      const steps = /** @type {any[]} */ (element.steps ?? []);
      const evidence = findEvidence(steps);
      const failed = steps.find((s) => s.result?.status === 'failed');
      const visible = steps.filter((s) => !s.hidden);
      const estado = failed ? 'FALLÓ' : visible.every((s) => s.result?.status === 'passed') ? 'PASÓ' : 'OMITIDO';
      const durNs = steps.reduce((acc, s) => acc + (s.result?.duration ?? 0), 0);
      results.push({
        testCaseId: evidence?.testCaseId ?? tagValue(tags, /^@([A-Z]+-TC-\d{3})$/),
        idFila: evidence?.idFila ?? tagValue(tags, /^@fila:(.+)$/),
        escenario: element.name,
        descripcion: evidence?.descripcion ?? '',
        datos: evidence?.datos ?? {},
        estado,
        pasoFallido: failed ? (failed.hidden ? `Hook ${failed.keyword.trim()}` : `${failed.keyword}${failed.name}`) : '',
        inicio: evidence?.inicio ?? '',
        fin: evidence?.fin ?? '',
        duracionSeg: evidence ? (Date.parse(evidence.fin) - Date.parse(evidence.inicio)) / 1000 : durNs / 1e9,
        error: failed ? firstLines(failed.result.error_message ?? '', 3) : '',
        trace: evidence?.evidencias?.trace ?? '',
        video: evidence?.evidencias?.video ?? '',
        screenshots: evidence?.evidencias?.screenshots ?? [],
        limpieza: (evidence?.limpieza ?? [])
          .map((/** @type {any} */ l) => `${l.ok ? 'OK' : 'ERROR'}: ${l.description}${l.error ? ` (${l.error})` : ''}`)
          .join('\n'),
      });
    }
  }
  return results;
}

/** Busca el adjunto de resumen escrito por el hook After. @param {any[]} steps */
function findEvidence(steps) {
  for (const step of steps) {
    for (const emb of step.embeddings ?? []) {
      if (emb.mime_type !== EVIDENCE_MIME) continue;
      // El formatter puede entregar el texto tal cual o en base64, según la versión.
      try {
        return JSON.parse(emb.data);
      } catch {
        return JSON.parse(Buffer.from(emb.data, 'base64').toString('utf8'));
      }
    }
  }
  return null;
}

/** @param {string[]} tags @param {RegExp} re */
function tagValue(tags, re) {
  for (const t of tags) {
    const m = re.exec(t);
    if (m) return m[1];
  }
  return '';
}

/** @param {string} text @param {number} n */
function firstLines(text, n) {
  return text.split('\n').filter((l) => l.trim()).slice(0, n).join('\n');
}

/**
 * Cuenta resultados por estado.
 * @param {Resultado[]} results
 */
export function summarize(results) {
  return {
    total: results.length,
    pasaron: results.filter((r) => r.estado === 'PASÓ').length,
    fallaron: results.filter((r) => r.estado === 'FALLÓ').length,
    omitidos: results.filter((r) => r.estado === 'OMITIDO').length,
  };
}
