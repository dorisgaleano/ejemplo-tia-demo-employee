/**
 * @file POM de los campos comunes a los formularios Apply Leave y Assign Leave.
 * Capa: pages/components. Solo locators.
 *
 * Los campos de OrangeHRM no tienen <label for> asociado: el nombre visible ("Leave Type",
 * "From Date"...) está en el mismo contenedor .oxd-input-group. Cada campo se ubica filtrando
 * ese contenedor por su texto (conteo único confirmado en HLC-TC-004 y HLC-TC-006) y dentro
 * de él por rol. Las fechas NO se ubican por placeholder porque este cambia con el formato
 * de fecha configurado en la demo.
 */

/** @typedef {import('playwright').Page} Page */

/** @param {Page} page @param {string} label */
const field = (page, label) => page.locator('form .oxd-input-group').filter({ hasText: label });

export const LeaveForm = {
  /** Abre el desplegable de tipos (select propio de OrangeHRM, sin rol combobox). @param {Page} page */
  leaveTypeSelect: (page) => field(page, 'Leave Type').locator('.oxd-select-text'),
  /** @param {Page} page @param {string} name */
  leaveTypeOption: (page, name) => page.getByRole('option', { name, exact: true }),
  /** @param {Page} page */
  fromDate: (page) => field(page, 'From Date').getByRole('textbox'),
  /** @param {Page} page */
  toDate: (page) => field(page, 'To Date').getByRole('textbox'),
  /**
   * Control de duración que aparece cuando las fechas son válidas: "Duration" (un día) o
   * "Partial Days" (varios días). Su aparición confirma que la app procesó las fechas.
   * @param {Page} page
   */
  durationControl: (page) => page.locator('form').getByText(/^(Duration|Partial Days)$/).first(),
};
