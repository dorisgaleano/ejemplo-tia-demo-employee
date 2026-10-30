/**
 * @file Question DiasConsumidosDelTipo: total de días consumidos de todos los cupos del tipo QA.
 * Capa: screenplay/questions. Lectura pura (GET). Si el tipo no tiene cupos, el total es 0.
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';

export const DiasConsumidosDelTipo = {
  /** @returns {import('../../models/types.js').Question<number>} */
  enTotal: () => ({
    answeredBy: async (actor) => {
      /** @type {import('../tasks/PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      const cupos = await LeaveApi.entitlements(CallOrangeApi.as(actor), tipo.empleado.empNumber, tipo.id);
      return cupos.reduce((total, c) => total + Number(c.daysUsed), 0);
    },
  }),
};
