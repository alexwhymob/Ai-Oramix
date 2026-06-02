export function parseCsv(content) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(value);
      if (row.some(cell => cell !== '')) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value !== '' || row.length > 0) {
    row.push(value);
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(header => header.trim());

  return rows.slice(1).map(cells => Object.fromEntries(
    headers.map((header, index) => [header, cells[index] ?? ''])
  ));
}
