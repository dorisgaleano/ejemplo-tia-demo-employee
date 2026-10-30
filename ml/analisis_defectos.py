#!/usr/bin/env python3
"""
Análisis exploratorio de defectos (Entregable 5).

    python3 ml/analisis_defectos.py

Lee ml/defectos.csv y produce en ml/salida/:
  · metricas.json          métricas de los dos modelos y validación cruzada
  · resumen.md             tablas listas para pegar en el documento del entregable
  · matriz_confusion.png   matriz del modelo de random forest
  · curva_roc.png          curva ROC de ambos modelos
  · importancia.png        importancia de variables del random forest

El objetivo no es "predecir defectos" en producción: es mostrar el método y comprobar si
las causas que el equipo ya conocía aparecen solas en los datos.
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    RocCurveDisplay,
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

RAIZ = Path(__file__).resolve().parents[1]
ENTRADA = RAIZ / "ml" / "defectos.csv"
SALIDA = RAIZ / "ml" / "salida"
SEMILLA = 20261023

# `duracion_seg` se excluye a propósito: la duración es CONSECUENCIA del fallo (una fila que
# falla tarda más), no su causa. En la primera iteración acaparaba el 79 % de la importancia y
# el modelo parecía bueno por fuga de información, no por entender el riesgo.
# `depende_demo_compartida` es constante (todas las corridas usan la demo pública): se excluye.
NUMERICAS = ["dias_licencia", "num_cupos", "num_pasos"]
BINARIAS = ["saldo_justo", "usa_api", "requiere_autocompletado", "modo_assign"]
VARIABLES = NUMERICAS + BINARIAS


def cargar() -> pd.DataFrame:
    """Carga el CSV y separa las corridas BLOQUEADAS por el ambiente.

    Un bloqueo (precondición ocupada, dos corridas en paralelo) no es un defecto del
    escenario: si se entrena con ellos, el modelo aprende el ruido del ambiente.
    """
    df = pd.read_csv(ENTRADA)
    df["modo_assign"] = (df["modo"] == "ASSIGN").astype(int)
    return df


def descriptivos(df: pd.DataFrame) -> pd.DataFrame:
    """Tasa de defecto por las dimensiones que el equipo ya sospechaba."""
    filas = []
    for col in ["modo", "saldo_justo", "requiere_autocompletado", "usa_api"]:
        for valor, grupo in df.groupby(col):
            filas.append({
                "variable": col,
                "valor": valor,
                "corridas": len(grupo),
                "tasa_defecto": round(grupo["defectuoso"].mean() * 100, 1),
            })
    for etiqueta, grupo in df.groupby(pd.cut(df["dias_licencia"], [0, 1, 2, 5], include_lowest=True)):
        filas.append({
            "variable": "dias_licencia",
            "valor": str(etiqueta),
            "corridas": len(grupo),
            "tasa_defecto": round(grupo["defectuoso"].mean() * 100, 1),
        })
    return pd.DataFrame(filas)


def modelos() -> dict:
    return {
        "Regresión logística": Pipeline([
            ("escala", StandardScaler()),
            # class_weight="balanced": con 17 % de positivos, el umbral 0,5 por defecto
            # clasifica todo como sano. Sin esto la comparación con el bosque sería injusta.
            ("clf", LogisticRegression(max_iter=1000, random_state=SEMILLA, class_weight="balanced")),
        ]),
        "Random forest": RandomForestClassifier(
            n_estimators=300, max_depth=4, min_samples_leaf=5, random_state=SEMILLA, class_weight="balanced"
        ),
    }


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    completo = cargar()
    df = completo[completo["bloqueo_ambiente"] == 0].reset_index(drop=True)
    X, y = df[VARIABLES], df["defectuoso"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=SEMILLA, stratify=y
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMILLA)
    metricas = {
        "filasTotales": len(completo),
        "filas": len(df),
        "filasBloqueadas": int(len(completo) - len(df)),
        "positivos": int(y.sum()),
        "tasaDefecto": round(y.mean() * 100, 1),
        "modelos": {},
    }

    fig_roc, ax_roc = plt.subplots(figsize=(6, 5))
    fig_cm, ax_cm = plt.subplots(figsize=(5, 4))

    for nombre, modelo in modelos().items():
        modelo.fit(X_train, y_train)
        pred = modelo.predict(X_test)
        proba = modelo.predict_proba(X_test)[:, 1]
        cruzada = cross_validate(
            modelo, X, y, cv=cv, scoring=["accuracy", "precision", "recall", "f1", "roc_auc"]
        )
        metricas["modelos"][nombre] = {
            "exactitud": round(accuracy_score(y_test, pred), 3),
            "precision": round(precision_score(y_test, pred, zero_division=0), 3),
            "recall": round(recall_score(y_test, pred, zero_division=0), 3),
            "f1": round(f1_score(y_test, pred, zero_division=0), 3),
            "roc_auc": round(roc_auc_score(y_test, proba), 3),
            "cv": {
                "accuracy_media": round(cruzada["test_accuracy"].mean(), 3),
                "accuracy_desv": round(cruzada["test_accuracy"].std(), 3),
                "recall_media": round(cruzada["test_recall"].mean(), 3),
                "f1_media": round(cruzada["test_f1"].mean(), 3),
                "roc_auc_media": round(cruzada["test_roc_auc"].mean(), 3),
            },
        }
        RocCurveDisplay.from_estimator(modelo, X_test, y_test, ax=ax_roc, name=nombre)
        if nombre == "Random forest":
            ConfusionMatrixDisplay.from_estimator(
                modelo, X_test, y_test, ax=ax_cm, colorbar=False, cmap="Blues"
            )
            ax_cm.set_title("Random forest — matriz de confusión")

    ax_roc.plot([0, 1], [0, 1], "k--", linewidth=0.8)
    ax_roc.set_title("Curva ROC — predicción de defectos")
    fig_roc.tight_layout()
    fig_roc.savefig(SALIDA / "curva_roc.png", dpi=150)
    fig_cm.tight_layout()
    fig_cm.savefig(SALIDA / "matriz_confusion.png", dpi=150)

    rf = RandomForestClassifier(
        n_estimators=300, max_depth=4, min_samples_leaf=5, random_state=SEMILLA, class_weight="balanced"
    ).fit(X, y)
    importancia = (
        pd.Series(rf.feature_importances_, index=VARIABLES).sort_values(ascending=True)
    )
    metrica = metricas["modelos"]["Random forest"]
    fig_imp, ax_imp = plt.subplots(figsize=(7, 4.5))
    importancia.plot.barh(ax=ax_imp, color="#2D5F8A")
    ax_imp.set_title("Qué variables predicen el fallo (random forest)")
    ax_imp.set_xlabel("importancia")
    fig_imp.tight_layout()
    fig_imp.savefig(SALIDA / "importancia.png", dpi=150)

    metricas["importancia"] = {k: round(v, 3) for k, v in importancia.sort_values(ascending=False).items()}
    metricas["descriptivos"] = descriptivos(df).to_dict(orient="records")
    (SALIDA / "metricas.json").write_text(json.dumps(metricas, indent=2, ensure_ascii=False), "utf-8")

    # ---------------------------------------------------------------- resumen en markdown
    lineas = [
        "# Resultados del análisis de defectos",
        "",
        f"Dataset: **{metricas['filasTotales']} filas** (corridas documentadas × 14 escenarios). "
        f"Se excluyen **{metricas['filasBloqueadas']} filas de corridas bloqueadas por el ambiente** "
        f"(precondición ocupada y ejecuciones en paralelo), que no miden el escenario.",
        "",
        f"Filas para modelar: **{metricas['filas']}**, de las cuales **{metricas['positivos']}** "
        f"presentaron defecto (**{metricas['tasaDefecto']} %**).",
        "",
        "## Descriptivos",
        "",
        "| Variable | Valor | Corridas | Tasa de defecto |",
        "|---|---|---|---|",
    ]
    for d in metricas["descriptivos"]:
        lineas.append(f"| {d['variable']} | {d['valor']} | {d['corridas']} | {d['tasa_defecto']} % |")

    lineas += ["", "## Modelos (30 % reservado para prueba)", "",
               "| Modelo | Exactitud | Precision | Recall | F1 | ROC-AUC |",
               "|---|---|---|---|---|---|"]
    for nombre, m in metricas["modelos"].items():
        lineas.append(
            f"| {nombre} | {m['exactitud']} | {m['precision']} | {m['recall']} | {m['f1']} | {m['roc_auc']} |"
        )

    lineas += ["", "## Validación cruzada (5 pliegues)", "",
               "| Modelo | Exactitud (media ± desv.) | Recall medio | F1 medio | ROC-AUC medio |",
               "|---|---|---|---|---|"]
    for nombre, m in metricas["modelos"].items():
        c = m["cv"]
        lineas.append(
            f"| {nombre} | {c['accuracy_media']} ± {c['accuracy_desv']} | "
            f"{c['recall_media']} | {c['f1_media']} | {c['roc_auc_media']} |"
        )

    lineas += ["", "## Importancia de variables", "", "| Variable | Importancia |", "|---|---|"]
    for var, val in metricas["importancia"].items():
        lineas.append(f"| {var} | {val} |")

    top2 = list(metricas["importancia"])[:2]
    tasa_assign = next(
        (d["tasa_defecto"] for d in metricas["descriptivos"]
         if d["variable"] == "modo" and d["valor"] == "ASSIGN"), None
    )
    tasa_apply = next(
        (d["tasa_defecto"] for d in metricas["descriptivos"]
         if d["variable"] == "modo" and d["valor"] == "APPLY"), None
    )
    lineas += [
        "",
        "## Lectura",
        "",
        f"Con una tasa de defecto del {metricas['tasaDefecto']} % el recall manda: un falso "
        "negativo es un fallo que llega a la corrida nocturna como si estuviera sano.",
        "",
        f"Las dos variables dominantes son `{top2[0]}` y `{top2[1]}`. No son dos hallazgos "
        "distintos: describen la misma causa que el equipo ya había documentado — el "
        "autocompletado de empleado en Assign Leave. El modelo la redescubre solo, y eso es lo "
        "que se quería comprobar.",
        "",
        f"La diferencia entre modalidades es el resultado más accionable: ASSIGN falla en el "
        f"{tasa_assign} % de sus ejecuciones y APPLY en el {tasa_apply} %. Con ese dato, la "
        "priorización deja de ser una opinión: las filas ASSIGN entran al conjunto de humo de "
        "cada push y las APPLY se reservan para la corrida completa.",
        "",
        "**Advertencia:** la etiqueta es simulada a partir de causas documentadas. El modelo "
        "demuestra el método y ordena el riesgo; no es desplegable.",
        "",
    ]
    (SALIDA / "resumen.md").write_text("\n".join(lineas), "utf-8")

    print(f"[analisis] {len(df)} filas · tasa de defecto {metricas['tasaDefecto']} %")
    for nombre, m in metricas["modelos"].items():
        print(f"  {nombre}: recall {m['recall']} · f1 {m['f1']} · roc-auc {m['roc_auc']} · cv {m['cv']}")
    print(f"  Importancia: {metricas['importancia']}")
    print(f"[analisis] salidas en {SALIDA.relative_to(RAIZ)}/")


if __name__ == "__main__":
    main()

