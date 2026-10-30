/**
 * @file CustomWorld: estado de UN escenario (= una fila del Excel).
 * Capa: support. Cucumber crea un World nuevo por escenario; es el único medio para
 * compartir estado entre pasos (no se usan variables globales). Los hooks lo llenan.
 */
import { World, setWorldConstructor } from '@cucumber/cucumber';

export class CustomWorld extends World {
  /** @param {import('@cucumber/cucumber').IWorldOptions} options */
  constructor(options) {
    super(options);
    /** @type {import('playwright').BrowserContext} Contexto aislado de la fila. */
    this.context = /** @type {any} */ (undefined);
    /** @type {import('playwright').Page} */
    this.page = /** @type {any} */ (undefined);
    /** @type {import('../screenplay/actors/Actor.js').Actor} */
    this.actor = /** @type {any} */ (undefined);
    /** @type {import('../models/types.js').Fila} Datos de la fila del Excel. */
    this.row = /** @type {any} */ (undefined);
    /** @type {import('../models/types.js').InfoCorrida} */
    this.runInfo = /** @type {any} */ (undefined);
    /** Carpeta de evidencias de la fila: reports/<corrida>/evidencias/<caso>/<fila>. */
    this.evidenceDir = '';
    /** Contador de pasos para numerar las capturas. */
    this.stepIndex = 0;
    /** @type {Date} */
    this.startedAt = new Date();
  }
}

setWorldConstructor(CustomWorld);
