/**
 * @file Task CompletarFormularioDeLicencia: elige el tipo QA y el rango de fechas en un
 * formulario de licencia (Apply Leave o Assign Leave, que comparten estos campos).
 * Capa: screenplay/tasks. Jornada completa = valor por defecto de la app (no se toca Duration).
 */
import { LeaveApi } from '../../api/LeaveApi.js';
import { LeaveForm } from '../../pages/components/LeaveForm.js';
import { formatForUi } from '../../utils/dates.js';
import { CallOrangeApi } from '../abilities/CallOrangeApi.js';
import { Click, Enter, Press, WaitFor } from '../interactions/index.js';

export const CompletarFormularioDeLicencia = {
  /**
   * @param {string} tipo Nombre del tipo de licencia.
   * @param {string} desde AAAA-MM-DD
   * @param {string} hasta AAAA-MM-DD
   * @returns {import('../../models/types.js').Activity}
   */
  con: (tipo, desde, hasta) => ({
    performAs: async (actor) => {
      // El formato de fecha de la UI se lee en cada ejecución: en la demo cualquiera lo cambia.
      const formato = await LeaveApi.dateFormat(CallOrangeApi.as(actor));
      const desdeUi = formatForUi(desde, formato);
      const hastaUi = formatForUi(hasta, formato);
      await actor.attemptsTo(
        Click.on(LeaveForm.leaveTypeSelect),
        Click.on((p) => LeaveForm.leaveTypeOption(p, tipo)),
        Enter.theValue(desdeUi).into(LeaveForm.fromDate),
        // Al salir de From la app copia la fecha en To. Si To se escribe antes de esa copia,
        // ambos valores se concatenan ("2026-27-102026-27-10", hallado en HLC-TC-004): se
        // espera la copia y luego se sobrescribe To.
        Click.on(LeaveForm.toDate),
        WaitFor.value(LeaveForm.toDate, desdeUi),
        Enter.theValue(hastaUi).into(LeaveForm.toDate),
        Press.key('Escape'), // cierra el calendario emergente que tapa el formulario
        // La aparición del control de duración confirma que la app validó las fechas.
        WaitFor.visible(LeaveForm.durationControl),
      );
    },
  }),
};
