/**
 * @file Recursos de la API REST v2 de OrangeHRM usados por la suite (equivalente al POM para la API).
 * Capa: api. Solo sabe DÓNDE está cada recurso y la forma de su respuesta; no decide nada de
 * negocio. Todos los endpoints fueron confirmados en la exploración HLC-TC-004, incluidos los
 * que usa la propia aplicación (overlap-leaves y la cancelación de solicitudes).
 */

/** @typedef {import('../screenplay/abilities/CallOrangeApi.js').CallOrangeApi} Api */

export const LeaveApi = {
  /**
   * Empleado vinculado a un usuario del sistema.
   * @param {Api} api @param {string} username
   * @returns {Promise<{empNumber: number, firstName: string, lastName: string}>}
   */
  async linkedEmployee(api, username) {
    const { data } = await api.get('/admin/users', { username, limit: 5 });
    const user = data.find((/** @type {any} */ u) => u.userName === username);
    if (!user?.employee) throw new Error(`El usuario ${username} no tiene un empleado vinculado`);
    return user.employee;
  },

  /** Periodo de licencia vigente. @param {Api} api @returns {Promise<{inicio: string, fin: string}>} */
  async currentPeriod(api) {
    const { meta } = await api.get('/leave/leave-periods');
    if (!meta?.currentLeavePeriod) throw new Error('OrangeHRM no tiene un periodo de licencia vigente definido');
    return { inicio: meta.currentLeavePeriod.startDate, fin: meta.currentLeavePeriod.endDate };
  },

  /** Formato de fecha de la UI, en notación PHP (ej. "Y-d-m"). @param {Api} api @returns {Promise<string>} */
  async dateFormat(api) {
    return (await api.get('/admin/localization')).data.dateFormat;
  },

  /**
   * Semana laboral indexada por día (0 = domingo): 0 jornada completa, 4 media, 8 no laborable.
   * @param {Api} api @returns {Promise<Record<string, number>>}
   */
  async workweek(api) {
    return (await api.get('/leave/workweek', { model: 'indexed' })).data;
  },

  /** Fechas de feriados en un rango. @param {Api} api @param {string} from @param {string} to @returns {Promise<string[]>} */
  async holidays(api, from, to) {
    const { data } = await api.get('/leave/holidays', { fromDate: from, toDate: to });
    return data.map((/** @type {any} */ h) => h.date);
  },

  /**
   * Licencias del usuario en sesión que se solapan con el rango (la app hace esta misma
   * consulta antes de enviar una solicitud).
   * @param {Api} api @param {string} from @param {string} to @returns {Promise<any[]>}
   */
  async overlaps(api, from, to) {
    const { data } = await api.get('/leave/overlap-leaves', { fromDate: from, toDate: to, 'duration[type]': 'full_day' });
    return Array.isArray(data) ? data : [];
  },

  /** @param {Api} api @param {string} name @returns {Promise<number>} id del tipo creado */
  async createLeaveType(api, name) {
    return (await api.post('/leave/leave-types', { name, situational: false })).data.id;
  },

  /** @param {Api} api @param {number[]} ids */
  async deleteLeaveTypes(api, ids) {
    await api.delete('/leave/leave-types', { ids });
  },

  /**
   * @param {Api} api
   * @param {{empNumber: number, leaveTypeId: number, fromDate: string, toDate: string, entitlement: string}} data
   * @returns {Promise<number>} id del cupo creado
   */
  async createEntitlement(api, data) {
    return (await api.post('/leave/leave-entitlements', data)).data.id;
  },

  /** @param {Api} api @param {number[]} ids */
  async deleteEntitlements(api, ids) {
    await api.delete('/leave/leave-entitlements', { ids });
  },

  /**
   * Cupos de un empleado para un tipo, con sus días consumidos.
   * @param {Api} api @param {number} empNumber @param {number} leaveTypeId
   * @returns {Promise<{id: number, entitlement: number, daysUsed: number, fromDate: string, toDate: string}[]>}
   */
  async entitlements(api, empNumber, leaveTypeId) {
    return (await api.get('/leave/leave-entitlements', { empNumber, leaveTypeId })).data;
  },

  /**
   * Solicitud de licencia del usuario en sesión, con el mismo recurso y cuerpo que envía la
   * pantalla Apply para un rango de jornada completa (capturado en la exploración HLC-TC-006).
   * No falla ante un rechazo: devuelve estado y cuerpo para que se verifique el resultado.
   * @param {Api} api
   * @param {{leaveTypeId: number, fromDate: string, toDate: string}} data
   * @returns {Promise<{status: number, body: any}>}
   */
  async submitOwnLeaveRequest(api, data) {
    return api.sendAllowingErrors('POST', '/leave/leave-requests', { ...data, comment: null });
  },

  /**
   * Saldo disponible de un empleado para un tipo (el valor "Leave Balance" de la pantalla).
   * Mismo recurso que consulta Assign Leave; respuesta confirmada en un trace de HLC-TC-008.
   * @param {Api} api @param {number} empNumber @param {number} leaveTypeId
   * @returns {Promise<number>}
   */
  async balance(api, empNumber, leaveTypeId) {
    const { data } = await api.get(`/leave/leave-balance/leave-type/${leaveTypeId}`, { empNumber });
    return Number(data.balance.balance);
  },

  /** Cancela una solicitud (mismo endpoint y cuerpo que usa la UI). @param {Api} api @param {number} id */
  async cancelLeaveRequest(api, id) {
    await api.put(`/leave/employees/leave-requests/${id}`, { action: 'CANCEL' });
  },

  /**
   * Ids de las solicitudes activas (Pending Approval = 1, Scheduled = 2) de un tipo en un rango,
   * de cualquier empleado. Mismo recurso que consulta Leave List (vista de administrador).
   * Los estados van en la URL porque la API espera la clave repetida "statuses[]".
   * @param {Api} api @param {number} leaveTypeId @param {string} from @param {string} to
   * @returns {Promise<number[]>}
   */
  async activeLeaveRequestIdsOfType(api, leaveTypeId, from, to) {
    const query = `leaveTypeId=${leaveTypeId}&fromDate=${from}&toDate=${to}&statuses[]=1&statuses[]=2&limit=50`;
    const { data } = await api.get(`/leave/employees/leave-requests?${query}`);
    return data.map((/** @type {any} */ r) => r.id);
  },
};
