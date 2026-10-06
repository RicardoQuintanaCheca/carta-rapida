/* Cuenta y Carta Pro (compartido por la web y el panel).
   - Cuenta.cargar(): lee la sesión (/cuenta/yo)
   - Cuenta.acceso({modo, motivo, alEntrar}): ventana de entrar / crear cuenta (crear = 7 días de Pro gratis)
   - Cuenta.planes({motivo, vuelta}): ventana para hacerse Pro (mensual o anual)
   - Cuenta.vueltaDelPago(): al volver de Stripe con ?suscripcion=...
   - Cuenta.restablecer(token): nueva contraseña desde el enlace del correo (?restablecer=...)
   Acceso con Google si el servidor tiene GOOGLE_CLIENT_ID (/cuenta/config).
   Emite el evento "cuenta" en window cada vez que cambia el estado. */
(function () {
  const PRECIOS = { mes: '12,90 €', ano: '9,90 €', anoTotal: '118,80 €' };
  const fmtFecha = ms => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const medir = (e, d) => { try { if (typeof window.medir === 'function') window.medir(e, d); } catch (err) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function api(ruta, datos, metodo) {
    const op = { method: metodo || (datos ? 'POST' : 'GET'), headers: {}, credentials: 'same-origin' };
    if (datos) { op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(datos); }
    const r = await fetch(ruta, op);
    let d = {};
    try { d = await r.json(); } catch (e) { d = { ok: false, error: 'Sin respuesta del servidor. Inténtalo de nuevo.' }; }
    d.status = r.status;
    return d;
  }

  const Cuenta = {
    estado: null,       // datos de la cuenta o null
    cargada: false,
    activas: true,      // el servidor admite cuentas
    api,
    esPro() { return !!(this.estado && this.estado.plan !== 'gratis'); },
    textoPlan() {
      const c = this.estado;
      if (!c) return '';
      if (c.plan === 'pro') return c.cancela ? `Pro hasta el ${fmtFecha(c.hasta)} (cancelada)` : `Pro ${c.periodo === 'ano' ? 'anual' : 'mensual'} · se renueva el ${fmtFecha(c.hasta)}`;
      if (c.plan === 'prueba') {
        const dias = Math.max(1, Math.ceil((c.hasta - Date.now()) / 864e5));
        return `Prueba de Pro · te ${dias === 1 ? 'queda 1 día' : 'quedan ' + dias + ' días'}`;
      }
      return 'Versión gratis';
    },
    poner(c) {
      this.estado = c || null;
      this.cargada = true;
      window.dispatchEvent(new CustomEvent('cuenta', { detail: this.estado }));
    },
    async cargar() {
      try {
        const d = await api('/cuenta/yo');
        this.activas = d.cuentas !== false;
        this.poner(d.ok ? d.cuenta : null);
      } catch (e) { this.poner(null); }
      return this.estado;
    },
    async salir() {
      await api('/cuenta/salir', {});
      this.poner(null);
    },
    async portal() {
      const d = await api('/cuenta/portal', {});
      if (d.ok && d.url) location.href = d.url; else aviso(d.error || 'No se ha podido abrir.');
    },
    acceso, planes, aviso, vueltaDelPago, restablecer, olvide, fmtFecha, esc
  };

  // ── Configuración de acceso (Google, correo) ──
  let configPromesa = null;
  function config() {
    if (!configPromesa) configPromesa = api('/cuenta/config').then(d => (d && d.ok ? d : { google: null, correo: false })).catch(() => ({ google: null, correo: false }));
    return configPromesa;
  }
  let gisPromesa = null, alGoogle = null, gisIniciado = false;
  function cargarGoogle() {
    if (!gisPromesa) gisPromesa = new Promise((ok, ko) => {
      if (window.google && window.google.accounts && window.google.accounts.id) return ok();
      const sc = document.createElement('script');
      sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = () => ok(); sc.onerror = () => { gisPromesa = null; ko(new Error('google')); };
      document.head.appendChild(sc);
    });
    return gisPromesa;
  }
  async function botonGoogle(hueco, modo, alCredencial) {
    const c = await config();
    if (!c.google || !hueco) return false;
    try { await cargarGoogle(); } catch (e) { return false; }
    alGoogle = alCredencial;
    if (!gisIniciado) {
      window.google.accounts.id.initialize({ client_id: c.google, callback: r => { if (alGoogle) alGoogle(r.credential); }, ux_mode: 'popup', auto_select: false, itp_support: true });
      gisIniciado = true;
    }
    hueco.innerHTML = '';
    // Se mide cuando la ventana ya está pintada: el botón ocupa todo el ancho (Google admite como máximo 400 px)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const caja = hueco.closest('.cu-google') || hueco.parentElement || hueco;
    const ancho = Math.max(220, Math.min(400, Math.floor(caja.getBoundingClientRect().width || hueco.getBoundingClientRect().width || 320)));
    window.google.accounts.id.renderButton(hueco, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: modo === 'crear' ? 'signup_with' : 'continue_with', logo_alignment: 'center', width: ancho, locale: 'es' });
    return true;
  }

  // ── Ventanas ──
  let velo = null, focoAntes = null, alCerrar = null;
  function abrir(html, ancha) {
    cerrar(true);
    focoAntes = document.activeElement;
    velo = document.createElement('div');
    velo.className = 'cu-velo';
    velo.innerHTML = `<div class="cu-caja${ancha ? ' ancha' : ''}" role="dialog" aria-modal="true"><button class="cu-cerrar" type="button" aria-label="Cerrar">×</button>${html}</div>`;
    document.body.appendChild(velo);
    document.body.style.overflow = 'hidden';
    velo.addEventListener('mousedown', e => { if (e.target === velo) cerrar(); });
    velo.querySelector('.cu-cerrar').onclick = () => cerrar();
    return velo.querySelector('.cu-caja');
  }
  function cerrar(silencio) {
    if (!velo) return;
    velo.remove(); velo = null;
    document.body.style.overflow = '';
    if (focoAntes && focoAntes.focus) try { focoAntes.focus(); } catch (e) {}
    const f = alCerrar; alCerrar = null;
    if (!silencio && f) f();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && velo) cerrar(); });

  // Entrar / crear cuenta
  function acceso(op = {}) {
    let modo = op.modo === 'entrar' ? 'entrar' : 'crear';
    alCerrar = op.alCerrar || null;
    const caja = abrir(`
      <div class="cu-eyebrow">Carta Pro · 7 días gratis</div>
      <h2 class="cu-titulo" id="cuTit"></h2>
      <p class="cu-sub" id="cuSub"></p>
      <div class="cu-motivo">${esc(op.motivo || '')}</div>
      <div class="cu-tabs" role="tablist">
        <button type="button" data-m="crear">Crear cuenta</button>
        <button type="button" data-m="entrar">Ya tengo cuenta</button>
      </div>
      <div class="cu-google" id="cuGoogle" hidden>
        <div class="cu-google-btn" id="cuGoogleBtn"></div>
        <p class="cu-google-nota" id="cuGoogleNota"></p>
        <div class="cu-o"><span>o con tu email</span></div>
      </div>
      <form novalidate>
        <label class="cu-campo"><span>Email</span><input type="email" name="email" autocomplete="email" placeholder="tu@restaurante.com" required></label>
        <label class="cu-campo"><span id="cuClaveTxt">Contraseña</span><input type="password" name="clave" minlength="8" required></label>
        <div id="cuSoloCrear">
          <label class="cu-check" id="cuAceptoLbl"><input type="checkbox" name="acepto"> <span>Acepto las <a href="/legal/condiciones.html" target="_blank" rel="noopener">condiciones</a> y la <a href="/legal/privacidad.html" target="_blank" rel="noopener">privacidad</a>.</span></label>
          <label class="cu-check"><input type="checkbox" name="novedades"> <span>Quiero recibir ideas para vender más con mi carta (como mucho, dos al mes).</span></label>
        </div>
        <button class="cu-btn" type="submit" id="cuBtn"></button>
        <p class="cu-error" role="alert"></p>
      </form>
      <p class="cu-pie" id="cuPie"></p>`);
    const f = caja.querySelector('form');
    const err = caja.querySelector('.cu-error');
    function pintar() {
      caja.querySelectorAll('.cu-tabs button').forEach(b => b.classList.toggle('on', b.dataset.m === modo));
      const crear = modo === 'crear';
      caja.querySelector('#cuTit').textContent = crear ? (op.titulo || 'Prueba Carta Pro 7 días gratis') : 'Entra en tu cuenta';
      caja.querySelector('#cuSub').textContent = crear
        ? 'Sin tarjeta. Tus cartas guardadas en tu panel, editables cuando cambien los precios, con tu logo, sin firma, traducidas y con los 20 estilos. Si no te convence, no pasa nada: sigues con la versión gratis.'
        : 'Tus cartas guardadas te esperan en tu panel.';
      caja.querySelector('#cuClaveTxt').textContent = crear ? 'Crea una contraseña (mínimo 8 caracteres)' : 'Contraseña';
      f.clave.autocomplete = crear ? 'new-password' : 'current-password';
      caja.querySelector('#cuSoloCrear').style.display = crear ? '' : 'none';
      caja.querySelector('#cuBtn').textContent = crear ? 'Empezar mis 7 días gratis' : 'Entrar';
      caja.querySelector('#cuPie').innerHTML = crear ? 'Sin tarjeta · no se renueva sola · cancelas cuando quieras'
        : '<button type="button" class="cu-enlace" id="cuOlvide">¿Olvidaste la contraseña?</button>';
      const ol = caja.querySelector('#cuOlvide');
      if (ol) ol.onclick = () => olvide({ email: f.email.value.trim(), volver: () => acceso({ ...op, modo: 'entrar', email: f.email.value.trim() }) });
      caja.querySelector('#cuGoogleNota').innerHTML = crear
        ? 'Al continuar con Google aceptas las <a href="/legal/condiciones.html" target="_blank" rel="noopener">condiciones</a> y la <a href="/legal/privacidad.html" target="_blank" rel="noopener">privacidad</a>.' : '';
      err.textContent = '';
      botonGoogle(caja.querySelector('#cuGoogleBtn'), modo, conGoogle).then(ok => { const g = caja.querySelector('#cuGoogle'); if (g) g.hidden = !ok; });
    }
    async function conGoogle(credencial) {
      err.textContent = '';
      const btnG = caja.querySelector('#cuGoogleBtn');
      if (btnG) btnG.style.opacity = '.5';
      const extra = typeof op.datos === 'function' ? op.datos() : {};
      const d = await api('/cuenta/google', { credencial, novedades: f.novedades.checked, ...extra });
      if (btnG) btnG.style.opacity = '';
      if (!d.ok) { err.textContent = d.error || 'No ha sido posible entrar con Google.'; return; }
      medir(d.nueva ? 'sign_up' : 'login', { method: 'google' });
      if (d.nueva) medir('prueba_activada');
      alCerrar = null;
      cerrar(true);
      Cuenta.poner(d.cuenta);
      if (op.alEntrar) op.alEntrar(d.cuenta, d.nueva ? 'crear' : 'entrar');
    }
    caja.querySelectorAll('.cu-tabs button').forEach(b => b.onclick = () => { modo = b.dataset.m; pintar(); f.email.focus(); });
    pintar();
    if (op.email) f.email.value = op.email;
    setTimeout(() => (f.email.value ? f.clave : f.email).focus(), 30);
    f.onsubmit = async ev => {
      ev.preventDefault();
      err.textContent = '';
      f.email.classList.remove('error'); f.clave.classList.remove('error');
      const email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { f.email.classList.add('error'); f.email.focus(); err.textContent = 'Revisa el email.'; return; }
      if (f.clave.value.length < (modo === 'crear' ? 8 : 1)) { f.clave.classList.add('error'); f.clave.focus(); err.textContent = modo === 'crear' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Escribe tu contraseña.'; return; }
      if (modo === 'crear' && !f.acepto.checked) { caja.querySelector('#cuAceptoLbl').classList.add('error'); err.textContent = 'Acepta las condiciones para continuar.'; return; }
      const btn = caja.querySelector('#cuBtn');
      btn.disabled = true; const txt = btn.textContent; btn.textContent = modo === 'crear' ? 'Creando tu cuenta…' : 'Entrando…';
      const extra = typeof op.datos === 'function' ? op.datos() : {};
      const d = await api(modo === 'crear' ? '/cuenta/registro' : '/cuenta/entrar',
        { email, clave: f.clave.value, novedades: f.novedades.checked, ...extra });
      btn.disabled = false; btn.textContent = txt;
      if (!d.ok) {
        err.textContent = d.error || 'No ha sido posible.';
        if (d.existe) { modo = 'entrar'; pintar(); f.clave.value = ''; f.clave.focus(); err.textContent = d.error; }
        if (d.campo && f[d.campo]) f[d.campo].classList.add('error');
        return;
      }
      medir(modo === 'crear' ? 'sign_up' : 'login', { method: 'email' });
      if (modo === 'crear') medir('prueba_activada');
      alCerrar = null;
      cerrar(true);
      Cuenta.poner(d.cuenta);
      if (op.alEntrar) op.alEntrar(d.cuenta, modo);
    };
  }

  // Olvidé mi contraseña: pide el email y manda el enlace
  function olvide(op = {}) {
    const volver = op.volver || null;
    const caja = abrir(`
      <div class="cu-eyebrow">Tu cuenta</div>
      <h2 class="cu-titulo">¿Olvidaste la contraseña?</h2>
      <p class="cu-sub">Escribe el email de tu cuenta y te mandamos un enlace para crear una nueva. Tarda un minuto.</p>
      <form novalidate>
        <label class="cu-campo"><span>Email</span><input type="email" name="email" autocomplete="email" placeholder="tu@restaurante.com" required></label>
        <button class="cu-btn" type="submit" id="cuBtn">Enviarme el enlace</button>
        <p class="cu-error" role="alert"></p>
      </form>
      <p class="cu-pie">${volver ? '<button type="button" class="cu-enlace" id="cuVolver">Volver a entrar</button>' : ''}</p>`);
    const f = caja.querySelector('form');
    const err = caja.querySelector('.cu-error');
    if (op.email) f.email.value = op.email;
    setTimeout(() => f.email.focus(), 30);
    const v = caja.querySelector('#cuVolver');
    if (v) v.onclick = () => volver();
    f.onsubmit = async ev => {
      ev.preventDefault();
      err.textContent = '';
      const email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { f.email.classList.add('error'); err.textContent = 'Revisa el email.'; return; }
      const btn = caja.querySelector('#cuBtn');
      btn.disabled = true; btn.textContent = 'Enviando…';
      const d = await api('/cuenta/olvide', { email });
      btn.disabled = false; btn.textContent = 'Enviarme el enlace';
      if (!d.ok) {
        if (d.sinCorreo) {
          err.innerHTML = 'Escríbenos desde ese email a <a href="mailto:hola@cartarapida.es?subject=Contrase%C3%B1a%20Carta%20R%C3%A1pida">hola@cartarapida.es</a> y te la restablecemos en el día.';
        } else err.textContent = d.error || 'No ha sido posible.';
        return;
      }
      caja.innerHTML = `<button class="cu-cerrar" type="button" aria-label="Cerrar">×</button><div class="cu-centro"><div class="cu-ok-icono">✓</div>
        <h2 class="cu-titulo">Revisa tu correo</h2>
        <p class="cu-sub">Si hay una cuenta con <b>${esc(email)}</b>, te acabamos de mandar un enlace para crear una contraseña nueva. Caduca en 1 hora.</p>
        <p class="cu-sub">¿No llega en un par de minutos? Mira en spam o promociones.</p>
        <button class="cu-btn" type="button" id="cuSeguir">Entendido</button></div>`;
      caja.querySelector('.cu-cerrar').onclick = () => cerrar();
      caja.querySelector('#cuSeguir').onclick = () => cerrar();
    };
  }

  // Nueva contraseña desde el enlace del correo
  function restablecer(token, op = {}) {
    alCerrar = null;
    const caja = abrir(`
      <div class="cu-eyebrow">Tu cuenta</div>
      <h2 class="cu-titulo">Crea tu contraseña nueva</h2>
      <p class="cu-sub">Mínimo 8 caracteres. Al guardarla entrarás directamente en tu panel.</p>
      <form novalidate>
        <label class="cu-campo"><span>Contraseña nueva</span><input type="password" name="clave" autocomplete="new-password" minlength="8" required></label>
        <button class="cu-btn" type="submit" id="cuBtn">Guardar y entrar</button>
        <p class="cu-error" role="alert"></p>
      </form>`);
    const f = caja.querySelector('form');
    const err = caja.querySelector('.cu-error');
    setTimeout(() => f.clave.focus(), 30);
    f.onsubmit = async ev => {
      ev.preventDefault();
      err.textContent = '';
      if (f.clave.value.length < 8) { f.clave.classList.add('error'); err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
      const btn = caja.querySelector('#cuBtn');
      btn.disabled = true; btn.textContent = 'Guardando…';
      const d = await api('/cuenta/restablecer', { token, clave: f.clave.value });
      btn.disabled = false; btn.textContent = 'Guardar y entrar';
      if (!d.ok) {
        if (d.caducado) err.innerHTML = esc(d.error) + ' <button type="button" class="cu-enlace" id="cuOtro">Pedir otro enlace</button>';
        else err.textContent = d.error || 'No ha sido posible.';
        const o = caja.querySelector('#cuOtro'); if (o) o.onclick = () => olvide();
        return;
      }
      cerrar(true);
      Cuenta.poner(d.cuenta);
      aviso('Contraseña guardada. Ya estás dentro.');
      if (op.alEntrar) op.alEntrar(d.cuenta);
    };
  }

  // Hacerse Pro
  function planes(op = {}) {
    if (!Cuenta.estado) {
      return acceso({ ...op, modo: 'crear', titulo: 'Crea tu cuenta y activa Pro', alEntrar: (c) => { if (c.plan !== 'pro') planes(op); else if (op.alEntrar) op.alEntrar(c); } });
    }
    if (Cuenta.estado.plan === 'pro') { aviso('Ya tienes Carta Pro activa.'); return; }
    let periodo = op.periodo === 'mes' ? 'mes' : 'ano';
    alCerrar = op.alCerrar || null;
    const prueba = Cuenta.estado.plan === 'prueba';
    const caja = abrir(`
      <div class="cu-eyebrow">Carta Pro</div>
      <h2 class="cu-titulo">Tu carta, siempre al día. Y siempre tuya.</h2>
      <p class="cu-sub">${prueba ? 'Estás en tu prueba gratis. Asegura Pro para no perder tus cartas editables cuando termine.' : 'Guarda tus cartas y cámbialas cuando quieras: precios, platos, temporada. En segundos.'}</p>
      <div class="cu-motivo">${esc(op.motivo || '')}</div>
      <div class="cu-planes">
        <button type="button" class="cu-plan" data-p="ano"><span class="cu-ahorro">Ahorra 36 €</span><div class="cu-plan-nombre">Anual</div><div class="cu-plan-precio">${PRECIOS.ano}<small> /mes</small></div><div class="cu-plan-nota">Un pago de ${PRECIOS.anoTotal} al año</div></button>
        <button type="button" class="cu-plan" data-p="mes"><div class="cu-plan-nombre">Mensual</div><div class="cu-plan-precio">${PRECIOS.mes}<small> /mes</small></div><div class="cu-plan-nota">Cancela cuando quieras</div></button>
      </div>
      <ul class="cu-lista">
        <li><b>Panel con tus cartas</b>: cambia platos y precios y descarga al momento</li>
        <li><b>Los 20 estilos</b>, también Riviera, Sumi, Cartel, Serigrafía y Azulejo</li>
        <li><b>Tu logotipo</b> y <b>sin la firma</b> de Carta Rápida</li>
        <li><b>Traducida</b> a inglés, francés, alemán, italiano, portugués o chino</li>
        <li><b>Alérgenos</b> con iconos en la carta y tabla para inspección</li>
        <li><b>Formatos</b>: A4, A4 slim y cuadernillo con elástico</li>
        <li><b>Menú del día</b> con la fecha de hoy y tus platos de siempre</li>
        <li><b>Imágenes para redes</b>: Instagram, Facebook y estado de WhatsApp</li>
        <li><b>Carta en dos idiomas</b>: cada plato en español y en otro idioma</li>
        <li><b>Cambios ilimitados</b> con una frase: «sube las croquetas a 13»</li>
      </ul>
      <label class="cu-check" id="cuPagoLbl"><input type="checkbox" id="cuPagoAcepto"> <span>Acepto las <a href="/legal/condiciones.html" target="_blank" rel="noopener">condiciones de Carta Pro</a>: se renueva sola hasta que la cancele y, como empieza ya, renuncio al desistimiento.</span></label>
      <button class="cu-btn" type="button" id="cuPagar"></button>
      <p class="cu-error" role="alert"></p>
      <div class="cu-seguro">Pago seguro con Stripe · tarjeta, Apple Pay o Google Pay · factura con tu CIF · cancelas en un clic desde tu panel</div>`, true);
    const btn = caja.querySelector('#cuPagar');
    const pintar = () => {
      caja.querySelectorAll('.cu-plan').forEach(b => b.classList.toggle('on', b.dataset.p === periodo));
      btn.textContent = periodo === 'ano' ? `Activar Pro · ${PRECIOS.anoTotal} al año` : `Activar Pro · ${PRECIOS.mes} al mes`;
    };
    caja.querySelectorAll('.cu-plan').forEach(b => b.onclick = () => { periodo = b.dataset.p; pintar(); });
    pintar();
    btn.onclick = async () => {
      const ok = caja.querySelector('#cuPagoAcepto');
      if (!ok.checked) { caja.querySelector('#cuPagoLbl').classList.add('error'); caja.querySelector('.cu-error').textContent = 'Marca la casilla para continuar.'; return; }
      btn.disabled = true; btn.textContent = 'Abriendo el pago seguro…';
      medir('begin_checkout', { value: periodo === 'ano' ? 118.8 : 12.9, currency: 'EUR', items: [{ item_name: 'Carta Pro ' + periodo }] });
      if (typeof op.antesDePagar === 'function') op.antesDePagar();
      const d = await api('/pago/crear', { periodo, vuelta: op.vuelta || '' });
      if (d.ok && d.url) { location.href = d.url; return; }
      btn.disabled = false; pintar();
      caja.querySelector('.cu-error').textContent = d.error || 'No hemos podido abrir el pago.';
    };
  }

  function aviso(texto, enlace) {
    let a = document.querySelector('.cu-aviso');
    if (!a) { a = document.createElement('div'); a.className = 'cu-aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.innerHTML = esc(texto) + (enlace ? ` <a href="${esc(enlace.href)}">${esc(enlace.texto)}</a>` : '');
    a.classList.add('on');
    clearTimeout(a._t);
    a._t = setTimeout(() => a.classList.remove('on'), enlace ? 7000 : 4000);
  }

  // Vuelta de Stripe: ?suscripcion=<sesión> o ?suscripcion=cancelada
  async function vueltaDelPago(alTerminar) {
    const params = new URLSearchParams(location.search);
    const s = params.get('suscripcion');
    if (!s) return false;
    params.delete('suscripcion');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
    if (s === 'cancelada') { aviso('Pago cancelado. No se ha cobrado nada.'); if (alTerminar) alTerminar(false); return true; }
    let d = await api('/pago/confirmar', { sesion: s });
    // Si Stripe tarda en confirmar, se reintenta un par de veces antes de dar el aviso
    for (let i = 0; i < 2 && !d.ok && !s.startsWith('demo_'); i++) { await new Promise(r => setTimeout(r, 2500)); d = await api('/pago/confirmar', { sesion: s }); }
    if (d.ok) {
      Cuenta.poner(d.cuenta);
      if (!s.startsWith('demo_')) medir('purchase', { transaction_id: s, value: d.cuenta.periodo === 'ano' ? 118.8 : 12.9, currency: 'EUR', items: [{ item_name: 'Carta Pro ' + d.cuenta.periodo }] });
      const caja = abrir(`<div class="cu-centro"><div class="cu-ok-icono">✓</div>
        <h2 class="cu-titulo">¡Ya eres Pro!</h2>
        <p class="cu-sub">Tus cartas se guardan en tu panel y puedes cambiarlas cuando quieras. Te llegará el recibo por email.</p>
        <button class="cu-btn" type="button" id="cuSeguir">Seguir</button></div>`);
      caja.querySelector('#cuSeguir').onclick = () => cerrar();
    } else {
      aviso(d.error || 'No hemos podido comprobar el pago.');
    }
    if (alTerminar) alTerminar(!!d.ok);
    return true;
  }

  window.Cuenta = Cuenta;

  // Ojo para ver u ocultar la contraseña en cualquier campo de contraseña
  const OJO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OJO_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
  function ponerOjos(raiz) {
    (raiz.querySelectorAll ? raiz.querySelectorAll('input[type="password"]:not([data-ojo])') : []).forEach(inp => {
      inp.dataset.ojo = '1';
      const caja = document.createElement('span');
      caja.className = 'cu-clave';
      inp.parentNode.insertBefore(caja, inp);
      caja.appendChild(inp);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cu-ojo'; b.innerHTML = OJO; b.setAttribute('aria-label', 'Mostrar contraseña');
      b.onclick = () => {
        const ver = inp.type === 'password';
        inp.type = ver ? 'text' : 'password';
        b.innerHTML = ver ? OJO_NO : OJO;
        b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
        inp.focus();
      };
      caja.appendChild(b);
    });
  }
  const vigilar = () => { ponerOjos(document); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && ponerOjos(n)))).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) vigilar(); else document.addEventListener('DOMContentLoaded', vigilar);

  // Con una ventana abierta, el tabulador da vueltas dentro de ella
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const velos = Array.from(document.querySelectorAll('.cu-velo:not([hidden])'));
    const caja = velos.length && velos[velos.length - 1];
    if (!caja) return;
    const focos = Array.from(caja.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
    if (!focos.length) return;
    const primero = focos[0], ultimo = focos[focos.length - 1];
    if (!caja.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
    else if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });
})();
