/**
 * @file Task SolicitarLicencia: el actor solicita licencia para sí mismo en Leave > Apply.
 * Capa: screenplay/tasks. Corresponde al "Cuando" de los escenarios de solicitud (modo APPLY).
 * La limpieza de lo que cree la registra PrepararTipoDeLicencia (barrido por tipo).
 */
import { TIMEOUTS } from '../../config/env.js';
import { ApplyLeavePage } from '../../pages/ApplyLeavePage.js';
import { MainMenu } from '../../pages/components/MainMenu.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';
import { Click, WaitFor } from '../interactions/index.js';
import { ComprobarFechasDisponibles } from './ComprobarFechasDisponibles.js';
import { CompletarFormularioDeLicencia } from './CompletarFormularioDeLicencia.js';

/**
 * Resultado del envío que el actor recuerda como "envioLicencia".
 * @typedef {object} EnvioLicencia
 * @property {'UI' | 'SISTEMA'} canal Por pantalla o enviado directamente al sistema.
 * @property {number} status Código HTTP de la respuesta de la app (400 = rechazo de saldo).
 * @property {any} body Cuerpo de la respuesta.
 */

export const SolicitarLicencia = {
  /**
   * @param {string} desde AAAA-MM-DD
   * @param {string} hasta AAAA-MM-DD
   * @returns {import('../../models/types.js').Activity}
   */
  deJornadaCompleta: (desde, hasta) => ({
    performAs: async (actor) => {
      const page = BrowseTheWeb.as(actor).page;
      /** @type {import('./PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');

      await actor.attemptsTo(
        ComprobarFechasDisponibles.entre(desde, hasta),
        Click.on(MainMenu.leave),
        Click.on(MainMenu.apply),
        WaitFor.visible(ApplyLeavePage.heading),
        CompletarFormularioDeLicencia.con(tipo.nombre, desde, hasta),
      );

      // Se espera la respuesta concreta del envío (éxito o rechazo): confirma que se procesó.
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => new URL(r.url()).pathname.endsWith('/api/v2/leave/leave-requests') && r.request().method() === 'POST',
          { timeout: TIMEOUTS.serverResponse },
        ),
        ApplyLeavePage.applyButton(page).click(),
      ]);
      /** @type {EnvioLicencia} */
      const envio = { canal: 'UI', status: response.status(), body: await response.json().catch(() => null) };
      actor.remember('envioLicencia', envio);
    },
  }),
};
