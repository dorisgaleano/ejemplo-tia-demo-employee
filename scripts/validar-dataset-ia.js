/**
 * @file Valida un Excel de datos contra los features y el registro, con el MISMO validador
 * que usa prepare-data. Sirve para comparar el set manual con el generado por IA sin tocar
 * data/input/datos_pruebas.xlsx.
 * Capa: scripts (solo lectura; no escribe .run/ ni toma el bloqueo de ejecución).
 *
 *   node scripts/validar-dataset-ia.js                         set generado por IA
 *   node scripts/validar-dataset-ia.js data/input/datos_pruebas.xlsx   set manual
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, ROOT_DIR } from '../src/config/env.js';
import { readWorkbook } from '../src/controller/excel-reader.js';
import { parseFeatures } from '../src/controller/feature-parser.js';
import { NON_CASE_SHEETS, formatErrors, validate } from '../src/controller/validator.js';
import { CASES } from '../src/registry/cases.js';

const relativo = process.argv[2] ?? path.join('data', 'input', 'ia', 'datos_pruebas_ia.xlsx');
const archivo = path.isAbsolute(relativo) ? relativo : path.join(ROOT_DIR, relativo);

if (!fs.existsSync(archivo)) {
  console.error(`[validar] No existe el archivo: ${relativo}`);
  process.exit(1);
}

const sheets = await readWorkbook(archivo);
const features = parseFeatures(PATHS.featuresSource);
const errores = validate(/** @type {any} */ (sheets), features, CASES);

// Filas evaluables = las que tienen IdFila (las vacías del Excel no cuentan).
const filas = /** @type {any} */ (sheets)
  .filter((s) => !NON_CASE_SHEETS.includes(s.name))
  .flatMap((s) => s.rows.filter((r) => r.values.IdFila).map((r) => ({ hoja: s.name, fila: r.filaExcel, id: r.values.IdFila })));

const filasConError = new Set(errores.filter((e) => e.fila).map((e) => `${e.hoja}#${e.fila}`));
const aceptadas = filas.filter((f) => !filasConError.has(`${f.hoja}#${f.fila}`));
const rechazadas = filas.filter((f) => filasConError.has(`${f.hoja}#${f.fila}`));

/** Motivo agrupado: se queda con la columna y el tipo de mensaje para poder contarlos. */
const motivos = new Map();
for (const e of errores.filter((x) => x.fila)) {
  const clave = e.columna ? `${e.columna}: ${e.mensaje.split(':')[0]}` : e.mensaje;
  motivos.set(clave, (motivos.get(clave) ?? 0) + 1);
}

const porHoja = new Map();
for (const f of filas) {
  const acc = porHoja.get(f.hoja) ?? { total: 0, aceptadas: 0 };
  acc.total += 1;
  if (!filasConError.has(`${f.hoja}#${f.fila}`)) acc.aceptadas += 1;
  porHoja.set(f.hoja, acc);
}

const resumen = {
  archivo: path.relative(ROOT_DIR, archivo),
  filas: filas.length,
  aceptadas: aceptadas.length,
  rechazadas: rechazadas.length,
  tasaAceptacion: filas.length ? Math.round((aceptadas.length / filas.length) * 100) : 0,
  errores: errores.length,
  porHoja: Object.fromEntries([...porHoja].map(([k, v]) => [k, v])),
  motivos: Object.fromEntries([...motivos].sort((a, b) => b[1] - a[1])),
};

console.log(`\n[validar] ${resumen.archivo}`);
console.log(`  Filas con IdFila: ${resumen.filas}`);
console.log(`  Aceptadas por el validador: ${resumen.aceptadas}`);
console.log(`  Rechazadas: ${resumen.rechazadas}  (${resumen.errores} error(es))`);
console.log(`  Tasa de aceptación: ${resumen.tasaAceptacion} %`);
if (errores.length) console.log(`\n${formatErrors(errores)}\n`);

const dir = path.join(ROOT_DIR, 'reports', 'datos-ia');
fs.mkdirSync(dir, { recursive: true });
const nombre = path.basename(archivo, '.xlsx');
fs.writeFileSync(path.join(dir, `${nombre}.json`), JSON.stringify(resumen, null, 2), 'utf8');
console.log(`\nReporte: ${path.relative(ROOT_DIR, path.join(dir, `${nombre}.json`))}\n`);

process.exit(rechazadas.length ? 1 : 0);

