/**
 * @file Matriz de impacto: qué casos hay que volver a ejecutar cuando cambia un archivo.
 * Capa: registry (una sola fuente, igual que cases.js y columns.js).
 *
 * Se construyó leyendo la suite, no suponiéndola: cada entrada dice por qué ese archivo
 * participa en ese caso. `modos` limita el impacto a una modalidad cuando el archivo solo
 * interviene en ella (ApplyLeavePage no se usa en las filas ASSIGN, por ejemplo).
 *
 * `casos: '*'` significa impacto transversal: cualquier fila puede romperse y no tiene
 * sentido intentar ahorrar.
 */

/**
 * @typedef {object} Impacto
 * @property {string} archivo  Ruta relativa a la raíz del proyecto.
 * @property {string[] | '*'} casos Casos afectados, o '*' si es transversal.
 * @property {('APPLY'|'ASSIGN')[]} [modos] Modalidades afectadas (todas si se omite).
 * @property {string} motivo   Por qué ese archivo impacta en esos casos.
 */

/** @type {Impacto[]} */
export const IMPACTOS = [
  // ---------------------------------------------------------------- transversal
  { archivo: 'src/api/LeaveApi.js', casos: '*', motivo: 'Capa de API: la usan la preparación de datos y las verificaciones de todos los casos.' },
  { archivo: 'src/config/env.js', casos: '*', motivo: 'Configuración del ambiente y timeouts de toda la suite.' },
  { archivo: 'src/support/hooks.js', casos: '*', motivo: 'Ciclo de vida del navegador, evidencias y limpieza: afecta a cada fila.' },
  { archivo: 'src/support/world.js', casos: '*', motivo: 'Estado compartido entre pasos de cualquier escenario.' },
  { archivo: 'src/steps/licencias.steps.js', casos: '*', motivo: 'Definiciones de pasos: un cambio de frase afecta a los nueve features.' },
  { archivo: 'src/registry/cases.js', casos: '*', motivo: 'Registro de casos y columnas esperadas del Excel.' },
  { archivo: 'src/registry/columns.js', casos: '*', motivo: 'Documentación de columnas que usa la plantilla del Excel.' },
  { archivo: 'src/controller/validator.js', casos: '*', motivo: 'Validación previa del Excel: puede bloquear cualquier corrida.' },
  { archivo: 'src/controller/column-rules.js', casos: '*', motivo: 'Reglas por columna aplicadas a todas las hojas.' },
  { archivo: 'src/controller/excel-reader.js', casos: '*', motivo: 'Lectura del Excel: entrada de todas las filas.' },
  { archivo: 'src/controller/feature-generator.js', casos: '*', motivo: 'Genera los escenarios de ejecución a partir de cada fila.' },
  { archivo: 'src/controller/feature-parser.js', casos: '*', motivo: 'Interpreta tags y bloques @excel de todos los features.' },
  { archivo: 'src/controller/filters.js', casos: '*', motivo: 'Filtros del menú (caso, fila): afectan a la selección de filas.' },
  { archivo: 'src/controller/run-lock.js', casos: '*', motivo: 'Bloqueo de ejecución: si falla, la corrida aborta sin datos.' },
  { archivo: 'src/controller/run-store.js', casos: '*', motivo: 'Persistencia de la corrida que leen hooks y generador.' },
  { archivo: 'src/reporting/results-builder.js', casos: '*', motivo: 'Armado del reporte de resultados de la corrida.' },
  { archivo: 'src/reporting/results-writer.js', casos: '*', motivo: 'Escritura del reporte de resultados de la corrida.' },
  { archivo: 'src/screenplay/abilities/BrowseTheWeb.js', casos: '*', motivo: 'Habilidad de navegación usada por todos los actores.' },
  { archivo: 'src/screenplay/abilities/CallOrangeApi.js', casos: '*', motivo: 'Cliente HTTP de la API usado en todos los casos.' },
  { archivo: 'src/screenplay/abilities/ManageTestData.js', casos: '*', motivo: 'Creación y limpieza de datos QA-HLC-* de cada fila.' },
  { archivo: 'src/screenplay/actors/Actor.js', casos: '*', motivo: 'Actor de Screenplay: base de todas las tareas.' },
  { archivo: 'src/screenplay/interactions/index.js', casos: '*', motivo: 'Interacciones genéricas (login, clics) reutilizadas por todas las tareas.' },
  { archivo: 'src/screenplay/tasks/PrepararTipoDeLicencia.js', casos: '*', motivo: 'Precondición de datos de todos los casos (crea el tipo y los cupos).' },
  { archivo: 'src/utils/expect.js', casos: '*', motivo: 'Utilidades de aserción usadas por todas las preguntas.' },

  // ---------------------------------------------------------------- APPLY
  { archivo: 'src/pages/ApplyLeavePage.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-009', 'HLC-TC-010', 'HLC-TC-011', 'HLC-TC-014'], modos: ['APPLY'], motivo: 'Page Object exclusivo del formulario Apply Leave.' },
  { archivo: 'src/screenplay/tasks/SolicitarLicencia.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-009', 'HLC-TC-010', 'HLC-TC-011', 'HLC-TC-014'], modos: ['APPLY'], motivo: 'Tarea de solicitud por la UI.' },
  { archivo: 'src/screenplay/tasks/SolicitarLicenciaDirectamente.js', casos: ['HLC-TC-007'], modos: ['APPLY'], motivo: 'Envío directo por API usado solo en la fila APPLY de HLC-TC-007.' },

  // ---------------------------------------------------------------- ASSIGN
  { archivo: 'src/pages/AssignLeavePage.js', casos: ['HLC-TC-003', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], modos: ['ASSIGN'], motivo: 'Page Object del formulario Assign Leave, incluido el autocompletado de empleado.' },
  { archivo: 'src/screenplay/tasks/AsignarLicencia.js', casos: ['HLC-TC-003', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], modos: ['ASSIGN'], motivo: 'Tarea de asignación y diálogo de confirmación.' },

  // ---------------------------------------------------------------- formulario común
  { archivo: 'src/pages/components/LeaveForm.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Componente de formulario compartido por Apply y Assign.' },
  { archivo: 'src/screenplay/tasks/CompletarFormularioDeLicencia.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Llenado de fechas y jornada en ambos formularios.' },
  { archivo: 'src/pages/components/Toast.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Mensajes de confirmación y de rechazo que verifican varios casos.' },
  { archivo: 'src/pages/components/MainMenu.js', casos: '*', motivo: 'Navegación del módulo usada por todas las tareas de UI.' },

  // ---------------------------------------------------------------- reglas de negocio
  { archivo: 'src/models/cupos.js', casos: ['HLC-TC-003', 'HLC-TC-004', 'HLC-TC-009', 'HLC-TC-011'], motivo: 'Modelo de cupos: reparto FIFO y agotamiento.' },
  { archivo: 'src/utils/dates.js', casos: ['HLC-TC-006', 'HLC-TC-007', 'HLC-TC-014'], motivo: 'Traducción de fechas simbólicas: LUN, MAR, INICIO_PERIODO' },
  { archivo: 'src/models/types.js', casos: '*', motivo: 'Tipos compartidos por toda la suite (solo documentación, impacto real nulo en ejecución).' },

  // ---------------------------------------------------------------- verificación
  { archivo: 'src/pages/MyLeaveListPage.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Verificación del estado de la licencia en My Leave.' },
  { archivo: 'src/screenplay/questions/LicenciaEnMiLista.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Pregunta que lee la licencia en My Leave.' },
  { archivo: 'src/pages/LeaveListPage.js', casos: ['HLC-TC-003'], motivo: 'HLC-TC-003 se verifica en Leave List con filtro de estado y tipo.' },
  { archivo: 'src/screenplay/questions/LicenciaEnListaDeLicencias.js', casos: ['HLC-TC-003'], motivo: 'Pregunta que lee la licencia en Leave List.' },
  { archivo: 'src/screenplay/questions/DiasConsumidosDelCupo.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-009', 'HLC-TC-010', 'HLC-TC-011', 'HLC-TC-014'], motivo: 'Consumo por cupo verificado por API en casi todos los casos.' },
  { archivo: 'src/screenplay/questions/DiasConsumidosDelTipo.js', casos: ['HLC-TC-003', 'HLC-TC-011'], motivo: 'Consumo total del tipo de licencia.' },
  { archivo: 'src/screenplay/questions/SaldoDisponible.js', casos: ['HLC-TC-003', 'HLC-TC-009'], motivo: 'Saldo disponible del tipo, verificado por API.' },
  { archivo: 'src/screenplay/questions/PeriodoVigente.js', casos: '*', motivo: 'Periodo de licencia vigente que necesita toda precondición.' },
  { archivo: 'src/screenplay/questions/MensajeEmergente.js', casos: ['HLC-TC-004', 'HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Toast de confirmación o rechazo.' },
  { archivo: 'src/screenplay/questions/MotivoDeRechazo.js', casos: ['HLC-TC-006', 'HLC-TC-007', 'HLC-TC-008', 'HLC-TC-010', 'HLC-TC-014'], motivo: 'Motivo del rechazo mostrado por la UI o la API.' },
  { archivo: 'src/screenplay/tasks/IniciarSesion.js', casos: '*', motivo: 'Login: primer paso de todos los escenarios.' },
  { archivo: 'src/pages/LoginPage.js', casos: '*', motivo: 'Locators del login.' },
  { archivo: 'src/screenplay/tasks/ComprobarFechasDisponibles.js', casos: ['HLC-TC-006', 'HLC-TC-007', 'HLC-TC-014'], motivo: 'Comprueba que las fechas simbólicas caen dentro del periodo.' },
];

/** Archivos cuya modificación obliga a correr todo (además de los marcados con casos: '*'). */
export const SIEMPRE_TODO = [
  'package.json',
  'package-lock.json',
  'cucumber.mjs',
  'data/input/datos_pruebas.xlsx',
];

/**
 * Busca el impacto de un archivo: primero exacto, luego por prefijo de carpeta.
 * @param {string} archivo Ruta relativa.
 * @returns {Impacto[]} Entradas aplicables (vacío si el archivo no participa en las pruebas).
 */
export function impactosDe(archivo) {
  const exacto = IMPACTOS.filter((i) => i.archivo === archivo);
  if (exacto.length) return exacto;
  // Un archivo nuevo dentro de una carpeta cubierta hereda el impacto de esa carpeta.
  return IMPACTOS.filter((i) => archivo.startsWith(i.archivo.replace(/\/[^/]+$/, '/')));
}

/**
 * Casos tocados por un feature concreto (features/licencias/HLC-TC-004_*.feature).
 * @param {string} archivo
 * @returns {string | null} TestCaseId o null si no es un feature de caso.
 */
export function casoDeFeature(archivo) {
  const m = /(?:^|\/)features\/.*?(HLC-TC-\d{3})[^/]*\.feature$/.exec(archivo);
  return m ? m[1] : null;
}

