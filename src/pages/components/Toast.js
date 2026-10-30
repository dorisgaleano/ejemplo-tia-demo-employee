/**
 * @file POM del aviso emergente (toast) de OrangeHRM.
 * Capa: pages/components. El toast no expone rol ARIA (alert/status); por eso se usa la
 * clase CSS del framework de UI de OrangeHRM (.oxd-toast), confirmada en la exploración.
 */

/** @typedef {import('playwright').Page} Page */

export const Toast = {
  /** @param {Page} page */
  current: (page) => page.locator('.oxd-toast').first(),
};
