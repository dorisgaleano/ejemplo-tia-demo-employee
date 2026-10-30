# Certificación de casos automatizados — handleLeaveCreate (OrangeHRM)

Cada caso se implementa y certifica por separado (Ciclo de certificación). Un caso pasa a
**Certificado** solo con la aprobación explícita de la responsable de QA.

Ambiente: demo pública `https://opensource-demo.orangehrmlive.com` (OrangeHRM OS 5.9), usuario Admin.

**Estado final (2026-10-21):** 9/9 casos certificados (14 escenarios). Por decisión de la usuaria
se omitieron las guías `GUIA_EJECUCION.md`, `ARQUITECTURA.md` y `GUIA_GHERKIN.md`.

**Integración desde `ejecutar_pruebas.bat` (ejecutada por la usuaria, opciones 1, 5 y 6):**

| Corrida | Resultado | Observaciones |
|---|---|---|
| `reports/2026-10-21_08-07-21/` | **14/14 PASÓ** | Integración completa |
| `reports/2026-10-21_12-36-18/` | 8/14 (fallaron las 6 filas ASSIGN) | El empleado vinculado al Admin pasó a llamarse "John Mike Doe" y la demo tenía otros tres "John … Doe": el autocompletado de Assign Leave devolvió 4 coincidencias y la selección por nombre fue ambigua (Playwright se detuvo sin elegir) |
| `reports/2026-10-21_19-39-12/` | **6/6 PASÓ** (filas ASSIGN, tras el ajuste) | `AsignarLicencia` elige al empleado por su empNumber: posición en la respuesta de sugerencias `/pim/employees?nameOrId=` (mismo orden que en pantalla, verificado en trace) y comprobación del nombre antes de clicar |
| `reports/2026-10-22_16-25-38/` | 0/14 | "Precondición no cumplida": otro usuario de la demo creó la solicitud 86 (CAN - Personal, 2026-10-23..28, Pending Approval) para el empleado de prueba, ocupando LUN/MAR. Se agregó `SEMANAS_ADELANTE` en `.env` para desplazar las fechas |
| `reports/2026-10-22_16-33-28/` y `16-34-50/` | 9/14 y 3/14 | **Dos ejecuciones simultáneas** (una por consola y otra desde el menú): compartieron `.run/run.json` (mismo sufijo → 422 al crear tipos), fechas y sesión. Sin residuos en la demo (verificado). No es un defecto de los casos; la suite no admite ejecuciones en paralelo |
| `reports/2026-10-22_16-46-50/` | **14/14 PASÓ** | Corrida única desde el menú con `SEMANAS_ADELANTE=1` (LUN = 2026-11-02, MAR = 2026-11-03). Limpieza completa en todas las filas |

**Bloqueo de ejecución (2026-10-22):** para evitar otra vez dos corridas simultáneas, `prepare-data`
toma `.run/lock.json` antes de escribir nada y Cucumber lo confirma en `BeforeAll` antes de abrir el
navegador; cada fila actualiza su hora de avance y `AfterAll` lo libera. Una segunda ejecución se
detiene con un mensaje claro sin crear datos. Un bloqueo abandonado caduca a los 2 min (solo
preparada) o 15 min sin avance (ejecutando). Probado: rechazo de una segunda preparación, aborto de
Cucumber ante otra corrida activa (0 escenarios, sin evidencias), recuperación de bloqueos
abandonados y liberación al terminar una corrida real (HLC-TC-007-01 PASÓ).

| TestCaseId | Feature | Modalidad | Fecha | Filas probadas | Resultado | Evidencia | Estado | Observaciones |
|---|---|---|---|---|---|---|---|---|
| HLC-TC-003 | `licencias/HLC-TC-003_asignacion_sin_cupo.feature` | B (exploración de solo lectura de los filtros de Leave List) | 2026-10-20 | 1 (HLC-TC-003-01 ASSIGN) | PASÓ 1/1 en 2 corridas consecutivas | `reports/2026-10-20_23-31-20/` | **Certificado** (2026-10-21) | Verificación en Leave List (opción A): se agrega el estado Scheduled y el tipo QA al filtro. Observado: 1.00 día, Scheduled (1.00), Leave Balance -1.00; saldo ≤ 0 y 0 días consumidos por API |
| HLC-TC-004 | `licencias/HLC-TC-004_solicitud_un_dia_un_cupo.feature` | B | 2026-10-20 | 1 (HLC-TC-004-01) | PASÓ en 3 corridas consecutivas (la 1.ª validación falló por el campo To Date y se corrigió) | `reports/2026-10-20_21-40-11/` | **Certificado** (2026-10-20) | Las solicitudes canceladas quedan en el historial de My Leave (OrangeHRM no permite borrarlas); tipos y cupos QA se eliminan. Regresión tras refactorizar en HLC-TC-006: PASÓ (`reports/2026-10-20_22-18-04/`) |
| HLC-TC-006 | `licencias/HLC-TC-006_fecha_anterior_al_cupo.feature` | B | 2026-10-20 | 2 (HLC-TC-006-01 APPLY, HLC-TC-006-02 ASSIGN) | PASÓ 2/2 en 2 corridas consecutivas tras los ajustes (las 3 corridas anteriores fallaron en Assign por la lentitud del servidor) | `reports/2026-10-20_22-18-04/` | **Certificado** (2026-10-20) | Assign Leave en la demo responde tras ~30–60 s y bloquea la sesión hasta ~60 s; la fila ASSIGN dura ~80–95 s. La verificación del Assign se hace en My Leave (Leave List filtra por defecto solo Pending Approval) |
| HLC-TC-007 | `licencias/HLC-TC-007_fecha_posterior_al_fin_del_cupo.feature` | B (validación en vivo, sin exploración aparte) | 2026-10-20 | 2 (HLC-TC-007-01 APPLY por envío directo, HLC-TC-007-02 ASSIGN) | PASÓ 2/2 en 2 corridas completas consecutivas (regresión de 004 y 006 incluida: 5/5) | `reports/2026-10-20_22-44-06/` | **Certificado** (2026-10-20) | **Diferencia con el caso:** Apply no ofrece un tipo cuyo único cupo termina antes del fin del periodo (`/leave/leave-types/eligible`). Opción B aprobada: la fila APPLY envía la solicitud directamente al sistema (mismo POST que la pantalla) y verifica el rechazo 400 "Leave Balance Exceeded". En Assign apareció el diálogo "Confirm Leave Assignment" (se acepta con "Ok") |
| HLC-TC-008 | `licencias/HLC-TC-008_saldo_menor_a_un_dia.feature` | B (validación en vivo, sin exploración aparte) | 2026-10-20 | 2 (HLC-TC-008-01 APPLY, HLC-TC-008-02 ASSIGN) | PASÓ 2/2 en 3 corridas consecutivas | `reports/2026-10-20_22-55-56/` | **Certificado** (2026-10-20) | Sin frases nuevas (reutilización total). En la corrida 1 el barrido de limpieza sufrió un corte de conexión ("fetch: aborted") sin dejar residuos (verificado); se agregó un único reintento idempotente ante cortes de conexión |
| HLC-TC-009 | `licencias/HLC-TC-009_agotamiento_exacto_del_cupo.feature` | B (validación en vivo; recurso de saldo confirmado en trace de HLC-TC-008) | 2026-10-20 | 1 (HLC-TC-009-01 APPLY) | PASÓ 1/1 en 2 corridas consecutivas | `reports/2026-10-20_23-02-31/` | **Certificado** (2026-10-20) | Nueva verificación: saldo disponible por API (`/leave/leave-balance/leave-type/{id}`), decisión P9 |
| HLC-TC-010 | `licencias/HLC-TC-010_saldo_insuficiente_por_un_dia.feature` | B (validación en vivo, sin exploración aparte) | 2026-10-20 | 2 (HLC-TC-010-01 APPLY, HLC-TC-010-02 ASSIGN) | PASÓ 2/2 en 2 corridas consecutivas | `reports/2026-10-20_23-07-35/` | **Certificado** (2026-10-20) | Sin frases nuevas (reutilización total). "El formulario puede mostrar el saldo como insuficiente" no se verifica (opcional en el caso) |
| HLC-TC-011 | `licencias/HLC-TC-011_un_dia_entre_tres_cupos.feature` | B (validación en vivo, sin exploración aparte) | 2026-10-20 | 1 (HLC-TC-011-01 APPLY) | PASÓ 1/1 en 2 corridas consecutivas | `reports/2026-10-20_23-14-50/` | **Certificado** (2026-10-20) | Reparto FIFO verificado por API (0.25/0.25/0.5). Fechas de inicio como INICIO_PERIODO(+1M/+2M); si MAR cae antes del inicio del tercer cupo o fuera del periodo, la fila falla con "Precondición no cumplida" antes de crear datos |
| HLC-TC-014 | `licencias/HLC-TC-014_fecha_previa_y_agotamiento_exacto.feature` | B (validación en vivo, sin exploración aparte) | 2026-10-20 | 2 (HLC-TC-014-01 APPLY, HLC-TC-014-02 ASSIGN) | PASÓ 2/2 en 2 corridas consecutivas | `reports/2026-10-20_23-21-26/` | **Certificado** (2026-10-20) | Sin frases nuevas (mismas de HLC-TC-006). Resultado observable igual a HLC-TC-006, como indica el caso. En la corrida 1 la fila APPLY tardó 51 s (lentitud puntual de la demo) sin afectar el resultado |
