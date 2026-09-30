// Envío de leads: log en Railway (siempre), webhook opcional y Listmonk (campanas.kartia.es) si está configurado.
//
// Variables en Railway:
//   LISTMONK_URL            https://campanas.kartia.es
//   LISTMONK_USUARIO        usuario de API creado en Listmonk (Ajustes → Usuarios → API)
//   LISTMONK_TOKEN          token de ese usuario
//   LISTMONK_LISTA_LEADS    id de la lista privada "Leads Carta Rápida" (todos los leads, para seguimiento comercial)
//   LISTMONK_LISTA_NOVEDADES id de la lista de novedades con doble opt-in (solo quien marca la casilla)
//   LEADS_WEBHOOK_URL       (opcional) otro destino: Make, Sheets…

const URL_LM = (process.env.LISTMONK_URL || '').replace(/\/$/, '');
const AUTH = process.env.LISTMONK_USUARIO && process.env.LISTMONK_TOKEN
  ? 'Basic ' + Buffer.from(`${process.env.LISTMONK_USUARIO}:${process.env.LISTMONK_TOKEN}`).toString('base64')
  : '';
const LISTA_LEADS = parseInt(process.env.LISTMONK_LISTA_LEADS, 10) || null;
const LISTA_NOVEDADES = parseInt(process.env.LISTMONK_LISTA_NOVEDADES, 10) || null;
const LISTMONK_ACTIVO = !!(URL_LM && AUTH && (LISTA_LEADS || LISTA_NOVEDADES));

async function llamar(metodo, ruta, cuerpo) {
  const r = await fetch(URL_LM + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(8000)
  });
  const texto = await r.text();
  let datos = null; try { datos = JSON.parse(texto); } catch {}
  return { status: r.status, datos, texto };
}

async function aListmonk(lead) {
  const listas = [];
  if (LISTA_LEADS) listas.push(LISTA_LEADS);
  if (LISTA_NOVEDADES && lead.novedades === true) listas.push(LISTA_NOVEDADES);
  if (!listas.length) return;
  const attribs = {
    origen: lead.origen, restaurante: lead.restaurante || '', estilo: lead.estilo || '',
    platos: lead.platos || 0, novedades: lead.novedades === true, canal: 'carta-rapida'
  };
  if (lead.pago) attribs.pago = lead.pago;
  if (lead.codigo) attribs.codigo = lead.codigo;

  const alta = await llamar('POST', '/api/subscribers', {
    email: lead.email, name: lead.restaurante || lead.email.split('@')[0],
    status: 'enabled', lists: listas, attribs, preconfirm_subscriptions: false
  });
  if (alta.status === 200) return;
  if (alta.status !== 409) throw new Error(`alta ${alta.status}: ${alta.texto.slice(0, 200)}`);

  // Ya existe: se le añaden las listas (las de doble opt-in quedan sin confirmar hasta que acepte)
  const q = encodeURIComponent(`subscribers.email = '${lead.email.replace(/'/g, "''")}'`);
  const busca = await llamar('GET', `/api/subscribers?query=${q}&per_page=1`);
  const id = busca.datos && busca.datos.data && busca.datos.data.results && busca.datos.data.results[0] && busca.datos.data.results[0].id;
  if (!id) throw new Error('existe pero no se encuentra');
  const r = await llamar('PUT', '/api/subscribers/lists', { ids: [id], action: 'add', target_list_ids: listas, status: 'unconfirmed' });
  if (r.status !== 200) throw new Error(`listas ${r.status}: ${r.texto.slice(0, 200)}`);
}

function enviarLead(lead) {
  console.log(`LEAD: ${JSON.stringify(lead)}`);
  // Se guarda también en la base de datos para verlo en /admin
  try {
    const { db } = require('./db');
    if (db) db.prepare('INSERT INTO leads (email, origen, restaurante, estilo, platos, novedades, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(String(lead.email || '').slice(0, 200), String(lead.origen || '').slice(0, 60), String(lead.restaurante || '').slice(0, 120),
        String(lead.estilo || '').slice(0, 20), Number.isFinite(+lead.platos) ? +lead.platos : 0, lead.novedades === true ? 1 : 0, Date.now());
  } catch (e) { console.error('[LEAD] no se pudo guardar en la base de datos:', e.message); }
  if (process.env.LEADS_WEBHOOK_URL) {
    fetch(process.env.LEADS_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) })
      .catch(err => console.error('[LEAD] webhook falló:', err.message));
  }
  if (LISTMONK_ACTIVO) {
    aListmonk(lead).then(() => console.log(`[LISTMONK] ok ${lead.origen}`))
      .catch(err => console.error('[LISTMONK] falló:', err.message));
  }
}

module.exports = { enviarLead, LISTMONK_ACTIVO };
