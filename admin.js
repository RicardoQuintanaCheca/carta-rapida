// Panel de administración (/admin): solo para las cuentas cuyo email está en ADMIN_EMAILS
// Y que además demuestran que controlan ese buzón con un código de 6 cifras enviado por email.
// (El registro no verifica el email: sin el código, cualquiera que registrase un email de admin entraría.)
// Por defecto: tienda.kartia@gmail.com e info@kartia.es.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { db } = require('./db');
const { usuarioDe, planDeUsuario, firmar, iguales, leerCookie } = require('./cuentas');
const { enviarCorreo, plantilla, CORREO_ACTIVO } = require('./correo');

const ADMINS = (process.env.ADMIN_EMAILS || 'tienda.kartia@gmail.com,info@kartia.es')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const DIA = 24 * 60 * 60 * 1000;
const PRECIO = { mes: 12.9, ano: 118.8 };

// ── Verificación por código ──
const COOKIE_ADMIN = 'cr_admin';
const HORAS_ADMIN = 12;
const MIN_CODIGO = 10;
const codigos = new Map(); // id de usuario -> { hash, x: caduca, intentos, enviado }
const enviosHora = new Map(); // id de usuario -> marcas de tiempo de los códigos pedidos
const hashCodigo = (uid, c) => firmar(`admin-codigo|${uid}|${c}`);

function usuarioAdmin(req) {
  const u = usuarioDe(req);
  return u && ADMINS.includes(u.email) ? u : null;
}
function verificado(req, u) {
  const token = leerCookie(req, COOKIE_ADMIN);
  if (!u || !token || token.length > 400 || !token.includes('.')) return false;
  const [datos, firma] = token.split('.');
  if (!firma || !iguales(firma, firmar('admin|' + datos))) return false;
  try {
    const t = JSON.parse(Buffer.from(datos, 'base64url').toString());
    return t.u === u.id && t.v === u.version_sesion && t.x > Date.now();
  } catch { return false; }
}
function esAdmin(req) {
  const u = usuarioAdmin(req);
  return !!(u && verificado(req, u));
}

function paginaCodigo(email) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Verificación · Administración</title>
<style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#FAF7F2;color:#0E0E0E;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
.c{background:#fff;max-width:420px;width:100%;border-radius:18px;padding:28px;border:1.5px solid #E8E1D6}
h1{font-size:22px;margin:0 0 8px}p{color:#555;font-size:14.5px;line-height:1.5;margin:0 0 16px}
input{width:100%;box-sizing:border-box;font-size:28px;letter-spacing:.4em;text-align:center;padding:12px;border:1.5px solid #E8E1D6;border-radius:12px;font-variant-numeric:tabular-nums}
button{width:100%;margin-top:12px;padding:14px;border:0;border-radius:999px;font-weight:700;font-size:15px;cursor:pointer;background:#0E0E0E;color:#fff}
button.sec{background:#fff;color:#0E0E0E;border:1.5px solid #0E0E0E}.m{min-height:20px;font-size:13.5px;margin-top:10px}.m.err{color:#B42318}.m.ok{color:#2E7D32}</style></head>
<body><div class="c"><h1>Verifica que eres tú</h1>
<p>Para entrar en la administración te enviamos un código de 6 cifras a <b>${esc(email)}</b>. Caduca en ${MIN_CODIGO} minutos.</p>
<button type="button" class="sec" id="enviar">Enviarme el código</button>
<form id="f" style="margin-top:16px"><input id="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······" aria-label="Código de 6 cifras"><button type="submit">Entrar</button></form>
<div class="m" id="m"></div></div>
<script>
const m = document.getElementById('m');
const post = async (u, b) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(b || {}) }); return r.json().catch(() => ({ ok: false, error: 'Error inesperado.' })); };
document.getElementById('enviar').onclick = async (e) => {
  e.target.disabled = true; m.className = 'm'; m.textContent = 'Enviando…';
  const d = await post('/admin/codigo');
  m.className = 'm ' + (d.ok ? 'ok' : 'err'); m.textContent = d.ok ? 'Código enviado. Revisa tu correo (y la carpeta de spam).' : d.error;
  setTimeout(() => { e.target.disabled = false; }, 30000);
  document.getElementById('codigo').focus();
};
document.getElementById('f').onsubmit = async (e) => {
  e.preventDefault();
  const d = await post('/admin/verificar', { codigo: document.getElementById('codigo').value.trim() });
  if (d.ok) location.reload(); else { m.className = 'm err'; m.textContent = d.error; }
};
</script></body></html>`;
}

const csv = filas => filas.map(f => f.map(v => {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}).join(';')).join('\n');
function inicioDiaMadrid(ms) {
  const d = new Date(ms);
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const desfase = local.getTime() - d.getTime();
  local.setHours(0, 0, 0, 0);
  return local.getTime() - desfase;
}
const fechaTxt = ms => ms ? new Date(ms).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '';

const r = express.Router();

r.get(['/admin', '/admin/'], (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!db) return res.status(503).send('Base de datos no disponible.');
  const u = usuarioAdmin(req);
  if (!u) return res.redirect('/panel?entrar=1&admin=1');
  if (!verificado(req, u)) return res.type('html').send(paginaCodigo(u.email));
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Enviar el código al email de administración (como mucho uno cada 30 s)
r.post('/admin/codigo', express.json(), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const u = usuarioAdmin(req);
  if (!u) return res.status(403).json({ ok: false, error: 'Esta cuenta no tiene acceso de administrador.' });
  if (!CORREO_ACTIVO) return res.json({ ok: false, error: 'El envío de correo no está configurado en el servidor.' });
  const previo = codigos.get(u.id);
  if (previo && Date.now() - previo.enviado < 30 * 1000) return res.json({ ok: false, error: 'Espera unos segundos antes de pedir otro código.' });
  const envios = (enviosHora.get(u.id) || []).filter(t => Date.now() - t < 60 * 60 * 1000);
  if (envios.length >= 6) return res.json({ ok: false, error: 'Has pedido demasiados códigos. Espera una hora.' });
  enviosHora.set(u.id, [...envios, Date.now()]);
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  codigos.set(u.id, { hash: hashCodigo(u.id, codigo), x: Date.now() + MIN_CODIGO * 60 * 1000, intentos: 0, enviado: Date.now() });
  const ok = await enviarCorreo({
    para: u.email,
    asunto: `Código de acceso a la administración: ${codigo}`,
    html: plantilla({ titulo: `Tu código: ${codigo}`, texto: `Úsalo para entrar en la administración de Carta Rápida. Caduca en ${MIN_CODIGO} minutos.`, boton: 'Abrir la administración', enlace: `${(process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')}/admin`, pie: 'Si no has sido tú, alguien ha entrado con tu contraseña: cámbiala desde tu panel.' }),
    texto: `Tu código de acceso a la administración de Carta Rápida: ${codigo}\nCaduca en ${MIN_CODIGO} minutos. Si no has sido tú, cambia tu contraseña.`
  });
  if (!ok) { codigos.delete(u.id); return res.json({ ok: false, error: 'No hemos podido enviar el correo. Inténtalo en un minuto.' }); }
  console.log(`[ADMIN] código enviado a ${u.email}`);
  res.json({ ok: true });
});

// Comprobar el código (5 intentos por código)
r.post('/admin/verificar', express.json(), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const u = usuarioAdmin(req);
  if (!u) return res.status(403).json({ ok: false, error: 'Esta cuenta no tiene acceso de administrador.' });
  const c = codigos.get(u.id);
  const codigo = String((req.body || {}).codigo || '').replace(/\D/g, '');
  if (!c || c.x < Date.now()) { codigos.delete(u.id); return res.json({ ok: false, error: 'El código ha caducado. Pide otro.' }); }
  if (c.intentos >= 5) { codigos.delete(u.id); return res.json({ ok: false, error: 'Demasiados intentos. Pide un código nuevo.' }); }
  c.intentos++;
  if (codigo.length !== 6 || !iguales(c.hash, hashCodigo(u.id, codigo))) return res.json({ ok: false, error: 'Código incorrecto.' });
  codigos.delete(u.id);
  const datos = Buffer.from(JSON.stringify({ u: u.id, v: u.version_sesion, x: Date.now() + HORAS_ADMIN * 60 * 60 * 1000 })).toString('base64url');
  res.cookie(COOKIE_ADMIN, `${datos}.${firmar('admin|' + datos)}`, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: HORAS_ADMIN * 60 * 60 * 1000, path: '/admin' });
  console.log(`[ADMIN] acceso verificado: ${u.email}`);
  res.json({ ok: true });
});

r.get('/admin/datos', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!db || !esAdmin(req)) return res.status(403).json({ ok: false });
  const ahora = Date.now();
  const usuarios = db.prepare('SELECT u.*, (SELECT COUNT(*) FROM cartas c WHERE c.usuario_id = u.id) AS n_cartas, (SELECT MAX(actualizado) FROM cartas c WHERE c.usuario_id = u.id) AS ultima_carta FROM usuarios u ORDER BY u.creado DESC').all();
  const lista = usuarios.map(u => {
    const p = planDeUsuario(u, ahora);
    return { email: u.email, alta: u.creado, plan: p.plan, periodo: p.periodo || '', hasta: p.hasta || u.prueba_hasta || 0,
      cancela: !!p.cancela, cartas: u.n_cartas, ultima: u.ultima_carta || 0, novedades: !!u.novedades, estado_stripe: u.sub_estado || '' };
  });
  const pro = lista.filter(u => u.plan === 'pro');
  const mrr = pro.reduce((t, u) => t + (u.periodo === 'ano' ? PRECIO.ano / 12 : PRECIO.mes), 0);
  const cuenta = (sql, ...a) => db.prepare(sql).get(...a).n;
  const eventos = (tipo, desde) => cuenta('SELECT COUNT(*) AS n FROM eventos WHERE tipo = ? AND fecha >= ?', tipo, desde);
  const periodos = { hoy: inicioDiaMadrid(ahora), d7: ahora - 7 * DIA, d30: ahora - 30 * DIA };
  const serie = (tipo) => Object.fromEntries(Object.entries(periodos).map(([k, d]) => [k, eventos(tipo, d)]));
  const leadsPor = db.prepare('SELECT origen, COUNT(*) AS n FROM leads WHERE fecha >= ? GROUP BY origen ORDER BY n DESC').all(periodos.d30);
  const ultimosLeads = db.prepare('SELECT email, origen, restaurante, estilo, platos, novedades, fecha FROM leads ORDER BY fecha DESC LIMIT 200').all();
  const solicitudes = db.prepare(`SELECT id, email, telefono, restaurante, estilo, platos, fecha, atendida, (json_extract(datos, '$.logo') IS NOT NULL) AS conLogo FROM solicitudes ORDER BY atendida ASC, fecha DESC LIMIT 200`).all();
  const estilos = db.prepare("SELECT detalle AS estilo, COUNT(*) AS n FROM eventos WHERE tipo = 'carta_generada' AND fecha >= ? GROUP BY detalle ORDER BY n DESC").all(periodos.d30);
  res.json({
    ok: true,
    resumen: {
      usuarios: lista.length,
      altas7: lista.filter(u => u.alta >= periodos.d7).length,
      altas30: lista.filter(u => u.alta >= periodos.d30).length,
      enPrueba: lista.filter(u => u.plan === 'prueba').length,
      pro: pro.length,
      proMes: pro.filter(u => u.periodo !== 'ano').length,
      proAno: pro.filter(u => u.periodo === 'ano').length,
      cancelan: pro.filter(u => u.cancela).length,
      mrr: Math.round(mrr * 100) / 100,
      cartasGuardadas: cuenta('SELECT COUNT(*) AS n FROM cartas'),
      leads: { total: cuenta('SELECT COUNT(*) AS n FROM leads'), d7: cuenta('SELECT COUNT(*) AS n FROM leads WHERE fecha >= ?', periodos.d7), d30: cuenta('SELECT COUNT(*) AS n FROM leads WHERE fecha >= ?', periodos.d30) }
    },
    uso: { cartas: serie('carta_generada'), pdfGratis: serie('pdf_gratis'), pdfPro: serie('pdf_pro') },
    leadsPor, estilos, usuarios: lista, leads: ultimosLeads, solicitudes
  });
});

// Solicitudes de montaje: PDF de la carta tal cual la pidió el cliente (con su logo y sin firma)
r.get('/admin/solicitudes/:id.pdf', async (req, res) => {
  if (!db || !esAdmin(req)) return res.status(403).end();
  const s = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(String(req.params.id));
  if (!s) return res.status(404).end();
  try {
    const d = JSON.parse(s.datos);
    const { pdf } = await require('./pdf').generarPDF(d.carta, { estilo: d.estilo, logo: d.logo, credito: false });
    const nombre = String(s.restaurante || s.email).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'carta';
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="montaje-${nombre}.pdf"`, 'Cache-Control': 'no-store' });
    res.send(Buffer.from(pdf));
  } catch (e) {
    console.error('[ADMIN] PDF de solicitud:', e.message);
    res.status(500).send('No se ha podido generar el PDF.');
  }
});
r.get('/admin/solicitudes/:id.logo', (req, res) => {
  if (!db || !esAdmin(req)) return res.status(403).end();
  const s = db.prepare('SELECT datos FROM solicitudes WHERE id = ?').get(String(req.params.id));
  const logo = s && JSON.parse(s.datos).logo;
  const m = logo && logo.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/);
  if (!m) return res.status(404).end();
  res.set({ 'Content-Type': m[1], 'Content-Disposition': `attachment; filename="logo-${req.params.id}.${m[2] === 'jpeg' ? 'jpg' : m[2]}"`, 'Cache-Control': 'no-store' });
  res.send(Buffer.from(m[3], 'base64'));
});
r.post('/admin/solicitudes/:id/atendida', express.json(), (req, res) => {
  if (!db || !esAdmin(req)) return res.status(403).json({ ok: false });
  const hecha = (req.body || {}).atendida !== false;
  const info = db.prepare('UPDATE solicitudes SET atendida = ?, estado = ? WHERE id = ?').run(hecha ? 1 : 0, hecha ? 'atendida' : 'nueva', String(req.params.id));
  res.json({ ok: !!info.changes });
});

r.get('/admin/usuarios.csv', (req, res) => {
  if (!db || !esAdmin(req)) return res.status(403).end();
  const filas = db.prepare('SELECT u.*, (SELECT COUNT(*) FROM cartas c WHERE c.usuario_id = u.id) AS n FROM usuarios u ORDER BY u.creado DESC').all()
    .map(u => { const p = planDeUsuario(u); return [u.email, fechaTxt(u.creado), p.plan, p.periodo || '', fechaTxt(p.hasta || u.prueba_hasta), p.cancela ? 'sí' : '', u.n, u.novedades ? 'sí' : 'no']; });
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="carta-rapida-usuarios.csv"' });
  res.send('﻿' + csv([['Email', 'Alta', 'Plan', 'Periodo', 'Hasta', 'Cancela', 'Cartas', 'Novedades'], ...filas]));
});

r.get('/admin/leads.csv', (req, res) => {
  if (!db || !esAdmin(req)) return res.status(403).end();
  const filas = db.prepare('SELECT * FROM leads ORDER BY fecha DESC').all()
    .map(l => [l.email, l.origen, l.restaurante, l.estilo, l.platos, l.novedades ? 'sí' : 'no', fechaTxt(l.fecha)]);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="carta-rapida-leads.csv"' });
  res.send('﻿' + csv([['Email', 'Origen', 'Restaurante', 'Estilo', 'Platos', 'Novedades', 'Fecha'], ...filas]));
});

module.exports = r;
