# 4. Predicción de defectos

Objetivo del requisito: *análisis exploratorio de datos de defectos (reales o simulados) usando
técnicas de ML vistas en clase.*

Resultado: dataset de 126 filas modelables construido desde las corridas documentadas, dos
modelos comparados con validación cruzada, y un hallazgo que cambia la priorización de la
suite: **ASSIGN falla 4,6 veces más que APPLY**.

---

## 4.1 De dónde salen los datos

No hay repositorio formal de defectos, y el enunciado permite datos simulados. Pero tampoco
hacía falta inventarlos de cero: `docs/CERTIFICACION.md` documenta **11 corridas reales** con
sus causas.

| Corrida documentada | Qué pasó | Cómo entra al dataset |
|---|---|---|
| `2026-10-20_*` (5 corridas) | Corridas normales, algún fallo puntual | Filas etiquetadas por escenario |
| `2026-10-21_08-07-21` | 14/14 pasó | Filas sanas |
| `2026-10-21_12-36-18` | Fallaron **las 6 filas ASSIGN**: autocompletado con 4 coincidencias "John … Doe" | Señal fuerte para ASSIGN |
| `2026-10-21_19-39-12` | 6/6 pasó tras el ajuste | Filas sanas |
| `2026-10-22_16-25-38` | 0/14: otro usuario ocupó LUN/MAR | **Bloqueo**, no defecto |
| `2026-10-22_16-33-28` | 9/14: dos corridas simultáneas | **Bloqueo**, no defecto |
| `2026-10-22_16-46-50` | 14/14 pasó | Filas sanas |

**Decisión de modelado que vale más que el modelo:** las dos corridas bloqueadas se marcan con
`bloqueo_ambiente = 1` y **se excluyen del entrenamiento**. Predecir un bloqueo no es predecir
un defecto; si se mezclan, el modelo aprende el ruido del ambiente compartido. Es la misma
distinción que un equipo real hace entre *blocked* y *failed*.

```
154 filas totales (11 corridas × 14 escenarios)
 −28 filas de corridas bloqueadas
─────
 126 filas para modelar · 22 con defecto (17,5 %)
```

Las etiquetas son **simuladas** con semilla fija siguiendo las causas documentadas. Está
declarado en el propio script y en el encabezado de los resultados.

---

## 4.2 Variables

| Variable | Tipo | Origen |
|---|---|---|
| `modo` (→ `modo_assign`) | binaria | Excel de datos |
| `dias_licencia` | numérica | Excel de datos |
| `num_cupos` | numérica | Columnas `Cupo*` |
| `num_pasos` | numérica | Feature |
| `saldo_justo` | binaria | Cálculo sobre cupos |
| `usa_api` | binaria | Inspección del step |
| `requiere_autocompletado` | binaria | Página implicada |

### Dos variables excluidas a propósito

**`duracion_seg` — fuga de información.** En la primera iteración el modelo la usaba y acaparaba
el **79 % de la importancia** con un ROC-AUC de 0,95. Era un espejismo: la duración es
*consecuencia* del fallo (una fila que falla tarda más porque agota timeouts), no su causa. Un
modelo así no sirve en producción, porque en el momento de predecir todavía no existe la
duración. Se retiró y el AUC bajó a un valor honesto.

**`depende_demo_compartida`.** Constante: todas las corridas usan la demo pública. Una variable
sin varianza no aporta y solo ensucia la importancia.

---

## 4.3 Modelos y resultados

Split estratificado 70/30 y validación cruzada de 5 pliegues.

### Conjunto de prueba (30 %)

| Modelo | Exactitud | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Regresión logística | 0,789 | 0,455 | **0,714** | **0,556** | **0,823** |
| Random forest | 0,711 | 0,357 | **0,714** | 0,476 | 0,795 |

### Validación cruzada (5 pliegues)

| Modelo | Exactitud (media ± desv.) | Recall medio | F1 medio | ROC-AUC medio |
|---|---|---|---|---|
| Regresión logística | 0,699 ± 0,063 | 0,690 | 0,442 | 0,736 |
| Random forest | 0,675 ± 0,092 | 0,690 | 0,428 | 0,743 |

### Lectura

**El recall manda.** Con 17,5 % de defectos, un falso negativo es un fallo que llega a la corrida
nocturna como si estuviera sano; un falso positivo solo cuesta revisar una fila más. Ambos
modelos aciertan el 71 % de los defectos reales.

**La regresión logística es preferible aquí:** mejor F1, mejor ROC-AUC, y menos varianza entre
pliegues (0,063 vs 0,092). Con 126 filas y 22 positivos, un bosque de 300 árboles es más
maquinaria de la que los datos justifican. Es una conclusión del tamaño muestral, no del
algoritmo.

**Nota metodológica:** la regresión logística va con `class_weight="balanced"`. Sin eso,
clasificaba *todo* como sano (recall 0) porque el umbral 0,5 por defecto no sirve con clases
desbalanceadas. La comparación inicial era injusta y se corrigió.

Gráficas en `ml/salida/`: `curva_roc.png`, `matriz_confusion.png`, `importancia.png`.

---

## 4.4 Qué aprendió el modelo

| Variable | Importancia |
|---|---|
| `modo_assign` | 0,254 |
| `requiere_autocompletado` | 0,237 |
| `num_pasos` | 0,162 |
| `usa_api` | 0,127 |
| `saldo_justo` | 0,095 |
| `dias_licencia` | 0,079 |
| `num_cupos` | 0,047 |

Las dos primeras **describen la misma causa** que el equipo ya había documentado: el
autocompletado de empleado en Assign Leave. El modelo la redescubre solo. Eso es exactamente lo
que se quería comprobar: si un modelo entrenado con datos del proyecto identifica la causa que
el equipo conoce por experiencia, el método está bien aplicado.

Que `num_pasos` y `usa_api` aparezcan después es esperable: son proxies de complejidad de la
fila, no causas independientes.

---

## 4.5 La tabla que cambia decisiones

Descriptivos sobre las 126 filas utilizables:

| Dimensión | Valor | Filas | Tasa de defecto |
|---|---|---|---|
| **Modo** | APPLY | 72 | **6,9 %** |
| **Modo** | ASSIGN | 54 | **31,5 %** |
| Saldo justo | No | 54 | 11,1 % |
| Saldo justo | Sí | 72 | 22,2 % |
| Usa API | No | 27 | 3,7 % |
| Usa API | Sí | 99 | 21,2 % |
| Días | ≤ 1 | 45 | 20,0 % |
| Días | 2 | 81 | 16,0 % |

De aquí sale una regla operativa, no una predicción:

> **Las 6 filas ASSIGN son el punto de riesgo de la suite.** Van al conjunto de humo de cada
> push. Las 8 filas APPLY, con 6,9 % de fallo, se reservan para la corrida completa.

Eso se conecta directamente con TIA (`03_tia.md`): el selector ya distingue por `@modo`, así que
la política se puede aplicar sin código nuevo.

---

## 4.6 Limitaciones

1. **La etiqueta es simulada.** El método es real; los datos no. El modelo no es desplegable y
   el documento lo dice en cada sección.
2. **126 filas y 22 positivos es poco.** Las métricas de validación cruzada tienen ±0,06 de
   desviación en exactitud; cualquier conclusión fina sería overfitting disfrazado.
3. **Una sola fuente de causas.** Todas las causas vienen de `CERTIFICACION.md`. Un histórico
   real de defectos traería causas que aquí no existen.
4. **Sin variables de código.** No se usó complejidad ciclomática ni historial de cambios. Con
   ellas el modelo sería bastante mejor, y es la evolución natural del componente.

---

## 4.7 Conclusión del componente

Se construyó un dataset defendible a partir de datos reales del proyecto, se detectó y corrigió
una fuga de información que inflaba el resultado, y se compararon dos modelos con validación
honesta. El producto no es el ROC-AUC: es la tabla de la sección 4.5, que convierte "creemos que
Assign Leave es frágil" en un número con el que se puede priorizar la suite.

