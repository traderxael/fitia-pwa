/* NutriPlan API — Node sin dependencias. Sirve la PWA y expone /api. */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT) || 3000;
const AI_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gemini-3.5-flash-lite';
const AI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

let db = { users: {} };
try {
  if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!db.users) db.users = {};
} catch (error) {
  console.error('No se pudo leer la base de datos:', error.message);
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 8 * 1024 * 1024) reject(new Error('Cuerpo demasiado grande'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function staticFile(req, res, pathname) {
  const clean = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const target = path.resolve(ROOT, '.' + clean);
  if (!target.startsWith(ROOT) || target.includes(path.join('server', 'data'))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  const ext = path.extname(target).toLowerCase();
  if (!MIME[ext]) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const SYSTEM_PROMPT = `Eres el coach de NutriPlan, una app de nutrición en español.
Respondes en español, de forma breve (máximo 90 palabras), concreta y sin consejos médicos.
Analizas los datos del día del usuario y respondes SOLO con un objeto JSON válido:
{"text":"respuesta al usuario","suggestion":null}
o, si recomiendas alimentos concretos:
{"text":"respuesta al usuario","suggestion":{"label":"Agregar ... sugerido","meal":"desayuno|almuerzo|cena|snack1|snack2","items":[{"id":"id_alimento","grams":150}]}}
Usa únicamente ids de la lista de alimentos disponible que recibirás en el contexto.
No inventes ids ni valores. Si no tienes suficiente información, suggestion debe ser null.`;

async function askAI(message, context) {
  const prompt = `${SYSTEM_PROMPT}\n\nCONTEXTO (JSON):\n${JSON.stringify(context || {}).slice(0, 4000)}\n\nPREGUNTA: ${message}`;
  const response = await fetch(`${AI_ENDPOINT}?key=${encodeURIComponent(AI_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 400, responseMimeType: 'application/json' }
    })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`IA ${response.status}: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(raw);
  const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const result = JSON.parse(clean);
    return {
      text: String(result.text || '').slice(0, 800),
      suggestion: result.suggestion && Array.isArray(result.suggestion.items) ? result.suggestion : null
    };
  } catch (error) {
    return { text: clean.slice(0, 800), suggestion: null };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (pathname === '/api/health') return json(res, 200, { ok: true, ai: !!AI_KEY, model: AI_MODEL });

  const stateMatch = pathname.match(/^\/api\/state\/([A-Za-z0-9_-]{4,32})$/);
  if (stateMatch && req.method === 'GET') {
    const record = db.users[stateMatch[1]];
    return json(res, 200, record || { state: null, updatedAt: 0 });
  }
  if (stateMatch && req.method === 'PUT') {
    try {
      const data = await body(req);
      if (!data.state || typeof data.state !== 'object') return json(res, 400, { error: 'Estado inválido' });
      const updatedAt = Date.now();
      db.users[stateMatch[1]] = { state: data.state, updatedAt };
      persist();
      return json(res, 200, { ok: true, updatedAt });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (pathname === '/api/coach' && req.method === 'POST') {
    try {
      const data = await body(req);
      if (!data.message || typeof data.message !== 'string') return json(res, 400, { error: 'Falta el mensaje' });
      if (!AI_KEY) return json(res, 501, { error: 'IA no configurada', local: true });
      const reply = await askAI(data.message, data.context);
      return json(res, 200, reply);
    } catch (error) {
      return json(res, 502, { error: error.message, local: true });
    }
  }

  if (req.method === 'GET' && !pathname.startsWith('/api/')) return staticFile(req, res, pathname);
  return json(res, 404, { error: 'Ruta no encontrada' });
});

server.listen(PORT, () => {
  console.log(`NutriPlan listo en http://localhost:${PORT}`);
  console.log(AI_KEY ? `Coach IA: ${AI_MODEL}` : 'Coach IA: modo local (define AI_API_KEY para activar Gemini)');
});
