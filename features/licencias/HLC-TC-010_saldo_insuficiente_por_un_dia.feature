# language: es
@licencias @HLC-TC-010
Característica: Licencia de dos días con saldo de un solo día
  Como administrador de OrangeHRM
  Quiero que la falta de un día completo de saldo se trate según el tipo de registro
  Para que las solicitudes no excedan el saldo y las asignaciones solo consuman lo disponible

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    Esquema del escenario: La solicitud de dos días se rechaza cuando el único cupo solo tiene saldo para uno
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> día del tipo de licencia de prueba, vigente durante todo el periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud se rechaza por saldo insuficiente

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | FechaDesde | FechaHasta |
        | HLC-TC-010-01 | 1          | LUN        | MAR        |

  Regla: Una asignación siempre se registra y consume solo el saldo disponible de los cupos vigentes

    Esquema del escenario: La asignación de dos días consume solo el día disponible del único cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> día del tipo de licencia de prueba, vigente durante todo el periodo
      Cuando el administrador asigna al empleado de prueba licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la licencia queda asignada por <DiasLicencia> días
      Y el cupo registra <DiasUsados1> día consumido

      @excel @modo:ASSIGN
      Ejemplos:
        | IdFila        | Cupo1_Dias | FechaDesde | FechaHasta | DiasLicencia | DiasUsados1 |
        | HLC-TC-010-02 | 1          | LUN        | MAR        | 2            | 1           |
