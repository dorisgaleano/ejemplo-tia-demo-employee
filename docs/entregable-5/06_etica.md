# 6. Ética en IA para testing

Objetivo del requisito: *reflexión documentada sobre los desafíos éticos de usar IA en el
proceso de pruebas (sesgos, privacidad de datos de prueba, dependencia de IA, transparencia).*

Este documento no es una reflexión genérica: cada eje tiene un **riesgo concreto de este
proyecto**, el **control** que se aplica y la **evidencia** en el repositorio. Si un eje no
tuviera evidencia, no estaría aquí.

---

## 6.1 Resumen

| Eje | Riesgo | Control aplicado | Dónde está la evidencia |
|---|---|---|---|
| Privacidad | Datos de empleados de la demo en capturas | Enmascarado de credenciales + regiones ignoradas | `src/visual/screens.js`, `snapshot.js`, `hooks.js` |
| Datos de prueba | Un dataset sintético que parece real | Marcado de origen en el propio archivo | `data/input/ia/datos_pruebas_ia.xlsx` (hoja Instrucciones) |
| Sesgo del modelo | Estigmatizar ASSIGN y descuidar el resto | El modelo prioriza, nunca excluye; bloqueos separados de defectos | `ml/analisis_defectos.py` |
| Sobreconfianza | Aceptar 100 % del validador como "está bien" | Medición de la iteración que falló (20 %) | `02_datos.md`, `evidencias/datos-ia/` |
| Automatización opaca | TIA que deja pasar una regresión | Política conservadora + corrida completa nocturna | `src/registry/impact.js`, `03_tia.md` |
| Dependencia de proveedor | Sin Percy, sin evidencia visual | Respaldo local de capturas y de diff | `scripts/comparar-visual.py` |
| Transparencia | No saber qué produjo la IA | Prompts, código generado vs. final, fuga de información declarada | `02_datos.md`, `04_prediccion.md` |

---

## 6.2 Privacidad: el enmascarado que era decorativo

**Riesgo.** La demo pública de OrangeHRM contiene datos de empleados ficticios pero de **otras
cuentas**, y las capturas por paso de `hooks.js` los registran. Subir eso a un repositorio o a
un servicio de snapshots es una fuga, aunque los nombres sean inventados: el hábito es lo que
se transfiere a un cliente real.

**Control.** Tres capas:

1. `hooks.js` enmascara `input[type="password"]` en cada captura por paso.
2. `PERCY_CSS` oculta los mismos campos en el snapshot remoto.
3. La suite visual añade el bloque `.orangehrm-demo-credentials`.

**El detalle que importa.** En la primera versión del login, el campo de contraseña estaba
tapado y **la credencial seguía visible**, porque la demo imprime
`Username: Admin / Password: admin123` en su propio formulario, en un bloque distinto. El
enmascarado era decorativo: protegía el campo y dejaba el secreto al lado. Se detectó mirando
la captura, no el código, y se corrigió. Ver `evidencias/visual/baseline/01-login.png`.

**Decisión documentada: ignorar no es tapar.** Se evaluó enmascarar todas las tablas en la
captura local y el resultado fue inservible (el dashboard entero quedó cubierto). Se separó:
`ignoreRegions` excluye de la comparación y deja el píxel visible; la máscara se reserva para
credenciales. La consecuencia ética es explícita: **la captura local no es un artefacto
publicable de un cliente real**; en un proyecto con datos personales habría que anonimizar la
evidencia o no versionarla.

---

## 6.3 Datos de prueba: lo sintético debe decirlo

**Riesgo.** Un dataset generado con IA que parece real puede acabar confundido con datos
productivos, o usarse para "probar" sin que nadie sepa de dónde salió.

**Control.** El archivo generado lleva una hoja `Instrucciones` que declara:

> *"Dataset sintético generado con IA para el Entregable 5 — no contiene datos de personas
> reales"*

Además, el generador (`ml/generar_datos_ia.py`) queda versionado: cualquiera puede reproducir
el archivo y verificar que no hay datos reales dentro.

**Lo que no se hizo y por qué.** No se generaron nombres, cédulas ni correos plausibles. El
módulo no los necesita: las columnas son fechas, días y modos. Añadir realismo habría sido
vistosidad sin valor, y un riesgo de privacidad gratuito.

---

## 6.4 Sesgo: el modelo que señalaba a ASSIGN

**Riesgo.** El análisis de defectos concluye que ASSIGN falla 31,5 % contra 6,9 % de APPLY.
Usado mal, eso se convierte en "las pruebas de Assign son las importantes" y el resto se
descuida. Peor: si el modelo se usara para **excluir** filas, se dejaría de detectar
regresiones en APPLY, donde también hay fallos.

**Control.**

1. El modelo **prioriza, no excluye**: las filas de bajo riesgo se ejecutan en la corrida
   completa, no se borran.
2. Se separaron **bloqueos de defectos**: 28 filas de corridas con la precondición ocupada o
   con ejecución en paralelo se excluyeron del entrenamiento. Sin eso, el modelo habría
   aprendido que "falla todo cuando el ambiente está ocupado", que no es un defecto del
   escenario.
3. Se documenta el desbalance y se usa `class_weight="balanced"`: sin eso la regresión
   logística clasificaba todo como sano y el sesgo quedaba escondido en una métrica alta.

**Riesgo residual declarado.** El dataset refleja las causas de **un** proyecto en **una** demo.
Sus conclusiones no son transferibles a otro módulo sin volver a medir.

---

## 6.5 Sobreconfianza: el 100 % que engaña

**Riesgo.** El dataset generado con esquema fue aceptado 30/30. Es un resultado excelente y
peligroso: invita a concluir "la IA genera datos correctos" y a dejar de revisar.

**Control.** Se conservó la iteración que falló. El set sin esquema sobrevivió al 20 % y sus 22
incidencias están documentadas con el mensaje exacto del validador. La conclusión del documento
no es "la IA acierta" sino **"el prompt con el contrato de datos es lo que hace la diferencia"**
y, por tanto, la revisión humana sigue siendo el paso obligatorio.

**Regla del equipo.** Nada generado por IA entra a la suite sin pasar el validador del proyecto.
El validador no es una formalidad: es lo que convierte una sugerencia en un dato ejecutable.

---

## 6.6 Automatización opaca: el día que TIA dejó pasar una regresión

**Riesgo.** El selector de TIA reduce la corrida al 43 % en un cambio típico. Si la matriz de
impacto está incompleta, la suite se ve verde y el defecto viaja a producción. Es un riesgo
creado por la propia optimización.

**Control.**

1. La matriz es **conservadora por diseño**: los archivos de infraestructura corren todo.
2. Se verificó dentro de Cucumber (8 escenarios), no solo en el script: el script podría decir
   8 y Cucumber ejecutar otra cosa.
3. La corrida nocturna/programada ejecuta siempre el 100 %. TIA acelera el *feedback*, no
   reemplaza la cobertura.
4. El límite está escrito en `03_tia.md`: el impacto es por archivo y no entiende semántica.

**Y el caso que se descartó.** Se evaluó añadir un "modo automático" que aplicara el filtro sin
intervención. Se descartó: un filtro que se aplica solo y se equivoca en silencio es peor que
uno que imprime el `FILTRO_TAG` y deja que alguien lo pegue.

---

## 6.7 Dependencia de proveedor

**Riesgo.** La regresión visual depende de Percy y de un token. Sin servicio, sin evidencia. Y
si el token se filtra, la cuenta queda expuesta.

**Control.**

- El token **nunca** está en el repositorio: `PERCY_TOKEN` vive en `.env`, que está en
  `.gitignore`; `.env.example` solo declara el nombre.
- `percyActivo()` comprueba token **y** `PERCY_ENABLE`: la suite no intenta nada si no
  corresponde, en lugar de fallar de forma confusa.
- Respaldo local: capturas por pantalla y `comparar-visual.py`, que funcionan sin red.
- El resultado funcional **no depende de Percy**: un fallo del servicio se anota y no cambia el
  veredicto de la prueba (mismo criterio que ya usaba `hooks.js`).

**Lo que se pierde sin el proveedor** está declarado: sin Percy no hay baselines históricos ni
comparación con IA. Se conserva la detección por píxeles, que es más frágil y no entiende de
layout.

---

## 6.8 Transparencia: lo que hizo la IA y lo que no

| Artefacto | Origen | Cómo se verifica |
|---|---|---|
| Documentos del entregable | Redactados con asistencia de IA, revisados por el equipo | Están en el repo, con cifras que se pueden reproducir |
| `ml/generar_datos_ia.py` | IA | Versionado y ejecutable |
| Dataset sintético | IA, validado con el validador del proyecto | `npm run validar-datos-ia` |
| `src/visual/*`, `scripts/tia.js` | IA sobre patrones del repo (POM, Screenplay, config) | Revisados y ejecutados contra la demo real |
| Análisis de defectos | IA, con datos simulados declarados | `ml/salida/metricas.json` |
| Capturas y evidencias | Generadas por la suite | `docs/entregable-5/evidencias/` |

**El caso incómodo, contado completo.** El primer modelo de defectos usaba `duracion_seg` y
alcanzaba ROC-AUC 0,95 con esa variable al 79 % de la importancia. Era una fuga de información:
la duración es consecuencia del fallo. El resultado se descartó, se retiró la variable y el
modelo quedó en 0,82. **Publicar el 0,95 habría sido más vistoso y habría sido falso.** Está en
`04_prediccion.md` con el detalle, porque un análisis que solo muestra el resultado final enseña
menos que uno que documenta el error y su corrección.

---

## 6.9 Uso responsable de un sistema ajeno

Este proyecto prueba una **demo pública de terceros**. Tres reglas que se respetaron:

1. **No se crean datos sin necesidad.** La suite visual solo navega; no crea tipos ni cupos.
   Cuando hizo falta crear datos (suite funcional), se hace con prefijo `QA-HLC-`
   y limpieza en `After`.
2. **No se interfiere con otros usuarios.** El bloqueo de ejecución (`run-lock.js`) impide dos
   corridas simultáneas —el problema que ya había ocurrido— y `SEMANAS_ADELANTE` permite
   esquivar fechas ocupadas por otros, en lugar de competir por ellas.
3. **Se acepta que el ambiente no es nuestro.** Cuando otro usuario ocupó LUN/MAR, la respuesta
   correcta fue registrar el bloqueo y desplazar fechas, no "hacer que la prueba pase".

---

## 6.10 Conclusión

El desafío ético de la IA en testing no está en los casos extremos: está en lo cotidiano —
enmascarar un campo y dejar la credencial al lado, aceptar un 100 % sin revisar, publicar un AUC
inflado por fuga, o dejar que una optimización silenciosa reduzca la cobertura. Los siete
controles de este documento son concretos y verificables en el repositorio, y dos de ellos
nacieron de errores propios que se detectaron y se corrigieron durante el trabajo.

