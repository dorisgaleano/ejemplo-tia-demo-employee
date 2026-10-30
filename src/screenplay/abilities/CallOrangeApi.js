/**
 * @file Ability CallOrangeApi: permite al Actor llamar la API REST v2 de OrangeHRM.
 * Capa: screenplay/abilities. Usa page.request, que comparte las cookies del BrowserContext:
 * tras iniciar sesión por la UI, las llamadas quedan autenticadas sin manejar tokens aparte.
 * Se usa para la preparación (tipos y cupos), la lectura de daysUsed/saldo y la limpieza.
 */

import { TIMEOUTS } from '../../config/env.js';

const API_PREFIX = '/web/index.php/api/v2';

export class CallOrangeApi {
  /**
   * @param {import('playwright').APIRequestContext} request page.request del contexto.
   * @param {string} baseUrl URL base del ambiente (sin "/" final).
   */
  constructor(request, baseUrl) {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  /**
   * @param {import('../actors/Actor.js').Actor} actor
   * @returns {CallOrangeApi}
   */
  static as(actor) {
    return actor.abilityTo(CallOrangeApi);
  }

  /**
   * GET a un recurso de la API v2.
   * @param {string} resource Ruta relativa al prefijo, ej. "/leave/leave-types".
   * @param {Record<string, string | number | boolean>} [params] Query string.
   * @returns {Promise<any>} Cuerpo JSON de la respuesta.
   */
  get(resource, params) {
    return this.#send('GET', resource, { params });
  }

  /** @param {string} resource @param {object} data @returns {Promise<any>} */
  post(resource, data) {
    return this.#send('POST', resource, { data });
  }

  /** @param {string} resource @param {object} data @returns {Promise<any>} */
  put(resource, data) {
    return this.#send('PUT', resource, { data });
  }

  /** @param {string} resource @param {object} data @returns {Promise<any>} */
  delete(resource, data) {
    return this.#send('DELETE', resource, { data });
  }

  /**
   * Envía la petición y devuelve estado y cuerpo SIN fallar ante 4xx/5xx. Para envíos cuyo
   * rechazo es el resultado esperado (ej. 400 "Leave Balance Exceeded").
   * @param {string} method
   * @param {string} resource
   * @param {object} data
   * @returns {Promise<{status: number, body: any}>}
   */
  async sendAllowingErrors(method, resource, data) {
    const response = await this.request.fetch(`${this.baseUrl}${API_PREFIX}${resource}`, {
      method,
      data,
      timeout: TIMEOUTS.serverResponse,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: response.status(), body };
  }

  /**
   * Envía la petición y falla con un mensaje claro si la respuesta no es 2xx.
   * @param {string} method
   * @param {string} resource
   * @param {{params?: Record<string, string | number | boolean>, data?: object}} options
   */
  async #send(method, resource, options) {
    const response = await this.request.fetch(`${this.baseUrl}${API_PREFIX}${resource}`, {
      method,
      timeout: TIMEOUTS.serverResponse,
      ...options,
    });
    const body = await response.text();
    if (!response.ok()) {
      throw new Error(`API ${method} ${resource} respondió ${response.status()}: ${body.slice(0, 300)}`);
    }
    return body ? JSON.parse(body) : null;
  }
}
