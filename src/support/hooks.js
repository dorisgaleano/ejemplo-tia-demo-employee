/**
 * @file Ciclo de vida del navegador, aislamiento por fila, limpieza y evidencias.
 * Capa: support.
 *
 *   BeforeAll  → toma el bloqueo de ejecución (aborta si hay otra corrida activa) y lanza un
 *                único Chromium (headless o visible según el perfil).
 *   Before     → por fila: BrowserContext nuevo (cookies/sesión aisladas) con video y trace,
 *                carga la fila desde el tag @fila:<IdFila> y crea el Actor.
 *   AfterStep  → captura de pantalla por paso, con los campos de contraseña enmascarados.
 *   After      → captura final, snapshot visual en Percy (con "percy exec"), limpieza de datos QA-HLC-*, cierre del trace y del video,
 *                y adjunto con datos/rutas/limpieza que usa el reporte resultados.xlsx.
 *   AfterAll   → cierra el navegador y libera el bloqueo de ejecución.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import percySnapshot from '@percy/playwright';
import { After, AfterAll, AfterStep, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { ENV, ROOT_DIR, TIMEOUTS } from '../config/env.js';
import { readRow, readRunInfo } from '../controller/run-store.js';
import { acquireRunLock, releaseRunLock, touchRunLock } from '../controller/run-lock.js';
import { EVIDENCE_MIME } from '../models/types.js';
import { Actor } from '../screenplay/actors/Actor.js';
import { BrowseTheWeb } from '../screenplay/abilities/BrowseTheWeb.js';
import { CallOrangeApi } from '../screenplay/abilities/CallOrangeApi.js';
import { ManageTestData } from '../screenplay/abilities/ManageTestData.js';

// Límite por paso (no una pausa): la preparación por API en la demo pública puede tardar.
setDefaultTimeout(TIMEOUTS.step);

/** @type {import('playwright').Browser | undefined} */
let browser;

/**
 * Datos de la corrida, leídos UNA vez al inicio: aunque alguien prepare otra corrida después,
 * esta sigue usando su propio sufijo, fechas y carpeta de reportes.
 * @type {import('../models/types.js').InfoCorrida | undefined}
 */
let runInfo;

/** Campos que nunca deben verse en una captura. */
const sensitive = (/** @type {import('playwright').Page} */ page) => [page.locator('input[type="password"]')];

/** CSS que Percy aplica solo a su snapshot: oculta las claves igual que el mask de las capturas. */
const PERCY_CSS = 'input[type="password"] { visibility: hidden !important; }';

BeforeAll(async function () {
  runInfo = readRunInfo();
  // Antes de abrir el navegador: si otra corrida está activa, se aborta sin crear datos.
  acquireRunLock(runInfo, 'ejecutando');
  browser = await chromium.launch({ headless: !this.parameters?.headed });
});

Before(async function ({ pickle }) {
  const filaTag = pickle.tags.find((t) => t.name.startsWith('@fila:'));
  if (!filaTag) {
    throw new Error(`El escenario "${pickle.name}" no tiene tag @fila:. Ejecuta la suite desde prepare-data.`);
  }
  this.runInfo = /** @type {import('../models/types.js').InfoCorrida} */ (runInfo);
  this.row = readRow(filaTag.name.slice('@fila:'.length));
  this.evidenceDir = path.join(ROOT_DIR, this.runInfo.reportDir, 'evidencias', this.row.testCaseId, this.row.idFila);
  fs.mkdirSync(this.evidenceDir, { recursive: true });

  // Contexto nuevo por fila: ninguna sesión, cookie o dato de navegador pasa de una fila a otra.
  this.context = await /** @type {import('playwright').Browser} */ (browser).newContext({
    baseURL: ENV.baseUrl,
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: this.evidenceDir, size: { width: 1366, height: 768 } },
  });
  this.context.setDefaultTimeout(TIMEOUTS.action);
  this.context.setDefaultNavigationTimeout(TIMEOUTS.navigation);
  await this.context.tracing.start({
    title: `${this.row.testCaseId} ${this.row.idFila}`,
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  this.page = await this.context.newPage();
  this.actor = new Actor('Administrador').whoCan(
    new BrowseTheWeb(this.page),
    new CallOrangeApi(this.page.request, ENV.baseUrl),
    new ManageTestData(),
  );
  this.startedAt = new Date();
});

AfterStep(async function ({ pickleStep }) {
  this.stepIndex += 1;
  const file = path.join(this.evidenceDir, `${String(this.stepIndex).padStart(2, '0')}_paso.png`);
  try {
    const shot = await this.page.screenshot({ path: file, mask: sensitive(this.page) });
    this.attach(shot, { mediaType: 'image/png', fileName: path.basename(file) });
  } catch (error) {
    this.attach(`No se pudo capturar el paso "${pickleStep.text}": ${/** @type {Error} */ (error).message}`);
  }
});

After(async function ({ result }) {
  // Avance de la corrida: evita que su bloqueo de ejecución parezca abandonado.
  if (runInfo) touchRunLock(runInfo);
  if (!this.context) return; // el Before falló antes de crear el contexto
  const evidencias = { screenshots: /** @type {string[]} */ ([]), trace: '', video: '' };

  // 1. Captura final (también si la fila falló: muestra el estado en el momento del error).
  const finalShot = path.join(this.evidenceDir, '99_final.png');
  try {
    const shot = await this.page.screenshot({ path: finalShot, mask: sensitive(this.page), fullPage: true });
    this.attach(shot, { mediaType: 'image/png', fileName: '99_final.png' });
  } catch {
    // la página pudo cerrarse por el error; el trace conserva el estado
  }

  // 1b. Snapshot visual en Percy (solo si la corrida va por "percy exec"; si no, no hace nada).
  //     Un fallo de Percy se reporta, pero no cambia el resultado de la prueba.
  try {
    await percySnapshot(this.page, this.row.idFila, { percyCSS: PERCY_CSS });
  } catch (error) {
    this.attach(`No se pudo enviar el snapshot a Percy: ${/** @type {Error} */ (error).message}`);
  }

  // 2. Limpieza de datos QA-HLC-* ANTES de cerrar el contexto: la API usa su sesión.
  //    Un fallo de limpieza se reporta, pero no cambia el resultado de la prueba.
  const limpieza = await ManageTestData.as(this.actor).cleanAll();

  // 3. Cierre del trace y del contexto (el video se escribe al cerrar).
  const tracePath = path.join(this.evidenceDir, 'trace.zip');
  await this.context.tracing.stop({ path: tracePath });
  const video = this.page.video();
  await this.context.close();
  if (video) {
    const videoPath = path.join(this.evidenceDir, 'video.webm');
    fs.renameSync(await video.path(), videoPath);
    evidencias.video = path.relative(ROOT_DIR, videoPath);
  }
  evidencias.trace = path.relative(ROOT_DIR, tracePath);
  evidencias.screenshots = fs
    .readdirSync(this.evidenceDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => path.relative(ROOT_DIR, path.join(this.evidenceDir, f)));

  // 4. Resumen de la fila para el reporte (sin secretos: el Excel no contiene claves).
  this.attach(
    JSON.stringify({
      testCaseId: this.row.testCaseId,
      idFila: this.row.idFila,
      descripcion: this.row.descripcion,
      datos: this.row.datos,
      estado: result?.status ?? Status.UNKNOWN,
      inicio: this.startedAt.toISOString(),
      fin: new Date().toISOString(),
      evidencias,
      limpieza,
    }),
    EVIDENCE_MIME,
  );
  const fallidas = limpieza.filter((l) => !l.ok);
  if (fallidas.length) {
    this.attach(`ATENCIÓN: limpieza incompleta:\n${fallidas.map((l) => `- ${l.description}: ${l.error}`).join('\n')}`);
  }
});

AfterAll(async function () {
  try {
    await browser?.close();
  } finally {
    // Solo libera el bloqueo si es de esta corrida (nunca el de otra).
    if (runInfo) releaseRunLock(runInfo);
  }
});
