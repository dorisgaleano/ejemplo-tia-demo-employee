/**
 * @file Question LicenciaEnMiLista: días y estado de la licencia del tipo QA en Leave > My Leave.
 * Capa: screenplay/questions.
 *
 * Abre My Leave desde el menú del módulo: es una navegación de solo lectura necesaria para
 * observar el resultado (el caso pide verificarlo en esa lista). No modifica nada.
 */
import { TIMEOUTS } from '../../config/env.js';
import { MainMenu } from '../../pages/components/MainMenu.js';
import { MyLeaveListPage } from '../../pages/MyLeaveListPage.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';

/** @typedef {{dias: number, estado: string}} LicenciaListada */

export const LicenciaEnMiLista = {
  /** @returns {import('../../models/types.js').Question<LicenciaListada>} */
  delTipoDePrueba: () => ({
    answeredBy: async (actor) => {
      const page = BrowseTheWeb.as(actor).page;
      /** @type {import('../tasks/PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      // Tras una asignación, la demo mantiene la sesión ocupada ~60 s en total (medido en
      // HLC-TC-006): la carga de My Leave puede esperar ese tiempo. Por eso el clic (que espera
      // la navegación que dispara) y el encabezado usan el límite serverResponse.
      await MainMenu.myLeave(page).click({ timeout: TIMEOUTS.serverResponse });
      await MyLeaveListPage.heading(page).waitFor({ timeout: TIMEOUTS.serverResponse });
      const row = MyLeaveListPage.rowFor(page, tipo.nombre);
      // La lista se carga por API después del encabezado: se espera la fila concreta.
      await row.first().waitFor();
      // Lleva la fila a la vista: la captura del paso (AfterStep) queda como evidencia.
      await row.first().scrollIntoViewIfNeeded();
      const headers = (await MyLeaveListPage.columnHeaders(page).allInnerTexts()).map((h) => h.trim());
      const cells = (await row.first().getByRole('cell').allInnerTexts()).map((c) => c.trim());
      const col = (/** @type {string} */ name) => {
        const i = headers.indexOf(name);
        if (i < 0) throw new Error(`My Leave List no tiene la columna "${name}"`);
        return cells[i];
      };
      return { dias: Number(col('Number of Days')), estado: col('Status') };
    },
  }),
};
