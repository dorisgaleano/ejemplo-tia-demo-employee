/**
 * @file Exploración (modalidad B) del caso HLC-TC-004 — SOLO LECTURA.
 * Capa: scripts/explore (evidencia reproducible del descubrimiento; NO forma parte de la suite).
 *
 * Recorre: login → lecturas por API (periodo, semana laboral, usuario/empleado, tipos) →
 * Leave > Apply (sin enviar) → Leave > My Leave List. Registra URL, título, ariaSnapshot,
 * llamadas GET a la API v2 y capturas con la contraseña enmascarada. No crea ni modifica datos.
 *
 * Uso: node scripts/explore/HLC-TC-004.explore.js [--headed]
 * Salida: scripts/explore/output/HLC-TC-004/
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ENV, ROOT_DIR } from '../../src/config/env.js';

const OUT = path.join(ROOT_DIR, 'scripts', 'explore', 'output', 'HLC-TC-004');
fs.mkdirSync(OUT, { recursive: true });
const log = (/** @type {string} */ title, /** @type {unknown} */ data) => {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`\n=== ${title} ===\n${text}`);
  fs.appendFileSync(path.join(OUT, 'exploracion.log'), `\n=== ${title} ===\n${text}\n`);
};
fs.rmSync(path.join(OUT, 'exploracion.log'), { force: true });

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const context = await browser.newContext({ baseURL: ENV.baseUrl, viewport: { width: 1366, height: 768 } });
context.setDefaultTimeout(20_000);
const page = await context.newPage();

// Registro de las llamadas a la API que hace la propia aplicación (descubre endpoints reales).
/** @type {string[]} */
const apiCalls = [];
page.on('response', (r) => {
  if (r.url().includes('/api/v2/')) apiCalls.push(`${r.request().method()} ${r.status()} ${r.url().replace(ENV.baseUrl, '')}`);
});
const mask = () => [page.locator('input[type="password"]')];
const shot = (/** @type {string} */ name) => page.screenshot({ path: path.join(OUT, `${name}.png`), mask: mask(), fullPage: true });
const api = async (/** @type {string} */ resource) => {
  const r = await page.request.get(`${ENV.baseUrl}/web/index.php/api/v2${resource}`);
  return { status: r.status(), body: r.ok() ? await r.json() : (await r.text()).slice(0, 200) };
};
const apiSend = async (/** @type {string} */ method, /** @type {string} */ resource, /** @type {object} */ data) => {
  const r = await page.request.fetch(`${ENV.baseUrl}/web/index.php/api/v2${resource}`, { method, data });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: r.status(), body };
};

// ---- Sección con creación de datos (solo con --crear-datos) -------------------
const WRITE = process.argv.includes('--crear-datos');
const EMP_NUMBER = 7; // empleado vinculado al Admin, descubierto en la pasada de solo lectura
const TYPE_NAME = 'QA-HLC-004-A-EXP1020';
const MAR_UI = '2026-27-10'; // 2026-10-27 en el formato Y-d-m de la demo
/** @type {{typeId?: number, entitlementId?: number, leaveRequestId?: number, cancelled?: boolean}} */
const created = {};
/** @type {string[]} */
const writeCalls = [];
page.on('request', (req) => {
  if (req.url().includes('/api/v2/') && req.method() !== 'GET') {
    writeCalls.push(`${req.method()} ${req.url().replace(ENV.baseUrl, '')} ${req.postData() ?? ''}`);
  }
});

try {
  // ---- 1. Login -------------------------------------------------------------
  await page.goto('/web/index.php/auth/login');
  const user = page.getByRole('textbox', { name: 'Username' });
  const pass = page.getByRole('textbox', { name: 'Password' });
  const loginBtn = page.getByRole('button', { name: 'Login' });
  // La página dibuja el formulario con JS: se cuenta después de que esté visible.
  await loginBtn.waitFor();
  log('Login: conteos de selectores candidatos', {
    'getByPlaceholder(Username)': await user.count(),
    'getByPlaceholder(Password)': await pass.count(),
    'getByRole(button, Login)': await loginBtn.count(),
  });
  log('Login: ariaSnapshot', await page.locator('form').ariaSnapshot());
  await shot('01_login');
  await user.fill(ENV.user);
  await pass.fill(ENV.password);
  await loginBtn.click();
  await page.waitForURL(/\/dashboard\//);
  log('Tras login', { url: page.url(), title: await page.title() });
  log('Topbar: ariaSnapshot', await page.locator('header').ariaSnapshot());
  await shot('02_dashboard');

  // ---- 2. Lecturas por API (solo GET) ---------------------------------------
  log('API leave-periods', await api('/leave/leave-periods'));
  log('API workweek', await api('/leave/workweek?model=indexed'));
  log('API admin/users?username=Admin (empleado vinculado)', await api(`/admin/users?username=${encodeURIComponent(ENV.user)}&limit=5`));
  log('API admin/localization (formato de fecha)', await api('/admin/localization'));
  log('API holidays periodo', await api('/leave/holidays?fromDate=2026-01-01&toDate=2026-12-31'));
  log('API leave-types/eligible', await api('/leave/leave-types/eligible'));
  log('API leave-entitlements (primeros 3, para ver campos)', await api('/leave/leave-entitlements?limit=3'));
  log('API leave-requests propias (My Leave)', await api('/leave/leave-requests?limit=3&fromDate=2026-01-01&toDate=2026-12-31'));

  // ---- 3. Leave > Apply (no se envía) ---------------------------------------
  await page.getByRole('link', { name: 'Leave' }).click();
  await page.waitForURL(/\/leave\//);
  log('Menú Leave: ariaSnapshot topbar', await page.locator('header').ariaSnapshot());
  await page.getByRole('link', { name: 'Apply' }).click();
  await page.waitForURL(/applyLeave/);
  await page.locator('form').first().waitFor();
  log('Apply', { url: page.url(), title: await page.title() });
  log('Apply: ariaSnapshot del contenido', await page.locator('.oxd-layout-context').ariaSnapshot());
  await shot('03_apply');

  // Interacción SIN enviar: abrir el desplegable de tipos y llenar fechas para ver qué controles
  // aparecen (Duration). No se pulsa "Apply"; al salir de la página nada queda guardado.
  const form = page.locator('form');
  const leaveTypeGroup = form.locator('.oxd-input-group').filter({ hasText: 'Leave Type' });
  const fromGroup = form.locator('.oxd-input-group').filter({ hasText: 'From Date' });
  const toGroup = form.locator('.oxd-input-group').filter({ hasText: 'To Date' });
  log('Apply: conteos de candidatos', {
    'grupo Leave Type': await leaveTypeGroup.count(),
    'grupo From Date': await fromGroup.count(),
    'grupo To Date': await toGroup.count(),
    'textbox en From': await fromGroup.getByRole('textbox').count(),
    'button Apply': await page.getByRole('button', { name: 'Apply' }).count(),
  });
  await leaveTypeGroup.locator('.oxd-select-text').click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor();
  log('Apply: listbox de tipos', await listbox.ariaSnapshot());
  await shot('03b_apply_tipos');
  await page.keyboard.press('Escape');
  const placeholder = await fromGroup.getByRole('textbox').getAttribute('placeholder');
  log('Apply: placeholder de fecha', placeholder);
  const sample = placeholder === 'yyyy-dd-mm' ? '2026-27-10' : '2026-10-27';
  await fromGroup.getByRole('textbox').fill(sample);
  await toGroup.getByRole('textbox').click(); // al salir del campo From, la app copia la fecha a To
  log('Apply: valor To tras llenar From', await toGroup.getByRole('textbox').inputValue());
  await form.getByText('Duration').first().waitFor();
  log('Apply: ariaSnapshot con fechas (sin enviar)', await page.locator('.oxd-layout-context').ariaSnapshot());
  await shot('03c_apply_con_fechas');

  // ---- 4. Leave > My Leave List ---------------------------------------------
  await page.goto('/web/index.php/leave/viewMyLeaveList');
  await page.locator('.oxd-table').first().waitFor();
  log('My Leave List', { url: page.url(), title: await page.title() });
  log('My Leave List: ariaSnapshot del contenido', await page.locator('.oxd-layout-context').ariaSnapshot());
  await shot('04_my_leave_list');

  if (WRITE) await exploreWithData();
} catch (error) {
  log('ERROR', String(/** @type {Error} */ (error).stack ?? error));
  await shot('99_error').catch(() => {});
  process.exitCode = 1;
} finally {
  if (WRITE) await cleanup();
  log('Llamadas a la API v2 hechas por la aplicación', apiCalls);
  log('Peticiones de escritura hechas por la aplicación (método, URL, cuerpo)', writeCalls);
  await browser.close();
}

/**
 * Sección con creación de datos (solo con --crear-datos, confirmada por la usuaria):
 * crea tipo + cupo, envía la solicitud por la UI, lee resultados y cancela por la UI.
 */
async function exploreWithData() {
  // 1. Tipo de licencia QA
  const tipo = await apiSend('POST', '/leave/leave-types', { name: TYPE_NAME, situational: false });
  log('1. POST leave-types', tipo);
  created.typeId = tipo.body?.data?.id;

  // 2. Cupo de 20 días para todo el periodo
  const cupo = await apiSend('POST', '/leave/leave-entitlements', {
    empNumber: EMP_NUMBER,
    leaveTypeId: created.typeId,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
    entitlement: '20',
  });
  log('2. POST leave-entitlements', cupo);
  created.entitlementId = cupo.body?.data?.id;

  // 3. Solicitud por la UI: Leave > Apply, Full Day, MAR
  await page.goto('/web/index.php/leave/applyLeave');
  const form = page.locator('form');
  const group = (/** @type {string} */ label) => form.locator('.oxd-input-group').filter({ hasText: label });
  await group('Leave Type').locator('.oxd-select-text').click();
  await page.getByRole('option', { name: TYPE_NAME }).click();
  log('3. Saldo mostrado tras elegir el tipo', await group('Leave Balance').innerText().catch(() => 'n/d'));
  await group('From Date').getByRole('textbox').fill(MAR_UI);
  await group('To Date').getByRole('textbox').click();
  await form.getByText('Duration').first().waitFor();
  await page.keyboard.press('Escape');
  await shot('05_apply_lleno');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/leave/leave-requests') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Apply' }).click(),
  ]);
  const respBody = await resp.json().catch(() => null);
  log('3. Respuesta POST leave-requests', { status: resp.status(), body: respBody });
  created.leaveRequestId = respBody?.data?.id;
  const toast = page.locator('.oxd-toast');
  await toast.first().waitFor();
  log('3. Toast tras Apply (texto)', await toast.first().innerText());
  log('3. Toast: ariaSnapshot', await toast.first().ariaSnapshot());
  await shot('06_toast_exito');
  await page.waitForURL(/viewMyLeaveList/).catch(() => log('3. Tras Apply', `URL: ${page.url()}`));

  // 4. Lecturas: My Leave List y daysUsed
  await page.goto('/web/index.php/leave/viewMyLeaveList');
  await page.locator('.oxd-table').first().waitFor();
  const row = page.locator('.oxd-table-card').filter({ hasText: TYPE_NAME });
  await row.first().waitFor();
  log('4. My Leave List: filas del tipo QA (conteo)', await row.count());
  log('4. My Leave List: ariaSnapshot de la fila', await row.first().ariaSnapshot());
  log('4. My Leave List: encabezados', await page.locator('.oxd-table-header').ariaSnapshot());
  await shot('07_my_leave_list_fila');
  log('4. GET cupo (daysUsed)', await api(`/leave/leave-entitlements?empNumber=${EMP_NUMBER}&leaveTypeId=${created.typeId}`));

  // 5a. Cancelación por la UI (para descubrir el endpoint real que usa la app)
  await row.first().getByRole('button', { name: 'Cancel' }).click();
  const cancelToast = page.locator('.oxd-toast');
  await cancelToast.first().waitFor();
  log('5a. Toast tras Cancel', await cancelToast.first().innerText());
  created.cancelled = true;
  await shot('08_cancelada');
}

/** 5b/5c. Limpieza: cancela (si faltó), elimina el cupo y el tipo. Registra cada resultado. */
async function cleanup() {
  if (created.leaveRequestId && !created.cancelled) {
    log('5b. PUT cancelar por API', await apiSend('PUT', `/leave/leave-requests/${created.leaveRequestId}`, { action: 'CANCEL' }));
  }
  if (created.entitlementId) {
    log('5b. DELETE leave-entitlements', await apiSend('DELETE', '/leave/leave-entitlements', { ids: [created.entitlementId] }));
  }
  if (created.typeId) {
    log('5c. DELETE leave-types', await apiSend('DELETE', '/leave/leave-types', { ids: [created.typeId] }));
    log('5c. Verificación: tipo QA visible en leave-types', (await api('/leave/leave-types?limit=0')).body?.data?.filter((/** @type {any} */ t) => t.name === TYPE_NAME));
  }
}
