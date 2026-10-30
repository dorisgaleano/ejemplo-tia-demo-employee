/**
 * @file Exporta el esquema de datos del registro de casos (id, columnas, filas de ejemplo).
 * Capa: scripts. Lo consume ml/generar_datos_ia.py para que el dataset sintético se genere
 * con el MISMO esquema que el Excel manual, sin duplicar columnas a mano.
 *
 *   node scripts/exportar-esquema.js > data/input/ia/esquema.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from '../src/config/env.js';
import { CASES } from '../src/registry/cases.js';
import { COLUMN_DOCS } from '../src/registry/columns.js';

const esquema = {
  generadoEn: new Date().toISOString(),
  casos: CASES.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    feature: c.feature,
    columnas: c.columnas,
    filasEjemplo: c.filasEjemplo,
  })),
  columnas: COLUMN_DOCS,
};

const destino = path.join(ROOT_DIR, 'data', 'input', 'ia', 'esquema.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(esquema, null, 2), 'utf8');
console.log(`[esquema] ${CASES.length} casos exportados a ${path.relative(ROOT_DIR, destino)}`);

