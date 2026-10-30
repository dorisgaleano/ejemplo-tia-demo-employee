/**
 * @file Ability ManageTestData: registro de limpieza de los datos creados por la fila.
 * Capa: screenplay/abilities. Cada Task que crea un dato registra cómo deshacerlo; el hook
 * After ejecuta la limpieza en orden inverso (LIFO): primero lo último creado. Así se respeta
 * la dependencia licencia → cupo → tipo, pase o falle la fila.
 */

export class ManageTestData {
  /** @type {{description: string, undo: () => Promise<void>}[]} */
  #pending = [];

  /**
   * @param {import('../actors/Actor.js').Actor} actor
   * @returns {ManageTestData}
   */
  static as(actor) {
    return actor.abilityTo(ManageTestData);
  }

  /**
   * Registra cómo deshacer un dato recién creado.
   * @param {string} description Texto legible para el reporte (ej. "Eliminar tipo QA-HLC-004-A-…").
   * @param {() => Promise<void>} undo
   */
  register(description, undo) {
    this.#pending.push({ description, undo });
  }

  /**
   * Ejecuta todas las limpiezas pendientes en orden inverso. No se detiene ante un error:
   * intenta todas y devuelve el resultado de cada una para dejarlo en el reporte.
   * @returns {Promise<{description: string, ok: boolean, error?: string}[]>}
   */
  async cleanAll() {
    const results = [];
    while (this.#pending.length) {
      const { description, undo } = /** @type {{description: string, undo: () => Promise<void>}} */ (
        this.#pending.pop()
      );
      try {
        await undo();
        results.push({ description, ok: true });
      } catch (error) {
        results.push({ description, ok: false, error: String(/** @type {Error} */ (error).message ?? error) });
      }
    }
    return results;
  }
}
