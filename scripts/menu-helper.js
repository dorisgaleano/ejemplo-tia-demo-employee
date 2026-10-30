/**
 * @file Ayudante del menú ejecutar_pruebas.bat.
 * Capa: scripts. Concentra en Node lo que en cmd sería frágil o inseguro: validar lo que
 * escribe el usuario (se lee de variables de entorno, nunca de la línea de comandos),
 * listar casos, verificar navegadores y abrir reportes, evidencias y traces.
 *
 * Uso: node scripts/menu-helper.js <comando>
 *   cases | browsers | check-caso | check-fila | check-tag | open-report | open-evidence | open-trace
 * Código de salida: 0 = OK, 1 = problema (con mensaje en consola).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { ROOT_DIR } from '../src/config/env.js';
import { CASES } from '../src/registry/cases.js';

const command = process.argv[2];

/** Patrones permitidos para lo que escribe el usuario. */
const PATTERNS = {
  'check-caso': { env: 'FILTRO_CASO', re: /^[A-Za-z]+-TC-\d{3}$/, ejemplo: 'HLC-TC-004' },
  'check-fila': { env: 'FILTRO_FILA', re: /^[A-Za-z]+-TC-\d{3}-\d{2,}$/, ejemplo: 'HLC-TC-004-01' },
  'check-tag': { env: 'FILTRO_TAG', re: /^[@A-Za-z0-9:_\- ()]+$/, ejemplo: '@HLC-TC-004 or @HLC-TC-009' },
};

/** @param {string} message */
function fail(message) {
  console.error(`  ${message}`);
  process.exit(1);
}

/** Carpeta de reportes de la última corrida preparada. */
function lastReportDir() {
  const runFile = path.join(ROOT_DIR, '.run', 'run.json');
  if (!fs.existsSync(runFile)) fail('Todavía no hay ejecuciones.');
  return path.join(ROOT_DIR, JSON.parse(fs.readFileSync(runFile, 'utf8')).reportDir);
}

/** Abre un archivo o carpeta con la aplicación predeterminada de Windows. @param {string} target */
function open(target) {
  if (!fs.existsSync(target)) fail(`No existe: ${path.relative(ROOT_DIR, target)}`);
  spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' }).unref();
}

switch (command) {
  case 'cases':
    console.log(CASES.length ? CASES.map((c) => `  ${c.id}  ${c.titulo}`).join('\n') : '  (aún no hay casos registrados)');
    break;
  case 'browsers':
    if (!fs.existsSync(chromium.executablePath())) fail('Falta el navegador Chromium de Playwright.');
    break;
  case 'check-caso':
  case 'check-fila':
  case 'check-tag': {
    const { env, re, ejemplo } = PATTERNS[command];
    const value = process.env[env] ?? '';
    if (!re.test(value)) fail(`Valor no válido. Ejemplo: ${ejemplo}`);
    break;
  }
  case 'open-report':
    open(path.join(lastReportDir(), 'cucumber-report.html'));
    break;
  case 'open-evidence':
    open(path.join(lastReportDir(), 'evidencias'));
    break;
  case 'open-trace': {
    const fila = (process.env.FILTRO_FILA ?? '').toUpperCase();
    if (!PATTERNS['check-fila'].re.test(fila)) fail('IdFila no válido. Ejemplo: HLC-TC-004-01');
    const caso = fila.replace(/-\d+$/, '');
    const trace = path.join(lastReportDir(), 'evidencias', caso, fila, 'trace.zip');
    if (!fs.existsSync(trace)) fail(`No hay trace de ${fila} en la última ejecución.`);
    console.log(`  Abriendo el trace de ${fila} (cierra la ventana del visor para volver al menú)...`);
    // shell: true es necesario para npx en Windows; la ruta va entre comillas por si tiene espacios.
    const r = spawnSync('npx', ['playwright', 'show-trace', `"${trace}"`], { stdio: 'inherit', shell: true, cwd: ROOT_DIR });
    process.exit(r.status ?? 0);
  }
  default:
    fail(`Comando desconocido: ${command}`);
}
