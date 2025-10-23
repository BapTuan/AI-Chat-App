import Papa from 'papaparse';

export function parseCsvText(csvText) {
  try {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (result.errors.length > 0) {
      throw new Error('CSV parse error: ' + result.errors[0].message);
    }

    const data = result.data.slice(0, 1000); // limit for safety
    const headers = Object.keys(data[0] || {});

    // Basic stats
    const stats = {};
    headers.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== '');
      const numeric = values.filter(v => typeof v === 'number');
      if (numeric.length > 0) {
        stats[col] = {
          min: Math.min(...numeric),
          max: Math.max(...numeric),
          mean: numeric.reduce((a, b) => a + b, 0) / numeric.length,
          count: numeric.length
        };
      }
    });

    return { data, headers, stats, rowCount: data.length };
  } catch (err) {
    throw new Error('Invalid CSV: ' + err.message);
  }
}