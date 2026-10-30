# language: es
@licencias @HLC-TC-004
Característica: Solicitud de licencia con saldo suficiente en un único cupo
  Como administrador de OrangeHRM
  Quiero solicitar licencia con cargo al cupo vigente
  Para que los días solicitados se descuenten correctamente del saldo

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    Esquema del escenario: El administrador solicita un día de licencia con saldo sobrado en un único cupo
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente durante todo el periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces se confirma que la solicitud fue registrada
      Y la solicitud figura por <DiasLicencia> día en estado "<EstadoEsperado>"
      Y el cupo registra <DiasUsados1> día consumido

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | FechaDesde | FechaHasta | DiasLicencia | EstadoEsperado   | DiasUsados1 |
        | HLC-TC-004-01 | 20         | MAR        | MAR        | 1            | Pending Approval | 1           |
