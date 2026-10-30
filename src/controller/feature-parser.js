/**
 * @file Lectura de los .feature fuente para el puente Excel → Gherkin.
 * Capa: controller (SRP: solo analiza el texto; no lee Excel ni escribe archivos).
 *
 * Localiza el tag del caso (@HLC-TC-xxx) y los bloques marcados así:
 *
 *       @excel @modo:APPLY        ← @modo es opcional (casos con Apply y Assign)
 *       Ejemplos:
 *         | IdFila | ... |        ← encabezados = columnas de la hoja del caso
 *         | ...    | ... |        ← filas ficticias de documentación (se descartan)
 */
import fs from 'node:fs';
import path from 'node:path';

/** Tag de trazabilidad del caso; su nombre (sin @) es el nombre de la hoja del Excel. */
export const CASE_TAG_RE = /^@([A-Z]+-TC-\d{3})$/;

/**
 * @typedef {object} BloqueExcel
 * @property {number} start   Índice (0-based) de la línea de tags del bloque.
 * @property {number} end     Índice de la última línea de la tabla.
 * @property {string} indent  Sangría de la línea "Ejemplos:".
 * @property {string[]} tags  Tags de la línea, excepto @excel.
 * @property {string[]} headers Encabezados de la tabla.
 * @property {string | null} modo Valor de @modo:X o null.
 */

/**
 * @typedef {object} FeatureFuente
 * @property {string} file      Ruta absoluta.
 * @property {string} relPath   Ruta relativa a features/.
 * @property {string[]} lines
 * @property {string | null} caseId  Ej. "HLC-TC-004".
 * @property {BloqueExcel[]} blocks
 */

/**
 * Lista y analiza todos los .feature bajo una carpeta.
 * @param {string} dir
 * @returns {FeatureFuente[]}
 */
export function parseFeatures(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.feature'))
    .map((rel) => parseFeature(path.join(dir, rel), rel));
}

/**
 * @param {string} file
 * @param {string} relPath
 * @returns {FeatureFuente}
 */
export function parseFeature(file, relPath) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const featureIdx = lines.findIndex((l) => /^\s*(Característica|Feature):/.test(l));
  let caseId = null;
  for (let i = 0; i < featureIdx; i += 1) {
    for (const tag of tagsOf(lines[i])) {
      const m = CASE_TAG_RE.exec(tag);
      if (m) caseId = m[1];
    }
  }

  /** @type {BloqueExcel[]} */
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const tags = tagsOf(lines[i]);
    if (!tags.includes('@excel')) continue;
    const exIdx = nextNonBlank(lines, i + 1);
    if (exIdx < 0 || !/^\s*(Ejemplos|Examples):/.test(lines[exIdx])) continue;
    const headerIdx = nextNonBlank(lines, exIdx + 1);
    let end = headerIdx;
    while (end + 1 < lines.length && lines[end + 1].trim().startsWith('|')) end += 1;
    const modoTag = tags.find((t) => t.startsWith('@modo:'));
    blocks.push({
      start: i,
      end,
      indent: /** @type {RegExpMatchArray} */ (lines[exIdx].match(/^\s*/))[0],
      tags: tags.filter((t) => t !== '@excel'),
      headers: splitRow(lines[headerIdx] ?? ''),
      modo: modoTag ? modoTag.slice('@modo:'.length) : null,
    });
    i = end;
  }
  return { file, relPath, lines, caseId, blocks };
}

/** @param {string} line @returns {string[]} */
function tagsOf(line) {
  const t = line.trim();
  return t.startsWith('@') ? t.split(/\s+/).filter((x) => x.startsWith('@')) : [];
}

/** @param {string[]} lines @param {number} from @returns {number} */
function nextNonBlank(lines, from) {
  for (let i = from; i < lines.length; i += 1) {
    if (lines[i].trim() && !lines[i].trim().startsWith('#')) return i;
  }
  return -1;
}

/** @param {string} line @returns {string[]} */
function splitRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}
