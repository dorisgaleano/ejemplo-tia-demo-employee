/**
 * @file POM de Leave > Apply (solicitar licencia).
 * Capa: pages. Solo locators; los campos comunes están en components/LeaveForm.js.
 */

/** @typedef {import('playwright').Page} Page */

export const ApplyLeavePage = {
  /** @param {Page} page */
  heading: (page) => page.getByRole('heading', { name: 'Apply Leave' }),
  /** @param {Page} page */
  applyButton: (page) => page.getByRole('button', { name: 'Apply', exact: true }),
};
