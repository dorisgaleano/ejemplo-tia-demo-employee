/**
 * @file Ability BrowseTheWeb: permite al Actor usar el navegador.
 * Capa: screenplay/abilities. Envuelve la Page de Playwright; Interactions y Questions
 * la obtienen con BrowseTheWeb.as(actor).page.
 */

export class BrowseTheWeb {
  /** @param {import('playwright').Page} page */
  constructor(page) {
    this.page = page;
  }

  /**
   * @param {import('../actors/Actor.js').Actor} actor
   * @returns {BrowseTheWeb}
   */
  static as(actor) {
    return actor.abilityTo(BrowseTheWeb);
  }
}
