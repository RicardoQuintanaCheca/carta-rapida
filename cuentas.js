// Carta Pro: cuentas (email + contraseña), prueba de 7 días, membresía mensual/anual con Stripe
// y cartas guardadas para editarlas desde el panel.
// Sin STRIPE_SECRET_KEY y con PAGOS_DEMO=si, el pago se simula (solo para pruebas locales).
const crypto = require('crypto');
const express = require('express');
const { db, persistente } = require('./db');
const { enviarLead } = require('./leads');

const DIA = 24 * 60 * 60 * 1000;
const DIAS_PRUEBA = 7;
const DIAS_SESION = 60;
const MAX_CARTAS = 60;
const MAX_DATOS = 2.5 * 1024 * 1024; // carta + logo en data URL

const PLANES = {
  mes: { precio: 9.9, texto: '9,90 € al mes', env: 'STRIPE_PRICE_MES', defecto: 'price_1UL62CRZgd5ArTbXO44o8DbJ' },
  ano: { precio: 99, texto: '99 € al año', env: 'STRIPE_PRICE_ANO', defecto: 'price_1UL62DRZgd5ArTbXDtHOFjzh' }
};
// Estilos solo para Pro (se pueden ver con tu carta, pero el PDF pide Pro)
const ESTILOS_PRO = ['riviera', 'sumi', 'cartel', 'serigrafia', 'azulejo'];

const CLAVE_STRIPE = process.env.STRIPE_SECRET_KEY || '';
const MODO_DEMO = !CLAVE_STRIPE && process.env.PAGOS_DEMO === 'si';
const PAGOS_ACTIVOS = !!CLAVE_STRIPE || MODO_DEMO;
const stripe = CLAVE_STRIPE ? require('stripe')(CLAVE_STRIPE) : null;
const CUENTAS_ACTIVAS = !!db;

// Secreto para firmar sesiones. Si no se configura, se deriva de la clave de OpenAI (estable entre reinicios)
const SECRETO = process.env.LICENCIA_SECRETO
  || crypto.createHash('sha256').update('carta-rapida|' + (process.env.OPENAI_API_KEY || 'local')).digest('hex');
const firmar = datos => crypto.createHmac('sha256', SECRETO).update(datos).digest('base64url');
const iguales = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;
const origenDe = req => (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
const ahoraMadrid = () => new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

// ── Contraseñas (scrypt) ──
function hashClave(clave, sal = crypto.randomBytes(16).toString('hex')) {
  return { sal, hash: crypto.scryptSync(clave, sal, 64, { N: 16384, r: 8, p: 1 }).toString('hex') };
}
function claveCorrecta(clave, u) {
  const { hash } = hashClave(clave, u.sal);
  return iguales(hash, u.hash);
}

// ── Sesión en cookie firmada ──
const COOKIE = 'cr_sesion';
function leerCookie(req, nombre) {
  const c = req.headers.cookie || '';
  const m = c.split(/;\s*/).find(p => p.startsWith(nombre + '='));
  return m ? decodeURIComponent(m.slice(nombre.length + 1)) : '';
}
function ponerSesion(req, res, u) {
  const datos = Buffer.from(JSON.stringify({ u: u.id, v: u.version_sesion, x: Date.now() + DIAS_SESION * DIA })).toString('base64url');
  const valor = `${datos}.${firmar(datos)}`;
  res.cookie(COOKIE, valor, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: DIAS_SESION * DIA, path: '/' });
}
function quitarSesion(req, res) { res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' }); }

function usuarioDe(req) {
  if (!db) return null;
  const token = leerCookie(req, COOKIE);
  if (!token || token.length > 600 || !token.includes('.')) return null;
  const [datos, firma] = token.split('.');
  if (!firma || !iguales(firma, firmar(datos))) return null;
  try {
    const s = JSON.parse(Buffer.from(datos, 'base64url').toString());
    if (!(s.x > Date.now())) return null;
    const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(s.u);
    return u && u.version_sesion === s.v ? u : null;
  } catch { return null; }
}

// ── Licencias antiguas (pago único de 19 €, antes de las cuentas): se siguen respetando hasta que caduquen ──
function leerLicencia(token) {
  if (typeof token !== 'string' || token.length > 1000 || !token.includes('.')) return null;
  const [datos, firma] = token.split('.');
  if (!firma || !iguales(firma, firmar(datos))) return null;
  try {
    const l = JSON.parse(Buffer.from(datos, 'base64url').toString());
    if (!l || !['pro', 'prueba'].includes(l.p) || !(l.x > Date.now())) return null;
    return { plan: l.p, email: l.e, hasta: l.x };
  } catch { return null; }
}

// ── Estado del plan ──
const SUB_VIVA = ['active', 'trialing', 'past_due'];
function planDeUsuario(u, ahora = Date.now()) {
  if (!u) return { plan: 'gratis' };
  if (u.sub_id && SUB_VIVA.includes(u.sub_estado) && u.sub_hasta > ahora) {
    return { plan: 'pro', hasta: u.sub_hasta, periodo: u.sub_plan, cancela: !!u.sub_cancela, estado: u.sub_estado };
  }
  if (u.prueba_hasta > ahora) return { plan: 'prueba', hasta: u.prueba_hasta };
  return { plan: 'gratis', pruebaUsada: u.prueba_hasta > 0, habiaPro: !!u.sub_id };
}

function finDePeriodo(sub) {
  const item = sub.items && sub.items.data && sub.items.data[0];
  const fin = sub.current_period_end || (item && item.current_period_end) || 0;
  return fin * 1000;
}
function periodoDe(sub) {
  const item = sub.items && sub.items.data && sub.items.data[0];
  const intervalo = item && item.price && item.price.recurring && item.price.recurring.interval;
  return intervalo === 'year' ? 'ano' : 'mes';
}
function guardarSuscripcion(uid, sub) {
  db.prepare(`UPDATE usuarios SET stripe_cliente = COALESCE(?, stripe_cliente), sub_id = ?, sub_estado = ?, sub_plan = ?, sub_hasta = ?, sub_cancela = ?, sub_revisado = ? WHERE id = ?`)
    .run(typeof sub.customer === 'string' ? sub.customer : (sub.customer && sub.customer.id) || null,
      sub.id, sub.status, periodoDe(sub), finDePeriodo(sub), sub.cancel_at_period_end ? 1 : 0, Date.now(), uid);
}

// Revisa en Stripe la suscripción si hace más de una hora o si ya ha vencido el periodo (renovaciones, bajas)
async function sincronizar(u, forzar = false) {
  if (!u || !u.sub_id || !stripe || u.sub_id.startsWith('demo_')) return u;
  const vencida = u.sub_hasta <= Date.now();
  if (!forzar && !vencida && Date.now() - u.sub_revisado < 60 * 60 * 1000) return u;
  if (!forzar && vencida && Date.now() - u.sub_revisado < 5 * 60 * 1000) return u;
  try {
    const sub = await stripe.subscriptions.retrieve(u.sub_id);
    guardarSuscripcion(u.id, sub);
  } catch (e) {
    console.error('[SUSCRIPCION] no se pudo revisar:', e.message);
    db.prepare('UPDATE usuarios SET sub_revisado = ? WHERE id = ?').run(Date.now(), u.id);
  }
  return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(u.id);
}

// Plan de quien hace la petición: cuenta con Pro/prueba o licencia antigua
async function planDe(req) {
  let u = usuarioDe(req);
  if (u) {
    u = await sincronizar(u);
    const p = planDeUsuario(u);
    if (p.plan !== 'gratis') return { ...p, email: u.email, usuario: u };
    const l = leerLicencia(req.get('x-licencia') || '');
    return l ? { ...l, usuario: u } : { ...p, email: u.email, usuario: u };
  }
  const l = leerLicencia(req.get('x-licencia') || '');
  return l || { plan: 'gratis' };
}

function datosCuenta(u) {
  const p = planDeUsuario(u);
  const n = db.prepare('SELECT COUNT(*) AS n FROM cartas WHERE usuario_id = ?').get(u.id).n;
  return { email: u.email, cartas: n, ...p, puedePortal: !!(u.stripe_cliente && stripe) };
}

// ── Cartas ──
const ESTILO_OK = /^[a-z]{3,20}$/;
function limpiarDatosCarta(b) {
  const carta = b && b.carta;
  if (!carta || typeof carta !== 'object' || !Array.isArray(carta.secciones)) return null;
  const logo = typeof b.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(b.logo) ? b.logo : null;
  const datos = {
    carta,
    estilo: ESTILO_OK.test(b.estilo || '') ? b.estilo : 'sobremesa',
    logo,
    cabecera: b.cabecera === 'nombre' ? 'nombre' : 'logo'
  };
  const json = JSON.stringify(datos);
  if (json.length > MAX_DATOS) return { error: 'La carta o el logotipo son demasiado grandes para guardarlos.' };
  const titulo = String(b.titulo || carta.nombre_restaurante || 'Mi carta').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Mi carta';
  return { json, titulo, estilo: datos.estilo };
}
function resumenCarta(c) {
  let platos = 0, secciones = 0, idioma = 'es';
  try {
    const d = JSON.parse(c.datos);
    secciones = d.carta.secciones.length;
    platos = d.carta.secciones.reduce((n, s) => n + (s.platos || []).length, 0);
    idioma = d.carta.idioma || 'es';
  } catch {}
  return { id: c.id, titulo: c.titulo, estilo: c.estilo, creado: c.creado, actualizado: c.actualizado, platos, secciones, idioma };
}

function crearRutas({ limite, limiteCuenta }) {
  const r = express.Router();

  const sinCuentas = (req, res, next) => CUENTAS_ACTIVAS ? next()
    : res.status(503).json({ ok: false, error: 'Las cuentas están en mantenimiento. Vuelve a intentarlo en unos minutos.' });
  const conSesion = (req, res, next) => {
    const u = usuarioDe(req);
    if (!u) return res.status(401).json({ ok: false, sesion: false, error: 'Entra en tu cuenta para continuar.' });
    req.usuario = u; next();
  };
  const conPlan = async (req, res, next) => {
    req.usuario = await sincronizar(req.usuario);
    const p = planDeUsuario(req.usuario);
    if (p.plan === 'gratis') return res.status(402).json({ ok: false, pro: true, error: 'Tu Carta Pro no está activa. Actívala para guardar y editar tus cartas.' });
    req.plan = p; next();
  };

  // ── Cuenta ──
  r.post('/cuenta/registro', limiteCuenta, sinCuentas, (req, res) => {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const clave = String(b.clave || '');
    if (!emailValido(email)) return res.json({ ok: false, campo: 'email', error: 'Revisa el email.' });
    if (clave.length < 8 || clave.length > 200) return res.json({ ok: false, campo: 'clave', error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)) {
      return res.json({ ok: false, existe: true, campo: 'email', error: 'Ya hay una cuenta con este email. Entra con tu contraseña.' });
    }
    const { sal, hash } = hashClave(clave);
    const ahora = Date.now();
    const info = db.prepare('INSERT INTO usuarios (email, hash, sal, creado, novedades, prueba_hasta) VALUES (?, ?, ?, ?, ?, ?)')
      .run(email, hash, sal, ahora, b.novedades === true ? 1 : 0, ahora + DIAS_PRUEBA * DIA);
    const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
    ponerSesion(req, res, u);
    console.log(`CUENTA: ${JSON.stringify({ email, fecha: ahoraMadrid(), origen: String(b.origen || '').slice(0, 40) })}`);
    enviarLead({
      email, origen: 'carta-rapida-cuenta', restaurante: String(b.restaurante || '').slice(0, 120),
      estilo: String(b.estilo || '').slice(0, 20), platos: Number.isFinite(+b.platos) ? +b.platos : 0,
      novedades: b.novedades === true, fecha: ahoraMadrid()
    });
    res.json({ ok: true, cuenta: datosCuenta(u) });
  });

  r.post('/cuenta/entrar', limiteCuenta, sinCuentas, async (req, res) => {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const u = emailValido(email) && db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    if (!u || !claveCorrecta(String(b.clave || ''), u)) {
      return res.json({ ok: false, error: 'Email o contraseña incorrectos.' });
    }
    ponerSesion(req, res, u);
    const al = await sincronizar(u, true);
    res.json({ ok: true, cuenta: datosCuenta(al) });
  });

  r.post('/cuenta/salir', (req, res) => { quitarSesion(req, res); res.json({ ok: true }); });

  r.get('/cuenta/yo', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let u = usuarioDe(req);
    if (!u) return res.json({ ok: true, cuenta: null, cuentas: CUENTAS_ACTIVAS });
    u = await sincronizar(u);
    res.json({ ok: true, cuenta: datosCuenta(u), cuentas: CUENTAS_ACTIVAS });
  });

  r.post('/cuenta/clave', limiteCuenta, sinCuentas, conSesion, (req, res) => {
    const b = req.body || {};
    if (!claveCorrecta(String(b.actual || ''), req.usuario)) return res.json({ ok: false, campo: 'actual', error: 'La contraseña actual no es correcta.' });
    const nueva = String(b.nueva || '');
    if (nueva.length < 8 || nueva.length > 200) return res.json({ ok: false, campo: 'nueva', error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    const { sal, hash } = hashClave(nueva);
    db.prepare('UPDATE usuarios SET hash = ?, sal = ?, version_sesion = version_sesion + 1 WHERE id = ?').run(hash, sal, req.usuario.id);
    ponerSesion(req, res, db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id));
    res.json({ ok: true });
  });

  // Borrar la cuenta y todas sus cartas (RGPD). Si hay suscripción viva, se cancela en Stripe.
  r.post('/cuenta/borrar', limiteCuenta, sinCuentas, conSesion, async (req, res) => {
    const u = req.usuario;
    if (!claveCorrecta(String((req.body || {}).clave || ''), u)) return res.json({ ok: false, error: 'La contraseña no es correcta.' });
    if (u.sub_id && stripe && !u.sub_id.startsWith('demo_') && SUB_VIVA.includes(u.sub_estado)) {
      try { await stripe.subscriptions.cancel(u.sub_id); }
      catch (e) { console.error('[CUENTA] no se pudo cancelar la suscripción al borrar:', e.message); return res.json({ ok: false, error: 'No hemos podido cancelar tu suscripción. Escríbenos a hola@kartia.es y la borramos a mano.' }); }
    }
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(u.id);
    console.log(`CUENTA BORRADA: ${JSON.stringify({ email: u.email, fecha: ahoraMadrid() })}`);
    quitarSesion(req, res);
    res.json({ ok: true });
  });

  // ── Cartas guardadas ──
  r.get('/cartas', sinCuentas, conSesion, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const filas = db.prepare('SELECT id, titulo, estilo, datos, creado, actualizado FROM cartas WHERE usuario_id = ? ORDER BY actualizado DESC').all(req.usuario.id);
    res.json({ ok: true, cartas: filas.map(resumenCarta) });
  });

  r.get('/cartas/:id', sinCuentas, conSesion, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const c = db.prepare('SELECT * FROM cartas WHERE id = ? AND usuario_id = ?').get(String(req.params.id), req.usuario.id);
    if (!c) return res.status(404).json({ ok: false, error: 'No encontramos esa carta.' });
    res.json({ ok: true, id: c.id, titulo: c.titulo, actualizado: c.actualizado, ...JSON.parse(c.datos) });
  });

  r.post('/cartas', limite, sinCuentas, conSesion, conPlan, (req, res) => {
    const n = db.prepare('SELECT COUNT(*) AS n FROM cartas WHERE usuario_id = ?').get(req.usuario.id).n;
    if (n >= MAX_CARTAS) return res.json({ ok: false, error: `Has llegado al máximo de ${MAX_CARTAS} cartas. Borra alguna que ya no uses.` });
    const d = limpiarDatosCarta(req.body);
    if (!d) return res.status(400).json({ ok: false, error: 'Falta la carta.' });
    if (d.error) return res.json({ ok: false, error: d.error });
    const id = crypto.randomBytes(9).toString('base64url');
    const ahora = Date.now();
    db.prepare('INSERT INTO cartas (id, usuario_id, titulo, estilo, datos, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.usuario.id, d.titulo, d.estilo, d.json, ahora, ahora);
    res.json({ ok: true, id, actualizado: ahora });
  });

  r.put('/cartas/:id', sinCuentas, conSesion, conPlan, (req, res) => {
    const d = limpiarDatosCarta(req.body);
    if (!d) return res.status(400).json({ ok: false, error: 'Falta la carta.' });
    if (d.error) return res.json({ ok: false, error: d.error });
    const ahora = Date.now();
    const info = db.prepare('UPDATE cartas SET titulo = ?, estilo = ?, datos = ?, actualizado = ? WHERE id = ? AND usuario_id = ?')
      .run(d.titulo, d.estilo, d.json, ahora, String(req.params.id), req.usuario.id);
    if (!info.changes) return res.status(404).json({ ok: false, error: 'No encontramos esa carta.' });
    res.json({ ok: true, actualizado: ahora });
  });

  r.post('/cartas/:id/duplicar', limite, sinCuentas, conSesion, conPlan, (req, res) => {
    const c = db.prepare('SELECT * FROM cartas WHERE id = ? AND usuario_id = ?').get(String(req.params.id), req.usuario.id);
    if (!c) return res.status(404).json({ ok: false, error: 'No encontramos esa carta.' });
    const n = db.prepare('SELECT COUNT(*) AS n FROM cartas WHERE usuario_id = ?').get(req.usuario.id).n;
    if (n >= MAX_CARTAS) return res.json({ ok: false, error: `Has llegado al máximo de ${MAX_CARTAS} cartas.` });
    const id = crypto.randomBytes(9).toString('base64url');
    const ahora = Date.now();
    db.prepare('INSERT INTO cartas (id, usuario_id, titulo, estilo, datos, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.usuario.id, (c.titulo + ' (copia)').slice(0, 80), c.estilo, c.datos, ahora, ahora);
    res.json({ ok: true, id });
  });

  r.delete('/cartas/:id', sinCuentas, conSesion, (req, res) => {
    const info = db.prepare('DELETE FROM cartas WHERE id = ? AND usuario_id = ?').run(String(req.params.id), req.usuario.id);
    res.json({ ok: !!info.changes });
  });

  // ── Membresía ──
  r.get('/pago/config', (req, res) => {
    res.json({ ok: true, demo: MODO_DEMO, activos: PAGOS_ACTIVOS, cuentas: CUENTAS_ACTIVAS, diasPrueba: DIAS_PRUEBA, estilosPro: ESTILOS_PRO,
      planes: { mes: PLANES.mes.precio, ano: PLANES.ano.precio } });
  });

  r.post('/pago/crear', limite, sinCuentas, conSesion, async (req, res) => {
    const periodo = (req.body || {}).periodo === 'ano' ? 'ano' : 'mes';
    const u = req.usuario;
    const origen = origenDe(req);
    const vuelta = String((req.body || {}).vuelta || '') === 'panel' ? '/panel' : '/';
    try {
      if (!PAGOS_ACTIVOS) return res.json({ ok: false, error: 'El pago estará disponible en unos minutos. Mientras, tienes 7 días de prueba gratis.' });
      const p = planDeUsuario(u);
      if (p.plan === 'pro') return res.json({ ok: false, yaPro: true, error: 'Ya tienes Carta Pro activa.' });
      if (MODO_DEMO) {
        const id = 'demo_' + crypto.randomBytes(9).toString('base64url');
        return res.json({ ok: true, url: `${origen}/pago/demo?s=${id}&p=${periodo}&v=${encodeURIComponent(vuelta)}` });
      }
      const base = {
        mode: 'subscription',
        line_items: [{ quantity: 1, price: process.env[PLANES[periodo].env] || PLANES[periodo].defecto }],
        locale: 'es',
        client_reference_id: String(u.id),
        ...(u.stripe_cliente ? { customer: u.stripe_cliente } : { customer_email: u.email }),
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        subscription_data: { description: 'Carta Rápida Pro', metadata: { origen: 'carta-rapida', usuario: String(u.id) } },
        custom_text: { submit: { message: `Se renueva sola (${PLANES[periodo].texto}) hasta que la canceles, desde tu panel y en un clic. Empieza ya: al activarla renuncias al desistimiento.` } },
        metadata: { origen: 'carta-rapida', usuario: String(u.id), periodo },
        success_url: `${origen}${vuelta}?suscripcion={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origen}${vuelta}?suscripcion=cancelada`
      };
      let sesion;
      try {
        sesion = await stripe.checkout.sessions.create({ ...base, payment_method_types: ['card', 'paypal'] });
      } catch (e) {
        // Si PayPal no admite cobros recurrentes en la cuenta, se ofrece solo tarjeta (con Apple Pay y Google Pay)
        console.warn('[PAGO] sin PayPal en suscripción:', e.message);
        sesion = await stripe.checkout.sessions.create({ ...base, payment_method_types: ['card'] });
      }
      res.json({ ok: true, url: sesion.url });
    } catch (e) {
      console.error('[PAGO] no se pudo crear:', e.message);
      res.json({ ok: false, error: 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.' });
    }
  });

  // Pantalla de pago simulado (solo en local con PAGOS_DEMO=si)
  r.get('/pago/demo', (req, res) => {
    if (!MODO_DEMO) return res.redirect('/');
    const id = String(req.query.s || '').replace(/[^\w-]/g, '').slice(0, 40);
    const periodo = req.query.p === 'ano' ? 'ano' : 'mes';
    const vuelta = req.query.v === '/panel' ? '/panel' : '/';
    res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pago de prueba · Carta Rápida</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#F6F4F0;color:#1B1A17;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
.c{background:#fff;max-width:420px;width:100%;border-radius:16px;padding:28px;box-shadow:0 20px 50px -20px rgba(0,0,0,.25)}
.aviso{background:#FFF4D6;color:#7A5A00;font-size:13px;padding:10px 12px;border-radius:8px;margin-bottom:18px}
h1{font-size:20px;margin:0 0 4px}.p{font-size:34px;font-weight:700;margin:14px 0 2px}.s{color:#6A655C;font-size:13px;margin:0 0 22px}
a{display:block;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600}.si{background:#635BFF;color:#fff}.no{color:#6A655C;margin-top:8px}</style></head>
<body><div class="c"><div class="aviso"><b>Entorno de pruebas.</b> Pago simulado: no se cobra nada.</div>
<h1>Carta Rápida Pro</h1><div class="p">${PLANES[periodo].texto}</div><p class="s">IVA incluido · se renueva hasta que la canceles</p>
<a class="si" href="${vuelta}?suscripcion=${id}_${periodo}">Simular pago correcto</a><a class="no" href="${vuelta}?suscripcion=cancelada">Cancelar</a></div></body></html>`);
  });

  // Al volver de Stripe: comprobar el pago y activar Pro en la cuenta
  r.post('/pago/confirmar', limite, sinCuentas, conSesion, async (req, res) => {
    const sesionId = String((req.body || {}).sesion || '').replace(/[^\w-]/g, '').slice(0, 200);
    const u = req.usuario;
    if (!sesionId) return res.json({ ok: false, error: 'Falta el pago.' });
    try {
      if (sesionId.startsWith('demo_')) {
        if (!MODO_DEMO) return res.json({ ok: false, error: 'Pago no válido.' });
        const periodo = sesionId.endsWith('_ano') ? 'ano' : 'mes';
        const hasta = Date.now() + (periodo === 'ano' ? 365 : 30) * DIA;
        db.prepare(`UPDATE usuarios SET sub_id = ?, sub_estado = 'active', sub_plan = ?, sub_hasta = ?, sub_cancela = 0, sub_revisado = ? WHERE id = ?`)
          .run(sesionId, periodo, hasta, Date.now(), u.id);
      } else {
        if (!stripe) return res.json({ ok: false, error: 'Pago no válido.' });
        const s = await stripe.checkout.sessions.retrieve(sesionId, { expand: ['subscription'] });
        if (String(s.client_reference_id) !== String(u.id)) return res.json({ ok: false, error: 'Este pago es de otra cuenta. Entra con el email con el que pagaste.' });
        if (s.status !== 'complete' || !s.subscription) return res.json({ ok: false, error: 'El pago no se ha completado.' });
        const sub = typeof s.subscription === 'string' ? await stripe.subscriptions.retrieve(s.subscription) : s.subscription;
        guardarSuscripcion(u.id, { ...sub, customer: sub.customer || s.customer });
        const nuevo = !u.sub_id || u.sub_id !== sub.id;
        if (nuevo) {
          console.log(`PAGO: ${JSON.stringify({ email: u.email, sub: sub.id, periodo: periodoDe(sub), importe: (s.amount_total || 0) / 100, fecha: ahoraMadrid() })}`);
          enviarLead({ email: u.email, origen: 'carta-rapida-pro', restaurante: '', estilo: '', platos: 0, fecha: ahoraMadrid(), pago: (s.amount_total || 0) / 100 });
        }
      }
      const al = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(u.id);
      res.json({ ok: true, cuenta: datosCuenta(al) });
    } catch (e) {
      console.error('[PAGO] no se pudo confirmar:', e.message);
      res.json({ ok: false, error: 'No hemos podido comprobar el pago. Si te lo han cobrado, escríbenos a hola@kartia.es y lo activamos a mano.' });
    }
  });

  // Portal de Stripe: cambiar tarjeta, ver facturas, cambiar de mensual a anual o cancelar
  r.post('/cuenta/portal', limite, sinCuentas, conSesion, async (req, res) => {
    const u = req.usuario;
    if (!stripe || !u.stripe_cliente) return res.json({ ok: false, error: 'No hay ninguna suscripción que gestionar.' });
    try {
      const p = await stripe.billingPortal.sessions.create({ customer: u.stripe_cliente, return_url: `${origenDe(req)}/panel?portal=1`, locale: 'es' });
      db.prepare('UPDATE usuarios SET sub_revisado = 0 WHERE id = ?').run(u.id); // al volver, se revisa el estado
      res.json({ ok: true, url: p.url });
    } catch (e) {
      console.error('[PORTAL] no se pudo abrir:', e.message);
      res.json({ ok: false, error: 'No hemos podido abrir la gestión de tu suscripción. Escríbenos a hola@kartia.es.' });
    }
  });

  return r;
}

module.exports = { crearRutas, planDe, ESTILOS_PRO, MODO_DEMO, PAGOS_ACTIVOS, CUENTAS_ACTIVAS, persistente };
