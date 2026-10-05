// Opciones de la herramienta (plegables)
function nOpciones(b) {
  const caja = document.getElementById('opciones');
  const abierta = !caja.classList.contains('abierta');
  caja.classList.toggle('abierta', abierta);
  b.setAttribute('aria-expanded', String(abierta));
}

(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const NOMBRES = { riviera: 'Riviera', azulejo: 'Azulejo', serigrafia: 'Serigrafía', cartel: 'Cartel', bloque: 'Bloque', marinero: 'Marinero', brunch: 'Brunch', vermut: 'Vermut', pizarra: 'Pizarra', ticket: 'Ticket', gaceta: 'Gaceta', trattoria: 'Trattoria', editorial: 'Editorial', sobremesa: 'Sobremesa', sumi: 'Sumi', brasserie: 'Brasserie', deco: 'Déco', mantel: 'Mantel', barra: 'Barra', autor: 'Autor' };

  const PRO = ['riviera', 'sumi', 'cartel', 'serigrafia', 'azulejo', 'marinero', 'brunch', 'vermut'];
  function esPro_(k) { return PRO.includes(k) && !(typeof esPro === 'function' && esPro()); }
  function pintarEstiloElegido(k) {
    const n = $('#nEstilo'); if (!n || !NOMBRES[k]) return;
    n.textContent = NOMBRES[k] + (esPro_(k) ? ' · Pro' : '');
  }
  window.addEventListener('cuenta', () => { if (typeof estiloActual !== 'undefined') pintarEstiloElegido(estiloActual); });
  // El estilo elegido se ve bajo el botón de la herramienta
  if (typeof selEstilo === 'function') {
    const original = selEstilo;
    window.selEstilo = selEstilo = function (el, estilo) {
      original(el, estilo);
      pintarEstiloElegido(estilo);
    };
    if (typeof estiloActual !== 'undefined') pintarEstiloElegido(estiloActual);
  }

  // En ordenador hay sitio: las opciones se ven abiertas al lado de la subida
  nOpciones($('.n-opc'));

  // «Pegar texto» siempre abre las opciones, aunque se hayan cerrado
  if (typeof abrirTexto === 'function') {
    const abrir = abrirTexto;
    window.abrirTexto = abrirTexto = function () {
      if (!$('#opciones').classList.contains('abierta')) nOpciones($('.n-opc'));
      return abrir.apply(this, arguments);
    };
  }
  // Las filas de opciones y «Pegar texto» también funcionan con teclado
  $$('#herramienta .t2-feat-row, #herramienta .t2-alt[onclick]').forEach(el => {
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });
  // La burbuja de la mascota ya no se ve: los mensajes importantes salen como aviso
  if (typeof updateToolBubble === 'function') {
    const burbuja = updateToolBubble;
    window.updateToolBubble = updateToolBubble = function (msg) {
      burbuja(msg);
      if (/Prueba activada|Hola de nuevo/.test(msg) && window.Cuenta && Cuenta.aviso) {
        Cuenta.aviso(String(msg).replace(/[✨📸]/gu, '').trim());
        if (typeof cartaActual !== 'undefined' && !cartaActual) ir($('#prueba'));
      }
    };
  }
  // El periodo elegido en Precios (anual/mensual) llega a la ventana de pago
  if (typeof hacersePro === 'function') {
    window.hacersePro = hacersePro = function (motivo) {
      Cuenta.planes({ motivo: typeof motivo === 'string' ? motivo : '', periodo: periodoElegido, antesDePagar: guardarPendiente });
    };
  }
  // «Probar Pro» cuando ya estás en prueba o eres Pro: que haga algo útil
  if (typeof probarPro === 'function') {
    const probar = probarPro;
    window.probarPro = probarPro = function (motivo) {
      const c = window.Cuenta && Cuenta.estado;
      if (c && c.plan === 'prueba') return hacersePro(motivo);
      if (c && c.plan === 'pro') { location.href = '/panel'; return; }
      return probar(motivo);
    };
  }

  // «Pegar texto» abre las opciones, que es donde está la caja de texto
  const td = $('#textoDrop');
  new MutationObserver(() => {
    if (td.classList.contains('on')) {
      const caja = $('#opciones');
      if (!caja.classList.contains('abierta')) nOpciones($('.n-opc'));
      setTimeout(() => $('#txt').focus({ preventScroll: true }), 50);
      td.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }).observe(td, { attributes: true, attributeFilter: ['class'] });

  // Con la carta ya hecha, la herramienta ocupa todo el ancho y se esconde la cabecera de la sección
  const prueba = $('#prueba');
  const resultado = $('#msgResult');
  const progreso = $('#progressBarWrap');
  let habiaCarta = false;
  const marcar = () => {
    const hay = resultado.style.display !== 'none';
    // Al salir la carta, el formulario de arriba se oculta y todo sube: se vuelve a encuadrar
    if (hay && !habiaCarta) setTimeout(() => { const r = resultado.getBoundingClientRect().top; if (r < 70 || r > innerHeight * .5) ir(resultado); }, 700);
    habiaCarta = hay;
    prueba.classList.toggle('con-carta', hay);
    prueba.classList.toggle('procesando', progreso.style.display !== 'none');
  };
  new MutationObserver(marcar).observe(resultado, { attributes: true, attributeFilter: ['style'] });
  new MutationObserver(marcar).observe(progreso, { attributes: true, attributeFilter: ['style'] });
  marcar();

  // Pasos de la barra de la app: 1 subir · 2 estilo · 3 PDF
  const pasos = $$('.n-app-pasos li');
  const marcarPasos = () => {
    const carta = resultado.style.display !== 'none', leyendo = progreso.style.display !== 'none';
    const hayFotos = !document.getElementById('mainBtn').disabled;
    pasos.forEach((li, k) => {
      const n = k + 1;
      li.classList.toggle('hecho', carta ? n === 1 : false);
      li.classList.toggle('on', carta ? n > 1 : (n === 1 && !leyendo) || (leyendo && n === 1) || (hayFotos && n === 1));
    });
  };
  new MutationObserver(marcarPasos).observe(resultado, { attributes: true, attributeFilter: ['style'] });
  new MutationObserver(marcarPasos).observe(progreso, { attributes: true, attributeFilter: ['style'] });
  marcarPasos();

  // Barra fija en móvil: aparece al dejar atrás la portada y se va al llegar a la herramienta o al final
  const barra = $('#nBarra');
  if (barra && 'IntersectionObserver' in window) {
    const vistos = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? vistos.add(e.target) : vistos.delete(e.target));
      const enPortada = vistos.has($('.nhero')), enHerramienta = vistos.has(prueba), enFinal = vistos.has($('.final'));
      barra.classList.toggle('on', !enPortada && !enHerramienta && !enFinal && resultado.style.display === 'none');
    }, { threshold: 0.02 });
    [$('.nhero'), prueba, $('.final')].forEach(el => el && io.observe(el));
  }

  // En móvil, con la carta ya hecha, el botón de descargar va siempre a mano (abajo) mientras el de la página no se ve
  const bajar = $('#nDescarga'), dl = $('#dlBtn'), dlTxt = $('#dlTexto');
  if (bajar && dl && 'IntersectionObserver' in window) {
    let dlVisible = false, enHerramienta = false;
    const pintarBajar = () => {
      $('#nDescargaTxt').textContent = dlTxt.textContent;
      bajar.classList.toggle('on', resultado.style.display !== 'none' && enHerramienta && !dlVisible);
    };
    new IntersectionObserver(([e]) => { dlVisible = e.isIntersecting; pintarBajar(); }).observe(dl);
    new IntersectionObserver(([e]) => { enHerramienta = e.isIntersecting; pintarBajar(); }, { threshold: 0.02 }).observe($('#herramienta'));
    new MutationObserver(pintarBajar).observe(dlTxt, { childList: true, characterData: true, subtree: true });
    new MutationObserver(pintarBajar).observe(resultado, { attributes: true, attributeFilter: ['style'] });
    bajar.addEventListener('click', () => { if (typeof medir === 'function') medir('descarga_barra_movil'); descargar(); });
  }

  // Barra con filete al bajar
  const nav = $('#nav');
  const marcarNav = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', marcarNav, { passive: true }); marcarNav();

  // Precios anual / mensual
  let periodoElegido = 'ano';
  const pintarPrecio = anual => {
    periodoElegido = anual ? 'ano' : 'mes';
    $('#tAno').setAttribute('aria-pressed', anual); $('#tMes').setAttribute('aria-pressed', !anual);
    $('#proAmount').textContent = anual ? '9,90 €' : '12,90 €';
    $('#proCond').textContent = anual ? 'Con el plan anual: 118,80 € al año. IVA incluido. Te das de baja cuando quieras.' : 'Mes a mes. IVA incluido. Te das de baja cuando quieras, en un clic.';
  };
  $('#tAno').addEventListener('click', () => pintarPrecio(true));
  $('#tMes').addEventListener('click', () => pintarPrecio(false));

  // ── Selector de estilos ──
  const chips = $$('#chips button');
  const figuras = $$('#pickSheet figure');
  let tocado = false, ciclo = null, elegido = 'riviera';
  const cargarFig = k => { const f = figuras.find(x => x.dataset.k === k), im = f && f.querySelector('img[data-srcset]'); if (im) { im.srcset = im.dataset.srcset; im.removeAttribute('data-srcset'); im.removeAttribute('loading'); } };
  const elegir = (k, auto) => {
    elegido = k;
    chips.forEach(c => c.setAttribute('aria-selected', String(c.dataset.k === k)));
    cargarFig(k); { const i = chips.findIndex(c => c.dataset.k === k); if (i >= 0) cargarFig(chips[(i + 1) % chips.length].dataset.k); } // la elegida y la siguiente
    figuras.forEach(f => f.classList.toggle('on', f.dataset.k === k));
    $('#probarEstiloNom').textContent = (NOMBRES[k] || k) + (esPro_(k) ? ' · Pro' : '');
    { const c = chips.find(x => x.dataset.k === k); if (c && window.innerWidth < 900) c.parentNode.scrollTo({ left: c.offsetLeft - 20, behavior: 'smooth' }); } // en móvil la fila acompaña al estilo activo
  };
  chips.forEach(c => c.addEventListener('click', () => { tocado = true; clearInterval(ciclo); elegir(c.dataset.k); }));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    // Pasa solo una vuelta mientras nadie lo toque; se para al pasar el ratón o al enfocarlo
    let pasos = 0, encima = false;
    const picker = $('.picker');
    ['pointerenter', 'focusin'].forEach(ev => picker.addEventListener(ev, () => { encima = true; }));
    ['pointerleave', 'focusout'].forEach(ev => picker.addEventListener(ev, () => { encima = false; }));
    new IntersectionObserver(([e]) => {
      clearInterval(ciclo);
      if (e.isIntersecting && !tocado) ciclo = setInterval(() => {
        if (encima) return;
        if (++pasos >= chips.length) { clearInterval(ciclo); elegir(chips[0].dataset.k, true); return; }
        const i = chips.findIndex(c => c.getAttribute('aria-selected') === 'true');
        elegir(chips[(i + 1) % chips.length].dataset.k, true);
      }, 2600);
    }, { threshold: .5 }).observe($('#pickSheet'));
  }

  // Ir a la herramienta (con desplazamiento suave si está disponible)
  let lenis = null;
  const ir = (el) => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
  };
  window.irHerramienta = e => { if (e) e.preventDefault(); ir($('#prueba')); };
  $('#probarEstilo').addEventListener('click', () => {
    if (typeof selEstilo === 'function') selEstilo(document.querySelector('.t2-scard.' + elegido), elegido);
    if (typeof medir === 'function') medir('estilo_desde_portada', { estilo: elegido });
    ir($('#prueba'));
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 && document.querySelector(id);
    if (el) { e.preventDefault(); ir(el); }
  });

  // ── Animaciones (si se pueden cargar) ──
  // ── Escaparate de la portada: la carta de ejemplo cambia de estilo sola; los puntos eligen ──
  function escaparate() {
    const hoja = $('#escHoja'), caja = $('#escPuntos'); if (!hoja || !caja) return;
    const lista = [['riviera', 'Riviera'], ['vermut', 'Vermut'], ['serigrafia', 'Serigrafía'], ['bloque', 'Bloque'], ['marinero', 'Marinero'], ['pizarra', 'Pizarra']];
    const imgs = lista.map(([k], n) => {
      if (n === 0) return hoja.querySelector('img'); // Riviera ya está en la página
      const im = new Image(); im.alt = ''; im.decoding = 'async'; im.loading = 'lazy';
      im.sizes = '(max-width: 900px) 72vw, 440px'; im.dataset.srcset = '/ejemplo/portada-' + k + '-640.webp 640w, /ejemplo/portada-' + k + '.webp 900w';
      hoja.appendChild(im); return im;
    });
    const puntos = lista.map(([k, n], i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Ver en estilo ' + n); b.setAttribute('aria-pressed', i === 0); caja.appendChild(b); return b; });
    let i = 0, tocado = false, visible = true, vueltas = 0, reloj = null;
    const cargar = n => { const im = imgs[n]; if (im && im.dataset.srcset) { im.removeAttribute('loading'); im.srcset = im.dataset.srcset; delete im.dataset.srcset; } };
    setTimeout(() => cargar(1), 1200); // la siguiente, cuando la página ya ha pintado
    const ir = n => { cargar(n); cargar((n + 1) % lista.length); i = n; imgs.forEach((im, x) => im.classList.toggle('on', x === n)); puntos.forEach((b, x) => b.setAttribute('aria-pressed', x === n)); $('#escNombre').textContent = lista[n][1]; };
    puntos.forEach((b, n) => b.addEventListener('click', () => { tocado = true; clearInterval(reloj); ir(n); }));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hoja);
    reloj = setInterval(() => {
      if (tocado || !visible || document.hidden) return;
      const s = (i + 1) % lista.length;
      if (s === 0 && ++vueltas >= 2) clearInterval(reloj); // tras dos vueltas se queda en Riviera
      ir(s);
    }, 2600);
  }

  // Las tipografías de los ejemplos de carta se piden cuando la página ya ha cargado
  window.addEventListener('load', () => setTimeout(() => {
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Jost:wght@400;500&display=swap';
    document.head.appendChild(l);
  }, 1200));
  window.addEventListener('DOMContentLoaded', () => {
    escaparate();
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto || !window.gsap || !window.ScrollTrigger) return;
    // Si las animaciones llegan tarde (red lenta), no se rehace la portada que ya se ve
    // Quien ya ha visto la portada en esta sesión no vuelve a esperar la entrada
    let vista = false; try { vista = sessionStorage.getItem('cr-vista') === '1'; sessionStorage.setItem('cr-vista', '1'); } catch (e) {}
    const tarde = vista || performance.now() > 1500;
    document.documentElement.classList.add('anim');
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);

    // Scroll suave solo con ratón; en móvil, el desplazamiento nativo
    if (window.Lenis && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      lenis = new Lenis({
        duration: 1.1, smoothWheel: true,
        prevent: n => !!(n.closest && n.closest('textarea, .cu-velo, .visor, .res-galeria, .res-estilos, .chips, [data-lenis-prevent]'))
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      // Si se abre una ventana (email, cuenta, visor), el fondo no se mueve
      new MutationObserver(() => { document.body.style.overflow === 'hidden' ? lenis.stop() : lenis.start(); })
        .observe(document.body, { attributes: true, attributeFilter: ['style'] });
    }

    // Portada: el titular entra por líneas; texto y carta suben una vez
    if (window.SplitText && !tarde) {
      const st = new SplitText('#heroTitle', { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.from(st.lines, { yPercent: 105, duration: .8, ease: 'expo.out', stagger: .08, delay: .05 });
    }
    if (!tarde) {
      gsap.from('.nhero .golpe, .nhero .lead, .hero-ctas, .hero-trust', { autoAlpha: 0, y: 16, duration: .6, ease: 'power3.out', stagger: .06, delay: .25 });
      gsap.from('#demo', { y: 28, duration: .8, ease: 'power3.out', delay: .3 }); // sin esconderla: es la imagen principal de la página
    }
    gsap.from('.cifras b', { yPercent: 60, autoAlpha: 0, stagger: .12, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: '.cifras', start: 'top 88%', once: true } });

    gsap.from('#herramienta > .wrap', { y: 40, autoAlpha: 0, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '#herramienta', start: 'top 92%', once: true } });
    $$('.rv').forEach(el => gsap.from(el, {
      autoAlpha: 0, y: 36, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    }));
    gsap.from('.anno .pin-dot', { scale: .85, autoAlpha: 0, duration: .4, ease: 'power3.out', stagger: .07, scrollTrigger: { trigger: '.anno', start: 'top 70%', once: true } });

    const precio = { v: 12.5 };
    const fmt = v => v.toFixed(2).replace('.', ',');
    gsap.timeline({ scrollTrigger: { trigger: '#proBox', start: 'top 65%', once: true } })
      .to(precio, { v: 13.5, duration: 1.2, ease: 'power2.inOut', delay: .4, onUpdate: () => { $('#edPrice').textContent = fmt(precio.v); } })
      .add(() => { $('#saved').textContent = 'Guardando…'; })
      .add(() => { $('#saved').textContent = 'Guardado'; $('#edOut').textContent = 'PDF actualizado · 13,50 €'; }, '+=.7')
      .from('.ed-out', { scale: .98, duration: .4, ease: 'power3.out' }, '<');

    window.addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
