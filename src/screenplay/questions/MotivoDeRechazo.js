/**
 * @file Question MotivoDeRechazo: mensaje observable con el que el sistema rechazó el último envío.
 * Capa: screenplay/questions.
 *
 * Lee el mensaje del canal por el que se envió la licencia (sin validaciones adicionales):
 *   UI      → el aviso (toast) que muestra la pantalla, ej. "Error Leave Balance Exceeded".
 *   SISTEMA → el mensaje de error de la respuesta, ej. "Leave Balance Exceeded".
 */
import { MensajeEmergente } from './MensajeEmergente.js';

export const MotivoDeRechazo = {
  /** @returns {import('../../models/types.js').Question<string>} */
  delUltimoEnvio: () => ({
    answeredBy: async (actor) => {
      /** @type {import('../tasks/SolicitarLicencia.js').EnvioLicencia} */
      const envio = actor.recall('envioLicencia');
      if (envio.canal === 'UI') return actor.asks(MensajeEmergente.actual());
      return String(envio.body?.error?.message ?? `respuesta ${envio.status} sin mensaje de error`);
    },
  }),
};
