/**
 * @file Runner de la regresión visual (independiente de Cucumber).
 * Capa: visual. Ejecuta las pantallas del catálogo, guarda un PNG por pantalla y, si la
 * corrida va por `percy exec`, envía el snapshot con nombre estable.
 *
 *   node src/visual/run.js                    todas las pantallas con sesión
 *   node src/visual/run.js --solo=05-my-leave una sola pantalla
 *   node src/visual/run.js --headed           navegador visible
 *   node src/visual/run.js --lista            lista el catálogo y sale
 *
 * No comparte estado con la suite funcional: no toca .run/, no toma el bloqueo de ejecución
 * y no crea datos QA-HLC-*. Solo navega pantallas, por eso puede correr en paralelo con ella.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ENV, ROOT_DIR, TIMEOUTS } from '../config/env.js';
import { LoginPage } from '../pages/LoginPage.js';
import { SCREENS, pantallaPorNombre } from './screens.js';
import { capturar, percyActivo, prepararPantalla } from './snapshot.js';

/** Argumentos de línea de comandos, en el formato --clave=valor o --bandera. */
function args() {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (const raw of process.argv.slice(2)) {
    const [k, v] = raw.replace(/^--/, '').split('=');
    out[k] = v ?? true;
  }
  return out;
}

const opciones = args();

if (opciones.lista) {
  for (const s of SCREENS) console.log(`${s.nombre.padEnd(18)} ${s.ruta}`);
  process.exit(0);
}

/** Pantallas a ejecutar: todas o la indicada en --solo. */
const seleccion = opciones.solo
  ? [pantallaPorNombre(String(opciones.solo))].filter(Boolean)
  : SCREENS;

if (!seleccion.length) {
  console.error(`[visual] No existe la pantalla "${opciones.solo}". Usa --lista para ver el catálogo.`);
  process.exit(1);
}

const now = new Date();
const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
const runId = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const dirCorrida = path.join(ROOT_DIR, 'reports', 'visual', runId);
fs.mkdirSync(dirCorrida, { recursive: true });

const conPercy = percyActivo();
if (!conPercy) {
  console.log('[visual] Percy no está activo (falta PERCY_TOKEN o la corrida no va por "percy exec").');
  console.log('[visual] Se guardarán capturas locales; los baselines no se actualizan.\n');
}

/** @type {{nombre: string, estado: 'PASÓ' | 'FALLÓ', ms: number, archivo?: string, percy?: string, error?: string}[]} */
const registro = [];

const browser = await chromium.launch({ headless: !opciones.headed });
const context = await browser.newContext({
  baseURL: ENV.baseUrl,
  viewport: { width: 1366, height: 768 },
});
context.setDefaultTimeout(TIMEOUTS.action);
context.setDefaultNavigationTimeout(TIMEOUTS.navigation);
const page = await context.newPage();

let sesionIniciada = false;

/** Inicia sesión una sola vez; las pantallas sin sesión se capturan antes. */
async function iniciarSesion() {
  if (sesionIniciada) return;
  await page.goto(LoginPage.path, { waitUntil: 'domcontentloaded' });
  await LoginPage.username(page).fill(ENV.user);
  await LoginPage.password(page).fill(ENV.password);
  await LoginPage.loginButton(page).click();
  await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.navigation });
  sesionIniciada = true;
}

for (const pantalla of seleccion) {
  const inicio = Date.now();
  try {
    if (pantalla.sesion) await iniciarSesion();
    await prepararPantalla(page, pantalla);
    const res = await capturar(page, pantalla, { dir: dirCorrida, enviarAPercy: conPercy });
    registro.push({
      nombre: pantalla.nombre,
      estado: 'PASÓ',
      ms: Date.now() - inicio,
      archivo: path.relative(ROOT_DIR, res.archivo),
      percy: res.percy,
    });
    console.log(`  ✓ ${pantalla.nombre}  ${Date.now() - inicio} ms  (percy: ${res.percy})`);
  } catch (error) {
    const mensaje = /** @type {Error} */ (error).message.split('\n')[0];
    registro.push({
      nombre: pantalla.nombre,
      estado: 'FALLÓ',
      ms: Date.now() - inicio,
      error: mensaje,
    });
    console.log(`  ✗ ${pantalla.nombre}  ${mensaje}`);
    // La sesión pudo perderse: la siguiente pantalla con sesión vuelve a entrar.
    if (pantalla.sesion) sesionIniciada = false;
  }
}

await context.close();
await browser.close();

const fallos = registro.filter((r) => r.estado === 'FALLÓ');
const resumen = {
  runId,
  baseUrl: process.env.BASE_URL,
  percy: conPercy ? 'activo' : 'inactivo',
  total: registro.length,
  paso: registro.length - fallos.length,
  fallo: fallos.length,
  pantallas: registro,
};
fs.writeFileSync(path.join(dirCorrida, 'registro.json'), JSON.stringify(resumen, null, 2), 'utf8');

console.log(
  [
    '',
    `[visual] ${resumen.paso}/${resumen.total} pantallas capturadas`,
    `  Percy: ${resumen.percy}`,
    `  Evidencias en: ${path.relative(ROOT_DIR, dirCorrida)}`,
    '',
  ].join('\n'),
);

process.exit(fallos.length ? 1 : 0);

