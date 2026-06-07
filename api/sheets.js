/* ═══════════════════════════════════════════════════════════════════
   api/sheets.js  —  Google Sheets API v4 proxy
   Replaces the public gviz/tq CSV approach with a server-side fetch
   so the API key stays in Vercel env and is never exposed to the browser.

   Query params (all optional):
     code  — filter by Data Item Code  (e.g. "1.1")
     cat   — filter by category prefix (e.g. "M1")
             If both omitted, returns all rows.

   Response:
     { districts: string[], rows: Row[] }
     Row: { year, month, category, code, name, stateTotal, distTotals }

   Fallback: if GOOGLE_SHEETS_API_KEY is not set, falls back to the
   public gviz CSV URL so the dashboard keeps working during setup.
═══════════════════════════════════════════════════════════════════ */

const SHEET_ID  = '1iVenSpoyXMuFf9aG3eB3O-ZoEG0ifScHIhuDnUM8g2M';
const SHEET_TAB = 'Sheet1';

export const maxDuration = 30;

/* ── Fallback: public gviz CSV (no API key needed) ─────────────── */
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_TAB}`;

function parseCSV(text) {
  return text.trim().split('\n').map(line => {
    const cols = []; let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"')               { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else                          { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });
}

async function fetchViaGviz() {
  const res = await fetch(GVIZ_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`gviz HTTP ${res.status}`);
  const text   = await res.text();
  const rows   = parseCSV(text);
  if (rows.length < 2) throw new Error('Empty sheet');

  const headers  = rows[0].map(h => h.replace(/"/g, '').trim());
  const districts = headers.slice(5);

  const COL = {
    year:  headers.findIndex(h => /^year$/i.test(h)),
    month: headers.findIndex(h => /^month$/i.test(h)),
    cat:   headers.findIndex(h => /^category$/i.test(h)),
    code:  headers.findIndex(h => /data item code/i.test(h)),
    name:  headers.findIndex(h => /data item name/i.test(h)),
  };

  return { headers, rows: rows.slice(1), COL, districts };
}

async function fetchViaAPIv4(apiKey) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_TAB}?key=${apiKey}&majorDimension=ROWS`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Sheets API HTTP ${res.status}`);
  }
  const json     = await res.json();
  const headers  = (json.values?.[0] || []).map(h => String(h).trim());
  const districts = headers.slice(5);

  const COL = {
    year:  headers.findIndex(h => /^year$/i.test(h)),
    month: headers.findIndex(h => /^month$/i.test(h)),
    cat:   headers.findIndex(h => /^category$/i.test(h)),
    code:  headers.findIndex(h => /data item code/i.test(h)),
    name:  headers.findIndex(h => /data item name/i.test(h)),
  };

  return { headers, rows: (json.values || []).slice(1), COL, districts };
}

function buildRows({ rows, COL, districts }, codeFilter, catFilter) {
  const out = [];
  for (const r of rows) {
    if (!r || r.length < 5) continue;

    const rawCat  = String(r[COL.cat] || '').replace(/"/g, '').trim();
    const catKey  = rawCat.match(/^(M\d+)/)?.[1];
    if (!catKey) continue;
    if (catFilter && catKey !== catFilter) continue;

    const rawCode = String(r[COL.code] || '').replace(/"/g, '').trim().replace(/\.$/, '');
    if (codeFilter && rawCode !== codeFilter) continue;

    const distTotals = {};
    let stateTotal = 0;
    districts.forEach((d, i) => {
      const raw = String(r[5 + i] || '0').replace(/"/g, '').replace(/,/g, '').trim();
      const val = parseFloat(raw) || 0;
      distTotals[d] = val;
      stateTotal   += val;
    });

    out.push({
      year:       String(r[COL.year]  || '').replace(/"/g, '').trim(),
      month:      String(r[COL.month] || '').replace(/"/g, '').trim(),
      category:   rawCat,
      code:       rawCode,
      name:       String(r[COL.name]  || '').replace(/"/g, '').trim(),
      stateTotal,
      distTotals,
    });
  }
  return out;
}

export default async function handler(req, res) {
  /* No caching — always serve fresh sheet data */
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, cat } = req.query;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  let sheetData = null;
  let source    = 'gviz';

  /* Try Sheets API v4 first if key is set.
     Falls back to gviz if the sheet is in Office format (xlsx not converted
     to native Google Sheets) — common when sheet was uploaded from Excel. */
  if (apiKey) {
    try {
      sheetData = await fetchViaAPIv4(apiKey);
      source    = 'api_v4';
    } catch (e) {
      console.warn('[api/sheets] API v4 failed, falling back to gviz:', e.message);
    }
  }

  if (!sheetData) {
    try {
      sheetData = await fetchViaGviz();
      source    = 'gviz';
    } catch (e) {
      console.error('[api/sheets] gviz also failed:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  const rows      = buildRows(sheetData, code || null, cat || null);
  const districts = sheetData.districts;

  return res.status(200).json({ districts, rows, source });
}
