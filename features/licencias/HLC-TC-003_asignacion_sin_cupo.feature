# language: es
@licencias @HLC-TC-003
Característica: Asignación de licencia de un tipo sin cupo
  Como administrador de OrangeHRM
  Quiero asignar licencia aunque el empleado no tenga cupo del tipo
  Para registrar ausencias autorizadas sin depender del saldo disponible

  Regla: Una asignación siempre se registra y consume solo el saldo disponible de los cupos vigentes

    Esquema del escenario: La asignación se registra sin consumir cupo cuando el empleado no tiene cupos del tipo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba no tiene ningún cupo del tipo de licencia de prueba
      Cuando el administrador asigna al empleado de prueba licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la licencia figura en la lista de licencias por <DiasLicencia> día
      Y el saldo disponible del tipo de licencia de prueba no es positivo
      Y no se consume ningún cupo del tipo de licencia de prueba

      @excel @modo:ASSIGN
      Ejemplos:
        | IdFila        | FechaDesde | FechaHasta | DiasLicencia |
        | HLC-TC-003-01 | MAR        | MAR        | 1            |
