#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

const args = process.argv.slice(2);
let query = '';
let domain = '';
let stack = '';
let maxResults = 3;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--domain' && args[i + 1]) {
    domain = args[++i];
  } else if (args[i] === '--stack' && args[i + 1]) {
    stack = args[++i];
  } else if (args[i] === '--max-results' && args[i + 1]) {
    maxResults = parseInt(args[++i], 10);
  } else if (!args[i].startsWith('--') && !query) {
    query = args[i];
  }
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  const header = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= header.length * 0.5) {
      const row = {};
      header.forEach((h, idx) => {
        row[h.trim()] = values[idx] || '';
      });
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function scoreRow(row, terms) {
  let score = 0;
  const rowText = Object.values(row).join(' ').toLowerCase();
  for (const term of terms) {
    if (!term) continue;
    const regex = new RegExp('\\b' + term + '\\b', 'i');
    if (regex.test(rowText)) score += 3;
    else if (rowText.includes(term)) score += 1;
  }
  return score;
}

const terms = (query || 'dashboard modern saas ui').toLowerCase().split(/\s+/).filter(Boolean);

let targetFile = 'styles.csv';
if (stack) {
  targetFile = path.join('stacks', `${stack}.csv`);
} else if (domain === 'color') {
  targetFile = 'colors.csv';
} else if (domain === 'ux') {
  targetFile = 'ux-guidelines.csv';
} else if (domain === 'typography') {
  targetFile = 'typography.csv';
} else if (domain === 'chart') {
  targetFile = 'charts.csv';
}

const filePath = path.join(dataDir, targetFile);
if (!fs.existsSync(filePath)) {
  console.log(`[UI/UX Pro Max] Dataset not found: ${targetFile}. Defaulting to styles.csv`);
}
const chosenFile = fs.existsSync(filePath) ? filePath : path.join(dataDir, 'styles.csv');

try {
  const content = fs.readFileSync(chosenFile, 'utf-8');
  const rows = parseCSV(content);
  const scored = rows.map(r => ({ row: r, score: scoreRow(r, terms) }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, maxResults);
  console.log(`\n## 🎨 UI/UX Pro Max Intelligence`);
  console.log(`**Query:** "${query || 'default'}" | **Source:** ${path.basename(chosenFile)} | **Results:** ${top.length}\n`);

  top.forEach((item, index) => {
    console.log(`### Result ${index + 1}: ${item.row['Style Category'] || item.row['Rule'] || item.row['Name'] || item.row['Palette Name'] || 'Recommendation'}`);
    for (const [key, val] of Object.entries(item.row)) {
      if (val && !['No', 'Status', 'Aliases'].includes(key)) {
        console.log(`- **${key}:** ${val.length > 250 ? val.substring(0, 250) + '...' : val}`);
      }
    }
    console.log('');
  });
} catch (err) {
  console.error('Error during UI/UX Pro Max search:', err.message);
}

