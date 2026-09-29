// Carta Pro: licencias firmadas (sin cuentas), prueba gratis de 7 días y cobro con Stripe.
// Sin STRIPE_SECRET_KEY funciona en MODO DEMO: el pago se simula y no se cobra nada.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const PRECIO_CENTIMOS = 1900;
const DIAS_PRO = 30;
const DIAS_PRUEBA = 7;
const DIA = 24 * 60 * 60 * 1000;

const CLAVE_STRIPE = process.env.STRIPE_SECRET_KEY || '';
const MODO_DEMO = !CLAVE_STRIPE;
const stripe = CLAVE_STRIPE ? require('stripe')(CLAVE_STRIPE) : null;

// Secreto para firmar licencias. Si no se configura, se deriva de la clave de OpenAI (estable entre reinicios)
const SECRETO = process.env.LICENCIA_SECRETO
  || crypto.createHash('sha256').update('carta-rapida|' + (process.env.OPENAI_API_KEY || 'local')).digest('hex');

const b64 = s => Buffer.from(s).toString('base64url');
const firmar = datos => crypto.createHmac('sha256', SECRETO).update(datos).digest('base64url');

function emitirLicencia({ plan, email, caduca, codigo }) {
  const datos = b64(JSON.stringify({ v: 1, p: plan, e: email || '', x: caduca, c: codigo || '' }));
  return `${datos}.${firmar(datos)}`;
}

// Devuelve la licencia si es válida y no ha caducado; si no, null
function leerLicencia(token) {
  if (typeof token !== 'string' || token.length > 1000 || !token.includes('.')) return null;
  const [datos, firma] = token.split('.');
  const esperada = firmar(datos);
  if (!firma || firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const l = JSON.parse(Buffer.from(datos, 'base64url').toString());
    if (!l || !['pro', 'prueba'].includes(l.p) || !(l.x > Date.now())) return null;
    return { plan: l.p, email: l.e, caduca: l.x, codigo: l.c };
  } catch { return null; }
}

const licenciaDe = req => leerLicencia(req.get('x-licencia') || '');

// === Registro mínimo en disco (pruebas usadas y pagos confirmados) ===
// En Railway conviene montar un volumen en /app/datos para que no se borre al redesplegar.
// Todo se escribe también en los logs (líneas PAGO: y PRUEBA:) por si el archivo se pierde.
const DIR_DATOS = process.env.DATA_DIR || path.join(__dirname, 'datos');
const ARCHIVO = path.join(DIR_DATOS, 'registro.json');
let registro = { pruebas: {}, pagos: {} };
try { registro = { pruebas: {}, pagos: {}, ...JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) }; } catch {}
function guardarRegistro() {
  try {
    fs.mkdirSync(DIR_DATOS, { recursive: true });
    fs.writeFileSync(ARCHIVO + '.tmp', JSON.stringify(registro));
    fs.renameSync(ARCHIVO + '.tmp', ARCHIVO);
  } catch (e) { console.error('[REGISTRO] no se pudo guardar:', e.message); }
}

// Código para descontar los 19 € en un pedido de portamenús
function codigoDescuento(sesion) {
  const h = crypto.createHmac('sha256', SECRETO).update('codigo|' + sesion).digest('hex').toUpperCase();
  return 'KARTIA-' + h.replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const origenDe = req => (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

const { enviarLead: avisarLead } = require('./leads');
const ahoraMadrid = () => new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

function crearRutas({ limite }) {
  const r = express.Router();

  r.get('/pago/config', (req, res) => {
    res.json({ ok: true, demo: MODO_DEMO, precio: PRECIO_CENTIMOS / 100, dias: DIAS_PRO, diasPrueba: DIAS_PRUEBA });
  });

  // 1) Crear el pago: devuelve la URL a la que mandar al cliente
  r.post('/pago/crear', limite, async (req, res) => {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
    const restaurante = String(b.restaurante || '').slice(0, 120);
    const origen = origenDe(req);
    try {
      if (MODO_DEMO) {
        const id = 'demo_' + crypto.randomBytes(9).toString('base64url');
        return res.json({ ok: true, url: `${origen}/pago/demo?s=${id}` });
      }
      // Producto y precio creados en Stripe (19 € IVA incluido); se puede cambiar con STRIPE_PRICE_ID
      const linea = { quantity: 1, price: process.env.STRIPE_PRICE_ID || 'price_1UL12HRZgd5ArTbXFbsfkhAl' };
      const conFactura = !!process.env.STRIPE_TAX_RATE; // factura con IVA desglosado solo si hay tipo de IVA configurado
      if (conFactura) linea.tax_rates = [process.env.STRIPE_TAX_RATE];
      const sesion = await stripe.checkout.sessions.create({
        mode: 'payment',
        // Solo tarjeta: Apple Pay y Google Pay aparecen solos dentro de la tarjeta; fuera Klarna, MB Way, etc.
        payment_method_types: ['card'],
        line_items: [linea],
        locale: 'es',
        customer_email: emailValido(email) ? email : undefined,
        customer_creation: 'always',
        billing_address_collection: conFactura ? 'required' : 'auto',
        ...(conFactura ? {
          tax_id_collection: { enabled: true },
          invoice_creation: { enabled: true, invoice_data: { description: 'Carta Rápida Pro · Kartia', footer: 'Te descontamos este importe si en los próximos 6 meses nos pides portamenús Kartia.' } }
        } : {}),
        allow_promotion_codes: true,
        payment_intent_data: { description: 'Carta Rápida Pro · 30 días', metadata: { origen: 'carta-rapida', restaurante } },
        custom_text: { submit: { message: 'Carta Pro se activa al momento. Al pagar pides que empiece ya y aceptas que por ello no hay desistimiento.' } },
        metadata: { origen: 'carta-rapida', restaurante },
        success_url: `${origen}/?pago={CHECKOUT_SESSION_ID}#herramienta`,
        cancel_url: `${origen}/?pago=cancelado#herramienta`
      });
      res.json({ ok: true, url: sesion.url });
    } catch (e) {
      console.error('[PAGO] no se pudo crear:', e.message);
      res.json({ ok: false, error: 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.' });
    }
  });

  // Pantalla de pago simulado (solo en modo demo)
  r.get('/pago/demo', (req, res) => {
    if (!MODO_DEMO) return res.redirect('/');
    const id = String(req.query.s || '').replace(/[^\w-]/g, '').slice(0, 40);
    res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pago de prueba · Carta Rápida</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#F6F4F0;color:#1B1A17;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
.c{background:#fff;max-width:420px;width:100%;border-radius:16px;padding:28px;box-shadow:0 20px 50px -20px rgba(0,0,0,.25)}
.aviso{background:#FFF4D6;color:#7A5A00;font-size:13px;padding:10px 12px;border-radius:8px;margin-bottom:18px}
h1{font-size:20px;margin:0 0 4px}.p{font-size:34px;font-weight:700;margin:14px 0 2px}.s{color:#6A655C;font-size:13px;margin:0 0 22px}
a{display:block;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600}
.si{background:#635BFF;color:#fff}.no{color:#6A655C;margin-top:8px}</style></head>
<body><div class="c"><div class="aviso"><b>Entorno de pruebas.</b> Este pago es simulado: no se cobra nada. Con Stripe conectado, aquí aparece la pasarela real (tarjeta, Apple Pay, Google Pay).</div>
<h1>Carta Rápida Pro · ${DIAS_PRO} días</h1><div class="p">${(PRECIO_CENTIMOS / 100).toFixed(2).replace('.', ',')} €</div><p class="s">Pago único · IVA incluido · factura a tu nombre</p>
<a class="si" href="/?pago=${id}#herramienta">Simular pago correcto</a><a class="no" href="/?pago=cancelado#herramienta">Cancelar</a></div></body></html>`);
  });

  // 2) Confirmar el pago al volver de la pasarela y entregar la licencia
  r.post('/pago/confirmar', limite, async (req, res) => {
    const sesionId = String((req.body || {}).sesion || '').replace(/[^\w-]/g, '').slice(0, 200);
    if (!sesionId) return res.json({ ok: false, error: 'Falta el pago.' });
    try {
      let previo = registro.pagos[sesionId];
      if (!previo) {
        let email = '', restaurante = '', importe = PRECIO_CENTIMOS;
        if (sesionId.startsWith('demo_')) {
          if (!MODO_DEMO) return res.json({ ok: false, error: 'Pago no válido.' });
        } else {
          if (!stripe) return res.json({ ok: false, error: 'Pago no válido.' });
          const s = await stripe.checkout.sessions.retrieve(sesionId);
          if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return res.json({ ok: false, error: 'El pago no se ha completado.' });
          if (s.status !== 'complete') return res.json({ ok: false, error: 'El pago no se ha completado.' });
          email = (s.customer_details && s.customer_details.email) || s.customer_email || '';
          restaurante = (s.metadata && s.metadata.restaurante) || '';
          importe = s.amount_total;
        }
        previo = { email, restaurante, importe, fecha: Date.now(), caduca: Date.now() + DIAS_PRO * DIA, codigo: codigoDescuento(sesionId), demo: sesionId.startsWith('demo_') };
        registro.pagos[sesionId] = previo;
        guardarRegistro();
        console.log(`PAGO: ${JSON.stringify({ sesion: sesionId, ...previo, fecha: ahoraMadrid() })}`);
        if (email) avisarLead({ email, origen: 'carta-rapida-pro', restaurante, estilo: '', platos: 0, fecha: ahoraMadrid(), pago: importe / 100, codigo: previo.codigo });
      }
      const licencia = emitirLicencia({ plan: 'pro', email: previo.email, caduca: previo.caduca, codigo: previo.codigo });
      res.json({ ok: true, licencia, plan: 'pro', caduca: previo.caduca, email: previo.email, codigo: previo.codigo, demo: !!previo.demo });
    } catch (e) {
      console.error('[PAGO] no se pudo confirmar:', e.message);
      res.json({ ok: false, error: 'No hemos podido comprobar el pago. Si te lo han cobrado, escríbenos a hola@kartia.es y lo activamos a mano.' });
    }
  });

  // Prueba gratis: 7 días de Pro a cambio del email (una por email)
  r.post('/prueba', limite, (req, res) => {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
    if (!emailValido(email)) return res.json({ ok: false, error: 'Revisa el email.' });
    const usada = registro.pruebas[email];
    if (usada && Date.now() > usada.caduca) {
      return res.json({ ok: false, usada: true, error: 'Ya disfrutaste de la prueba con este email. Pásate a Pro para seguir con tu logo y sin firma.' });
    }
    const caduca = usada ? usada.caduca : Date.now() + DIAS_PRUEBA * DIA;
    if (!usada) {
      registro.pruebas[email] = { fecha: Date.now(), caduca, restaurante: String(b.restaurante || '').slice(0, 120), novedades: b.novedades === true };
      guardarRegistro();
      console.log(`PRUEBA: ${JSON.stringify({ email, caduca: new Date(caduca).toISOString() })}`);
      avisarLead({
        email, origen: 'carta-rapida-prueba', restaurante: String(b.restaurante || '').slice(0, 120),
        estilo: String(b.estilo || '').slice(0, 20), platos: Number.isFinite(+b.platos) ? +b.platos : 0,
        novedades: b.novedades === true, fecha: ahoraMadrid()
      });
    }
    res.json({ ok: true, licencia: emitirLicencia({ plan: 'prueba', email, caduca }), plan: 'prueba', caduca, email });
  });

  // Comprobar una licencia guardada en el navegador
  r.post('/licencia', (req, res) => {
    const l = leerLicencia(String((req.body || {}).licencia || ''));
    res.json(l ? { ok: true, ...l } : { ok: false });
  });

  return r;
}

module.exports = { crearRutas, licenciaDe, MODO_DEMO };
