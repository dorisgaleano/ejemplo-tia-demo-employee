/**
 * @file Exploración (modalidad B) del caso HLC-TC-003 — SOLO LECTURA.
 * Capa: scripts/explore (evidencia reproducible del descubrimiento; NO forma parte de la suite).
 *
 * Descubre los filtros de Leave > Leave List (estado, tipo de licencia, Search) y la tabla de
 * resultados. Abre desplegables y pulsa Search: no crea ni modifica datos.
 *
 * Uso: node scripts/explore/HLC-TC-003.explore.js [--headed]
 * Salida: scripts/explore/output/HLC-TC-003/
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ENV, ROOT_DIR } from '../../src/config/env.js';

const OUT = path.join(ROOT_DIR, 'scripts', 'explore', 'output', 'HLC-TC-003');
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(path.join(OUT, 'exploracion.log'), { force: true });
const log = (/** @type {string} */ title, /** @type {unknown} */ data) => {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`\n=== ${title} ===\n${text}`);
  fs.appendFileSync(path.join(OUT, 'exploracion.log'), `\n=== ${title} ===\n${text}\n`);
};

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const context = await browser.newContext({ baseURL: ENV.baseUrl, viewport: { width: 1366, height: 900 } });
context.setDefaultTimeout(30_000);
const page = await context.newPage();
/** @type {string[]} */
const apiCalls = [];
page.on('request', (req) => {
  if (req.url().includes('/api/v2/leave/employees/leave-requests')) apiCalls.push(`${req.method()} ${req.url().replace(/.*api\/v2/, '')}`);
});
// Capturas del tamaño de la ventana: una captura fullPage colapsa el menú superior (HLC-TC-006).
const shot = (/** @type {string} */ name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const group = (/** @type {string} */ label) => page.locator('.oxd-table-filter .oxd-input-group').filter({ hasText: label });

try {
  await page.goto('/web/index.php/auth/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(ENV.user);
  await page.getByRole('textbox', { name: 'Password' }).fill(ENV.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/dashboard\//);

  await page.getByRole('link', { name: 'Leave', exact: true }).click();
  await page.waitForURL(/viewLeaveList/);
  await page.getByRole('heading', { name: 'Leave List' }).first().waitFor();
  log('Leave List: conteos de grupos de filtro', {
    'Show Leave with Status': await group('Show Leave with Status').count(),
    'Leave Type': await group('Leave Type').count(),
    'From Date': await group('From Date').count(),
    'To Date': await group('To Date').count(),
    'button Search': await page.getByRole('button', { name: 'Search' }).count(),
  });
  log('Leave List: valores de fechas por defecto', {
    from: await group('From Date').getByRole('textbox').inputValue(),
    to: await group('To Date').getByRole('textbox').inputValue(),
  });
  log('Grupo estado: ariaSnapshot', await group('Show Leave with Status').ariaSnapshot());
  await shot('01_leave_list');

  // Desplegable de estados (multiselección)
  await group('Show Leave with Status').locator('.oxd-select-text').click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor();
  log('Estados: listbox', await listbox.ariaSnapshot());
  await shot('02_estados');
  await listbox.getByRole('option', { name: 'Scheduled', exact: true }).click();
  log('Grupo estado tras elegir Scheduled', await group('Show Leave with Status').ariaSnapshot());
  await page.keyboard.press('Escape');

  // Desplegable de tipos
  await group('Leave Type').locator('.oxd-select-text').click();
  await page.getByRole('listbox').waitFor();
  log('Tipos: listbox (primeras opciones)', (await page.getByRole('listbox').getByRole('option').allInnerTexts()).slice(0, 15));
  await page.keyboard.press('Escape');

  // Search sin tipo (solo estados Pending + Scheduled): lectura
  await page.getByRole('button', { name: 'Search' }).click();
  await page.locator('.oxd-table').first().waitFor();
  await page.getByText(/Records? Found/).first().waitFor();
  log('Tras Search: total', await page.getByText(/Records? Found/).first().innerText());
  log('Encabezados de la tabla', await page.getByRole('columnheader').allInnerTexts());
  const first = page.getByRole('row').nth(1);
  if (await first.count()) log('Primera fila', await first.ariaSnapshot());
  await shot('03_resultado_search');
} catch (error) {
  log('ERROR', String(/** @type {Error} */ (error).stack ?? error));
  await shot('99_error').catch(() => {});
  process.exitCode = 1;
} finally {
  log('Consultas de Leave List a la API', apiCalls);
  await browser.close();
}
