/**
 * @file Question SaldoDisponible: saldo del empleado de prueba para el tipo QA, leído por API.
 * Capa: screenplay/questions. Lectura pura (GET), acordada en la decisión P9.
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';

export const SaldoDisponible = {
  /** @returns {import('../../models/types.js').Question<number>} */
  delTipoDePrueba: () => ({
    answeredBy: async (actor) => {
      /** @type {import('../tasks/PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      return LeaveApi.balance(CallOrangeApi.as(actor), tipo.empleado.empNumber, tipo.id);
    },
  }),
};
