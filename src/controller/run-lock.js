/**
 * @file Bloqueo de ejecución: impide dos corridas de la suite al mismo tiempo.
 * Capa: controller.
 *
 * Por qué: todas las corridas comparten .run/run.json, el usuario Admin, el empleado de
 * prueba y las fechas. Dos corridas simultáneas (2026-10-22) se sobrescribieron el sufijo
 * (→ 422 al crear tipos), se ocuparon las fechas entre sí y saturaron la sesión.
 *
 * Ciclo: prepare-data lo toma en estado "preparada" → BeforeAll lo pasa a "ejecutando" →
 * After de cada fila actualiza la hora de avance → AfterAll lo libera. Un bloqueo sin
 * avance se considera abandonado (ventana cerrada a mitad de corrida) y puede retomarse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../config/env.js';

const LOCK_FILE = path.join(PATHS.runDir, 'lock.json');

/** Minutos sin avance tras los que un bloqueo se considera abandonado, por estado. */
const ABANDONADO_MIN = { preparada: 2, ejecutando: 15 };

/**
 * @typedef {object} Bloqueo
 * @property {string} token   Identifica la corrida dueña (InfoCorrida.token).
 * @property {string} runId   Carpeta de reportes de la corrida (para el mensaje).
 * @property {'preparada' | 'ejecutando'} estado
 * @property {string} inicio      ISO.
 * @property {string} actualizado ISO: último avance.
 */

/** @returns {Bloqueo | null} */
function read() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch {
    return null; // no existe o quedó a medio escribir: se trata como libre
  }
}

/** @param {Bloqueo} lock */
function isActive(lock) {
  const limite = ABANDONADO_MIN[lock.estado] ?? ABANDONADO_MIN.ejecutando;
  return Date.now() - Date.parse(lock.actualizado) < limite * 60_000;
}

/** @param {string} iso */
const hora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

/**
 * Toma (o renueva) el bloqueo para la corrida indicada.
 * @param {{token: string, runId: string}} corrida
 * @param {'preparada' | 'ejecutando'} estado
 * @throws {Error} Si otra corrida tiene el bloqueo activo (mensaje para el usuario final).
 */
export function acquireRunLock(corrida, estado) {
  const actual = read();
  if (actual && actual.token !== corrida.token && isActive(actual)) {
    const limite = ABANDONADO_MIN[actual.estado] ?? ABANDONADO_MIN.ejecutando;
    throw new Error(
      `Ya hay una ejecución de las pruebas en curso (${actual.runId}, iniciada a las ${hora(actual.inicio)}, ` +
        `último avance a las ${hora(actual.actualizado)}). Espera a que termine: dos ejecuciones a la vez ` +
        `se estorban entre sí en la demo. Si estás segura de que no hay ninguna abierta, espera ${limite} ` +
        'minutos o borra el archivo .run/lock.json.',
    );
  }
  const now = new Date().toISOString();
  /** @type {Bloqueo} */
  const lock = {
    token: corrida.token,
    runId: corrida.runId,
    estado,
    inicio: actual?.token === corrida.token ? actual.inicio : now,
    actualizado: now,
  };
  fs.mkdirSync(PATHS.runDir, { recursive: true });
  if (!actual) {
    // Creación exclusiva: si dos procesos llegan a la vez, solo uno la consigue.
    try {
      fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), { flag: 'wx' });
      return;
    } catch {
      return acquireRunLock(corrida, estado); // otro proceso lo creó primero: se reevalúa
    }
  }
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
}

/**
 * Registra avance de la corrida dueña (evita que su bloqueo parezca abandonado).
 * @param {{token: string}} corrida
 */
export function touchRunLock(corrida) {
  const actual = read();
  if (actual?.token === corrida.token) {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ ...actual, actualizado: new Date().toISOString() }, null, 2));
  }
}

/**
 * Libera el bloqueo si pertenece a la corrida indicada (nunca borra el de otra).
 * @param {{token: string}} corrida
 */
export function releaseRunLock(corrida) {
  if (read()?.token === corrida.token) fs.rmSync(LOCK_FILE, { force: true });
}
