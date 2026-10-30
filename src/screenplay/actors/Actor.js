/**
 * @file Actor del patrón Screenplay.
 * Capa: screenplay. El Actor posee Abilities, ejecuta Activities (Tasks/Interactions)
 * y responde Questions. También guarda "notas" con datos que produce un paso y consume otro
 * (ej. el nombre del tipo de licencia creado en el Dado y leído en el Entonces).
 */

export class Actor {
  /** @type {Map<Function, object>} */
  #abilities = new Map();
  /** @type {Map<string, unknown>} */
  #notes = new Map();

  /** @param {string} name Nombre del rol, visible en mensajes de error. */
  constructor(name) {
    this.name = name;
  }

  /**
   * Otorga Abilities al actor (se indexan por su clase).
   * @param {...object} abilities
   * @returns {this}
   */
  whoCan(...abilities) {
    for (const ability of abilities) this.#abilities.set(ability.constructor, ability);
    return this;
  }

  /**
   * Obtiene una Ability por su clase.
   * @template T
   * @param {new (...args: any[]) => T} AbilityClass
   * @returns {T}
   * @throws {Error} Si el actor no tiene esa Ability (error de configuración en hooks).
   */
  abilityTo(AbilityClass) {
    const ability = this.#abilities.get(AbilityClass);
    if (!ability) throw new Error(`${this.name} no tiene la habilidad ${AbilityClass.name}`);
    return /** @type {T} */ (ability);
  }

  /**
   * Ejecuta las actividades en orden; se detiene en la primera que falle.
   * @param {...import('../../models/types.js').Activity} activities
   */
  async attemptsTo(...activities) {
    for (const activity of activities) await activity.performAs(this);
  }

  /**
   * Responde una Question.
   * @template T
   * @param {import('../../models/types.js').Question<T>} question
   * @returns {Promise<T>}
   */
  async asks(question) {
    return question.answeredBy(this);
  }

  /**
   * Guarda una nota para pasos posteriores del mismo escenario.
   * @param {string} key
   * @param {unknown} value
   */
  remember(key, value) {
    this.#notes.set(key, value);
  }

  /**
   * Recupera una nota guardada con remember().
   * @template T
   * @param {string} key
   * @returns {T}
   * @throws {Error} Si la nota no existe (un paso previo no se ejecutó).
   */
  recall(key) {
    if (!this.#notes.has(key)) throw new Error(`${this.name} no recuerda "${key}"`);
    return /** @type {T} */ (this.#notes.get(key));
  }
}
