/**
 * @file Task ComprobarFechasDisponibles: verifica por API las precondiciones de un rango de fechas.
 * Capa: screenplay/tasks. La usan SolicitarLicencia y AsignarLicencia antes de enviar.
 *
 * En la demo pública terceros pueden romper la precondición (feriados, licencias del mismo
 * empleado en esas fechas). Si no se cumple, la fila falla con "Precondición no cumplida" en
 * lugar de producir un falso fallo de la regla de negocio probada.
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { eachDate, fromIsoDate } from '../../utils/dates.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';

export const ComprobarFechasDisponibles = {
  /**
   * @param {string} desde AAAA-MM-DD
   * @param {string} hasta AAAA-MM-DD
   * @returns {import('../../models/types.js').Activity}
   */
  entre: (desde, hasta) => ({
    performAs: async (actor) => {
      const api = CallOrangeApi.as(actor);
      const [semana, feriados, solapes] = await Promise.all([
        LeaveApi.workweek(api),
        LeaveApi.holidays(api, desde, hasta),
        LeaveApi.overlaps(api, desde, hasta),
      ]);
      const noLaborables = eachDate(desde, hasta).filter(
        (d) => semana[String(fromIsoDate(d).getDay())] !== 0 || feriados.includes(d),
      );
      if (noLaborables.length) {
        throw new Error(`Precondición no cumplida: ${noLaborables.join(', ')} no es día laborable completo en OrangeHRM.`);
      }
      if (solapes.length) {
        throw new Error(
          `Precondición no cumplida: el empleado de prueba ya tiene licencias entre ${desde} y ${hasta} ` +
            '(creadas por otro usuario de la demo). Sube SEMANAS_ADELANTE en el archivo .env ' +
            '(ej. de 0 a 1) para usar la semana siguiente, o reintenta más tarde.',
        );
      }
    },
  }),
};
