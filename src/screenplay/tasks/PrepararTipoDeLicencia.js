/**
 * @file Task PrepararTipoDeLicencia: crea por API el tipo de licencia QA y sus cupos.
 * Capa: screenplay/tasks. Precondición de los casos HLC (setup por API, según los casos).
 *
 * Nombre del tipo: QA-<caso>-A-<sufijo de la corrida>-<n.º de fila>, ej. QA-HLC-006-A-1020213000-02.
 * Debe ser único por FILA: OrangeHRM elimina los tipos de forma lógica y no permite crear otro
 * con el nombre de uno eliminado (422, confirmado en la exploración HLC-TC-006).
 *
 * Limpieza (ManageTestData, orden inverso al registro):
 *   1.º cancelar toda licencia activa del tipo (barrido: no depende de que el paso que la
 *       creó haya capturado su id), 2.º eliminar cada cupo, 3.º eliminar el tipo.
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { resolveDateToken } from '../../utils/dates.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';
import { ManageTestData } from '../abilities/ManageTestData.js';

/**
 * Datos que la Task deja en la memoria del actor ("tipoLicencia") para pasos posteriores.
 * @typedef {object} TipoPreparado
 * @property {number} id
 * @property {string} nombre
 * @property {{empNumber: number, firstName: string, lastName: string}} empleado Empleado de prueba.
 * @property {{inicio: string, fin: string}} periodo
 * @property {{id: number, dias: number, desde: string, hasta: string}[]} cupos En el orden del Excel.
 */

export const PrepararTipoDeLicencia = {
  /**
   * @param {import('../../models/cupos.js').CupoDefinido[]} cupos Cupos de la fila (puede ser vacío).
   * @param {import('../../models/types.js').Fila} row Fila en ejecución (caso e IdFila para el nombre).
   * @param {import('../../models/types.js').InfoCorrida} runInfo Sufijo y fechas de la corrida.
   * @returns {import('../../models/types.js').Activity}
   */
  conCupos: (cupos, row, runInfo) => ({
    performAs: async (actor) => {
      const api = CallOrangeApi.as(actor);
      const cleanup = ManageTestData.as(actor);
      const empleado = await LeaveApi.linkedEmployee(api, actor.recall('usuario'));
      const periodo = await LeaveApi.currentPeriod(api);

      const numeroFila = row.idFila.slice(row.testCaseId.length + 1);
      const nombre = `QA-${row.testCaseId.replace('-TC-', '-')}-A-${runInfo.sufijo}-${numeroFila}`;
      const id = await LeaveApi.createLeaveType(api, nombre);
      cleanup.register(`Eliminar tipo ${nombre} (id ${id})`, () => LeaveApi.deleteLeaveTypes(api, [id]));

      /** @type {TipoPreparado['cupos']} */
      const creados = [];
      for (const cupo of cupos) {
        const ctx = { fechas: runInfo.fechas, periodo };
        const desde = resolveDateToken(cupo.desde, ctx);
        const hasta = resolveDateToken(cupo.hasta, ctx);
        if (desde > hasta) throw new Error(`Cupo inválido: inicia ${desde} y termina ${hasta}`);
        const cupoId = await LeaveApi.createEntitlement(api, {
          empNumber: empleado.empNumber,
          leaveTypeId: id,
          fromDate: desde,
          toDate: hasta,
          entitlement: String(cupo.dias),
        });
        cleanup.register(`Eliminar cupo ${cupoId} del tipo ${nombre}`, () => LeaveApi.deleteEntitlements(api, [cupoId]));
        creados.push({ id: cupoId, dias: cupo.dias, desde, hasta });
      }

      // Registrado al final para ejecutarse PRIMERO: un cupo con días usados no se puede borrar.
      const barrido = async () => {
        for (const leaveId of await LeaveApi.activeLeaveRequestIdsOfType(api, id, periodo.inicio, periodo.fin)) {
          await LeaveApi.cancelLeaveRequest(api, leaveId);
        }
      };
      cleanup.register(`Cancelar licencias activas del tipo ${nombre}`, async () => {
        try {
          await barrido();
        } catch (error) {
          // Un único reintento SOLO ante un corte de conexión (visto en HLC-TC-008: "fetch:
          // aborted"). El barrido es idempotente: vuelve a listar lo que sigue activo, así que
          // repetirlo no cancela nada dos veces. Las respuestas HTTP de error ("API ...") no se reintentan.
          if (String(/** @type {Error} */ (error).message).startsWith('API ')) throw error;
          await barrido();
        }
      });

      /** @type {TipoPreparado} */
      const tipo = { id, nombre, empleado, periodo, cupos: creados };
      actor.remember('tipoLicencia', tipo);
    },
  }),
};
