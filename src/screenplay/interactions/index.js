/**
 * @file Interactions atómicas y reutilizables del patrón Screenplay.
 * Capa: screenplay/interactions. Cada una hace UNA cosa en el navegador sobre un locator
 * definido en una Page (POM). Reciben el locator como función (page) => Locator para
 * resolverlo en el momento de actuar, no al construir la Task.
 *
 * Ninguna usa esperas fijas: los métodos de Playwright esperan solos a que el elemento
 * sea visible, estable y habilitado (auto-wait) hasta el timeout de acción configurado.
 */
import { expect } from '../../utils/expect.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';

/** @typedef {(page: import('playwright').Page) => import('playwright').Locator} Target */

/** Navega a una ruta relativa a la URL base del contexto. */
export const Navigate = {
  /**
   * @param {string} route Ej. "/web/index.php/auth/login".
   * @returns {import('../../models/types.js').Activity}
   */
  to: (route) => ({
    performAs: async (actor) => {
      await BrowseTheWeb.as(actor).page.goto(route);
    },
  }),
};

/** Hace clic en un elemento. */
export const Click = {
  /**
   * @param {Target} target
   * @returns {import('../../models/types.js').Activity}
   */
  on: (target) => ({
    performAs: async (actor) => {
      await target(BrowseTheWeb.as(actor).page).click();
    },
  }),
};

/**
 * Espera a que un elemento sea visible. Se usa solo cuando la aparición del elemento es la
 * condición observable de que un paso terminó (ej. el formulario cargó); no es una pausa fija.
 */
export const WaitFor = {
  /**
   * @param {Target} target
   * @returns {import('../../models/types.js').Activity}
   */
  visible: (target) => ({
    performAs: async (actor) => {
      await target(BrowseTheWeb.as(actor).page).waitFor({ state: 'visible' });
    },
  }),
  /**
   * Espera a que un campo tenga un valor (ej. el que la app copia automáticamente en otro
   * campo). Usa la aserción web-first toHaveValue, que reintenta hasta TIMEOUTS.expect.
   * @param {Target} target
   * @param {string} value
   * @returns {import('../../models/types.js').Activity}
   */
  value: (target, value) => ({
    performAs: async (actor) => {
      await expect(target(BrowseTheWeb.as(actor).page)).toHaveValue(value);
    },
  }),
};

/** Pulsa una tecla en la página (ej. Escape para cerrar el calendario emergente). */
export const Press = {
  /**
   * @param {string} key Nombre de tecla de Playwright, ej. "Escape".
   * @returns {import('../../models/types.js').Activity}
   */
  key: (key) => ({
    performAs: async (actor) => {
      await BrowseTheWeb.as(actor).page.keyboard.press(key);
    },
  }),
};

/** Escribe un valor en un campo (reemplaza el contenido previo). */
export const Enter = {
  /**
   * @param {string} value
   * @returns {{into: (target: Target) => import('../../models/types.js').Activity}}
   */
  theValue: (value) => ({
    into: (target) => ({
      performAs: async (actor) => {
        await target(BrowseTheWeb.as(actor).page).fill(value);
      },
    }),
  }),
};
