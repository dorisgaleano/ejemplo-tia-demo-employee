/**
 * @file Post-proceso de la corrida: cucumber-report.json → resultados.xlsx + resumen en consola.
 * Capa: scripts (orquestador; la lógica vive en src/reporting).
 * Siempre termina con código 0: el éxito o fallo de la corrida lo informa Cucumber.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from '../src/config/env.js';
import { readRunInfo } from '../src/controller/run-store.js';
import { buildResults, summarize } from '../src/reporting/results-builder.js';
import { writeResults } from '../src/reporting/results-writer.js';

const { reportDir } = readRunInfo();
const dir = path.join(ROOT_DIR, reportDir);
const jsonFile = path.join(dir, 'cucumber-report.json');
if (!fs.existsSync(jsonFile)) {
  console.error(`[report] No existe ${jsonFile}: la corrida no llegó a ejecutarse.`);
  process.exit(0);
}

const results = buildResults(JSON.parse(fs.readFileSync(jsonFile, 'utf8')));
await writeResults(results, path.join(dir, 'resultados.xlsx'));
const s = summarize(results);

console.log(
  [
    '',
    '================ RESUMEN DE LA EJECUCIÓN ================',
    `  Total: ${s.total}   Pasaron: ${s.pasaron}   Fallaron: ${s.fallaron}   Omitidos: ${s.omitidos}`,
    ...results.filter((r) => r.estado !== 'PASÓ').map((r) => `  - ${r.idFila}: ${r.estado} ${r.pasoFallido}`),
    ...results.filter((r) => /ERROR/.test(r.limpieza)).map((r) => `  ! ${r.idFila}: limpieza incompleta (ver resultados.xlsx)`),
    `  Reporte HTML:   ${path.join(reportDir, 'cucumber-report.html')}`,
    `  Resultados:     ${path.join(reportDir, 'resultados.xlsx')}`,
    `  Evidencias:     ${path.join(reportDir, 'evidencias')}`,
    '==========================================================',
    '',
  ].join('\n'),
);
