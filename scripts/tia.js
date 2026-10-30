/**
 * @file Test Impact Analysis: del diff de git al filtro por tags de Cucumber.
 * Capa: scripts (orquestador; la matriz vive en src/registry/impact.js).
 *
 *   node scripts/tia.js                      usa `git diff HEAD~1`
 *   node scripts/tia.js --base=origin/main   compara contra otra referencia
 *   node scripts/tia.js --files=a.js,b.js    simula un cambio sin git (para la demo)
 *   node scripts/tia.js --json               salida legible por una máquina
 *
 * Emite el valor de FILTRO_TAG que ya consumen cucumber.mjs y la opción 4 del menú .bat,
 * de modo que el ahorro se aplica sin tocar la suite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import ExcelJS from 'exceljs';
import { PATHS, ROOT_DIR } from '../src/config/env.js';
import { casoDeFeature, impactosDe, SIEMPRE_TODO } from '../src/registry/impact.js';

/**
 * Duración media observada por modalidad, en segundos, según docs/CERTIFICACION.md
 * (APPLY: 20–51 s; ASSIGN: 80–95 s en la demo pública). Se usa para estimar, no para medir.
 */
const MEDIA_SEG = { APPLY: 30, ASSIGN: 90 };

/** Argumentos --clave=valor. */
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

/**
 * Filas ejecutables del Excel, agrupadas por caso y modalidad.
 * @returns {Promise<Map<string, {APPLY: number, ASSIGN: number}>>}
 */
async function filasPorCaso() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(PATHS.excelInput);
  const mapa = new Map();
  for (const ws of wb.worksheets) {
    if (ws.name === 'Instrucciones') continue;
    const headers = ws.getRow(1).values.slice(1).map(String);
    const colEjecutar = headers.indexOf('Ejecutar') + 1;
    const colModo = headers.indexOf('Modo') + 1;
    const cuenta = { APPLY: 0, ASSIGN: 0 };
    for (let r = 2; r <= ws.rowCount; r += 1) {
      const fila = ws.getRow(r);
      if (String(fila.getCell(colEjecutar).value ?? '').trim() !== 'SI') continue;
      const modo = String(fila.getCell(colModo).value ?? '').trim().toUpperCase();
      if (modo in cuenta) cuenta[modo] += 1;
    }
    mapa.set(ws.name, cuenta);
  }
  return mapa;
}

/** Archivos cambiados según git, o los pasados a mano con --files. */
function archivosCambiados() {
  if (opciones.files) return String(opciones.files).split(',').map((f) => f.trim()).filter(Boolean);
  const base = String(opciones.base ?? 'HEAD~1');
  try {
    return execSync(`git diff --name-only ${base}`, { cwd: ROOT_DIR, encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(
      [
        '[tia] No se pudo leer el diff de git.',
        `      Detalle: ${/** @type {Error} */ (error).message.split('\n')[0]}`,
        '      Si el proyecto no está en un repositorio, usa --files=a.js,b.js para simular el cambio.',
      ].join('\n'),
    );
    process.exit(1);
  }
}

const cambiados = archivosCambiados();
const filas = await filasPorCaso();
const totalEscenarios = [...filas.values()].reduce((a, c) => a + c.APPLY + c.ASSIGN, 0);
const totalCasos = filas.size;

/**
 * Casos afectados con la lista de modalidades tocadas por caso.
 * @type {Map<string, Set<'APPLY'|'ASSIGN'>>}
 */
const afectados = new Map();
let todo = false;
const motivos = [];
const ignorados = [];

for (const archivo of cambiados) {
  const casoFeature = casoDeFeature(archivo);
  if (casoFeature) {
    afectados.set(casoFeature, new Set(['APPLY', 'ASSIGN']));
    motivos.push(`${archivo} → solo ${casoFeature} (cambia su propio feature)`);
    continue;
  }
  if (SIEMPRE_TODO.some((f) => archivo === f || archivo.startsWith(f.replace(/\/[^/]+$/, '/')))) {
    todo = true;
    motivos.push(`${archivo} → transversal (configuración de la suite)`);
    continue;
  }
  const entradas = impactosDe(archivo);
  if (!entradas.length) {
    ignorados.push(archivo);
    continue;
  }
  for (const entrada of entradas) {
    if (entrada.casos === '*') {
      todo = true;
      motivos.push(`${archivo} → transversal (${entrada.motivo})`);
      break;
    }
    const modos = entrada.modos ?? ['APPLY', 'ASSIGN'];
    for (const caso of entrada.casos) {
      const previos = afectados.get(caso) ?? new Set();
      modos.forEach((m) => previos.add(m));
      afectados.set(caso, previos);
    }
    motivos.push(`${archivo} → ${entrada.casos.length} caso(s) ${modos.join('/')} (${entrada.motivo})`);
  }
}

// ---------------------------------------------------------------- selección final
/** @type {{caso: string, modos: ('APPLY'|'ASSIGN')[], escenarios: number}[]} */
const seleccion = [];
for (const [caso, modos] of afectados) {
  const cuenta = filas.get(caso);
  if (!cuenta) continue;
  const escenarios = [...modos].reduce((a, m) => a + cuenta[m], 0);
  if (escenarios > 0) seleccion.push({ caso, modos: [...modos], escenarios });
}
seleccion.sort((a, b) => a.caso.localeCompare(b.caso));

const escenariosSeleccionados = todo ? totalEscenarios : seleccion.reduce((a, s) => a + s.escenarios, 0);
const casosSeleccionados = todo ? totalCasos : seleccion.length;

/** Todos los escenarios de una modalidad concreta (para estimar tiempo). */
const totalPorModo = [...filas.values()].reduce(
  (a, c) => ({ APPLY: a.APPLY + c.APPLY, ASSIGN: a.ASSIGN + c.ASSIGN }),
  { APPLY: 0, ASSIGN: 0 },
);

/** Minutos estimados de la selección (o de todo, si el impacto es transversal). */
function minutosSeleccion() {
  if (todo) return minutosSuiteCompleta();
  let seg = 0;
  for (const s of seleccion) {
    for (const m of s.modos) {
      const cuenta = filas.get(s.caso)?.[m] ?? 0;
      seg += cuenta * (m === 'APPLY' ? MEDIA_SEG.APPLY : MEDIA_SEG.ASSIGN);
    }
  }
  return seg / 60;
}

/** Minutos estimados de la suite completa. */
function minutosSuiteCompleta() {
  return (totalPorModo.APPLY * MEDIA_SEG.APPLY + totalPorModo.ASSIGN * MEDIA_SEG.ASSIGN) / 60;
}

/**
 * Expresión de tags de Cucumber. Cucumber ya añade "and not @wip", así que no se repite.
 * @returns {string} Cadena vacía si hay que correr todo.
 */
function filtroTag() {
  if (todo) return '';
  const partes = seleccion.map(({ caso, modos }) => {
    const tag = `@${caso}`;
    return modos.length === 2 ? tag : `(${tag} and @modo:${modos[0]})`;
  });
  return partes.join(' or ');
}

const resumen = {
  archivos: cambiados,
  motivos,
  ignorados,
  todo,
  casosAfectados: seleccion.map((s) => s.caso),
  casosSeleccionados,
  totalCasos,
  escenariosSeleccionados,
  totalEscenarios,
  ahorroPct: totalEscenarios ? Math.round((1 - escenariosSeleccionados / totalEscenarios) * 100) : 0,
  minutosEstimados: Number(minutosSeleccion().toFixed(1)),
  minutosSuiteCompleta: Number(minutosSuiteCompleta().toFixed(1)),
  filtroTag: filtroTag(),
};

if (opciones.json) {
  console.log(JSON.stringify(resumen, null, 2));
  process.exit(0);
}

const linea = '─'.repeat(66);
console.log(`\n${linea}\n[test-impact-analysis]\n${linea}`);
console.log(`Archivos cambiados: ${cambiados.length}`);
motivos.forEach((m) => console.log(`  · ${m}`));
if (ignorados.length) {
  console.log('  (sin impacto en las pruebas)');
  ignorados.forEach((f) => console.log(`  · ${f}`));
}
console.log('');

if (!cambiados.length) {
  console.log('No hay archivos cambiados: no hay nada que ejecutar.');
  process.exit(0);
}

if (!seleccion.length && !todo) {
  console.log('Ninguno de los archivos cambiados participa en las pruebas: no se ejecuta nada.');
  console.log('Si el cambio toca documentación o el informe, es el resultado esperado.\n');
  process.exit(0);
}

console.log(`Casos afectados: ${casosSeleccionados} de ${totalCasos}${todo ? ' (transversal: se ejecuta todo)' : ''}`);
if (!todo) seleccion.forEach((s) => console.log(`  · ${s.caso}  ${s.modos.join('/')}  ${s.escenarios} escenario(s)`));
console.log('');
console.log(`Escenarios: ${escenariosSeleccionados} de ${totalEscenarios}  (ahorro ${resumen.ahorroPct} %)`);
console.log(`Tiempo estimado: ${resumen.minutosEstimados} min  vs  ${resumen.minutosSuiteCompleta} min de la suite completa`);
console.log('');
console.log(resumen.filtroTag ? `FILTRO_TAG=${resumen.filtroTag}` : 'Se ejecuta la suite completa.');

const dir = path.join(ROOT_DIR, 'reports', 'tia');
fs.mkdirSync(dir, { recursive: true });
const sello = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(path.join(dir, `${sello}.json`), JSON.stringify(resumen, null, 2), 'utf8');
console.log(`\nReporte: ${path.relative(ROOT_DIR, path.join(dir, `${sello}.json`))}\n`);


