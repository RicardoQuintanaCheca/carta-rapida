/* Cuenta y Carta Pro (compartido por la web y el panel).
   - Cuenta.cargar(): lee la sesión (/cuenta/yo)
   - Cuenta.acceso({modo, motivo, alEntrar}): ventana de entrar / crear cuenta (crear = 7 días de Pro gratis)
   - Cuenta.planes({motivo, vuelta}): ventana para hacerse Pro (mensual o anual)
   - Cuenta.vueltaDelPago(): al volver de Stripe con ?suscripcion=...
   Emite el evento "cuenta" en window cada vez que cambia el estado. */
(function () {
  const PRECIOS = { mes: '9,90 €', ano: '99 €' };
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
    acceso, planes, aviso, vueltaDelPago, fmtFecha, esc
  };

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
        ? 'Sin tarjeta. Tus cartas guardadas en tu panel, editables cuando cambien los precios, con tu logo, sin firma, traducidas y con los 15 estilos. Si no te convence, no pasa nada: sigues con la versión gratis.'
        : 'Tus cartas guardadas te esperan en tu panel.';
      caja.querySelector('#cuClaveTxt').textContent = crear ? 'Crea una contraseña (mínimo 8 caracteres)' : 'Contraseña';
      f.clave.autocomplete = crear ? 'new-password' : 'current-password';
      caja.querySelector('#cuSoloCrear').style.display = crear ? '' : 'none';
      caja.querySelector('#cuBtn').textContent = crear ? 'Empezar mis 7 días gratis' : 'Entrar';
      caja.querySelector('#cuPie').innerHTML = crear ? 'Sin tarjeta · no se renueva sola · cancelas cuando quieras'
        : '¿Olvidaste la contraseña? Escríbenos desde tu email a <a href="mailto:hola@kartia.es?subject=Contrase%C3%B1a%20Carta%20R%C3%A1pida">hola@kartia.es</a> y te la restablecemos.';
      err.textContent = '';
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
        <button type="button" class="cu-plan" data-p="mes"><div class="cu-plan-nombre">Mensual</div><div class="cu-plan-precio">${PRECIOS.mes}<small> /mes</small></div><div class="cu-plan-nota">Cancela cuando quieras</div></button>
        <button type="button" class="cu-plan" data-p="ano"><span class="cu-ahorro">2 meses gratis</span><div class="cu-plan-nombre">Anual</div><div class="cu-plan-precio">${PRECIOS.ano}<small> /año</small></div><div class="cu-plan-nota">Sale a 8,25 € al mes</div></button>
      </div>
      <ul class="cu-lista">
        <li><b>Panel con tus cartas</b>: cambia platos y precios y descarga al momento</li>
        <li><b>Los 15 estilos</b>, también Riviera, Sumi, Cartel, Serigrafía y Azulejo</li>
        <li><b>Tu logotipo</b> y <b>sin la firma</b> de Carta Rápida</li>
        <li><b>Traducida</b> a inglés, francés, alemán, italiano, portugués o chino</li>
        <li><b>Cambios ilimitados</b> con una frase: «sube las croquetas a 13»</li>
      </ul>
      <label class="cu-check" id="cuPagoLbl"><input type="checkbox" id="cuPagoAcepto"> <span>Acepto las <a href="/legal/condiciones.html" target="_blank" rel="noopener">condiciones de Carta Pro</a>: se renueva sola hasta que la cancele y, como empieza ya, renuncio al desistimiento.</span></label>
      <button class="cu-btn" type="button" id="cuPagar"></button>
      <p class="cu-error" role="alert"></p>
      <div class="cu-seguro">Pago seguro con Stripe · tarjeta, Apple Pay o Google Pay · factura con tu CIF · cancelas en un clic desde tu panel</div>`, true);
    const btn = caja.querySelector('#cuPagar');
    const pintar = () => {
      caja.querySelectorAll('.cu-plan').forEach(b => b.classList.toggle('on', b.dataset.p === periodo));
      btn.textContent = `Activar Pro · ${PRECIOS[periodo]}${periodo === 'ano' ? ' al año' : ' al mes'}`;
    };
    caja.querySelectorAll('.cu-plan').forEach(b => b.onclick = () => { periodo = b.dataset.p; pintar(); });
    pintar();
    btn.onclick = async () => {
      const ok = caja.querySelector('#cuPagoAcepto');
      if (!ok.checked) { caja.querySelector('#cuPagoLbl').classList.add('error'); caja.querySelector('.cu-error').textContent = 'Marca la casilla para continuar.'; return; }
      btn.disabled = true; btn.textContent = 'Abriendo el pago seguro…';
      medir('begin_checkout', { value: periodo === 'ano' ? 99 : 9.9, currency: 'EUR', items: [{ item_name: 'Carta Pro ' + periodo }] });
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
    const d = await api('/pago/confirmar', { sesion: s });
    if (d.ok) {
      Cuenta.poner(d.cuenta);
      if (!s.startsWith('demo_')) medir('purchase', { transaction_id: s, value: d.cuenta.periodo === 'ano' ? 99 : 9.9, currency: 'EUR', items: [{ item_name: 'Carta Pro ' + d.cuenta.periodo }] });
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
})();
