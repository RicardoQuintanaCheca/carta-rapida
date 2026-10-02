// Envío de correos de la plataforma (recuperar contraseña).
// Funciona con cualquiera de estas dos opciones (se configura en Railway → Variables):
//
//   A) Resend (recomendado y OBLIGATORIO en Railway Hobby, que bloquea los puertos SMTP; 3.000 correos/mes gratis):
//      RESEND_API_KEY     la clave que da Resend
//
//   B) Cualquier servidor SMTP (Gmail, Amazon SES, Brevo, el hosting…):
//      SMTP_HOST          p. ej. smtp.gmail.com
//      SMTP_PORT          587 (o 465)
//      SMTP_USUARIO       el usuario / email
//      SMTP_CLAVE         la contraseña (en Gmail: «contraseña de aplicación»)
//
//   En los dos casos:
//      CORREO_REMITENTE   p. ej.  Carta Rápida <hola@kartia.es>
//
// Sin nada configurado, la web sigue funcionando y ofrece escribir a hola@kartia.es.

const REMITENTE = process.env.CORREO_REMITENTE || process.env.SMTP_USUARIO || '';
const RESEND = process.env.RESEND_API_KEY || '';
const SMTP = process.env.SMTP_HOST && process.env.SMTP_USUARIO && process.env.SMTP_CLAVE;
const CORREO_ACTIVO = !!(REMITENTE && (RESEND || SMTP));

let transporte = null;
function smtp() {
  if (!transporte) {
    const nodemailer = require('nodemailer');
    const puerto = parseInt(process.env.SMTP_PORT, 10) || 587;
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: puerto, secure: puerto === 465,
      auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE },
      // Sin esperas de minutos si el puerto está bloqueado (Railway bloquea SMTP salvo en el plan Pro)
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000
    });
  }
  return transporte;
}

async function enviarCorreo({ para, asunto, html, texto, adjuntos = [], responderA }) {
  if (!CORREO_ACTIVO) return false;
  try {
    if (RESEND) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: REMITENTE, to: [para], subject: asunto, html, text: texto, ...(responderA ? { reply_to: responderA } : {}),
          ...(adjuntos.length ? { attachments: adjuntos.map(a => ({ filename: a.nombre, content: Buffer.from(a.contenido).toString('base64') })) } : {}) }),
        signal: AbortSignal.timeout(10000)
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    } else {
      await smtp().sendMail({ from: REMITENTE, to: para, subject: asunto, html, text: texto, ...(responderA ? { replyTo: responderA } : {}),
        attachments: adjuntos.map(a => ({ filename: a.nombre, content: Buffer.from(a.contenido), contentType: a.tipo || 'application/pdf' })) });
    }
    console.log(`[CORREO] enviado «${asunto}» a ${para}`);
    return true;
  } catch (e) {
    console.error('[CORREO] no se pudo enviar:', e.message);
    return false;
  }
}

// Plantilla sencilla, fondo blanco, un botón naranja
function plantilla({ titulo, texto, boton, enlace, pie }) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const F = "font-family:Manrope,'Helvetica Neue',Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F6F3EE;${F};color:#16130F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;padding:36px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FFFFFF;border-radius:14px;padding:40px 36px">
<tr><td style="${F};font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#16130F">Carta <span style="color:#CC4416">Rápida</span></td></tr>
<tr><td style="${F};padding-top:28px;font-size:28px;font-weight:bold;line-height:1.15;letter-spacing:-0.8px">${esc(titulo)}</td></tr>
<tr><td style="${F};padding-top:14px;font-size:16.5px;line-height:1.6;color:#6E675F">${esc(texto)}</td></tr>
${enlace ? `<tr><td style="padding-top:28px"><a href="${esc(enlace)}" style="${F};display:inline-block;background:#CC4416;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:16px;padding:16px 26px;border-radius:10px">${esc(boton)}</a></td></tr>` : ''}
<tr><td style="${F};padding-top:30px;margin-top:30px;font-size:13.5px;line-height:1.55;color:#6E675F"><div style="border-top:1px solid #EAE5DE;padding-top:20px">${esc(pie)}${enlace ? `<br><br>Si el botón no funciona, copia este enlace en el navegador:<br><span style="word-break:break-all;color:#B4400E">${esc(enlace)}</span>` : ''}</div></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px"><tr><td style="${F};padding:18px 8px 0;font-size:12.5px;line-height:1.5;color:#8F877E">Carta Rápida es de Kartia, portamenús hechos a mano en España · cartarapida.kartia.es</td></tr></table>
</td></tr></table></body></html>`;
}

module.exports = { enviarCorreo, plantilla, CORREO_ACTIVO };
