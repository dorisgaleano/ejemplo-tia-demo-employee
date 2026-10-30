/**
 * @file Question DiasConsumidosDelCupo: daysUsed de un cupo del tipo QA, leído por API.
 * Capa: screenplay/questions. Lectura pura (GET); la UI no muestra este dato por cupo.
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';

export const DiasConsumidosDelCupo = {
  /**
   * @param {number} numero Posición del cupo en el Excel (1 = Cupo1).
   * @returns {import('../../models/types.js').Question<number>}
   */
  numero: (numero) => ({
    answeredBy: async (actor) => {
      /** @type {import('../tasks/PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      const cupo = tipo.cupos[numero - 1];
      if (!cupo) throw new Error(`La fila no define el cupo ${numero}`);
      const cupos = await LeaveApi.entitlements(CallOrangeApi.as(actor), tipo.empleado.empNumber, tipo.id);
      const actual = cupos.find((c) => c.id === cupo.id);
      if (!actual) throw new Error(`El cupo ${cupo.id} ya no existe en OrangeHRM`);
      return Number(actual.daysUsed);
    },
  }),
};
