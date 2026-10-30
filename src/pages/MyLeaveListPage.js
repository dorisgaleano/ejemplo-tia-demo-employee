/**
 * @file POM de Leave > My Leave (lista de licencias propias).
 * Capa: pages. Solo locators. La tabla expone roles ARIA (row, cell, columnheader):
 * las columnas se ubican por el nombre de su encabezado, no por posición fija.
 */

/** @typedef {import('playwright').Page} Page */

export const MyLeaveListPage = {
  /** @param {Page} page */
  heading: (page) => page.getByRole('heading', { name: 'My Leave List' }),
  /** @param {Page} page */
  columnHeaders: (page) => page.getByRole('columnheader'),
  /** Fila de una licencia por su tipo (el nombre del tipo QA es único por corrida). @param {Page} page @param {string} leaveType */
  rowFor: (page, leaveType) => page.getByRole('row').filter({ hasText: leaveType }),
};
