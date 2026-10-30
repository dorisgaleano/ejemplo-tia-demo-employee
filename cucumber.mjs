/**
 * @file Configuración de Cucumber.js con perfiles default, headed y dryrun.
 * Capa: infraestructura. Cucumber ejecuta SOLO los features generados en .run/features
 * (copias con una fila de Excel por escenario); los de features/ son la documentación viva.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Lee .run/run.json (lo genera prepare-data) para ubicar los reportes de esta corrida. */
function reportDir() {
  try {
    return JSON.parse(fs.readFileSync('.run/run.json', 'utf8')).reportDir;
  } catch {
    return 'reports/sin-preparar';
  }
}

/** Filtro por tag recibido desde el menú .bat; @wip siempre queda excluido. */
const tags = process.env.FILTRO_TAG ? `(${process.env.FILTRO_TAG}) and not @wip` : 'not @wip';

const base = {
  paths: ['.run/features/**/*.feature'],
  import: ['src/support/**/*.js', 'src/steps/**/*.js'],
  tags,
  parallel: 0, // secuencial: todas las filas usan el mismo Admin y empleado en la demo
  retry: 0, // no se reintentan escenarios que crean datos
  strict: true,
  format: [
    'progress',
    `html:${path.join(reportDir(), 'cucumber-report.html')}`,
    `json:${path.join(reportDir(), 'cucumber-report.json')}`,
  ],
  worldParameters: { headed: false },
};

export default base;

/** Igual que default, con el navegador visible para observar la prueba. */
export const headed = { ...base, worldParameters: { headed: true } };

/** Solo valida que cada paso tenga exactamente una step definition (sin navegador). */
export const dryrun = { ...base, dryRun: true, format: ['progress'] };
