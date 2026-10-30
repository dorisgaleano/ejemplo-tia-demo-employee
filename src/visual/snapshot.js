/**
 * @file Captura de una pantalla: espera, congelado de animaciones y envío a Percy.
 * Capa: visual. Reemplaza el snapshot de evidencia de hooks.js (uno por fila, sin nombre
 * estable) por una captura por PANTALLA, con nombre fijo y sin datos volátiles.
 *
 * Tres cosas se hacen siempre antes de disparar el snapshot:
 *   1. Esperar a que la red se calme (si no, Percy captura esqueletos de carga).
 *   2. Congelar animaciones y transiciones (si no, cada corrida difiere por timing).
 *   3. Enmascarar contraseñas y las regiones que declara la pantalla.
 */
import fs from 'node:fs';
import path from 'node:path';
import percySnapshot from '@percy/playwright';
import { LOCAL_CSS, PERCY_CSS } from './screens.js';

/** @typedef {import('./screens.js').Pantalla} Pantalla */

/** Tiempo de asentamiento tras la carga: las tablas de OrangeHRM se repintan al llegar los datos. */
const ASENTAMIENTO_MS = 400;

/**
 * Indica si la corrida va envuelta en `percy exec`. Sin token o sin el CLI, Percy no debe
 * intentar nada: la captura local sigue siendo válida como evidencia.
 * @returns {boolean}
 */
export function percyActivo() {
  return Boolean(process.env.PERCY_TOKEN) && process.env.PERCY_ENABLE === '1';
}

/**
 * Navega a la pantalla y la deja estable para capturar.
 * @param {import('playwright').Page} page
 * @param {Pantalla} pantalla
 * @throws {Error} Si el encabezado esperado no aparece (la pantalla no cargó o cambió).
 */
export async function prepararPantalla(page, pantalla) {
  await page.goto(pantalla.ruta, { waitUntil: 'domcontentloaded' });
  // El encabezado es la prueba de que la pantalla correcta cargó: sin él, capturar sería
  // tomar una foto de una página de error o de un login caducado.
  await page.getByRole('heading', { name: pantalla.titulo }).first().waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts?.ready);
  // Congela animaciones también en la captura local (Playwright no aplica percyCSS).
  await page.addStyleTag({ content: LOCAL_CSS });
  // Solo para la demostración de detección: inyecta un cambio de estilo controlado.
  // No se usa en una corrida normal (la variable no está definida en .env).
  if (process.env.VISUAL_CSS_INJECT) {
    await page.addStyleTag({ content: process.env.VISUAL_CSS_INJECT });
  }
  await page.waitForTimeout(ASENTAMIENTO_MS);
}

/**
 * Captura una pantalla: PNG local (siempre) y snapshot en Percy (si la corrida va por percy exec).
 * @param {import('playwright').Page} page
 * @param {Pantalla} pantalla
 * @param {{dir: string, enviarAPercy?: boolean}} opciones
 * @returns {Promise<{archivo: string, percy: 'enviado' | 'omitido' | 'error', detalle?: string}>}
 */
export async function capturar(page, pantalla, opciones) {
  fs.mkdirSync(opciones.dir, { recursive: true });
  const archivo = path.join(opciones.dir, `${pantalla.nombre}.png`);

  // Solo se tapa la contraseña. Los datos de la demo son ficticios y tapan la pantalla
  // completa si se enmascara la tabla: la evidencia quedaría inservible. Las regiones que
  // cambian entre corridas NO se tapan: se excluyen de la comparación con `ignoreRegions`
  // de Percy, que las mantiene visibles pero fuera del diff.
  const mascaras = (pantalla.mascaras ?? ['input[type="password"]']).map((sel) => page.locator(sel));
  await page.screenshot({ path: archivo, mask: mascaras, maskColor: '#E9EEF3', fullPage: false });

  if (!opciones.enviarAPercy) return { archivo, percy: 'omitido' };

  try {
    await percySnapshot(page, pantalla.nombre, {
      widths: [1366],
      percyCSS: PERCY_CSS,
      ignoreRegions: pantalla.ignorar ?? [],
    });
    return { archivo, percy: 'enviado' };
  } catch (error) {
    // Un fallo de Percy no invalida la evidencia local ni tumba la corrida.
    return { archivo, percy: 'error', detalle: /** @type {Error} */ (error).message };
  }
}


