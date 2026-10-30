# language: es
@licencias @HLC-TC-014
Característica: Licencia con una fecha previa al cupo y un último día que agota exactamente el cupo
  Como administrador de OrangeHRM
  Quiero que una fecha sin cupo impida la solicitud aunque el resto agote exactamente el saldo
  Para que las solicitudes nunca queden parcialmente cubiertas y las asignaciones solo consuman lo disponible

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    Esquema del escenario: La solicitud se rechaza por una fecha previa al cupo aunque el día cubierto agota exactamente su saldo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> día del tipo de licencia de prueba, vigente desde el "<Cupo1_Desde>" hasta el fin del periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud se rechaza por saldo insuficiente

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo1_Desde | FechaDesde | FechaHasta |
        | HLC-TC-014-01 | 1          | MAR         | LUN        | MAR        |

  Regla: Una asignación siempre se registra y consume solo el saldo disponible de los cupos vigentes

    Esquema del escenario: La asignación agota exactamente el cupo con el día cubierto y deja sin cupo la fecha previa
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> día del tipo de licencia de prueba, vigente desde el "<Cupo1_Desde>" hasta el fin del periodo
      Cuando el administrador asigna al empleado de prueba licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la licencia queda asignada por <DiasLicencia> días
      Y el cupo registra <DiasUsados1> día consumido

      @excel @modo:ASSIGN
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo1_Desde | FechaDesde | FechaHasta | DiasLicencia | DiasUsados1 |
        | HLC-TC-014-02 | 1          | MAR         | LUN        | MAR        | 2            | 1           |
