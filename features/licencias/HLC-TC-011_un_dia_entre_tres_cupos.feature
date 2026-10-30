# language: es
@licencias @HLC-TC-011
Característica: Reparto de un día de licencia entre varios cupos
  Como administrador de OrangeHRM
  Quiero que una licencia consuma primero los cupos más antiguos
  Para que el saldo se descuente en orden de vigencia cuando un cupo no alcanza

  Regla: El consumo se reparte entre los cupos vigentes en orden de inicio de vigencia

    Esquema del escenario: Un día completo se reparte entre tres cupos cuando los dos más antiguos no alcanzan
      Dado que el administrador ha iniciado sesión
      Y el empleado de prueba tiene tres cupos del tipo de licencia de prueba de <Cupo1_Dias>, <Cupo2_Dias> y <Cupo3_Dias> días, iniciados en ese orden y vigentes hasta el fin del periodo
      Cuando el administrador solicita licencia de jornada completa del "<FechaDesde>" al "<FechaHasta>"
      Entonces la solicitud queda registrada por <DiasLicencia> día
      Y los cupos registran <DiasUsados1>, <DiasUsados2> y <DiasUsados3> días consumidos respectivamente

      @excel @modo:APPLY
      Ejemplos:
        | IdFila        | Cupo1_Dias | Cupo2_Dias | Cupo3_Dias | FechaDesde | FechaHasta | DiasLicencia | DiasUsados1 | DiasUsados2 | DiasUsados3 |
        | HLC-TC-011-01 | 0.25       | 0.25       | 5          | MAR        | MAR        | 1            | 0.25        | 0.25        | 0.5         |
