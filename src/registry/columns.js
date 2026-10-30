/**
 * @file Descripción de cada columna del Excel para la hoja "Instrucciones".
 * Capa: registry. Una sola fuente para la ayuda al usuario final; la plantilla la usa
 * para documentar las columnas que aparecen en alguna hoja de caso.
 */

/** @type {Record<string, {descripcion: string, ejemplo: string}>} */
export const COLUMN_DOCS = {
  Ejecutar: { descripcion: 'SI = la fila se ejecuta; NO = se omite.', ejemplo: 'SI' },
  IdFila: { descripcion: 'Identificador único de la fila: <caso>-<número>.', ejemplo: 'HLC-TC-004-01' },
  Descripcion: { descripcion: 'Para qué sirve esta fila.', ejemplo: 'Un día con saldo sobrado' },
  Modo: { descripcion: 'APPLY = solicitar licencia; ASSIGN = asignar licencia.', ejemplo: 'APPLY' },
  FechaDesde: { descripcion: 'Primer día de la licencia (ver "Fechas" abajo).', ejemplo: 'MAR' },
  FechaHasta: { descripcion: 'Último día de la licencia (ver "Fechas" abajo).', ejemplo: 'MAR' },
  Jornada: { descripcion: 'Duración de cada día de la licencia.', ejemplo: 'Completa' },
  Cupo1_Dias: { descripcion: 'Días del cupo 1. Vacío = el tipo no tiene cupo.', ejemplo: '20' },
  Cupo1_Desde: { descripcion: 'Inicio de vigencia del cupo 1.', ejemplo: 'INICIO_PERIODO' },
  Cupo1_Hasta: { descripcion: 'Fin de vigencia del cupo 1.', ejemplo: 'FIN_PERIODO' },
  Cupo2_Dias: { descripcion: 'Días del cupo 2 (vacío si no aplica).', ejemplo: '0.25' },
  Cupo2_Desde: { descripcion: 'Inicio de vigencia del cupo 2.', ejemplo: 'INICIO_PERIODO+1M' },
  Cupo2_Hasta: { descripcion: 'Fin de vigencia del cupo 2.', ejemplo: 'FIN_PERIODO' },
  Cupo3_Dias: { descripcion: 'Días del cupo 3 (vacío si no aplica).', ejemplo: '5' },
  Cupo3_Desde: { descripcion: 'Inicio de vigencia del cupo 3.', ejemplo: 'INICIO_PERIODO+2M' },
  Cupo3_Hasta: { descripcion: 'Fin de vigencia del cupo 3.', ejemplo: 'FIN_PERIODO' },
  ResultadoEsperado: { descripcion: 'CREADA = la licencia se registra; RECHAZADA = no se registra.', ejemplo: 'CREADA' },
  DiasLicencia: { descripcion: 'Días que debe tener la licencia creada.', ejemplo: '1' },
  EstadoEsperado: { descripcion: 'Estado esperado de la licencia en la lista.', ejemplo: 'Pending Approval' },
  DiasUsados1: { descripcion: 'Días consumidos esperados del cupo 1.', ejemplo: '1' },
  DiasUsados2: { descripcion: 'Días consumidos esperados del cupo 2.', ejemplo: '0.25' },
  DiasUsados3: { descripcion: 'Días consumidos esperados del cupo 3.', ejemplo: '0.5' },
  SaldoEsperado: { descripcion: 'Saldo disponible esperado del tipo: un número o "<=0".', ejemplo: '0' },
};

/** Texto de ayuda sobre fechas para la hoja Instrucciones. */
export const DATE_HELP = [
  'LUN = primer lunes posterior al día de la ejecución; MAR = el martes siguiente a ese lunes.',
  'INICIO_PERIODO / FIN_PERIODO = inicio y fin del periodo de licencia vigente en OrangeHRM.',
  'Se puede sumar o restar días (D) o meses (M): MAR-1D, INICIO_PERIODO+2M.',
  'También se acepta una fecha fija en formato AAAA-MM-DD.',
];
