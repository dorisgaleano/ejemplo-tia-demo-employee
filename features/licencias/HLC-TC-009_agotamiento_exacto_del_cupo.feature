# language: es
@licencias @HLC-TC-009
Característica: Solicitud de licencia que agota exactamente el saldo del cupo
  Como administrador de OrangeHRM
  Quiero solicitar licencia por la totalidad del saldo disponible
  Para usar todo mi cupo sin que el sistema lo rechace

  Regla: Una solicitud se acepta cuando todas sus fechas están cubiertas por cupos vigentes con saldo suficiente

    Esquema del escenario: La solicitud que consume exactamente todo el saldo del único cupo se acepta
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene un único cupo de <Cupo1_Dias> días del tipo de licencia de prueba, vigente durante todo el periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud figura por <DiasLicencia> días en estado "<EstadoEsperado>"
      Y el cupo registra <DiasUsados1> días consumidos
      Y el saldo disponible del tipo de licencia de prueba queda en <SaldoEsperado> días

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | FechaDesde | FechaHasta | DiasLicencia | EstadoEsperado   | DiasUsados1 | SaldoEsperado |
        | HLC-TC-009-01 | 2          | LUN        | MAR        | 2            | Pending Approval | 2           | 0             |
