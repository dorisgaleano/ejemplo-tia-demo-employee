# handleLeaveCreate — Automatización de pruebas del módulo Leave (OrangeHRM)

Suite de pruebas automatizadas del flujo **handleLeaveCreate** del módulo **Leave** de
OrangeHRM, con BDD (Cucumber), Screenplay + Page Object Model sobre Playwright, datos
parametrizados en Excel y evidencias por paso.

Incluye además los componentes del **Entregable 5 — Testing Potenciado con IA**: regresión
visual, datos sintéticos, Test Impact Analysis y análisis de defectos con ML.

| | |
|---|---|
| **SUT** | OrangeHRM OS 5.9 — demo pública `https://opensource-demo.orangehrmlive.com` |
| **Casos** | 9 casos certificados / 14 escenarios (ver [`docs/CERTIFICACION.md`](docs/CERTIFICACION.md)) |
| **Stack** | Node.js ≥ 20 · Cucumber 13 · Playwright 1.63 · Screenplay + POM · Percy |
| **Entregable 5** | [`docs/entregable-5/00_README.md`](docs/entregable-5/00_README.md) |

---

## Estructura

```
├── features/licencias/          Features fuente (documentación viva) con datos de ejemplo
├── data/input/
│   ├── datos_pruebas.xlsx       Excel manual: una hoja por caso
│   └── ia/                      Dataset sintético + esquema exportado del registro
├── docs/
│   ├── CERTIFICACION.md         Bitácora de certificación caso por caso
│   └── entregable-5/            Los seis componentes del Entregable 5 + evidencias
├── ml/                          Generación de datos y análisis de defectos (Python)
├── scripts/                     prepare-data, reporte, TIA, validación y comparación visual
├── src/
│   ├── api/                     Cliente REST del módulo Leave
│   ├── config/                  Ambiente, rutas y timeouts
│   ├── controller/              Lectura, validación y generación de escenarios
│   ├── pages/                   Page Objects
│   ├── registry/                Casos, columnas y matriz de impacto (TIA)
│   ├── screenplay/              Actor, habilidades, tareas y preguntas
│   ├── steps/                   Definiciones de pasos
│   ├── support/                 Hooks y World
│   ├── utils/                   Fechas y aserciones
│   └── visual/                  Suite de regresión visual (independiente de Cucumber)
└── ejecutar_pruebas.bat         Menú de ejecución para Windows
```

---

## Puesta en marcha

```bash
npm install
npx playwright install chromium

cp .env.example .env       # completar E2E_USER y E2E_PASSWORD
```

`.env` **nunca** se versiona: contiene la clave del usuario de prueba. `.gitignore` lo excluye.

```ini
BASE_URL=https://opensource-demo.orangehrmlive.com
E2E_USER=Admin
E2E_PASSWORD=********
SEMANAS_ADELANTE=0         # sube a 1, 2… si otro usuario ocupó LUN/MAR en la demo
PERCY_TOKEN=               # solo para la suite visual con Percy
```

---

## Ejecución

### Suite funcional (Cucumber)

```bash
npm run dryrun             # valida que cada paso tenga su definición, sin navegador
npm test                   # ejecuta las filas con Ejecutar = SI
npm run test:headed        # con navegador visible
npm run report             # genera el reporte de resultados
```

Cada fila del Excel se convierte en **un escenario independiente**. La corrida se identifica
con un sufijo propio (`QA-HLC-*`) y un bloqueo en `.run/lock.json` impide dos ejecuciones
simultáneas.

### Suite visual (Entregable 5)

```bash
npm run test:visual                     # 7 pantallas, capturas locales
npm run test:visual:percy               # ídem + snapshot en Percy (requiere PERCY_TOKEN)
node src/visual/run.js --lista          # catálogo de pantallas
node src/visual/run.js --solo=05-my-leave --headed
```

No comparte estado con la suite funcional: no toca `.run/`, no crea datos y puede correr en
paralelo.

### Datos sintéticos con IA

```bash
node scripts/exportar-esquema.js        # esquema desde src/registry/cases.js
python3 ml/generar_datos_ia.py          # 30 filas → data/input/ia/datos_pruebas_ia.xlsx
npm run validar-datos-ia                # valida con el validador real de la suite
```

### Test Impact Analysis

```bash
npm run tia                                   # git diff HEAD~1
npm run tia -- --base=origin/main             # contra otra referencia
npm run tia -- --files=src/pages/ApplyLeavePage.js
```

Imprime el `FILTRO_TAG` que consumen `cucumber.mjs` y la opción 4 del menú `.bat`.

### Análisis de defectos (Python)

```bash
pip install pandas scikit-learn matplotlib pillow
python3 ml/construir_defectos.py
python3 ml/analisis_defectos.py         # salidas en ml/salida/
```

---

## Datos de prueba

El Excel es la entrada de la suite: una hoja por caso, con las columnas que declara
`src/registry/columns.js`. Antes de abrir el navegador, `prepare-data` valida:

- una hoja por caso registrado y ninguna desconocida,
- columnas obligatorias y las que usan los `Ejemplos:` del feature,
- `IdFila` con el prefijo del caso y sin duplicados,
- `Modo` ∈ {APPLY, ASSIGN},
- fechas como tokens (`LUN`, `MAR`, `INICIO_PERIODO`, `FIN_PERIODO`, desplazamientos, `AAAA-MM-DD`),
- días numéricos y `SaldoEsperado` numérico o `<=0`.

Si algo falla, la corrida se detiene **antes** de crear datos y muestra hoja, fila y columna.

---

## Evidencias

Cada corrida deja en `reports/<corrida>/`:

- reporte HTML y JSON de Cucumber,
- una captura por paso con las contraseñas enmascaradas,
- video y `trace.zip` por fila,
- `resultados.xlsx` con el consolidado.

La suite visual deja `reports/visual/<corrida>/` con un PNG por pantalla y `registro.json`.
Las evidencias que acompañan al Entregable 5 están versionadas en
`docs/entregable-5/evidencias/`.

---

## Menú de Windows

`ejecutar_pruebas.bat` ofrece ejecutar todo, un caso, una fila o por tag; abrir el último
reporte, las evidencias o el trace; y abrir la plantilla de Excel. Instala dependencias la
primera vez y valida el Excel antes de cada corrida.

---

## Convenciones del código

- Comentarios y mensajes en español; identificadores de dominio en español (`Fila`, `Corrida`,
  `Cupo`), nombres de API en inglés.
- Cada archivo declara su capa (`config`, `controller`, `pages`, `screenplay`, `support`,
  `visual`).
- Los Page Objects contienen **solo locators**: sin acciones ni aserciones.
- Las aserciones viven en `questions/` (Screenplay); las acciones, en `tasks/`.
- Los errores se escriben para el usuario final: qué columna, qué valor y qué se esperaba.

