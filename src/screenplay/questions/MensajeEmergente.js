/**
 * @file Question MensajeEmergente: texto del aviso (toast) que muestra la app tras una acción.
 * Capa: screenplay/questions.
 */
import { Toast } from '../../pages/components/Toast.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';

export const MensajeEmergente = {
  /**
   * Espera a que aparezca el toast (hasta el timeout de acción) y devuelve su texto en una
   * línea, ej. "Success Successfully Saved". Se consulta justo después de la acción porque
   * el toast desaparece solo a los pocos segundos.
   * @returns {import('../../models/types.js').Question<string>}
   */
  actual: () => ({
    answeredBy: async (actor) => {
      const toast = Toast.current(BrowseTheWeb.as(actor).page);
      await toast.waitFor({ state: 'visible' });
      return (await toast.innerText()).replace(/×/g, '').replace(/\s+/g, ' ').trim();
    },
  }),
};
