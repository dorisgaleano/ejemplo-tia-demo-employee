/**
 * @file Escribe resultados.xlsx: una fila por ejecución, con estado, error y rutas de evidencia.
 * Capa: reporting (SRP: solo da formato y escribe; los datos llegan de results-builder).
 */
import ExcelJS from 'exceljs';

const COLORS = { 'PASÓ': 'FFC6EFCE', 'FALLÓ': 'FFFFC7CE', OMITIDO: 'FFFFEB9C' };

/**
 * @param {import('./results-builder.js').Resultado[]} results
 * @param {string} file Ruta de salida (dentro de la carpeta de la corrida).
 */
export async function writeResults(results, file) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Resultados', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'TestCaseId', key: 'testCaseId', width: 13 },
    { header: 'IdFila', key: 'idFila', width: 16 },
    { header: 'Escenario', key: 'escenario', width: 45 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Datos usados', key: 'datos', width: 50 },
    { header: 'Estado', key: 'estado', width: 10 },
    { header: 'Paso que falló', key: 'pasoFallido', width: 40 },
    { header: 'Inicio', key: 'inicio', width: 22 },
    { header: 'Fin', key: 'fin', width: 22 },
    { header: 'Duración (s)', key: 'duracionSeg', width: 12 },
    { header: 'Error', key: 'error', width: 60 },
    { header: 'Trace', key: 'trace', width: 45 },
    { header: 'Video', key: 'video', width: 45 },
    { header: 'Screenshots', key: 'screenshots', width: 45 },
    { header: 'Limpieza de datos', key: 'limpieza', width: 50 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: 'A1', to: 'O1' };

  for (const r of results) {
    const row = ws.addRow({
      ...r,
      datos: Object.entries(r.datos)
        .filter(([k]) => !['Ejecutar', 'IdFila', 'Descripcion'].includes(k) && !/clave|password/i.test(k))
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
      inicio: r.inicio ? new Date(r.inicio).toLocaleString('es-CO') : '',
      fin: r.fin ? new Date(r.fin).toLocaleString('es-CO') : '',
      duracionSeg: Math.round(r.duracionSeg * 10) / 10,
      screenshots: r.screenshots.join('\n'),
    });
    row.alignment = { vertical: 'top', wrapText: true };
    row.getCell('estado').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS[r.estado] } };
  }
  await workbook.xlsx.writeFile(file);
}
