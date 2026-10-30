/**
 * @file POM de Leave > Leave List (lista de licencias, vista de administrador).
 * Capa: pages. Solo locators. Confirmados en la exploración HLC-TC-003 (conteo único).
 *
 * Los filtros siguen el patrón de OrangeHRM: el nombre visible del campo está en el mismo
 * contenedor .oxd-input-group (sin <label for>), por eso se filtra el contenedor por su texto.
 * Por defecto la lista muestra solo "Pending Approval": una licencia asignada (Scheduled)
 * aparece únicamente si se agrega ese estado al filtro.
 */

/** @typedef {import('playwright').Page} Page */

/** @param {Page} page @param {string} label */
const filter = (page, label) => page.locator('.oxd-table-filter .oxd-input-group').filter({ hasText: label });

export const LeaveListPage = {
  /** @param {Page} page */
  heading: (page) => page.getByRole('heading', { name: 'Leave List' }).first(),
  /** Desplegable multiselección de estados. @param {Page} page */
  statusSelect: (page) => filter(page, 'Show Leave with Status').locator('.oxd-select-text'),
  /** @param {Page} page */
  leaveTypeSelect: (page) => filter(page, 'Leave Type').locator('.oxd-select-text'),
  /** Opción del desplegable abierto (estado o tipo). @param {Page} page @param {string} name */
  option: (page, name) => page.getByRole('listbox').getByRole('option', { name, exact: true }),
  /** @param {Page} page */
  searchButton: (page) => page.getByRole('button', { name: 'Search' }),
  /** @param {Page} page */
  columnHeaders: (page) => page.getByRole('columnheader'),
  /** @param {Page} page @param {string} leaveType */
  rowFor: (page, leaveType) => page.getByRole('row').filter({ hasText: leaveType }),
};
