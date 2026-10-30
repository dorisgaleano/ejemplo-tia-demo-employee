# 1. Pruebas visuales con IA

Objetivo del requisito: *implementar pruebas de regresión visual usando Percy u otra
herramienta de Visual AI Testing sobre al menos 5 pantallas del módulo.*

Resultado: **7 pantallas** con snapshot estable, suite independiente de Cucumber, Percy
integrado y detección de regresión demostrada con mediciones reales.

---

## 1.1 Punto de partida: lo que había no era una prueba visual

El repositorio ya tenía `@percy/playwright`, `PERCY_TOKEN` en `.env.example` y un snapshot en
el hook `After` de `src/support/hooks.js`. Eso **no** cumple el requisito, por cuatro razones
concretas:

| Lo que había | Por qué no sirve como regresión visual |
|---|---|
| Un snapshot por *fila* de Excel, llamado con el `IdFila` | El nombre cambia con cada corrida: Percy crea una pantalla nueva en vez de comparar contra el baseline |
| Se disparaba al final del escenario | Captura el estado tras la limpieza de datos, no la pantalla que se quiere vigilar |
| Sin `ignoreRegions` ni enmascarado de datos | Cada corrida produce diffs falsos por saldos, fechas y filas de la demo compartida |
| Mezclado con la suite funcional | Un fallo de Percy se confunde con un fallo de negocio y viceversa |

Se conserva el snapshot de `hooks.js` como **evidencia de ejecución** (que es para lo que
sirve) y se añade una suite visual aparte.

---

## 1.2 Diseño de la suite

Tres archivos, cada uno con una responsabilidad:

| Archivo | Responsabilidad |
|---|---|
| `src/visual/screens.js` | Catálogo: nombre estable, ruta, encabezado esperado y regiones a ignorar |
| `src/visual/snapshot.js` | Prepara la pantalla (espera, congela animaciones) y captura |
| `src/visual/run.js` | Orquesta: login una vez, recorre el catálogo, escribe registro y evidencias |

### Las 7 pantallas

Rutas verificadas contra la demo (todas responden 200 y su encabezado coincide):

| # | Pantalla | Ruta | Por qué está |
|---|---|---|---|
| 01 | Login | `/web/index.php/auth/login` | Una regresión aquí bloquea toda la suite |
| 02 | Dashboard | `/web/index.php/dashboard/index` | Widgets y maquetación de la vista de aterrizaje |
| 03 | Apply Leave | `/web/index.php/leave/applyLeave` | Formulario principal del módulo |
| 04 | Assign Leave | `/web/index.php/leave/assignLeave` | Autocompletado de empleado y confirmación |
| 05 | My Leave | `/web/index.php/leave/viewMyLeaveList` | Lista con filtros, estados y paginación |
| 06 | Leave List | `/web/index.php/leave/viewLeaveList` | Vista administrativa, más columnas |
| 07 | Leave Types | `/web/index.php/leave/leaveTypeList` | Configuración donde viven los tipos QA-HLC-* |

Cinco de ellas son del módulo Leave; login y dashboard completan el recorrido del flujo.

### Tres decisiones que hacen que funcione

**1. El nombre del snapshot es la identidad de la pantalla.**
`01-login`, no `login-2026-10-23T20-58`. Si el nombre cambia, Percy crea una pantalla nueva y
el histórico de comparación desaparece aunque el reporte se vea lleno.

**2. Congelar animaciones antes de capturar.**
`* { animation: none; transition: none }` se inyecta tanto en Percy (`percyCSS`) como en la
captura local (`addStyleTag`). Sin esto, la mitad de los snapshots difieren por *timing* y no
por un defecto.

**3. Ignorar, no tapar, lo volátil.**
Primera versión: se enmascaraba `.oxd-table-body` y `.oxd-grid-item` en la captura local. El
resultado fue inservible — el dashboard entero quedó cubierto por un rectángulo porque toda su
rejilla son `.oxd-grid-item`. Decisión final:

- **`ignoreRegions` (Percy)**: excluye de la comparación, deja el píxel visible.
- **Máscara (captura local)**: solo contraseñas y el bloque de credenciales de demo de
  `.orangehrm-demo-credentials`.

La demo imprime `Username: Admin / Password: admin123` en el propio formulario: enmascarar el
campo de contraseña y no ese bloque habría sido un enmascarado decorativo.

---

## 1.3 Ejecución y evidencias

```
npm run test:visual          → 7/7 pantallas, 17,2 s
npm run test:visual:percy    → lo mismo + snapshot en Percy (requiere PERCY_TOKEN)
node src/visual/run.js --lista
node src/visual/run.js --solo=05-my-leave --headed
```

Salida real de la corrida (`evidencias/visual/baseline/registro.json`):

| Pantalla | Estado | Tiempo |
|---|---|---|
| 01-login | PASÓ | 2.683 ms |
| 02-dashboard | PASÓ | 4.110 ms |
| 03-apply-leave | PASÓ | 2.246 ms |
| 04-assign-leave | PASÓ | 2.084 ms |
| 05-my-leave | PASÓ | 2.217 ms |
| 06-leave-list | PASÓ | 2.100 ms |
| 07-leave-types | PASÓ | 1.801 ms |

**Total: 7 de 7, 17,2 s.** Las capturas están en `evidencias/visual/baseline/`.

---

## 1.4 La prueba de que la regresión visual detecta algo

Subir siete capturas no demuestra nada. Se hicieron **tres corridas** y se compararon con
`scripts/comparar-visual.py` (diferencia de píxeles con umbral 12 para no contar antialiasing):

| Comparación | Qué mide | Resultado |
|---|---|---|
| A → B (dos corridas sin cambios) | **Ruido** de la demo | 6 pantallas al **0,000 %**; dashboard al **0,042 %** |
| A → C (con un cambio de estilo inyectado) | **Detección** | **5 de 7** pantallas marcadas |

### Ruido: 0,000 % en seis pantallas

Con las animaciones congeladas y las regiones volátiles fuera, dos corridas seguidas son
idénticas. El único píxel que se mueve es el del widget de reloj del dashboard (0,042 %), que
es exactamente la razón por la que `.oxd-grid-item` está en `ignoreRegions`.

### Detección: 5 de 7 con un cambio controlado

Cambio inyectado (simula una regresión de maquetación real, no un rediseño):

```css
.oxd-form .oxd-grid-item { margin-top: 7px !important; }
.oxd-form .oxd-input-group { padding-bottom: 5px !important; }
```

| Pantalla | Cambio detectado |
|---|---|
| 01-login | **2,356 %** |
| 02-dashboard | 0,096 % |
| 03-apply-leave | 0,000 % |
| 04-assign-leave | **2,691 %** |
| 05-my-leave | **4,837 %** |
| 06-leave-list | **7,544 %** |
| 07-leave-types | 0,000 % |

Las dos pantallas en 0,000 % **no son un fallo del comparador**, y explicarlo es parte del
análisis:

- **03-apply-leave** renderiza el estado vacío ("No Leave Types with Leave Balance"): el
  usuario Admin no tiene cupos elegibles en la demo, así que no hay formulario que desplazar.
  Es una limitación real de la pantalla y está en la sección 1.6 con su corrección.
- **07-leave-types** es una tabla sin grupos de formulario: el selector inyectado no existe ahí.

Las imágenes de diferencia (rojo = cambió) están en `evidencias/visual/regresion/`.

---

## 1.5 Estado de Percy y qué falta para cerrar el ciclo

Percy está **integrado y ejecutable**, pero los baselines no se aprobaron en esta entrega
porque el repositorio no tiene `PERCY_TOKEN` (y no debe tenerlo). Lo que sí está hecho:

- `.percy.yml` con ancho fijo 1366 (un ancho variable multiplica las pantallas sin agregar
  cobertura).
- `percySnapshot()` con `percyCSS`, `widths` e `ignoreRegions` por pantalla.
- Gate `percyActivo()`: sin token o sin `percy exec`, la suite no intenta nada y la captura
  local sigue siendo evidencia válida.

**Para cerrar el ciclo** (15 minutos): poner el token en `.env`, ejecutar
`npm run test:visual:percy`, aprobar los 7 snapshots en Percy, repetir con el CSS inyectado y
guardar la captura del build donde Percy marca la diferencia. Los tres builds quedan entonces
como evidencia primaria y `comparar-visual.py` pasa a ser el respaldo offline.

---

## 1.6 Limitación encontrada y su corrección

`03-apply-leave` captura el estado vacío porque el Admin de la demo no tiene tipos de licencia
con saldo. La suite visual, a diferencia de la funcional y la de datos, **no prepara datos**:
solo navega.

Corrección concreta (una tarea de preparación antes de la captura, reutilizando lo que ya
existe):

```js
// src/visual/run.js, antes de capturar 03-apply-leave
const api = CallOrangeApi.as(actor);
const id = await LeaveApi.createLeaveType(api, 'QA-VISUAL');
cleanup.register(`Eliminar tipo ${id}`, () => LeaveApi.deleteLeaveTypes(api, [id]));
// …y un cupo con saldo vigente para el empleado vinculado al Admin
```

Con eso la pantalla muestra el formulario completo. No se ejecutó en esta entrega para no
crear datos en la demo pública sin necesidad; queda como mejora de una línea en el documento y
en el código.

---

## 1.7 Conclusión del componente

El requisito pedía 5 pantallas con IA visual. Se entregaron **7 pantallas estables**, con
Percy integrado y con algo que la mayoría de los entregables no trae: **medición del ruido y
demostración de detección con cifras**. La suite visual corre en 17 segundos y no interfiere
con la funcional (no toca `.run/`, no crea datos, no toma el bloqueo de ejecución).

