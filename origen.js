// Trazabilidad de campañas, sin terceros: de dónde viene cada visita y hasta dónde llega.
// Al entrar se anota el origen (utm_*, gclid, fbclid, ttclid o la web de procedencia) en una cookie
// propia (cr_o, 30 días). Cada paso importante (carta, descarga, cuenta, Pro) se guarda con ese origen
// y el panel /admin lo cruza por campaña.
const COOKIE = 'cr_o', VISITA = 'cr_v', DIAS = 30;
const limpio = (x, n = 40) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._\-+ ]/g, '').trim().replace(/\s+/g, '-').slice(0, n);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|curl|wget|python|node-fetch|axios/i;
const REDES = [
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)facebook\.com$|(^|\.)fb\.com$|^l\.facebook|^lm\.facebook/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'], [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube'], [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'linkedin'],
  [/(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x'], [/^(www\.)?google\./, 'google'], [/(^|\.)bing\.com$/, 'bing'],
  [/whatsapp/, 'whatsapp'], [/mail\.|outlook\.|gmail/, 'email'], [/(^|\.)kartia\.es$/, 'kartia.es']
];
function leerCookie(req, nombre) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + nombre + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
// Origen de esta petición si trae datos de campaña o viene de otra web; null si no dice nada nuevo
function origenNuevo(req) {
  const q = req.query || {};
  const s = limpio(q.utm_source), m = limpio(q.utm_medium), c = limpio(q.utm_campaign, 60), k = limpio(q.utm_content);
  if (s || c) return { s: s || '?', m, c, k };
  if (q.gclid || q.gbraid || q.wbraid) return { s: 'google', m: 'cpc', c: '', k: '' };
  if (q.fbclid) return { s: 'meta', m: 'enlace', c: '', k: '' };
  if (q.ttclid) return { s: 'tiktok', m: 'cpc', c: '', k: '' };
  let host = '';
  try { host = new URL(req.get('referer') || '').hostname.replace(/^www\./, ''); } catch {}
  if (!host || host === req.hostname || /cartarapida\.es$|railway\.app$|localhost/.test(host)) return null;
  const red = REDES.find(([re]) => re.test(host));
  const s2 = red ? red[1] : host.slice(0, 40);
  return { s: s2, m: red && ['google', 'bing'].includes(s2) ? 'organico' : 'referido', c: '', k: '' };
}
const etiqueta = o => o ? [o.s, o.m, o.c].filter(Boolean).join(' / ') + (o.k ? ' · ' + o.k : '') : 'directo';

function origenDe(req) {
  if (req._origen !== undefined) return req._origen;
  try { const o = JSON.parse(Buffer.from(leerCookie(req, COOKIE), 'base64url').toString()); return (req._origen = etiqueta(o)); } catch { return (req._origen = 'directo'); }
}

// Middleware: solo en páginas (no en imágenes, PDF ni llamadas de la web)
function marcarOrigen(evento) {
  return (req, res, next) => {
    if (req.method !== 'GET' || !/text\/html/.test(req.get('accept') || '') || /^\/(admin|stripe|salud|carta\/|ejemplo|fuentes)/.test(req.path) || /\.[a-z0-9]{2,5}$/i.test(req.path) && !/\.html$/.test(req.path)) return next();
    if (BOT.test(req.get('user-agent') || '')) return next();
    const nuevo = origenNuevo(req);
    const seguro = req.secure || req.get('x-forwarded-proto') === 'https';
    const attrs = `; Path=/; SameSite=Lax${seguro ? '; Secure' : ''}`;
    const galletas = [];
    if (nuevo) {
      galletas.push(`${COOKIE}=${Buffer.from(JSON.stringify(nuevo)).toString('base64url')}; Max-Age=${DIAS * 86400}${attrs}`);
      req._origen = etiqueta(nuevo);
    }
    // Una visita = una sesión del navegador (la cookie cr_v se borra al cerrarlo), o un clic nuevo de campaña
    if (!leerCookie(req, VISITA) || nuevo) {
      galletas.push(`${VISITA}=1${attrs}`);
      evento('visita', req.path.slice(0, 60), origenDe(req));
    }
    if (galletas.length) res.append('Set-Cookie', galletas);
    next();
  };
}
module.exports = { marcarOrigen, origenDe };
