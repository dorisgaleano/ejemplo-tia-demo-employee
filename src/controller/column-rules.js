/**
 * @file Reglas de validación por columna del Excel.
 * Capa: controller. Declarativas (OCP): una columna nueva con formato especial se valida
 * agregando una regla aquí, sin tocar el validador.
 */
import { isValidDateToken } from '../utils/dates.js';

/** Columnas obligatorias en toda hoja de caso. */
export const REQUIRED_COLUMNS = ['Ejecutar', 'IdFila', 'Descripcion'];

const isNumber = (/** @type {string} */ v) => /^\d+(\.\d+)?$/.test(v);

/**
 * Cada regla aplica a las columnas cuyo nombre coincide con `column`.
 * `check` devuelve un mensaje de error o null. Las celdas vacías solo se revisan si `required`.
 * @type {{column: RegExp, required?: boolean, check: (value: string) => string | null}[]}
 */
export const COLUMN_RULES = [
  { column: /^Ejecutar$/, required: true, check: (v) => (['SI', 'NO'].includes(v) ? null : 'debe ser SI o NO') },
  { column: /^IdFila$/, required: true, check: () => null },
  { column: /^Descripcion$/, required: true, check: () => null },
  { column: /^Modo$/, required: true, check: (v) => (['APPLY', 'ASSIGN'].includes(v) ? null : 'debe ser APPLY o ASSIGN') },
  {
    column: /^Fecha(Desde|Hasta)$|_(Desde|Hasta)$/,
    check: (v) =>
      isValidDateToken(v) ? null : 'debe ser LUN, MAR, INICIO_PERIODO, FIN_PERIODO (con +N/-N D o M) o AAAA-MM-DD',
  },
  { column: /_Dias$|^DiasLicencia$|^DiasUsados\d$/, check: (v) => (isNumber(v) ? null : 'debe ser un número (ej. 1 o 0.5)') },
  { column: /^SaldoEsperado$/, check: (v) => (isNumber(v) || v === '<=0' ? null : 'debe ser un número o "<=0"') },
];
