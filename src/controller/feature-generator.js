/**
 * @file Genera las copias de los features en .run/features con una fila del Excel por escenario.
 * Capa: controller (SRP: solo transforma texto; los datos ya llegan validados y filtrados).
 *
 * Cada bloque "@excel Ejemplos:" se reemplaza por un bloque "Ejemplos:" por fila, con el tag
 * @fila:<IdFila>. Así cada fila es un escenario independiente en el reporte, y el hook Before
 * sabe qué fila cargar. Los features fuente nunca se modifican.
 */
import { resolveDateToken } from '../utils/dates.js';

/**
 * @param {import('./feature-parser.js').FeatureFuente} feature
 * @param {import('../models/types.js').Fila[]} rows Filas habilitadas y filtradas del caso.
 * @param {{LUN: string, MAR: string}} fechas Para mostrar LUN/MAR como fechas reales.
 * @returns {{text: string, scenarios: number}} Texto generado y cantidad de escenarios.
 */
export function generateFeature(feature, rows, fechas) {
  const out = [];
  let scenarios = 0;
  let cursor = 0;
  for (const block of feature.blocks) {
    out.push(...feature.lines.slice(cursor, block.start));
    const blockRows = rows.filter((r) => !block.modo || r.datos.Modo === block.modo);
    if (!blockRows.length) {
      // Sin filas (por filtro o por Modo): se deja solo el encabezado. Gherkin compila un
      // Esquema SIN Ejemplos como escenario normal (se ejecutaría sin fila); con Ejemplos
      // vacíos genera cero escenarios.
      out.push(
        `${block.indent}# Sin filas habilitadas para este bloque en esta corrida`,
        `${block.indent}Ejemplos:`,
        `${block.indent}  | ${block.headers.map(escapeCell).join(' | ')} |`,
        '',
      );
    }
    for (const row of blockRows) {
      const values = block.headers.map((h) => display(row.datos[h] ?? '', fechas));
      out.push(
        `${block.indent}${[`@fila:${row.idFila}`, ...block.tags].join(' ')}`,
        `${block.indent}Ejemplos: ${row.idFila} — ${row.descripcion}`,
        `${block.indent}  | ${block.headers.map(escapeCell).join(' | ')} |`,
        `${block.indent}  | ${values.map(escapeCell).join(' | ')} |`,
        '',
      );
      scenarios += 1;
    }
    cursor = block.end + 1;
  }
  out.push(...feature.lines.slice(cursor));
  return {
    text: [
      `# GENERADO por scripts/prepare-data.js desde features/${feature.relPath.replace(/\\/g, '/')} — no editar`,
      ...out,
    ].join('\n'),
    scenarios,
  };
}

/**
 * Muestra LUN/MAR (y sus desplazamientos) como fechas reales en el reporte; los tokens del
 * periodo de licencia se dejan tal cual porque solo se conocen en ejecución (por API).
 * @param {string} value
 * @param {{LUN: string, MAR: string}} fechas
 */
function display(value, fechas) {
  if (!/^(LUN|MAR)/.test(value)) return value;
  try {
    return resolveDateToken(value, { fechas });
  } catch {
    return value;
  }
}

/** Escapa los caracteres especiales de una celda de tabla Gherkin. @param {string} v */
function escapeCell(v) {
  return v.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '\\n');
}
