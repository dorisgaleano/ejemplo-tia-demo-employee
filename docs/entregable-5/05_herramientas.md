# 5. Evaluación de herramientas de IA para testing

Objetivo del requisito: *evaluación comparativa de al menos 2 herramientas de IA para testing.*

Resultado: cuatro herramientas comparadas con criterios ponderados, y **una de ellas ya
probada sobre este repositorio**, lo que cambia por completo la naturaleza de la evaluación: no
es una lista de características leídas en una web, es una decisión con evidencia.

---

## 5.1 Contexto que define los pesos

Los pesos salen del proyecto, no de una plantilla:

- Suite en **JavaScript** (Cucumber 13 + Playwright 1.63), no Java ni Python.
- Equipo **pequeño** y calendario académico: la curva de aprendizaje pesa.
- **Ambiente de demo público y compartido**: la estabilidad de las comparaciones es crítica.
- Sin presupuesto de licencias: el costo es un criterio real, no decorativo.
- La suite funcional **ya funciona**; lo que falta es la capa visual, no reemplazar nada.

De ahí los pesos: integración y calidad de la IA visual al 25 % cada una; costo y gestión de
baselines al 15 %; reportes y curva de aprendizaje al 10 %.

---

## 5.2 Matriz ponderada

Puntaje 1–5. Total = Σ (puntaje × peso).

| Criterio | Peso | Percy | Applitools Eyes | Mabl | Testim |
|---|---|---|---|---|---|
| Integración con Playwright + Cucumber | 25 % | **5** | 4 | 3 | 3 |
| Calidad de la IA visual (layout, regiones) | 25 % | 3 | **5** | 3 | 3 |
| Gestión de baselines y aprobación | 15 % | 4 | **5** | 4 | 4 |
| Costo para un equipo pequeño | 15 % | **5** | 2 | 2 | 2 |
| Trazabilidad y reportes | 10 % | 3 | **5** | 4 | 4 |
| Curva de aprendizaje | 10 % | **5** | 3 | 3 | 3 |
| **Total ponderado** | 100 % | **4,15** | 4,10 | 3,10 | 3,10 |

### Justificación de cada puntaje

**Percy — 4,15**

| Criterio | Puntaje | Por qué (con evidencia del repo) |
|---|---|---|
| Integración | 5 | `percySnapshot(page, nombre, opts)` funciona dentro del `page` de Playwright que la suite ya usa. Se integró sin cambiar la arquitectura: 3 archivos nuevos, 0 modificados. |
| IA visual | 3 | Compara con tolerancia, no entiende de layout. Obliga a mantener `ignoreRegions` a mano: en este proyecto hubo que declarar `.oxd-table-body`, `.oxd-grid-item`, `.oxd-toast` por pantalla. |
| Baselines | 4 | Flujo de aprobación claro por build; el nombre del snapshot es la identidad de la pantalla, lo que es simple y a la vez un riesgo (si cambia el nombre, se pierde el histórico). |
| Costo | 5 | Tiene plan gratuito suficiente para 7 pantallas y varios builds; el token vive en `.env`, nunca en el repo. |
| Reportes | 3 | El build muestra el diff, pero no da métricas propias del proyecto (cobertura visual, tendencia). |
| Curva | 5 | Un desarrollador lo tiene funcionando en una tarde. |

**Applitools Eyes — 4,10**

| Criterio | Puntaje | Por qué |
|---|---|---|
| Integración | 4 | SDK sólido para Playwright, pero la configuración con Cucumber es más verbosa (configuración por batch, `eyes.open/check/close` en hooks). |
| IA visual | 5 | Su motor compara estructura y contenido, no píxeles: ignora regiones dinámicas sin dibujarlas. Es la mejor calidad de las cuatro y resolvería el problema que aquí se resolvió a mano. |
| Baselines | 5 | Gestión por rama, aprobación por lote, historial por componente. |
| Costo | 2 | Licencia por usuario/checkpoint; para un equipo académico es la barrera principal. |
| Reportes | 5 | Los mejores del grupo: diff con causa, agrupación por componente. |
| Curva | 3 | Media: hay que entender su modelo de batches para no duplicar snapshots. |

**Mabl — 3,10 y Testim — 3,10**

| Criterio | Puntaje | Por qué |
|---|---|---|
| Integración | 3 / 3 | Son plataformas de autoría de pruebas, no una capa de comparación visual sobre el código existente. Adoptarlas implica migrar la suite, no extenderla. |
| IA visual | 3 / 3 | Su IA es de *self-healing* de selectores, un problema distinto (y real, pero no el que pide este requisito). |
| Baselines | 4 / 4 | Buenos, dentro de su modelo de nube. |
| Costo | 2 / 2 | Licencia por plataforma completa. |
| Reportes | 4 / 4 | Completos, orientados a negocio. |
| Curva | 3 / 3 | Alta: hay que aprender su IDE/editor de pruebas. |

**Nota sobre precios:** no se citan cifras porque cambian y varían por región y volumen. La
columna de costo es una valoración relativa, declarada como tal.

---

## 5.3 Lo que se aprendió probando Percy de verdad

Una tabla de puntajes no captura esto, y es lo más útil del componente:

**1. La IA visual no adivina qué es volátil.** En la primera corrida se enmascaró
`.oxd-grid-item` en la captura local y **el dashboard entero quedó tapado**, porque toda su
rejilla son elementos de ese tipo. La conclusión no es "Percy es malo": es que la herramienta
necesita que alguien le diga qué mirar, y ese trabajo es del equipo. Un producto con matching
estructural (Applitools) reduciría ese trabajo, no lo eliminaría.

**2. El nombre del snapshot es el diseño.** Con nombres derivados de la corrida
(`HLC-TC-004-01`), Percy crea pantallas nuevas en lugar de comparar. Con nombres de pantalla
(`01-login`) el histórico tiene sentido. Es una decisión de diseño de la suite, no de la
herramienta.

**3. La herramienta no reemplaza el juicio sobre el ruido.** Se midió el ruido real: dos
corridas sin cambios dan **0,000 % en 6 pantallas y 0,042 % en el dashboard**. Ese 0,042 % es
el reloj del widget. Sin esa medición, cualquier discusión sobre "diffs falsos" era opinión.

**4. Sin servicio, la suite se queda muda.** Se añadió `comparar-visual.py` (diferencia de
píxeles con umbral) como respaldo: funciona offline, no tiene IA y no gestiona baselines, pero
mantiene la evidencia y permitió demostrar la detección sin token. Es exactamente la diferencia
entre "depender de un proveedor" y "depender de un proveedor para la comodidad".

---

## 5.4 Veredicto

> **Percy para este proyecto**, por integración ya probada sobre Playwright + Cucumber y por
> costo. Es la decisión que ya está implementada en el repositorio y funciona en 17 s.

**Cambiaría de veredicto si:**

- la organización pudiera asumir la licencia y necesitara precisión visual real (layouts
  complejos, componentes que se mueven): **Applitools**, sin dudarlo, por matching estructural;
- el dolor principal fuera el mantenimiento de selectores y no la comparación de pantallas:
  **Mabl o Testim**, sabiendo que implican migrar la suite;
- se necesitara correr sin internet o sin proveedor: **Percy con el respaldo local** que ya
  está implementado, aceptando que sin servicio no hay baselines históricos.

Un veredicto con condiciones es más útil que uno absoluto, y en este caso las condiciones salen
de haber usado la herramienta, no de leer su página de características.

---

## 5.5 Conclusión del componente

Se compararon cuatro herramientas con pesos derivados del proyecto, y una de ellas está
**integrada, ejecutada y medida** en el repositorio. La diferencia frente a una comparación
teórica está en la sección 5.3: los tres aprendizajes que solo aparecen al usarla, incluido el
más incómodo —que la calidad de una prueba visual depende más de lo que el equipo decide
ignorar que de la IA de la herramienta.

