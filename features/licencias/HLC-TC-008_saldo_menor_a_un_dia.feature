# language: es
@licencias @HLC-TC-008
Característica: Licencia de un día completo con un cupo de saldo menor a un día
  Como administrador de OrangeHRM
  Quiero que un saldo parcial se trate según el tipo de registro
  Para que las solicitudes no excedan el saldo y las asignaciones solo consuman lo disponible

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    Esquema del escenario: La solicitud de un día completo se rechaza cuando el único cupo tiene menos de un día de saldo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente durante todo el periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud se rechaza por saldo insuficiente

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | FechaDesde | FechaHasta |
        | HLC-TC-008-01 | 0.5        | MAR        | MAR        |

  Regla: Una asignación siempre se registra y consume solo el saldo disponible de los cupos vigentes

    Esquema del escenario: La asignación de un día completo consume solo el saldo parcial del único cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente durante todo el periodo
      Cuando el administrador asigna al empleado de prueba licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la licencia queda asignada por <DiasLicencia> día
      Y el cupo registra <DiasUsados1> días consumidos

      @excel @modo:ASSIGN
      Ejemplos:
        | IdFila        | Cupo1_Dias | FechaDesde | FechaHasta | DiasLicencia | DiasUsados1 |
        | HLC-TC-008-02 | 0.5        | MAR        | MAR        | 1            | 0.5         |
