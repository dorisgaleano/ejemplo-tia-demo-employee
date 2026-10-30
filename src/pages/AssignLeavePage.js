/**
 * @file POM de Leave > Assign Leave (asignar licencia a un empleado).
 * Capa: pages. Solo locators; los campos comunes están en components/LeaveForm.js.
 */

/** @typedef {import('playwright').Page} Page */

/** @param {string} text */
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const AssignLeavePage = {
  /** @param {Page} page */
  heading: (page) => page.getByRole('heading', { name: 'Assign Leave' }),
  /**
   * Autocompletado de empleado. No tiene label asociado; su placeholder es fijo
   * ("Type for hints...") y único en la pantalla (conteo 1 confirmado).
   * @param {Page} page
   */
  employeeName: (page) => page.getByPlaceholder('Type for hints...'),
  /**
   * Sugerencia del autocompletado por POSICIÓN. En la demo puede haber varios empleados con
   * el mismo nombre (ej. dos "John Doe"), así que el nombre no basta para elegir: la Task
   * calcula la posición del empleado en la respuesta de sugerencias de la API, cuyo orden
   * coincide con el de las opciones en pantalla (verificado en un trace del 2026-10-21).
   * @param {Page} page @param {number} index
   */
  employeeOptionAt: (page, index) => page.getByRole('listbox').getByRole('option').nth(index),
  /**
   * Nombre esperado de una sugerencia: la app muestra el nombre completo (con segundos
   * nombres), por eso se acepta "Nombre ... Apellido". Sirve para verificar la opción elegida.
   * @param {string} firstName @param {string} lastName
   */
  employeeNamePattern: (firstName, lastName) =>
    new RegExp(`^${escapeRe(firstName)}\\b.*\\b${escapeRe(lastName)}$`),
  /** @param {Page} page */
  assignButton: (page) => page.getByRole('button', { name: 'Assign', exact: true }),
  /**
   * Diálogo "Confirm Leave Assignment" ("Employee does not have sufficient leave balance...").
   * Confirmado en HLC-TC-007 (no aparece en todos los casos: en HLC-TC-006 no se mostró).
   * @param {Page} page
   */
  confirmDialog: (page) => page.getByRole('dialog'),
  /** Botón "Ok" del diálogo: acepta asignar pese al saldo insuficiente. @param {Page} page */
  confirmButton: (page) => page.getByRole('dialog').getByRole('button', { name: 'Ok', exact: true }),
};
