/**
 * @file Question LicenciaEnListaDeLicencias: días y estado de la licencia del tipo QA en Leave > Leave List.
 * Capa: screenplay/questions.
 *
 * Abre Leave List y ajusta sus filtros (agrega el estado Scheduled y elige el tipo QA) para
 * que la licencia asignada sea visible; luego pulsa Search. Son acciones de solo lectura
 * necesarias para observar el resultado en la pantalla que nombra el caso HLC-TC-003.
 */
import { TIMEOUTS } from '../../config/env.js';
import { MainMenu } from '../../pages/components/MainMenu.js';
import { LeaveListPage } from '../../pages/LeaveListPage.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';

export const LicenciaEnListaDeLicencias = {
  /** @returns {import('../../models/types.js').Question<{dias: number, estado: string}>} */
  delTipoDePrueba: () => ({
    answeredBy: async (actor) => {
      const page = BrowseTheWeb.as(actor).page;
      /** @type {import('../tasks/PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      // Tras una asignación la demo mantiene la sesión ocupada hasta ~60 s (HLC-TC-006): la
      // navegación y la carga de la página usan el límite serverResponse.
      await MainMenu.leaveList(page).click({ timeout: TIMEOUTS.serverResponse });
      await LeaveListPage.heading(page).waitFor({ timeout: TIMEOUTS.serverResponse });

      await LeaveListPage.statusSelect(page).click();
      await LeaveListPage.option(page, 'Scheduled').click();
      await page.keyboard.press('Escape');
      await LeaveListPage.leaveTypeSelect(page).click();
      await LeaveListPage.option(page, tipo.nombre).click();
      await LeaveListPage.searchButton(page).click();

      const row = LeaveListPage.rowFor(page, tipo.nombre);
      await row.first().waitFor();
      // Lleva la fila a la vista: la captura del paso (AfterStep) queda como evidencia.
      await row.first().scrollIntoViewIfNeeded();
      const headers = (await LeaveListPage.columnHeaders(page).allInnerTexts()).map((h) => h.trim());
      const cells = (await row.first().getByRole('cell').allInnerTexts()).map((c) => c.trim());
      const col = (/** @type {string} */ name) => {
        const i = headers.indexOf(name);
        if (i < 0) throw new Error(`Leave List no tiene la columna "${name}" (columnas: ${headers.join(', ')})`);
        return cells[i];
      };
      return { dias: Number(col('Number of Days')), estado: col('Status') };
    },
  }),
};
