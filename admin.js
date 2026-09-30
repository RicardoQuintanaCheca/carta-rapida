// Panel de administración (/admin): solo para las cuentas cuyo email está en ADMIN_EMAILS.
// Por defecto: tienda.kartia@gmail.com e info@kartia.es (hay que crear la cuenta con ese email en la web).
const path = require('path');
const express = require('express');
const { db } = require('./db');
const { usuarioDe, planDeUsuario } = require('./cuentas');

const ADMINS = (process.env.ADMIN_EMAILS || 'tienda.kartia@gmail.com,info@kartia.es')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const DIA = 24 * 60 * 60 * 1000;
const PRECIO = { mes: 12.9, ano: 118.8 };

function esAdmin(req) {
  const u = usuarioDe(req);
  return !!(u && ADMINS.includes(u.email));
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
  if (!esAdmin(req)) return res.redirect('/panel?entrar=1&admin=1');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
    leadsPor, estilos, usuarios: lista, leads: ultimosLeads
  });
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
