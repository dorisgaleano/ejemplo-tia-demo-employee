/**
 * @file Registro cerrado de casos autorizados: TestCaseId ↔ feature ↔ hoja del Excel.
 * Capa: registry. Solo los casos registrados aquí se validan y ejecutan; prepare-data
 * rechaza features u hojas de casos no registrados. Cada caso se agrega al certificarse
 * su implementación (Ciclo de certificación), junto con las columnas de su hoja.
 */

/**
 * @typedef {object} CasoRegistrado
 * @property {string} id       TestCaseId = tag del feature = nombre de la hoja.
 * @property {string} titulo   Título del caso.
 * @property {string} feature  Ruta relativa a features/.
 * @property {string[]} columnas Columnas de la hoja, en orden (incluye las comunes).
 * @property {Record<string, string>[]} filasEjemplo Filas iniciales de la plantilla.
 */

/** @type {CasoRegistrado[]} */
export const CASES = [
  {
    id: 'HLC-TC-003',
    titulo: 'Asignar licencia a un empleado sin cupo del tipo',
    feature: 'licencias/HLC-TC-003_asignacion_sin_cupo.feature',
    columnas: ['Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta', 'DiasLicencia'],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-003-01', Descripcion: 'Assign MAR de un tipo sin cupos',
        Modo: 'ASSIGN', FechaDesde: 'MAR', FechaHasta: 'MAR', DiasLicencia: '1',
      },
    ],
  },
  {
    id: 'HLC-TC-004',
    titulo: 'Camino normal: un día con saldo sobrado en un solo cupo',
    feature: 'licencias/HLC-TC-004_solicitud_un_dia_un_cupo.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'EstadoEsperado', 'DiasUsados1',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-004-01', Descripcion: 'Un día con saldo sobrado en un solo cupo',
        Modo: 'APPLY', FechaDesde: 'MAR', FechaHasta: 'MAR',
        Cupo1_Dias: '20', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
        DiasLicencia: '1', EstadoEsperado: 'Pending Approval', DiasUsados1: '1',
      },
    ],
  },
  {
    id: 'HLC-TC-006',
    titulo: 'Primera fecha anterior al inicio del cupo',
    feature: 'licencias/HLC-TC-006_fecha_anterior_al_cupo.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'DiasUsados1',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-006-01', Descripcion: 'Apply LUN–MAR con cupo desde MAR: rechazo',
        Modo: 'APPLY', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '20', Cupo1_Desde: 'MAR', Cupo1_Hasta: 'FIN_PERIODO',
      },
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-006-02', Descripcion: 'Assign LUN–MAR con cupo desde MAR: consume solo MAR',
        Modo: 'ASSIGN', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '20', Cupo1_Desde: 'MAR', Cupo1_Hasta: 'FIN_PERIODO',
        DiasLicencia: '2', DiasUsados1: '1',
      },
    ],
  },
  {
    id: 'HLC-TC-007',
    titulo: 'Segunda fecha posterior al fin del cupo y sin otro cupo',
    feature: 'licencias/HLC-TC-007_fecha_posterior_al_fin_del_cupo.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'DiasUsados1',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-007-01', Descripcion: 'Apply LUN–MAR con cupo hasta LUN: rechazo',
        Modo: 'APPLY', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '20', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'LUN',
      },
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-007-02', Descripcion: 'Assign LUN–MAR con cupo hasta LUN: consume solo LUN',
        Modo: 'ASSIGN', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '20', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'LUN',
        DiasLicencia: '2', DiasUsados1: '1',
      },
    ],
  },
  {
    id: 'HLC-TC-008',
    titulo: 'Reparto parcial sin más cupos (saldo menor que un día)',
    feature: 'licencias/HLC-TC-008_saldo_menor_a_un_dia.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'DiasUsados1',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-008-01', Descripcion: 'Apply MAR (día completo) con cupo de 0.5: rechazo',
        Modo: 'APPLY', FechaDesde: 'MAR', FechaHasta: 'MAR',
        Cupo1_Dias: '0.5', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
      },
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-008-02', Descripcion: 'Assign MAR (día completo) con cupo de 0.5: consume 0.5',
        Modo: 'ASSIGN', FechaDesde: 'MAR', FechaHasta: 'MAR',
        Cupo1_Dias: '0.5', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
        DiasLicencia: '1', DiasUsados1: '0.5',
      },
    ],
  },
  {
    id: 'HLC-TC-009',
    titulo: 'Agotamiento exacto del cupo',
    feature: 'licencias/HLC-TC-009_agotamiento_exacto_del_cupo.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'EstadoEsperado', 'DiasUsados1', 'SaldoEsperado',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-009-01', Descripcion: 'Apply LUN–MAR con cupo de 2 días: agota el saldo',
        Modo: 'APPLY', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '2', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
        DiasLicencia: '2', EstadoEsperado: 'Pending Approval', DiasUsados1: '2', SaldoEsperado: '0',
      },
    ],
  },
  {
    id: 'HLC-TC-010',
    titulo: 'Saldo insuficiente por un día completo',
    feature: 'licencias/HLC-TC-010_saldo_insuficiente_por_un_dia.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'DiasUsados1',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-010-01', Descripcion: 'Apply LUN–MAR con cupo de 1 día: rechazo',
        Modo: 'APPLY', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '1', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
      },
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-010-02', Descripcion: 'Assign LUN–MAR con cupo de 1 día: consume 1',
        Modo: 'ASSIGN', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '1', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
        DiasLicencia: '2', DiasUsados1: '1',
      },
    ],
  },
  {
    id: 'HLC-TC-011',
    titulo: 'Un día repartido entre tres cupos',
    feature: 'licencias/HLC-TC-011_un_dia_entre_tres_cupos.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'Cupo2_Dias', 'Cupo2_Desde', 'Cupo2_Hasta',
      'Cupo3_Dias', 'Cupo3_Desde', 'Cupo3_Hasta', 'DiasLicencia', 'DiasUsados1', 'DiasUsados2', 'DiasUsados3',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-011-01', Descripcion: 'Apply MAR con cupos 0.25/0.25/5: reparto FIFO',
        Modo: 'APPLY', FechaDesde: 'MAR', FechaHasta: 'MAR',
        Cupo1_Dias: '0.25', Cupo1_Desde: 'INICIO_PERIODO', Cupo1_Hasta: 'FIN_PERIODO',
        Cupo2_Dias: '0.25', Cupo2_Desde: 'INICIO_PERIODO+1M', Cupo2_Hasta: 'FIN_PERIODO',
        Cupo3_Dias: '5', Cupo3_Desde: 'INICIO_PERIODO+2M', Cupo3_Hasta: 'FIN_PERIODO',
        DiasLicencia: '1', DiasUsados1: '0.25', DiasUsados2: '0.25', DiasUsados3: '0.5',
      },
    ],
  },
  {
    id: 'HLC-TC-014',
    titulo: 'Fecha previa sin cupo y último día que agota exactamente el cupo',
    feature: 'licencias/HLC-TC-014_fecha_previa_y_agotamiento_exacto.feature',
    columnas: [
      'Ejecutar', 'IdFila', 'Descripcion', 'Modo', 'FechaDesde', 'FechaHasta',
      'Cupo1_Dias', 'Cupo1_Desde', 'Cupo1_Hasta', 'DiasLicencia', 'DiasUsados1',
    ],
    filasEjemplo: [
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-014-01', Descripcion: 'Apply LUN–MAR con cupo de 1 día desde MAR: rechazo',
        Modo: 'APPLY', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '1', Cupo1_Desde: 'MAR', Cupo1_Hasta: 'FIN_PERIODO',
      },
      {
        Ejecutar: 'SI', IdFila: 'HLC-TC-014-02', Descripcion: 'Assign LUN–MAR con cupo de 1 día desde MAR: consume solo MAR',
        Modo: 'ASSIGN', FechaDesde: 'LUN', FechaHasta: 'MAR',
        Cupo1_Dias: '1', Cupo1_Desde: 'MAR', Cupo1_Hasta: 'FIN_PERIODO',
        DiasLicencia: '2', DiasUsados1: '1',
      },
    ],
  },
];
