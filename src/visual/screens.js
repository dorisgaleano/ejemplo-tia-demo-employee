/**
 * @file Catálogo de pantallas de la regresión visual (Entregable 5).
 * Capa: visual. Una pantalla = un nombre estable + una ruta + qué hay que enmascarar.
 *
 * El NOMBRE es la identidad del snapshot en Percy: si cambia (porque incluye el IdFila, la
 * fecha o un contador), Percy crea una pantalla nueva en cada corrida en lugar de comparar
 * contra el baseline y la regresión visual deja de existir. Nombres fijos, sin datos de la
 * corrida dentro.
 *
 * Rutas verificadas contra la demo pública (OrangeHRM OS 5.9) el 2026-10-23:
 * todas responden 200 y su encabezado coincide con `titulo`.
 */

/**
 * @typedef {object} Pantalla
 * @property {string} nombre      Identidad estable del snapshot (prefijo numérico = orden).
 * @property {string} ruta        Ruta relativa al BASE_URL.
 * @property {string} titulo      Encabezado que debe estar visible antes de capturar.
 * @property {boolean} sesion     true si requiere haber iniciado sesión.
 * @property {string[]} [ignorar] Selectores que Percy ignora por completo (regiones volátiles).
 * @property {string[]} [mascaras] Reservado: regiones que se taparían en la captura local.
 * @property {string} [nota]      Por qué esta pantalla está en la suite.
 */

/** Regiones volátiles comunes: filas de datos de la demo compartida y avisos efímeros. */
const VOLATIL = ['.oxd-table-body', '.oxd-toast-container', '.oxd-toast'];

/** @type {Pantalla[]} */
export const SCREENS = [
  {
    nombre: '01-login',
    ruta: '/web/index.php/auth/login',
    titulo: 'Login',
    sesion: false,
    ignorar: [],
    // La demo imprime las credenciales de acceso en el propio formulario: se tapa junto con
    // el campo de contraseña, o el enmascarado sería decorativo.
    mascaras: ['input[type="password"]', '.orangehrm-demo-credentials'],
    nota: 'Puerta de entrada: cualquier regresión aquí bloquea toda la suite.',
  },
  {
    nombre: '02-dashboard',
    ruta: '/web/index.php/dashboard/index',
    titulo: 'Dashboard',
    sesion: true,
    // Los widgets muestran ausencias del día y nombres de empleados que cambian con el uso
    // de la demo compartida: se ignoran para no aprobar como baseline el estado de otro usuario.
    ignorar: ['.oxd-grid-item', ...VOLATIL],
    nota: 'Vista de aterrizaje: los widgets y su maquetación son el objetivo de la comparación.',
  },
  {
    nombre: '03-apply-leave',
    ruta: '/web/index.php/leave/applyLeave',
    titulo: 'Apply Leave',
    sesion: true,
    // El saldo disponible por tipo cambia según los cupos QA-HLC-* de cada corrida.
    ignorar: ['.oxd-grid-item--gutters', ...VOLATIL],
    nota: 'Formulario principal del módulo: el que más regresiones de maquetación recibe.',
  },
  {
    nombre: '04-assign-leave',
    ruta: '/web/index.php/leave/assignLeave',
    titulo: 'Assign Leave',
    sesion: true,
    ignorar: ['.oxd-grid-item--gutters', ...VOLATIL],
    nota: 'Formulario con autocompletado de empleado y diálogo de confirmación.',
  },
  {
    nombre: '05-my-leave',
    ruta: '/web/index.php/leave/viewMyLeaveList',
    titulo: 'My Leave List',
    sesion: true,
    ignorar: [...VOLATIL],
    nota: 'Lista con filtros, paginación y estados: la tabla es lo que se compara.',
  },
  {
    nombre: '06-leave-list',
    ruta: '/web/index.php/leave/viewLeaveList',
    titulo: 'Leave List',
    sesion: true,
    ignorar: [...VOLATIL],
    nota: 'Vista administrativa del módulo; comparte tabla con My Leave pero con más columnas.',
  },
  {
    nombre: '07-leave-types',
    ruta: '/web/index.php/leave/leaveTypeList',
    titulo: 'Leave Types',
    sesion: true,
    ignorar: [...VOLATIL],
    nota: 'Configuración del módulo: aquí viven los tipos QA-HLC-* que crea la preparación.',
  },
];

/**
 * CSS que Percy aplica SOLO a su snapshot: congela animaciones y oculta claves, igual que el
 * mask de las capturas. Sin esto, cada corrida produce diffs falsos por transiciones a medias.
 */
export const PERCY_CSS = `
  * { animation: none !important; transition: none !important; caret-color: transparent !important; }
  input[type="password"] { visibility: hidden !important; }
`;

/** CSS equivalente para la captura local (Playwright no aplica percyCSS). */
export const LOCAL_CSS = `
  * { animation: none !important; transition: none !important; caret-color: transparent !important; }
  input[type="password"] { -webkit-text-security: disc !important; }
`;

/**
 * Devuelve la pantalla por nombre, o undefined si no existe.
 * @param {string} nombre
 * @returns {Pantalla | undefined}
 */
export function pantallaPorNombre(nombre) {
  return SCREENS.find((s) => s.nombre === nombre);
}

