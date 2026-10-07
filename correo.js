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
//      CORREO_REMITENTE   p. ej.  Carta Rápida <hola@cartarapida.es>
//
// Sin nada configurado, la web sigue funcionando y ofrece escribir a hola@cartarapida.es.

// Dirección pública de la web (en Railway: PUBLIC_URL). Mientras no se cambie, la de siempre.
const WEB = (process.env.PUBLIC_URL || 'https://www.cartarapida.es').replace(/\/$/, '');
const WEB_CORTA = WEB.replace(/^https?:\/\//, '');
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
  const F = "font-family:'Bricolage Grotesque','Helvetica Neue',Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F3F3F5;${F};color:#0C0C0D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F5;padding:36px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FFFFFF;border-radius:14px;padding:40px 36px">
<tr><td style="${F};font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#0C0C0D">Carta <span style="color:#FF4A1C">Rápida</span></td></tr>
<tr><td style="${F};padding-top:28px;font-size:28px;font-weight:bold;line-height:1.15;letter-spacing:-0.8px">${esc(titulo)}</td></tr>
<tr><td style="${F};padding-top:14px;font-size:16.5px;line-height:1.6;color:#6C6C72">${esc(texto)}</td></tr>
${enlace ? `<tr><td style="padding-top:28px"><a href="${esc(enlace)}" style="${F};display:inline-block;background:#FF4A1C;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:16px;padding:16px 26px;border-radius:10px">${esc(boton)}</a></td></tr>` : ''}
<tr><td style="${F};padding-top:30px;margin-top:30px;font-size:13.5px;line-height:1.55;color:#6C6C72"><div style="border-top:1px solid #E6E6EA;padding-top:20px">${esc(pie)}${enlace ? `<br><br>Si el botón no funciona, copia este enlace en el navegador:<br><span style="word-break:break-all;color:#C93A0E">${esc(enlace)}</span>` : ''}</div></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px"><tr><td style="${F};padding:18px 8px 0;font-size:12.5px;line-height:1.5;color:#8F877E">Carta Rápida es de Kartia, portamenús hechos a mano en España · ${WEB_CORTA}</td></tr></table>
</td></tr></table></body></html>`;
}

// Correo con la carta: la imagen de la carta, cómo imprimirla y los siguientes pasos
function plantillaCarta({ restaurante, estilo, imagen, conPase }) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const F = "font-family:'Bricolage Grotesque','Helvetica Neue',Helvetica,Arial,sans-serif";
  const web = WEB;
  const fila = (n, t) => `<tr><td width="34" valign="top" style="${F};padding:7px 0;font-size:13px;font-weight:bold;color:#FF4A1C">${n}</td><td style="${F};padding:7px 0;font-size:15.5px;line-height:1.5;color:#3A3A40">${t}</td></tr>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F3F3F5;${F};color:#0C0C0D">
<div style="display:none;max-height:0;overflow:hidden">Va adjunta en PDF, en A4 y lista para imprimir.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3F5;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden">
<tr><td style="${F};padding:30px 36px 0;font-size:19px;font-weight:800;letter-spacing:-0.5px;color:#0C0C0D">Carta <span style="color:#FF4A1C">Rápida</span></td></tr>
<tr><td style="${F};padding:26px 36px 0;font-size:34px;font-weight:bold;line-height:1.05;letter-spacing:-1.2px">Tu carta<br><span style="color:#FF4A1C">está lista.</span></td></tr>
<tr><td style="${F};padding:14px 36px 0;font-size:16.5px;line-height:1.55;color:#6C6C72">${restaurante ? `La de <b style="color:#0C0C0D">${esc(restaurante)}</b>, ` : 'La tuya, '}en estilo ${esc(estilo)}. Va adjunta en PDF, en A4 y lista para imprimir.</td></tr>
${imagen ? `<tr><td align="center" style="padding:28px 36px 0"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F3F3F5;border-radius:12px"><tr><td align="center" style="padding:26px 20px"><img src="${esc(imagen)}" width="290" alt="Tu carta maquetada" style="display:block;width:290px;max-width:100%;height:auto;border:1px solid #E6E6EA;border-radius:4px"></td></tr></table></td></tr>` : ''}
<tr><td style="${F};padding:30px 36px 0;font-size:13px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#0C0C0D">Para que salga perfecta</td></tr>
<tr><td style="padding:8px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${fila('01', 'Abre el PDF adjunto e imprime en <b>A4</b>.')}
${fila('02', 'Elige <b>tamaño real o 100 %</b>. No marques «ajustar a la página».')}
${fila('03', 'En papel blanco. Si es algo más grueso que el de oficina, mejor.')}
</table></td></tr>
<tr><td style="padding:30px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0C0C0D;border-radius:12px"><tr><td style="padding:26px 26px 28px">
<div style="${F};font-size:21px;font-weight:bold;line-height:1.2;letter-spacing:-0.5px;color:#FFFFFF">¿Mañana cambia un precio?</div>
<div style="${F};padding-top:8px;font-size:15.5px;line-height:1.55;color:#C9C9D0">Crea tu cuenta, que es gratis, y la carta se queda guardada: cambias lo que haga falta y la descargas otra vez.</div>
<div style="padding-top:18px"><a href="${web}/panel" style="${F};display:inline-block;background:#FF4A1C;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15.5px;padding:14px 22px;border-radius:10px">Guardar mi carta gratis</a></div>
${conPase ? `<div style="${F};padding-top:14px;font-size:14px;line-height:1.5;color:#9A9AA3">¿Sin suscripciones? <a href="${web}/?pase=quiero" style="color:#FFFFFF">Pase de 7 días por 15 €, una sola vez</a>.</div>` : ''}
</td></tr></table></td></tr>
<tr><td style="padding:26px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E6E6EA;border-radius:12px"><tr><td style="padding:22px 24px">
<div style="${F};font-size:18px;font-weight:bold;letter-spacing:-0.4px;color:#0C0C0D">Ya tienes la carta. ¿Dónde la vas a poner?</div>
<div style="${F};padding-top:6px;font-size:15px;line-height:1.55;color:#6C6C72">En Kartia hacemos a mano portamenús para restaurantes y hoteles. Si quieres ver cómo quedaría la tuya en uno, respóndenos a este correo.</div>
<div style="padding-top:12px"><a href="https://kartia.es" style="${F};font-size:15px;font-weight:bold;color:#C93A0E">Ver portamenús Kartia</a></div>
</td></tr></table></td></tr>
<tr><td style="${F};padding:26px 36px 32px;font-size:13px;line-height:1.55;color:#8A8A92">Te escribimos porque has pedido tu carta en Carta Rápida. Si no has sido tú, ignora este correo.</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="${F};padding:18px 8px 0;font-size:12.5px;line-height:1.5;color:#8A8A92">Carta Rápida es de Kartia, portamenús hechos a mano en España · ${WEB_CORTA}</td></tr></table>
</td></tr></table></body></html>`;
}

module.exports = { enviarCorreo, plantilla, plantillaCarta, CORREO_ACTIVO, WEB };
