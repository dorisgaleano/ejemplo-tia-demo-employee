/**
 * @file POM de la pantalla de acceso de OrangeHRM.
 * Capa: pages. Solo locators (DÓNDE); sin acciones ni aserciones.
 * Selectores confirmados en la exploración HLC-TC-004 (conteo único).
 */

/** @typedef {import('playwright').Page} Page */

export const LoginPage = {
  path: '/web/index.php/auth/login',
  /** @param {Page} page */
  username: (page) => page.getByRole('textbox', { name: 'Username' }),
  /** @param {Page} page */
  password: (page) => page.getByRole('textbox', { name: 'Password' }),
  /** @param {Page} page */
  loginButton: (page) => page.getByRole('button', { name: 'Login' }),
};
