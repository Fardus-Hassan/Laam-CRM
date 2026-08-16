/** Download a pre-built text file in the browser. */
export function downloadTextFile(
  filename: string,
  contents: string,
  mime = 'text/csv;charset=utf-8;',
) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = /\.[a-z0-9]+$/i.test(filename) ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export type TableCell = string | number | boolean | null | undefined;
export type TableExportFormat = 'csv' | 'excel';

function escapeCsv(value: TableCell) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stem(filename: string) {
  return filename.replace(/\.(csv|xlsx|xls)$/i, '');
}

/** Download rows as a CSV file in the browser. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: TableCell[][],
) {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  downloadTextFile(`${stem(filename)}.csv`, `\uFEFF${lines.join('\n')}`);
}

/**
 * Excel-compatible SpreadsheetML (.xls). Opens in Excel, Google Sheets, LibreOffice.
 */
export function downloadExcel(
  filename: string,
  headers: string[],
  rows: TableCell[][],
) {
  const cellXml = (value: TableCell) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
    }
    if (typeof value === 'boolean') {
      return `<Cell><Data ss:Type="Boolean">${value ? 1 : 0}</Data></Cell>`;
    }
    return `<Cell><Data ss:Type="String">${xmlEscape(value == null ? '' : String(value))}</Data></Cell>`;
  };
  const headerRow = `<Row>${headers.map((h) => cellXml(h)).join('')}</Row>`;
  const body = rows.map((row) => `<Row>${row.map(cellXml).join('')}</Row>`).join('');
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Export">
  <Table>
   ${headerRow}
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;
  downloadTextFile(
    `${stem(filename)}.xls`,
    xml,
    'application/vnd.ms-excel;charset=utf-8;',
  );
}

export function downloadCsvAndExcel(
  filename: string,
  headers: string[],
  rows: TableCell[][],
) {
  downloadCsv(filename, headers, rows);
  downloadExcel(filename, headers, rows);
}

export function downloadTable(
  filename: string,
  headers: string[],
  rows: TableCell[][],
  format: TableExportFormat,
) {
  if (format === 'excel') {
    downloadExcel(filename, headers, rows);
    return;
  }
  downloadCsv(filename, headers, rows);
}

/** Parse a simple CSV body (quoted fields supported) into a table. */
export function parseCsvToTable(csv: string): { headers: string[]; rows: TableCell[][] } {
  const text = csv.replace(/^\uFEFF/, '').trim();
  if (!text) return { headers: [], rows: [] };
  const lines: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      current.push(cell);
      cell = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      current.push(cell);
      if (current.some((c) => c.length)) lines.push(current);
      current = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  current.push(cell);
  if (current.some((c) => c.length)) lines.push(current);
  const headers = lines[0] ?? [];
  const rows = lines.slice(1);
  return { headers, rows };
}

export function downloadCsvText(
  filename: string,
  csv: string,
  format: TableExportFormat = 'csv',
) {
  const table = parseCsvToTable(csv);
  if (!table.headers.length) {
    downloadTextFile(`${stem(filename)}.csv`, csv);
    return;
  }
  downloadTable(filename, table.headers, table.rows, format);
}
