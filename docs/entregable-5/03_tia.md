# 3. Test Impact Analysis (TIA)

Objetivo del requisito: *análisis conceptual de cómo TIA puede optimizar la ejecución de
pruebas del módulo ante cambios en el código.*

Resultado: la matriz conceptual **más un selector ejecutable** que convierte un diff de git en
el filtro de tags que la suite ya sabe usar. Verificado: un cambio en el formulario Apply deja
la corrida en **8 de 14 escenarios** y Cucumber confirma los 8.

---

## 3.1 Por qué TIA es viable en esta suite

La mayoría de los equipos no puede hacer TIA porque no hay relación entre el código y las
pruebas. Aquí sí la hay, y ya existía antes de este entregable:

| Pieza existente | Para qué sirve en TIA |
|---|---|
| `features/` con un caso por archivo y tag `@HLC-TC-xxx` | Identifica el caso sin ambigüedad |
| `cucumber.mjs` con `tags` leído de `FILTRO_TAG` | Ya acepta una selección externa; no hay que tocar la suite |
| `ejecutar_pruebas.bat` opción 4 (ejecutar por tag) | El usuario final ya tiene la puerta de entrada |
| Page Objects y tareas de Screenplay por pantalla | Cada archivo tiene dueño funcional claro |
| Columnas `Modo` con `@modo:APPLY` / `@modo:ASSIGN` | Permite recortar por modalidad, no solo por caso |

TIA no hubo que inventarlo: hubo que **conectar** lo que ya estaba.

---

## 3.2 La matriz de impacto

Vive en `src/registry/impact.js`, junto al registro de casos, para que sea una sola fuente.
Cada entrada declara archivo, casos afectados, modalidades y **por qué**.

### Impacto transversal (corre todo)

`src/api/LeaveApi.js`, `src/config/env.js`, `src/support/*`, `src/steps/licencias.steps.js`,
`src/controller/*` (el pipeline de `prepare-data`), `src/registry/*`,
`src/screenplay/abilities/*`, `src/screenplay/actors/*`, `src/utils/expect.js`,
`src/screenplay/tasks/PrepararTipoDeLicencia.js` y `IniciarSesion.js`.

No tiene sentido intentar ahorrar aquí: son la infraestructura que usan las 14 filas. Además
`package.json`, `package-lock.json`, `cucumber.mjs` y el Excel de datos fuerzan corrida completa.

### Impacto por caso y modalidad

| Archivo que cambia | Casos | Modalidad | Escenarios | Motivo |
|---|---|---|---|---|
| `src/pages/ApplyLeavePage.js` | 004, 006, 007, 008, 009, 010, 011, 014 | APPLY | 8 | Page Object exclusivo del formulario |
| `src/pages/AssignLeavePage.js` | 003, 006, 007, 008, 010, 014 | ASSIGN | 6 | Incluye el autocompletado de empleado |
| `src/screenplay/tasks/SolicitarLicencia.js` | 8 casos APPLY | APPLY | 8 | Tarea de solicitud por UI |
| `src/screenplay/tasks/AsignarLicencia.js` | 6 casos ASSIGN | ASSIGN | 6 | Tarea de asignación y confirmación |
| `src/pages/components/LeaveForm.js` | 004, 006, 007, 008, 010, 014 | ambas | 11 | Formulario compartido |
| `src/models/cupos.js` | 003, 004, 009, 011 | ambas | 5 | Reparto FIFO y agotamiento |
| `src/utils/dates.js` | 006, 007, 014 | ambas | 6 | Fechas simbólicas LUN/MAR |
| `src/pages/MyLeaveListPage.js` | 004, 006, 007, 008, 010, 014 | ambas | 11 | Verificación del estado en My Leave |
| `src/pages/LeaveListPage.js` | 003 | ambas | 1 | HLC-TC-003 se verifica en Leave List |
| `src/screenplay/questions/SaldoDisponible.js` | 003, 009 | ambas | 2 | Saldo verificado por API |

La columna **Escenarios** sale de contar las filas con `Ejecutar = SI` del Excel real, no de
suponer: `scripts/tia.js` lee el libro y cruza caso + modalidad.

---

## 3.3 El selector

```bash
npm run tia                              # usa git diff HEAD~1
npm run tia -- --base=origin/main        # contra otra referencia
npm run tia -- --files=a.js,b.js         # simula el cambio (sin git)
npm run tia -- --json                    # salida para una máquina
```

Salida real (recortada) de un cambio en el formulario Apply:

```
Archivos cambiados: 1
  · src/pages/ApplyLeavePage.js → 8 caso(s) APPLY (Page Object exclusivo del formulario)

Casos afectados: 8 de 9
  · HLC-TC-004  APPLY  1 escenario(s)
  · HLC-TC-006  APPLY  1 escenario(s)
  …
Escenarios: 8 de 14  (ahorro 43 %)
Tiempo estimado: 4 min  vs  13 min de la suite completa

FILTRO_TAG=(@HLC-TC-004 and @modo:APPLY) or … or (@HLC-TC-014 and @modo:APPLY)
```

Ese `FILTRO_TAG` se pega en la opción 4 del menú `.bat` o se exporta antes de `npm test`.
Cucumber ya añade `and not @wip`, así que el selector no lo repite.

---

## 3.4 Resultados medidos

Cuatro escenarios ejecutados con el selector (`evidencias/tia/ejemplos.txt`):

| Cambio simulado | Casos | Escenarios | Ahorro | Tiempo |
|---|---|---|---|---|
| `src/pages/ApplyLeavePage.js` | 8 de 9 | **8 de 14** | **43 %** | 4 min vs 13 min |
| `src/utils/dates.js` | 3 de 9 | **6 de 14** | **57 %** | 6 min vs 13 min |
| `src/api/LeaveApi.js` | 9 de 9 | 14 de 14 | 0 % | 13 min vs 13 min |
| `docs/entregable-5/03_tia.md` | — | **0** | 100 % | no se ejecuta nada |

**Verificación en Cucumber, no solo en el script.** Con el `FILTRO_TAG` del primer caso
(`evidencias/tia/filtro-aplicado.txt`):

```
2 hooks (2 skipped)
8 scenarios (8 skipped)
53 steps (53 skipped)
```

El selector dice 8 y Cucumber selecciona **exactamente 8**. La reducción es real, no una
estimación del script.

El tiempo se estima con las medias observadas y documentadas en `CERTIFICACION.md`
(APPLY 20–51 s; ASSIGN 80–95 s en la demo pública): APPLY 30 s, ASSIGN 90 s. Es una
estimación declarada, no una medición de esta corrida.

---

## 3.5 Lo que TIA no resuelve aquí

Tres límites que el documento debe decir en voz alta:

**1. El impacto es por archivo, no semántico.** Un cambio de un comentario en `cupos.js`
dispara 5 escenarios igual que un cambio de la regla FIFO. TIA no lee el diff, lo clasifica.

**2. Sin cobertura real, la matriz es una promesa.** La matriz dice "este archivo participa en
estos casos" porque se leyó el código; no hay instrumentación que lo demuestre. Con cobertura
de Istanbul sobre la suite se podría generar esta matriz automáticamente y dejar de mantenerla
a mano. Es la mejora natural del componente.

**3. El ahorro es en minutos, no en horas.** Con 14 escenarios, el máximo ahorro son 7 minutos
por corrida. El valor aparece cuando se multiplica: 20 push al día × 7 min ≈ 2,3 h diarias, y
sobre todo en el tiempo de *feedback* — 4 minutos es una respuesta que se espera; 13 no.

**4. Riesgo de sub-selección.** Si la matriz se queda corta, TIA deja pasar una regresión. Por
eso la política es conservadora: ante la duda, transversal. Y por eso la corrida nocturna
siempre ejecuta el 100 %.

---

## 3.6 Cómo se integraría en CI

```yaml
# .github/workflows/tests.yml (extracto)
- name: Seleccionar escenarios por impacto
  id: tia
  run: |
    npm run tia -- --base=origin/main --json > tia.json
    echo "tag=$(jq -r .filtroTag tia.json)" >> $GITHUB_OUTPUT

- name: Ejecutar solo lo afectado
  if: steps.tia.outputs.tag != ''
  run: FILTRO_TAG="${{ steps.tia.outputs.tag }}" npm test

- name: Suite completa (nocturna)
  if: github.event_name == 'schedule'
  run: npm test
```

En un push se ejecuta lo afectado; en la programada, todo. Es el patrón estándar y no requiere
tocar el código de la suite.

---

## 3.7 Conclusión del componente

El requisito pedía un análisis conceptual. Se entregó eso y además un selector que funciona
contra el repositorio real, con el ahorro medido y **verificado dentro de Cucumber**. La pieza
que faltaba para hacer TIA no era teoría: era la matriz de impacto, y ahora está versionada
junto al registro de casos.

