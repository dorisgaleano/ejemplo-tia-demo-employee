/**
 * @file Fechas de la suite: cálculo de LUN/MAR y resolución de tokens de fecha del Excel.
 * Capa: utils. La comparten prepare-data (validación y cálculo) y las Tasks (resolución
 * con el periodo de licencia leído por API).
 *
 * Tokens válidos en el Excel:
 *   LUN | MAR | INICIO_PERIODO | FIN_PERIODO, con desplazamiento opcional +N/-N en días (D)
 *   o meses (M): "INICIO_PERIODO+1M", "MAR-1D". También una fecha fija AAAA-MM-DD.
 */

const TOKEN_RE = /^(LUN|MAR|INICIO_PERIODO|FIN_PERIODO)(?:([+-])(\d+)([DM]))?$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formatea una fecha local como AAAA-MM-DD (sin pasar por UTC, que podría cambiar el día).
 * @param {Date} date
 * @returns {string}
 */
export function toIsoDate(date) {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Convierte AAAA-MM-DD a Date local (mediodía, para evitar saltos por horario de verano).
 * @param {string} iso
 * @returns {Date}
 */
export function fromIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/**
 * Regla acordada: LUN = primer lunes estrictamente posterior a la fecha de ejecución
 * (si hoy es lunes, el de la próxima semana); MAR = LUN + 1 día.
 * semanasAdelante desplaza ambas fechas N semanas (SEMANAS_ADELANTE del .env), para esquivar
 * fechas ocupadas por otros usuarios de la demo.
 * @param {Date} [today]
 * @param {number} [semanasAdelante]
 * @returns {{LUN: string, MAR: string}}
 */
export function computeWeekDates(today = new Date(), semanasAdelante = 0) {
  const lun = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12);
  while (lun.getDay() !== 1) lun.setDate(lun.getDate() + 1);
  lun.setDate(lun.getDate() + 7 * semanasAdelante);
  const mar = new Date(lun);
  mar.setDate(lun.getDate() + 1);
  return { LUN: toIsoDate(lun), MAR: toIsoDate(mar) };
}

/**
 * Indica si un texto es un token o una fecha válida (validación previa, sin resolver).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidDateToken(value) {
  return TOKEN_RE.test(value) || (ISO_RE.test(value) && !Number.isNaN(fromIsoDate(value).getTime()));
}

/**
 * Convierte AAAA-MM-DD al formato de fecha que muestra la UI de OrangeHRM (notación PHP).
 * Solo se admiten formatos numéricos con Y, m y d (ej. "Y-d-m", "Y-m-d", "d/m/Y"); la demo
 * permite cambiarlo, por eso se lee de la API en cada corrida en vez de fijarlo.
 * @param {string} iso
 * @param {string} phpFormat
 * @returns {string}
 * @throws {Error} Si el formato usa otros símbolos (ej. nombres de mes).
 */
export function formatForUi(iso, phpFormat) {
  if (!/^[Ymd][^A-Za-z][Ymd][^A-Za-z][Ymd]$/.test(phpFormat)) {
    throw new Error(`Formato de fecha de OrangeHRM no soportado: "${phpFormat}" (Admin > Localization)`);
  }
  const [Y, m, d] = iso.split('-');
  return phpFormat.replace(/[Ymd]/g, (c) => ({ Y, m, d })[/** @type {'Y' | 'm' | 'd'} */ (c)]);
}

/**
 * Lista las fechas AAAA-MM-DD entre dos fechas, ambas incluidas.
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function eachDate(from, to) {
  const dates = [];
  for (const d = fromIsoDate(from); toIsoDate(d) <= to; d.setDate(d.getDate() + 1)) dates.push(toIsoDate(d));
  return dates;
}

/**
 * Resuelve un token a fecha AAAA-MM-DD.
 * @param {string} value Token o fecha fija.
 * @param {{fechas: {LUN: string, MAR: string}, periodo?: {inicio: string, fin: string}}} ctx
 * @returns {string}
 * @throws {Error} Si el token no es válido o requiere un periodo no disponible.
 */
export function resolveDateToken(value, ctx) {
  if (ISO_RE.test(value)) return value;
  const match = TOKEN_RE.exec(value);
  if (!match) throw new Error(`Fecha inválida "${value}"`);
  const [, base, sign, amount, unit] = match;
  /** @type {Record<string, string | undefined>} */
  const bases = {
    LUN: ctx.fechas.LUN,
    MAR: ctx.fechas.MAR,
    INICIO_PERIODO: ctx.periodo?.inicio,
    FIN_PERIODO: ctx.periodo?.fin,
  };
  const baseIso = bases[base];
  if (!baseIso) throw new Error(`No se puede resolver "${value}": falta el periodo de licencia`);
  const date = fromIsoDate(baseIso);
  if (sign) {
    const n = Number(amount) * (sign === '-' ? -1 : 1);
    if (unit === 'D') date.setDate(date.getDate() + n);
    else date.setMonth(date.getMonth() + n);
  }
  return toIsoDate(date);
}
