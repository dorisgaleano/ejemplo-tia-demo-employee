# language: es
@licencias @HLC-TC-006
Característica: Licencia con una fecha anterior al inicio del cupo
  Como administrador de OrangeHRM
  Quiero que las fechas sin cupo vigente se traten según el tipo de registro
  Para que las solicitudes no excedan el saldo y las asignaciones solo consuman lo disponible

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    Esquema del escenario: La solicitud se rechaza cuando su primera fecha es anterior al inicio del cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente desde el "<Cupo1_Desde>" hasta el fin del periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud se rechaza por saldo insuficiente

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo1_Desde | FechaDesde | FechaHasta |
        | HLC-TC-006-01 | 20         | MAR         | LUN        | MAR        |

  Regla: Una asignación siempre se registra y consume solo el saldo disponible de los cupos vigentes

    Esquema del escenario: La asignación consume solo el día cubierto cuando su primera fecha es anterior al inicio del cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente desde el "<Cupo1_Desde>" hasta el fin del periodo
      Cuando el administrador asigna al empleado de prueba licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la licencia queda asignada por <DiasLicencia> días
      Y el cupo registra <DiasUsados1> día consumido

      @excel @modo:ASSIGN
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo1_Desde | FechaDesde | FechaHasta | DiasLicencia | DiasUsados1 |
        | HLC-TC-006-02 | 20         | MAR         | LUN        | MAR        | 2            | 1           |
