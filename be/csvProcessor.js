const csv = require('csv-parser');
const { Readable } = require('stream');
const axios = require('axios');

async function parseCSVFromFile(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function parseCSVFromURL(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return parseCSVFromFile(response.data);
}

function analyzeCSV(data) {
  if (data.length === 0) return { error: "CSV is empty" };

  const headers = Object.keys(data[0]);
  const numericCols = headers.filter(h => data.every(row => !isNaN(parseFloat(row[h])) && row[h] !== ''));
  const stats = {};

  numericCols.forEach(col => {
    const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
    stats[col] = {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
      missing: data.length - values.length
    };
  });

  const missingByCol = headers.map(h => ({
    column: h,
    missing: data.filter(row => row[h] === '' || row[h] == null).length
  })).sort((a, b) => b.missing - a.missing);

  const sample = data.slice(0, 10)
  .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | '))
  .join('\n');

  return {
    headers,
    totalRows: data.length,
    sample: JSON.stringify(sample, null, 2),
    stats,
    missingByCol
  };
}

module.exports = { parseCSVFromFile, parseCSVFromURL, analyzeCSV };