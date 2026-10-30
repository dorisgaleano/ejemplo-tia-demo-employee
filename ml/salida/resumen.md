# Resultados del análisis de defectos

Dataset: **154 filas** (corridas documentadas × 14 escenarios). Se excluyen **28 filas de corridas bloqueadas por el ambiente** (precondición ocupada y ejecuciones en paralelo), que no miden el escenario.

Filas para modelar: **126**, de las cuales **22** presentaron defecto (**17.5 %**).

## Descriptivos

| Variable | Valor | Corridas | Tasa de defecto |
|---|---|---|---|
| modo | APPLY | 72 | 6.9 % |
| modo | ASSIGN | 54 | 31.5 % |
| saldo_justo | 0 | 54 | 11.1 % |
| saldo_justo | 1 | 72 | 22.2 % |
| requiere_autocompletado | 0 | 72 | 6.9 % |
| requiere_autocompletado | 1 | 54 | 31.5 % |
| usa_api | 0 | 27 | 3.7 % |
| usa_api | 1 | 99 | 21.2 % |
| dias_licencia | (-0.001, 1.0] | 45 | 20.0 % |
| dias_licencia | (1.0, 2.0] | 81 | 16.0 % |

## Modelos (30 % reservado para prueba)

| Modelo | Exactitud | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Regresión logística | 0.789 | 0.455 | 0.714 | 0.556 | 0.823 |
| Random forest | 0.711 | 0.357 | 0.714 | 0.476 | 0.795 |

## Validación cruzada (5 pliegues)

| Modelo | Exactitud (media ± desv.) | Recall medio | F1 medio | ROC-AUC medio |
|---|---|---|---|---|
| Regresión logística | 0.699 ± 0.063 | 0.69 | 0.442 | 0.736 |
| Random forest | 0.675 ± 0.092 | 0.69 | 0.428 | 0.743 |

## Importancia de variables

| Variable | Importancia |
|---|---|
| modo_assign | 0.254 |
| requiere_autocompletado | 0.237 |
| num_pasos | 0.162 |
| usa_api | 0.127 |
| saldo_justo | 0.095 |
| dias_licencia | 0.079 |
| num_cupos | 0.047 |

## Lectura

Con una tasa de defecto del 17.5 % el recall manda: un falso negativo es un fallo que llega a la corrida nocturna como si estuviera sano.

Las dos variables dominantes son `modo_assign` y `requiere_autocompletado`. No son dos hallazgos distintos: describen la misma causa que el equipo ya había documentado — el autocompletado de empleado en Assign Leave. El modelo la redescubre solo, y eso es lo que se quería comprobar.

La diferencia entre modalidades es el resultado más accionable: ASSIGN falla en el 31.5 % de sus ejecuciones y APPLY en el 6.9 %. Con ese dato, la priorización deja de ser una opinión: las filas ASSIGN entran al conjunto de humo de cada push y las APPLY se reservan para la corrida completa.

**Advertencia:** la etiqueta es simulada a partir de causas documentadas. El modelo demuestra el método y ordena el riesgo; no es desplegable.
