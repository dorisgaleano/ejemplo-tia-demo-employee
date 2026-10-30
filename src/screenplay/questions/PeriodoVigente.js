/**
 * @file Question PeriodoVigente: inicio y fin del periodo de licencia vigente en OrangeHRM.
 * Capa: screenplay/questions. Lectura pura (GET). Permite resolver tokens INICIO_PERIODO /
 * FIN_PERIODO antes de crear datos (ej. para verificar una precondición en HLC-TC-011).
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';

export const PeriodoVigente = {
  /** @returns {import('../../models/types.js').Question<{inicio: string, fin: string}>} */
  actual: () => ({
    answeredBy: async (actor) => LeaveApi.currentPeriod(CallOrangeApi.as(actor)),
  }),
};
