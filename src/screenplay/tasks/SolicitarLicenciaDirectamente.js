/**
 * @file Task SolicitarLicenciaDirectamente: el actor envía su solicitud de licencia al sistema
 * sin pasar por la pantalla Apply.
 * Capa: screenplay/tasks. Corresponde al "Cuando ... envía directamente al sistema ...".
 *
 * Existe porque la pantalla Apply no ofrece un tipo cuyo único cupo termina antes del fin del
 * periodo (HLC-TC-007, opción B aprobada): se envía la misma petición que haría la pantalla
 * para que la regla de saldo del servidor se ejerza. La limpieza la registra
 * PrepararTipoDeLicencia (barrido por tipo).
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';
import { ComprobarFechasDisponibles } from './ComprobarFechasDisponibles.js';

export const SolicitarLicenciaDirectamente = {
  /**
   * @param {string} desde AAAA-MM-DD
   * @param {string} hasta AAAA-MM-DD
   * @returns {import('../../models/types.js').Activity}
   */
  deJornadaCompleta: (desde, hasta) => ({
    performAs: async (actor) => {
      /** @type {import('./PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      await actor.attemptsTo(ComprobarFechasDisponibles.entre(desde, hasta));
      const { status, body } = await LeaveApi.submitOwnLeaveRequest(CallOrangeApi.as(actor), {
        leaveTypeId: tipo.id,
        fromDate: desde,
        toDate: hasta,
      });
      /** @type {import('./SolicitarLicencia.js').EnvioLicencia} */
      const envio = { canal: 'SISTEMA', status, body };
      actor.remember('envioLicencia', envio);
    },
  }),
};
