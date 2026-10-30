/**
 * @file Task IniciarSesion: el actor se autentica en OrangeHRM.
 * Capa: screenplay/tasks. Corresponde al paso "Dado que el administrador ha iniciado sesión".
 */
import { ENV } from '../../config/env.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { BrowseTheWeb } from '../abilities/BrowseTheWeb.js';
import { Click, Enter, Navigate } from '../interactions/index.js';

export const IniciarSesion = {
  /**
   * Inicia sesión con el usuario y la clave del .env. La clave nunca se registra: Playwright
   * no la imprime y las capturas enmascaran los campos de contraseña.
   * El actor recuerda "usuario" para resolver luego su empleado vinculado.
   * @returns {import('../../models/types.js').Activity}
   */
  conCredencialesDelAmbiente: () => ({
    performAs: async (actor) => {
      await actor.attemptsTo(
        Navigate.to(LoginPage.path),
        Enter.theValue(ENV.user).into(LoginPage.username),
        Enter.theValue(ENV.password).into(LoginPage.password),
        Click.on(LoginPage.loginButton),
      );
      // Condición observable de fin: la app redirige al Dashboard tras autenticar.
      await BrowseTheWeb.as(actor).page.waitForURL(/\/dashboard\//);
      actor.remember('usuario', ENV.user);
    },
  }),
};
