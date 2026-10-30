/**
 * @file Configuración centralizada del ambiente, el navegador y los timeouts.
 * Capa: config. Todo valor ajustable de la suite se lee aquí y en ningún otro lugar.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/** Raíz del proyecto (dos niveles arriba de src/config). */
export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// quiet: evita que dotenv imprima mensajes en consola (podrían mezclarse con el reporte).
dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

/** Rutas de trabajo de la suite. */
export const PATHS = {
  featuresSource: path.join(ROOT_DIR, 'features'),
  excelInput: path.join(ROOT_DIR, 'data', 'input', 'datos_pruebas.xlsx'),
  runDir: path.join(ROOT_DIR, '.run'),
  runFeatures: path.join(ROOT_DIR, '.run', 'features'),
  rowsFile: path.join(ROOT_DIR, '.run', 'rows.json'),
  runInfoFile: path.join(ROOT_DIR, '.run', 'run.json'),
  reportsDir: path.join(ROOT_DIR, 'reports'),
};

/**
 * Timeouts en milisegundos. Son LÍMITES máximos de espera, nunca pausas:
 * Playwright continúa en cuanto se cumple la condición.
 */
export const TIMEOUTS = {
  /** Un paso de Cucumber: debe contener un envío lento (serverResponse) más sus acciones de UI. */
  step: 150_000,
  /** Una acción de Playwright (clic, llenado) incluyendo su auto-wait. */
  action: 15_000,
  /**
   * Respuesta del servidor a un envío o a una llamada a la API. Medido en HLC-TC-006: en la
   * demo, Assign Leave (POST /leave/employees/leave-requests) responde 200 tras ~60 s, y
   * mientras tanto la sesión queda bloqueada (las demás llamadas esperan). 90 s cubre ese
   * tiempo con margen; si responde antes, la suite continúa de inmediato.
   */
  serverResponse: 90_000,
  /** Una navegación (goto, waitForURL). */
  navigation: 30_000,
  /** Una aserción web-first de expect (reintenta hasta este límite). */
  expect: 10_000,
};

/**
 * Lee una variable obligatoria del .env.
 * @param {string} name Nombre de la variable.
 * @returns {string} Su valor.
 * @throws {Error} Si no existe o está vacía (mensaje entendible para el usuario final).
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable ${name} en el archivo .env (usa .env.example como guía).`);
  }
  return value;
}

/** Configuración del ambiente. Las credenciales se leen bajo demanda y nunca se registran. */
export const ENV = {
  get baseUrl() {
    return required('BASE_URL').replace(/\/+$/, '');
  },
  get user() {
    return required('E2E_USER');
  },
  get password() {
    return required('E2E_PASSWORD');
  },
  /**
   * Semanas que se desplazan LUN/MAR (opcional, 0 por defecto). Permite esquivar fechas que
   * otro usuario de la demo pública ocupó con licencias del empleado de prueba.
   * @throws {Error} Si no es un entero mayor o igual a 0.
   */
  get semanasAdelante() {
    const raw = (process.env.SEMANAS_ADELANTE ?? '').trim();
    if (raw === '') return 0;
    if (!/^\d+$/.test(raw)) {
      throw new Error(`SEMANAS_ADELANTE en el archivo .env debe ser un número entero (0, 1, 2...); tiene "${raw}".`);
    }
    return Number(raw);
  },
};
