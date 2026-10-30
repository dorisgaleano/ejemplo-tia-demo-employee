# 2. Generación inteligente de datos de prueba

Objetivo del requisito: *usar IA generativa para crear datasets de prueba realistas para el
módulo y compararlos con los generados en la etapa de diseño.*

Resultado: un dataset de **30 filas** que el validador propio de la suite acepta **al 100 %**,
comparado contra el set manual (14 filas) y contra una **primera iteración sin esquema** que
solo sobrevivió al 20 %.

---

## 2.1 La ventaja de este repositorio

Aquí no se compara "datos bonitos contra datos feos". La suite ya tiene un **validador
estricto** que revisa, antes de abrir el navegador:

- que exista una hoja por caso y ninguna hoja desconocida,
- que estén las columnas obligatorias y las que usa cada `Ejemplos:` del feature,
- que `IdFila` empiece por el identificador del caso y no esté repetido,
- que `Modo` sea `APPLY` o `ASSIGN`,
- que las fechas sean tokens válidos (`LUN`, `MAR`, `INICIO_PERIODO+1M`, `AAAA-MM-DD`…),
- que los días sean numéricos y `SaldoEsperado` sea número o `<=0`.

Eso convierte "¿la IA genera buenos datos?" en una **métrica objetiva y reproducible**: cuántas
filas sobreviven al validador real, y por qué caen las que caen.

---

## 2.2 Método

```
node scripts/exportar-esquema.js     → data/input/ia/esquema.json
python3 ml/generar_datos_ia.py       → data/input/ia/datos_pruebas_ia.xlsx
npm run validar-datos-ia             → reports/datos-ia/*.json
```

Dos decisiones de método:

**1. El esquema no se escribe a mano.** Se exporta del registro de casos (`src/registry/cases.js`)
y de la documentación de columnas (`columns.js`). Si mañana cambia el registro, se reexporta y
el generador sigue produciendo un archivo válido sin tocar el script.

**2. El dataset sintético no pisa el manual.** Vive en `data/input/ia/` y se valida con
`scripts/validar-dataset-ia.js`, que usa **el mismo validador** que `prepare-data` pero sin
tocar `.run/` ni tomar el bloqueo de ejecución. El set original queda intacto.

---

## 2.3 El prompt que se usó

```
Actúa como analista de pruebas senior del módulo Leave de OrangeHRM.

Genera filas de datos de prueba para los casos HLC-TC-003, -004, -006, -007, -008,
-009, -010, -011 y -014, respetando EXACTAMENTE estas columnas y este orden:

  [se pega el contenido de data/input/ia/esquema.json]

Reglas del sistema que debes respetar:
1. Las columnas de vigencia (Cupo*_Desde/Hasta) solo aceptan INICIO_PERIODO,
   FIN_PERIODO, LUN, MAR o desplazamientos (INICIO_PERIODO+1M, MAR-1D).
2. Modo es APPLY (solicitar) o ASSIGN (asignar). ASSIGN no rechaza por saldo en la UI:
   consume hasta donde alcanza el cupo y deja saldo negativo.
3. Para un rechazo esperado en APPLY, DiasLicencia debe exceder la suma de cupos
   vigentes que cubren las fechas pedidas.
4. IdFila debe empezar por el identificador de su caso.
5. Incluye al menos 8 combinaciones de borde: saldo exacto, saldo +1 día, saldo -1 día,
   cupo de 0.25, cupo de 0.5 y reparto entre tres cupos con orden FIFO.

Devuelve solo la tabla, sin explicaciones.
```

La diferencia con un prompt ingenuo es todo el punto del ejercicio: sin el esquema y sin las
reglas, el modelo **no puede saber** que `1,5` es inválido ni que el cupo se consume por
vigencia. Esa es exactamente la comparación de la sección 2.5.

---

## 2.4 Qué se generó

30 filas sobre las 9 hojas del registro, con cobertura de bordes deliberada:

| Caso | Filas | Qué cubren |
|---|---|---|
| HLC-TC-003 | 3 | Sin cupo: 1 día, 2 días y saldo negativo de 1 y 2 días |
| HLC-TC-004 | 5 | Saldo sobrado 20/10/5 y **saldo exacto de 1 día** |
| HLC-TC-006 | 4 | Fecha previa con 20 días de cupo; un solo día previo; consumo 1 y 0 |
| HLC-TC-007 | 2 | Fin de cupo en LUN con licencia LUN–MAR |
| HLC-TC-008 | 5 | Cupo 0,5 y **cupo 0,25** (borde inferior), en APPLY y ASSIGN |
| HLC-TC-009 | 2 | Agotamiento exacto con 2 días y con 1 día, `SaldoEsperado = 0` |
| HLC-TC-010 | 2 | Saldo insuficiente por un día, en APPLY (rechazo) y ASSIGN (consume 1) |
| HLC-TC-011 | 4 | Reparto FIFO 0,25/0,25/5, 0,25/0,25/0,5, 0,5/0,25/5 y 0,25/0,5/5 |
| HLC-TC-014 | 3 | Cupo desde MAR con 1 y 2 días de vigencia |

Detalle en `evidencias/datos-ia/datos_pruebas_ia.json`.

---

## 2.5 La comparación

### Resultado del validador real

| Dataset | Filas | Aceptadas | Rechazadas | Tasa de aceptación |
|---|---|---|---|---|
| Manual (etapa de diseño) | 14 | 14 | 0 | **100 %** |
| **IA sin esquema** (iteración 1) | 10 | 2 | 8 | **20 %** |
| **IA con esquema y reglas** (iteración 2) | 30 | 30 | 0 | **100 %** |

### Por qué caía la iteración 1

22 incidencias en 10 filas: 7 de estructura del archivo (6 hojas ausentes y una hoja
inexistente) y **15 de formato de fila**. Los motivos, tal como los devolvió el validador:

| Motivo | Veces |
|---|---|
| `Modo` con valor `SOLICITAR` | 1 |
| `Modo` que el feature no contempla | 1 |
| Fechas en lenguaje natural (`próximo lunes`, `martes`) | 3 |
| Fechas en formato local (`01/11/2026`) | 2 |
| Números con coma decimal o con unidad (`1,5 días`, `1,5`, `dos`) | 3 |
| `IdFila` sin el prefijo del caso | 2 |
| `Descripcion` vacía | 1 |
| Día negativo (`-1`) | 1 |
| Hoja que no corresponde a ningún feature | 1 |

Este es el hallazgo útil del componente: **la IA acierta el contenido y falla el contrato**.
Ninguno de esos errores es de lógica de negocio; todos son de formato y de esquema. Lo que
cambió entre 20 % y 100 % no fue el modelo: fue el prompt.

### Calidad más allá del validador

Una fila puede pasar el validador y no aportar nada. Revisión fila a fila del set generado:

| Aspecto | Manual | IA con esquema |
|---|---|---|
| Filas nuevas respecto al set manual | — | 26 de 30 |
| Bordes que el manual no cubría | — | cupo 0,25; consumo 0 en ASSIGN; 4 variantes FIFO |
| Filas redundantes | 0 | 0 (las 4 que coinciden son intencionales, para comparar) |
| Filas semánticamente inválidas | 0 | 0 |
| Tiempo de producción | ~2 h de diseño manual | ~10 min de generación + 25 min de revisión |

**Caveat honesto:** el set generado es válido para el validador y está pensado para poder
ejecutarse, pero no se ejecutó en la demo en esta entrega (las fechas LUN/MAR dependen de que
otro usuario de la demo no las ocupe). Lo que se mide aquí es la validez del contrato de datos,
no el resultado de las 30 corridas.

---

## 2.6 Cómo se usa

```bash
# Validar el set sintético sin tocar el manual
npm run validar-datos-ia

# Comparar contra el manual
npm run validar-datos-ia -- data/input/datos_pruebas.xlsx

# Si se quiere ejecutar el set sintético: se copia sobre el archivo de entrada
cp data/input/ia/datos_pruebas_ia.xlsx data/input/datos_pruebas.xlsx
npm run prepare-data && npm test
```

El `Instrucciones` del archivo generado declara su procedencia: *"Dataset sintético generado con
IA — no contiene datos de personas reales"*. Un archivo sintético que parece real y no lo dice
es un problema ético y operativo; ver `06_etica.md`.

---

## 2.7 Conclusión del componente

Se generaron 30 filas que el sistema acepta sin una sola corrección, con cobertura de bordes
que el set manual no tenía. La comparación contra la iteración sin reglas (20 % → 100 %) es la
evidencia de algo más útil que "la IA funcionó": **el prompt con el contrato de datos es el
entregable**, y sin él la IA produce filas plausibles que el sistema rechaza en masa.

