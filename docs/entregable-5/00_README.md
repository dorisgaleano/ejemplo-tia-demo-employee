# Entregable 5 — Testing Potenciado con IA

**Módulo:** Leave (licencias) · **SUT:** OrangeHRM OS 5.9, demo pública
**Flujo automatizado:** handleLeaveCreate · **Suite:** Cucumber 13 + Playwright 1.63 (Screenplay + POM)
**Entrega:** 23 de octubre de 2026

---

## Qué hay aquí

Este entregable no reemplaza la suite existente: la extiende con los seis componentes de
profundización en IA que pide el programa. Cada componente tiene su documento y su evidencia
ejecutable en el repositorio.

| # | Requisito del entregable | Documento | Código / datos | Evidencia |
|---|---|---|---|---|
| 1 | Pruebas visuales con IA en 5+ pantallas | [`01_visual.md`](01_visual.md) | `src/visual/`, `.percy.yml` | `evidencias/visual/` (7 pantallas, ruido y detección medidos) |
| 2 | Generación inteligente de datos de prueba | [`02_datos.md`](02_datos.md) | `ml/generar_datos_ia.py`, `data/input/ia/` | `evidencias/datos-ia/` (validador real: 30/30) |
| 3 | Test Impact Analysis | [`03_tia.md`](03_tia.md) | `src/registry/impact.js`, `scripts/tia.js` | `evidencias/tia/` (filtro verificado en Cucumber: 8 de 14) |
| 4 | Predicción de defectos | [`04_prediccion.md`](04_prediccion.md) | `ml/construir_defectos.py`, `ml/analisis_defectos.py` | `ml/salida/` (métricas, ROC, importancia) |
| 5 | Evaluación de herramientas de IA | [`05_herramientas.md`](05_herramientas.md) | — | Matriz ponderada con POC de Percy ya ejecutada |
| 6 | Ética en IA para testing | [`06_etica.md`](06_etica.md) | — | Cada eje con control verificable en el código |

---

## Cómo reproducirlo

```bash
npm install
npx playwright install chromium

# 1. Pruebas visuales (7 pantallas). Sin PERCY_TOKEN guarda capturas locales;
#    con "percy exec" además crea/actualiza baselines en Percy.
npm run test:visual
npm run test:visual:percy        # requiere PERCY_TOKEN en .env

# 2. Dataset sintético con IA y su validación contra el validador real
node scripts/exportar-esquema.js
python3 ml/generar_datos_ia.py
npm run validar-datos-ia

# 3. Test Impact Analysis (diff de git → filtro de tags)
npm run tia -- --files=src/pages/ApplyLeavePage.js
FILTRO_TAG="..." npm test

# 4. Predicción de defectos
python3 ml/construir_defectos.py
python3 ml/analisis_defectos.py

# 5. Comparación de dos corridas visuales (respaldo local de Percy)
python3 scripts/comparar-visual.py reports/visual/<base> reports/visual/<nueva>
```

---

## Resultados de esta entrega

Todo lo que sigue se ejecutó sobre la demo real el 23 de octubre de 2026 y quedó en
`evidencias/`. Nada de estas cifras es estimado salvo donde se dice explícitamente.

| Componente | Resultado medido |
|---|---|
| Suite visual | **7/7 pantallas** capturadas, 17,2 s en total |
| Ruido de la demo (dos corridas sin cambios) | 6 pantallas al **0,000 %**; dashboard al **0,042 %** |
| Detección de una regresión inyectada | **5 de 7** pantallas marcadas, entre 2,36 % y 7,54 % de píxeles |
| Dataset con esquema | **30 filas, 30 aceptadas (100 %)** por el validador de la suite |
| Dataset sin esquema (primera iteración) | **10 filas, 2 aceptadas (20 %)**, 22 incidencias |
| Test Impact Analysis | cambio en el formulario Apply: **8 de 14 escenarios (43 % menos)**; verificado en Cucumber |
| Predicción de defectos | 126 filas modeladas, 17,5 % de defecto; **recall 0,71 · ROC-AUC 0,82** |
| Riesgo por modalidad | ASSIGN **31,5 %** de fallo vs. APPLY **6,9 %** |

---

## Lo que el entregable aporta más allá del requisito

Tres hallazgos que salieron de hacer el trabajo y que el equipo no tenía antes:

1. **El snapshot de `hooks.js` no era una prueba visual.** Enviaba una captura por fila, sin
   nombre estable y sin enmascarar lo volátil. Se sustituyó por una suite con nombre fijo por
   pantalla; se conserva el hook como evidencia, no como regresión.
2. **La demo pública imprime las credenciales en el propio login.** El enmascarado de la
   contraseña era decorativo hasta que se tapó también el bloque de credenciales de demo. Hoy
   el CSS de Percy y la captura local lo cubren.
3. **El primer modelo de defectos tenía fuga de información.** Se apoyaba en la duración de la
   fila, que es *consecuencia* del fallo, no su causa: acaparaba el 79 % de la importancia. Se
   retiró y el modelo pasó de un AUC engañoso a uno honesto. Está documentado en `04_prediccion.md`.

---

## Limitaciones declaradas

- El dataset de defectos es **simulado** a partir de causas documentadas en `CERTIFICACION.md`.
  No hay histórico real de defectos. El modelo demuestra el método y ordena el riesgo; no es
  desplegable.
- Percy queda **integrado y ejecutable**, pero los baselines no se aprobaron en esta entrega
  porque no hay `PERCY_TOKEN` en el repositorio (ni debe haberlo). La detección se demostró con
  el comparador local de píxeles, que es el respaldo de la suite.
- La pantalla **Apply Leave captura su estado vacío** ("No Leave Types with Leave Balance")
  porque el usuario Admin no tiene cupos elegibles en la demo. La corrección concreta está en
  `01_visual.md`.

