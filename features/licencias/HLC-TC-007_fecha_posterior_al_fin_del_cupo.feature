# language: es
@licencias @HLC-TC-007
Característica: Licencia con una fecha posterior al fin del cupo y sin otro cupo disponible
  Como administrador de OrangeHRM
  Quiero que las fechas posteriores al fin del cupo se traten según el tipo de registro
  Para que las solicitudes no excedan el saldo y las asignaciones solo consuman lo disponible

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    # La pantalla Apply no ofrece un tipo cuyo único cupo termina antes del fin del periodo
    # (diferencia documentada en docs/CERTIFICACION.md): la solicitud se envía directamente al sistema.
    Esquema del escenario: La solicitud se rechaza cuando su última fecha es posterior al fin del único cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente desde el inicio del periodo hasta el "<Cupo1_Hasta>"
      Cuando el administrador envía directamente al sistema una solicitud de licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud se rechaza por saldo insuficiente

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo1_Hasta | FechaDesde | FechaHasta |
        | HLC-TC-007-01 | 20         | LUN         | LUN        | MAR        |

  Regla: Una asignación siempre se registra y consume solo el saldo disponible de los cupos vigentes

    Esquema del escenario: La asignación consume solo el día cubierto cuando su última fecha es posterior al fin del único cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente desde el inicio del periodo hasta el "<Cupo1_Hasta>"
      Cuando el administrador asigna al empleado de prueba licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la licencia queda asignada por <DiasLicencia> días
      Y el cupo registra <DiasUsados1> día consumido

      @excel @modo:ASSIGN
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo1_Hasta | FechaDesde | FechaHasta | DiasLicencia | DiasUsados1 |
        | HLC-TC-007-02 | 20         | LUN         | LUN        | MAR        | 2            | 1           |
