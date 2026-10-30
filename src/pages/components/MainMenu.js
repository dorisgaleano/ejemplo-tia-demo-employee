/**
 * @file POM del menú de navegación (lateral y superior del módulo).
 * Capa: pages/components. exact: true evita que "Leave" coincida también con "Leave List".
 *
 * Nota (exploración HLC-TC-006): si la ventana se redimensiona (ej. captura fullPage), la
 * barra superior del módulo se colapsa en "More" y estos enlaces dejan de estar visibles.
 * La suite usa capturas del tamaño de la ventana a mitad del escenario para evitarlo.
 */

/** @typedef {import('playwright').Page} Page */

export const MainMenu = {
  /** @param {Page} page */
  leave: (page) => page.getByRole('link', { name: 'Leave', exact: true }),
  /** @param {Page} page */
  apply: (page) => page.getByRole('link', { name: 'Apply', exact: true }),
  /** @param {Page} page */
  myLeave: (page) => page.getByRole('link', { name: 'My Leave', exact: true }),
  /** @param {Page} page */
  assignLeave: (page) => page.getByRole('link', { name: 'Assign Leave', exact: true }),
  /** @param {Page} page */
  leaveList: (page) => page.getByRole('link', { name: 'Leave List', exact: true }),
};
