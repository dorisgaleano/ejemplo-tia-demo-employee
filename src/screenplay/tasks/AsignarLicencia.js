/**
 * @file Task AsignarLicencia: el actor asigna licencia al empleado de prueba en Leave > Assign Leave.
 * Capa: screenplay/tasks. Corresponde al "Cuando" de los escenarios de asignación (modo ASSIGN).
 *
 * Si la app muestra el diálogo de saldo insuficiente, se acepta (lo indican los casos).
 * El envío es POST /leave/employees/leave-requests (confirmado en HLC-TC-006).
 * La limpieza de lo que cree la registra PrepararTipoDeLicencia (barrido por tipo).
 */
import { TIMEOUTS } from '../../config/env.js';
import { expect } from '../../utils/expect.js';
import { AssignLeavePage } from '../../pages/AssignLeavePage.js';
import { MainMenu } from '../../pages/components/MainMenu.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';
import { Click, Enter, WaitFor } from '../interactions/index.js';
import { ComprobarFechasDisponibles } from './ComprobarFechasDisponibles.js';
import { CompletarFormularioDeLicencia } from './CompletarFormularioDeLicencia.js';

export const AsignarLicencia = {
  /**
   * @param {string} desde AAAA-MM-DD
   * @param {string} hasta AAAA-MM-DD
   * @returns {import('../../models/types.js').Activity}
   */
  deJornadaCompletaAlEmpleadoDePrueba: (desde, hasta) => ({
    performAs: async (actor) => {
      const page = BrowseTheWeb.as(actor).page;
      /** @type {import('./PrepararTipoDeLicencia.js').TipoPreparado} */
      const tipo = actor.recall('tipoLicencia');
      const { empNumber, firstName, lastName } = tipo.empleado;

      await actor.attemptsTo(
        ComprobarFechasDisponibles.entre(desde, hasta),
        Click.on(MainMenu.leave),
        Click.on(MainMenu.assignLeave),
        WaitFor.visible(AssignLeavePage.heading),
      );

      // En la demo puede haber varios empleados con el mismo nombre (fallo del 2026-10-21 con
      // cuatro "John ... Doe"): se elige al empleado por su empNumber. Se captura la respuesta
      // de sugerencias que dispara el autocompletado y se clica la opción en su misma posición.
      const sugerenciasPromise = page.waitForResponse((r) => {
        const url = new URL(r.url());
        return url.pathname.endsWith('/api/v2/pim/employees') && url.searchParams.get('nameOrId') === firstName;
      });
      await actor.attemptsTo(Enter.theValue(firstName).into(AssignLeavePage.employeeName));
      const sugerencias = (await (await sugerenciasPromise).json()).data ?? [];
      const posicion = sugerencias.findIndex((/** @type {any} */ e) => e.empNumber === empNumber);
      if (posicion < 0) {
        throw new Error(`El empleado de prueba (empNumber ${empNumber}) no aparece en las sugerencias de "${firstName}"`);
      }
      const opcion = AssignLeavePage.employeeOptionAt(page, posicion);
      // Comprobación de seguridad antes de clicar: la opción debe tener el nombre del empleado.
      await expect(opcion).toHaveText(AssignLeavePage.employeeNamePattern(firstName, lastName));
      await opcion.click();

      await actor.attemptsTo(CompletarFormularioDeLicencia.con(tipo.nombre, desde, hasta));

      const isAssignPost = (/** @type {import('playwright').Response} */ r) =>
        new URL(r.url()).pathname.endsWith('/api/v2/leave/employees/leave-requests') && r.request().method() === 'POST';
      const responsePromise = page.waitForResponse(isAssignPost, { timeout: TIMEOUTS.serverResponse });
      await AssignLeavePage.assignButton(page).click();

      // Tras el clic ocurre una de dos cosas: la app envía directamente o primero pide
      // confirmar por saldo insuficiente. Se espera la que suceda primero.
      const primero = await Promise.race([
        responsePromise.then(() => 'envio'),
        AssignLeavePage.confirmDialog(page)
          .waitFor({ state: 'visible' })
          .then(() => 'dialogo')
          .catch(() => 'envio'),
      ]);
      if (primero === 'dialogo') await AssignLeavePage.confirmButton(page).click();
      const response = await responsePromise;

      /** @type {import('./SolicitarLicencia.js').EnvioLicencia} */
      const envio = { canal: 'UI', status: response.status(), body: await response.json().catch(() => null) };
      actor.remember('envioLicencia', envio);
    },
  }),
};
