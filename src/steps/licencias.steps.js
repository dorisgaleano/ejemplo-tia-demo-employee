/**
 * @file Step definitions del dominio "licencias" (Leave de OrangeHRM).
 * Capa: steps. Traducción delgada frase → Screenplay: sin locators ni lógica de UI.
 * Los datos de la fila llegan en this.row (cargada por el hook Before desde el tag @fila:).
 */
import { Given, Then, When } from '@cucumber/cucumber';
import { cuposDeLaFila } from '../models/cupos.js';
import { IniciarSesion } from '../screenplay/tasks/IniciarSesion.js';
import { PrepararTipoDeLicencia } from '../screenplay/tasks/PrepararTipoDeLicencia.js';
import { SolicitarLicencia } from '../screenplay/tasks/SolicitarLicencia.js';
import { AsignarLicencia } from '../screenplay/tasks/AsignarLicencia.js';
import { SolicitarLicenciaDirectamente } from '../screenplay/tasks/SolicitarLicenciaDirectamente.js';
import { MensajeEmergente } from '../screenplay/questions/MensajeEmergente.js';
import { MotivoDeRechazo } from '../screenplay/questions/MotivoDeRechazo.js';
import { SaldoDisponible } from '../screenplay/questions/SaldoDisponible.js';
import { PeriodoVigente } from '../screenplay/questions/PeriodoVigente.js';
import { LicenciaEnListaDeLicencias } from '../screenplay/questions/LicenciaEnListaDeLicencias.js';
import { DiasConsumidosDelTipo } from '../screenplay/questions/DiasConsumidosDelTipo.js';
import { LicenciaEnMiLista } from '../screenplay/questions/LicenciaEnMiLista.js';
import { DiasConsumidosDelCupo } from '../screenplay/questions/DiasConsumidosDelCupo.js';
import { resolveDateToken } from '../utils/dates.js';
import { expect } from '../utils/expect.js';

/** @typedef {import('../support/world.js').CustomWorld} World */

/**
 * Contexto para resolver tokens de fecha (LUN, MAR, INICIO_PERIODO...).
 * @param {World} world
 * @param {{inicio: string, fin: string}} [periodo]
 */
const fechasCtx = (world, periodo) => ({ fechas: world.runInfo.fechas, periodo });

/**
 * Prepara el tipo QA con un único cupo, tomado de las columnas Cupo1_* de la fila.
 * Antes verifica que el escenario y la fila coincidan para no ejecutar con datos contradictorios.
 * Solo se comparan las fechas que la frase nombra con una fecha concreta: LUN y MAR se
 * resuelven igual aquí que en la Task, y los límites del periodo los define la fila.
 * @param {World} world
 * @param {number} dias Días del cupo según el escenario.
 * @param {{desde?: string, hasta?: string}} [vigencia] Fechas de vigencia que indica la frase.
 */
async function prepararUnicoCupo(world, dias, vigencia = {}) {
  const cupos = cuposDeLaFila(world.row);
  const misma = (/** @type {string | undefined} */ frase, /** @type {string} */ fila) =>
    frase === undefined || resolveDateToken(frase, fechasCtx(world)) === resolveDateToken(fila, fechasCtx(world));
  const coincide =
    cupos.length === 1 && cupos[0].dias === dias && misma(vigencia.desde, cupos[0].desde) && misma(vigencia.hasta, cupos[0].hasta);
  if (!coincide) {
    throw new Error(`La fila ${world.row.idFila} no coincide con el escenario (Cupo1 de ${dias} días, ${JSON.stringify(vigencia)})`);
  }
  await world.actor.attemptsTo(PrepararTipoDeLicencia.conCupos(cupos, world.row, world.runInfo));
}

// ---------------------------------------------------------------- Dado

/** Inicia sesión como el administrador configurado en .env. */
Given('que el administrador ha iniciado sesión', async function () {
  await /** @type {World} */ (this).actor.attemptsTo(IniciarSesion.conCredencialesDelAmbiente());
});

Given(
  'el empleado de prueba tiene un único cupo de {float} día(s) del tipo de licencia de prueba, vigente durante todo el periodo',
  async function (/** @type {number} */ dias) {
    await prepararUnicoCupo(/** @type {World} */ (this), dias);
  },
);

Given(
  'el empleado de prueba tiene un único cupo de {float} día(s) del tipo de licencia de prueba, vigente desde el {string} hasta el fin del periodo',
  async function (/** @type {number} */ dias, /** @type {string} */ desde) {
    await prepararUnicoCupo(/** @type {World} */ (this), dias, { desde });
  },
);

Given(
  'el empleado de prueba tiene un único cupo de {float} día(s) del tipo de licencia de prueba, vigente desde el inicio del periodo hasta el {string}',
  async function (/** @type {number} */ dias, /** @type {string} */ hasta) {
    await prepararUnicoCupo(/** @type {World} */ (this), dias, { hasta });
  },
);

/** Crea el tipo QA sin ningún cupo (la fila no debe definir columnas CupoN_Dias). */
Given('el empleado de prueba no tiene ningún cupo del tipo de licencia de prueba', async function () {
  const world = /** @type {World} */ (this);
  if (cuposDeLaFila(world.row).length) {
    throw new Error(`La fila ${world.row.idFila} define cupos, pero el escenario indica que no hay ninguno`);
  }
  await world.actor.attemptsTo(PrepararTipoDeLicencia.conCupos([], world.row, world.runInfo));
});

/**
 * Prepara el tipo QA con tres cupos (columnas Cupo1_* a Cupo3_* de la fila). Antes de crear
 * datos verifica que la fila coincida con el escenario (días y orden de inicio) y la
 * precondición del caso: los tres cupos deben estar vigentes en todo el rango solicitado.
 * Con fechas dinámicas esto no se cumple si MAR cae antes del inicio del tercer cupo
 * (enero/febrero) o fuera del periodo vigente (fin de año).
 */
Given(
  'el empleado de prueba tiene tres cupos del tipo de licencia de prueba de {float}, {float} y {float} días, iniciados en ese orden y vigentes hasta el fin del periodo',
  async function (/** @type {number} */ d1, /** @type {number} */ d2, /** @type {number} */ d3) {
    const world = /** @type {World} */ (this);
    const cupos = cuposDeLaFila(world.row);
    const ctx = fechasCtx(world, await world.actor.asks(PeriodoVigente.actual()));
    const vigencias = cupos.map((c) => ({ desde: resolveDateToken(c.desde, ctx), hasta: resolveDateToken(c.hasta, ctx) }));
    const ordenados = vigencias.every((v, i) => i === 0 || vigencias[i - 1].desde <= v.desde);
    if (cupos.length !== 3 || cupos.map((c) => c.dias).join() !== [d1, d2, d3].join() || !ordenados) {
      throw new Error(`La fila ${world.row.idFila} no coincide con el escenario (tres cupos de ${d1}, ${d2} y ${d3} días en orden de inicio)`);
    }
    const desde = resolveDateToken(world.row.datos.FechaDesde, ctx);
    const hasta = resolveDateToken(world.row.datos.FechaHasta, ctx);
    if (!vigencias.every((v) => v.desde <= desde && v.hasta >= hasta)) {
      throw new Error(
        `Precondición no cumplida: no todos los cupos están vigentes entre ${desde} y ${hasta} ` +
          `(${vigencias.map((v) => `${v.desde}..${v.hasta}`).join(', ')}).`,
      );
    }
    await world.actor.attemptsTo(PrepararTipoDeLicencia.conCupos(cupos, world.row, world.runInfo));
  },
);

// ---------------------------------------------------------------- Cuando

/** Solicita licencia en Leave > Apply (las fechas llegan resueltas o como token). */
When(
  'el administrador solicita licencia de jornada completa del {string} al {string}',
  async function (/** @type {string} */ desde, /** @type {string} */ hasta) {
    const world = /** @type {World} */ (this);
    const ctx = fechasCtx(world, world.actor.recall('tipoLicencia').periodo);
    await world.actor.attemptsTo(
      SolicitarLicencia.deJornadaCompleta(resolveDateToken(desde, ctx), resolveDateToken(hasta, ctx)),
    );
  },
);

/**
 * Envía la solicitud directamente al sistema, sin la pantalla Apply (HLC-TC-007, opción B):
 * Apply no ofrece un tipo cuyo único cupo termina antes del fin del periodo.
 */
When(
  'el administrador envía directamente al sistema una solicitud de licencia de jornada completa del {string} al {string}',
  async function (/** @type {string} */ desde, /** @type {string} */ hasta) {
    const world = /** @type {World} */ (this);
    const ctx = fechasCtx(world, world.actor.recall('tipoLicencia').periodo);
    await world.actor.attemptsTo(
      SolicitarLicenciaDirectamente.deJornadaCompleta(resolveDateToken(desde, ctx), resolveDateToken(hasta, ctx)),
    );
  },
);

/** Asigna licencia en Leave > Assign Leave al empleado de prueba. */
When(
  'el administrador asigna al empleado de prueba licencia de jornada completa del {string} al {string}',
  async function (/** @type {string} */ desde, /** @type {string} */ hasta) {
    const world = /** @type {World} */ (this);
    const ctx = fechasCtx(world, world.actor.recall('tipoLicencia').periodo);
    await world.actor.attemptsTo(
      AsignarLicencia.deJornadaCompletaAlEmpleadoDePrueba(resolveDateToken(desde, ctx), resolveDateToken(hasta, ctx)),
    );
  },
);

// ---------------------------------------------------------------- Entonces

/** Texto de confirmación confirmado en la exploración HLC-TC-004. */
Then('se confirma que la solicitud fue registrada', async function () {
  const mensaje = await /** @type {World} */ (this).actor.asks(MensajeEmergente.actual());
  expect(mensaje).toContain('Successfully Saved');
});

/**
 * Texto de rechazo confirmado en HLC-TC-006 (toast "Error · Leave Balance Exceeded" y respuesta
 * 400 con el mismo mensaje). Se lee del canal por el que se envió la solicitud.
 */
Then('la solicitud se rechaza por saldo insuficiente', async function () {
  const mensaje = await /** @type {World} */ (this).actor.asks(MotivoDeRechazo.delUltimoEnvio());
  expect(mensaje).toContain('Leave Balance Exceeded');
});

/** El estado en la lista se muestra como "Pending Approval (1.00)": se compara el prefijo. */
Then(
  'la solicitud figura por {float} día(s) en estado {string}',
  async function (/** @type {number} */ dias, /** @type {string} */ estado) {
    const licencia = await /** @type {World} */ (this).actor.asks(LicenciaEnMiLista.delTipoDePrueba());
    expect(licencia.dias).toBe(dias);
    expect(licencia.estado.startsWith(estado), `Estado mostrado: "${licencia.estado}"`).toBe(true);
  },
);

/** Días de la solicitud registrada, leídos en My Leave (sin verificar estado: el caso no lo pide). */
Then('la solicitud queda registrada por {float} día(s)', async function (/** @type {number} */ dias) {
  const licencia = await /** @type {World} */ (this).actor.asks(LicenciaEnMiLista.delTipoDePrueba());
  expect(licencia.dias).toBe(dias);
});

/** daysUsed de los tres cupos, por API. Una sola aserción para ver el reparto completo si falla. */
Then(
  'los cupos registran {float}, {float} y {float} días consumidos respectivamente',
  async function (/** @type {number} */ d1, /** @type {number} */ d2, /** @type {number} */ d3) {
    const actor = /** @type {World} */ (this).actor;
    const consumos = [];
    for (const n of [1, 2, 3]) consumos.push(await actor.asks(DiasConsumidosDelCupo.numero(n)));
    expect(consumos).toEqual([d1, d2, d3]);
  },
);

/** Días de la licencia asignada, leídos en My Leave (muestra todos los estados del empleado). */
Then('la licencia queda asignada por {float} día(s)', async function (/** @type {number} */ dias) {
  const licencia = await /** @type {World} */ (this).actor.asks(LicenciaEnMiLista.delTipoDePrueba());
  expect(licencia.dias).toBe(dias);
});

/** daysUsed del único cupo (Cupo1), leído por API. */
Then('el cupo registra {float} día(s) consumido(s)', async function (/** @type {number} */ dias) {
  expect(await /** @type {World} */ (this).actor.asks(DiasConsumidosDelCupo.numero(1))).toBe(dias);
});

/** Días de la licencia en Leave > Leave List (pantalla que nombra HLC-TC-003). */
Then('la licencia figura en la lista de licencias por {float} día(s)', async function (/** @type {number} */ dias) {
  const licencia = await /** @type {World} */ (this).actor.asks(LicenciaEnListaDeLicencias.delTipoDePrueba());
  expect(licencia.dias).toBe(dias);
});

/** "Saldo no positivo" del caso HLC-TC-003: saldo disponible ≤ 0, leído por API. */
Then('el saldo disponible del tipo de licencia de prueba no es positivo', async function () {
  expect(await /** @type {World} */ (this).actor.asks(SaldoDisponible.delTipoDePrueba())).toBeLessThanOrEqual(0);
});

/** "No existe ningún cupo consumido": la suma de daysUsed de los cupos del tipo es 0. */
Then('no se consume ningún cupo del tipo de licencia de prueba', async function () {
  expect(await /** @type {World} */ (this).actor.asks(DiasConsumidosDelTipo.enTotal())).toBe(0);
});

/** Saldo disponible del tipo QA para el empleado de prueba, leído por API. */
Then(
  'el saldo disponible del tipo de licencia de prueba queda en {float} día(s)',
  async function (/** @type {number} */ dias) {
    expect(await /** @type {World} */ (this).actor.asks(SaldoDisponible.delTipoDePrueba())).toBe(dias);
  },
);
