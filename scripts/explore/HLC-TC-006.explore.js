/**
 * @file Exploración (modalidad B) del caso HLC-TC-006.
 * Capa: scripts/explore (evidencia reproducible del descubrimiento; NO forma parte de la suite).
 *
 * Sin flags: SOLO LECTURA. Login → Leave > Assign Leave (autocompletado de empleado, sin
 * enviar) → Leave > Leave List. Registra ariaSnapshot, conteos y llamadas a la API v2.
 *
 * Con --crear-datos (requiere confirmación previa de la usuaria): crea el tipo y el cupo
 * desde MAR, envía Apply LUN–MAR (rechazo esperado) y Assign LUN–MAR, lee Leave List y
 * daysUsed, y limpia (cancela, elimina cupo y tipo).
 *
 * Uso: node scripts/explore/HLC-TC-006.explore.js [--crear-datos] [--headed]
 * Salida: scripts/explore/output/HLC-TC-006/
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ENV, ROOT_DIR } from '../../src/config/env.js';
import { computeWeekDates, formatForUi } from '../../src/utils/dates.js';

const OUT = path.join(ROOT_DIR, 'scripts', 'explore', 'output', 'HLC-TC-006');
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(path.join(OUT, 'exploracion.log'), { force: true });
const log = (/** @type {string} */ title, /** @type {unknown} */ data) => {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`\n=== ${title} ===\n${text}`);
  fs.appendFileSync(path.join(OUT, 'exploracion.log'), `\n=== ${title} ===\n${text}\n`);
};

const WRITE = process.argv.includes('--crear-datos');
const { LUN, MAR } = computeWeekDates();
// Nombre único por ejecución: OrangeHRM no permite reutilizar el nombre de un tipo eliminado.
const TYPE_NAME = `QA-HLC-006-A-EXP${new Date().toTimeString().slice(0, 8).replace(/:/g, "")}`;

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const context = await browser.newContext({ baseURL: ENV.baseUrl, viewport: { width: 1366, height: 900 } });
context.setDefaultTimeout(20_000);
const page = await context.newPage();

/** @type {string[]} */
const apiCalls = [];
/** @type {string[]} */
const writeCalls = [];
page.on('response', (r) => {
  if (r.url().includes('/api/v2/')) apiCalls.push(`${r.request().method()} ${r.status()} ${r.url().replace(ENV.baseUrl, '')}`);
});
page.on('request', (req) => {
  if (req.url().includes('/api/v2/') && req.method() !== 'GET') {
    writeCalls.push(`${req.method()} ${req.url().replace(ENV.baseUrl, '')} ${req.postData() ?? ''}`);
  }
});
const shot = (/** @type {string} */ name) =>
  page.screenshot({ path: path.join(OUT, `${name}.png`), mask: [page.locator('input[type="password"]')] });
const apiSend = async (/** @type {string} */ method, /** @type {string} */ resource, /** @type {object} */ [data] = []) => {
  const r = await page.request.fetch(`${ENV.baseUrl}/web/index.php/api/v2${resource}`, { method, data });
  const text = await r.text();
  try {
    return { status: r.status(), body: JSON.parse(text) };
  } catch {
    return { status: r.status(), body: text.slice(0, 300) };
  }
};
const field = (/** @type {string} */ label) => page.locator('form .oxd-input-group').filter({ hasText: label });

/** @type {{typeId?: number, entitlementId?: number, leaveIds: number[]}} */
const created = { leaveIds: [] };

try {
  // ---- Login (selectores certificados en HLC-TC-004) ---------------------------
  await page.goto('/web/index.php/auth/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(ENV.user);
  await page.getByRole('textbox', { name: 'Password' }).fill(ENV.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/dashboard\//);
  const users = await apiSend('GET', `/admin/users?username=${encodeURIComponent(ENV.user)}`);
  const emp = users.body.data[0].employee;
  const empName = `${emp.firstName} ${emp.lastName}`;
  log('Empleado vinculado', { empNumber: emp.empNumber, nombre: empName, LUN, MAR });

  // ---- Leave > Assign Leave (sin enviar) ---------------------------------------
  await page.getByRole('link', { name: 'Leave', exact: true }).click();
  await page.getByRole('link', { name: 'Assign Leave', exact: true }).click();
  await page.waitForURL(/assignLeave/);
  await page.getByRole('heading', { name: 'Assign Leave' }).waitFor();
  log('Assign', { url: page.url() });
  log('Assign: ariaSnapshot', await page.locator('.oxd-layout-context').ariaSnapshot());
  log('Assign: conteos', {
    'grupo Employee Name': await field('Employee Name').count(),
    'textbox Employee Name (placeholder Type for hints...)': await page.getByPlaceholder('Type for hints...').count(),
    'grupo Leave Type': await field('Leave Type').count(),
    'grupo From Date': await field('From Date').count(),
    'grupo To Date': await field('To Date').count(),
    'button Assign': await page.getByRole('button', { name: 'Assign', exact: true }).count(),
  });
  await shot('01_assign');
  await page.getByPlaceholder('Type for hints...').fill(emp.firstName);
  const listbox = page.getByRole('listbox');
  await listbox.getByRole('option').first().waitFor();
  await listbox.getByRole('option', { name: /Searching/ }).waitFor({ state: 'detached' }).catch(() => {});
  log('Assign: opciones del autocompletado', await listbox.ariaSnapshot());
  await shot('02_assign_autocompletado');
  await page.keyboard.press('Escape');

  // ---- Leave > Leave List --------------------------------------------------------
  await page.getByRole('link', { name: 'Leave List', exact: true }).click();
  await page.waitForURL(/viewLeaveList/);
  await page.getByRole('heading', { name: 'Leave List' }).first().waitFor();
  log('Leave List', { url: page.url() });
  log('Leave List: ariaSnapshot (filtros)', await page.locator('.oxd-table-filter').ariaSnapshot());
  await shot('03_leave_list');

  if (WRITE) await exploreWithData(emp, empName);
} catch (error) {
  log('ERROR', String(/** @type {Error} */ (error).stack ?? error));
  await shot('99_error').catch(() => {});
  process.exitCode = 1;
} finally {
  if (WRITE) await cleanup();
  log('Llamadas a la API v2 hechas por la aplicación', apiCalls);
  log('Peticiones de escritura (método, URL, cuerpo)', writeCalls);
  await browser.close();
}

/**
 * Sección con creación de datos (solo con --crear-datos, confirmada por la usuaria).
 * @param {{empNumber: number, firstName: string, lastName: string}} emp
 * @param {string} empName
 */
async function exploreWithData(emp, empName) {
  const fmt = (await apiSend('GET', '/admin/localization')).body.data.dateFormat;
  const tipo = await apiSend('POST', '/leave/leave-types', [{ name: TYPE_NAME, situational: false }]);
  created.typeId = tipo.body?.data?.id;
  log('1. Tipo creado', tipo);
  const cupo = await apiSend('POST', '/leave/leave-entitlements', [
    { empNumber: emp.empNumber, leaveTypeId: created.typeId, fromDate: MAR, toDate: '2026-12-31', entitlement: '20' },
  ]);
  created.entitlementId = cupo.body?.data?.id;
  log('2. Cupo creado', cupo);
  log('2b. Solapes LUN–MAR', await apiSend('GET', `/leave/overlap-leaves?fromDate=${LUN}&toDate=${MAR}&duration[type]=full_day`));

  // ---- 3. Apply LUN–MAR: rechazo esperado ----------------------------------------
  await page.getByRole('link', { name: 'Apply', exact: true }).click();
  await page.getByRole('heading', { name: 'Apply Leave' }).waitFor();
  await field('Leave Type').locator('.oxd-select-text').click();
  await page.getByRole('option', { name: TYPE_NAME, exact: true }).click();
  await field('From Date').getByRole('textbox').fill(formatForUi(LUN, fmt));
  await field('To Date').getByRole('textbox').click();
  await page.waitForFunction(
    (v) => [...document.querySelectorAll('form input')].some((i) => /** @type {HTMLInputElement} */ (i).value === v),
    formatForUi(LUN, fmt),
  );
  await field('To Date').getByRole('textbox').fill(formatForUi(MAR, fmt));
  await page.keyboard.press('Escape');
  await page.locator('form').getByText(/^(Duration|Partial Days)$/).first().waitFor();
  log('3. Apply: ariaSnapshot antes de enviar', await page.locator('.oxd-layout-context').ariaSnapshot());
  await shot('04_apply_lleno');
  const applyResp = page
    .waitForResponse((r) => r.url().includes('/api/v2/leave/leave-requests') && r.request().method() === 'POST', { timeout: 8000 })
    .catch(() => null);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  const ar = await applyResp;
  log('3. Apply: respuesta POST', ar ? { status: ar.status(), body: await ar.text() } : 'no se envió petición POST');
  const toast = page.locator('.oxd-toast').first();
  await toast.waitFor().catch(() => {});
  log('3. Apply: toast', await toast.innerText().catch(() => 'sin toast'));
  log('3. Apply: textos de error en el formulario', await page.locator('.oxd-input-field-error-message').allInnerTexts());
  log('3. Apply: diálogo visible', await page.getByRole('dialog').count());
  await shot('05_apply_resultado');
  if (ar?.ok()) {
    const body = await ar.json();
    if (body?.data?.id) created.leaveIds.push(body.data.id);
  }

  // ---- 4. Assign LUN–MAR ------------------------------------------------------------
  await page.getByRole('link', { name: 'Assign Leave', exact: true }).click();
  await page.getByRole('heading', { name: 'Assign Leave' }).waitFor();
  await page.getByPlaceholder('Type for hints...').fill(emp.firstName);
  const option = page.getByRole('option', { name: new RegExp(`${emp.firstName}.*${emp.lastName}`) });
  await option.first().waitFor();
  log('4. Assign: opciones que coinciden con el empleado', await option.count());
  await option.first().click();
  await field('Leave Type').locator('.oxd-select-text').click();
  await page.getByRole('option', { name: TYPE_NAME, exact: true }).click();
  await field('From Date').getByRole('textbox').fill(formatForUi(LUN, fmt));
  await field('To Date').getByRole('textbox').click();
  await page.waitForFunction(
    (v) => [...document.querySelectorAll('form input')].filter((i) => /** @type {HTMLInputElement} */ (i).value === v).length >= 2,
    formatForUi(LUN, fmt),
  );
  await field('To Date').getByRole('textbox').fill(formatForUi(MAR, fmt));
  await page.keyboard.press('Escape');
  await page.locator('form').getByText(/^(Duration|Partial Days)$/).first().waitFor();
  log('4. Assign: ariaSnapshot antes de enviar', await page.locator('.oxd-layout-context').ariaSnapshot());
  await shot('06_assign_lleno');
  await page.getByRole('button', { name: 'Assign', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const assignResp = page
    .waitForResponse((r) => /\/api\/v2\/leave\/employees\/\d+\/leave-requests/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
    .catch(() => null);
  const appeared = await dialog.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  log('4. Assign: ¿apareció diálogo?', appeared);
  if (appeared) {
    log('4. Assign: diálogo ariaSnapshot', await dialog.ariaSnapshot());
    await shot('07_assign_dialogo');
    await dialog.getByRole('button', { name: /Confirm|Ok|Yes/i }).click();
  }
  const sr = await assignResp;
  log('4. Assign: respuesta POST', sr ? { status: sr.status(), body: await sr.text() } : 'no capturada');
  if (sr?.ok()) {
    const body = await sr.json();
    if (body?.data?.id) created.leaveIds.push(body.data.id);
  }
  await page.locator('.oxd-toast').first().waitFor().catch(() => {});
  log('4. Assign: toast', await page.locator('.oxd-toast').first().innerText().catch(() => 'sin toast'));
  await shot('08_assign_resultado');

  // ---- 5. Leave List y daysUsed --------------------------------------------------------
  await page.getByRole('link', { name: 'Leave List', exact: true }).click();
  await page.waitForURL(/viewLeaveList/);
  const row = page.getByRole('row').filter({ hasText: TYPE_NAME });
  const found = await row.first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  log('5. Leave List: ¿fila del tipo QA visible sin filtrar?', found);
  if (found) {
    await row.first().scrollIntoViewIfNeeded();
    log('5. Leave List: fila', await row.first().ariaSnapshot());
    log('5. Leave List: encabezados', await page.getByRole('columnheader').allInnerTexts());
  }
  await shot('09_leave_list');
  // My Leave muestra por defecto todos los estados (incluido Scheduled) del empleado vinculado.
  await page.getByRole('link', { name: 'My Leave', exact: true }).click();
  await page.getByRole('heading', { name: 'My Leave List' }).waitFor();
  const myRow = page.getByRole('row').filter({ hasText: TYPE_NAME });
  const myFound = await myRow.first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  log('5. My Leave: filas del tipo QA', myFound ? await myRow.count() : 0);
  if (myFound) {
    await myRow.first().scrollIntoViewIfNeeded();
    for (const r of await myRow.all()) log('5. My Leave: fila', await r.ariaSnapshot());
  }
  await shot('10_my_leave');
  log('5. daysUsed', await apiSend('GET', `/leave/leave-entitlements?empNumber=${emp.empNumber}&leaveTypeId=${created.typeId}`));
  log('5. Solicitudes del tipo (API admin)', await apiSend('GET', `/leave/employees/leave-requests?leaveTypeId=${created.typeId}&fromDate=${LUN}&toDate=${MAR}&statuses[]=1&statuses[]=2&statuses[]=3&statuses[]=-1&statuses[]=0`));
  log('Empleado', empName);
}

/** Limpieza: cancela las licencias creadas, elimina el cupo y el tipo. */
async function cleanup() {
  for (const id of created.leaveIds) {
    log(`6. Cancelar licencia ${id}`, await apiSend('PUT', `/leave/employees/leave-requests/${id}`, [{ action: 'CANCEL' }]));
  }
  if (created.entitlementId) {
    log('6. Eliminar cupo', await apiSend('DELETE', '/leave/leave-entitlements', [{ ids: [created.entitlementId] }]));
  }
  if (created.typeId) {
    log('6. Eliminar tipo', await apiSend('DELETE', '/leave/leave-types', [{ ids: [created.typeId] }]));
    const types = await apiSend('GET', '/leave/leave-types?limit=0');
    log('6. Verificación: tipo QA aún visible', types.body.data.filter((/** @type {any} */ t) => t.name === TYPE_NAME));
  }
}
