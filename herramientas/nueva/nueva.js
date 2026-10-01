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
  const NOMBRES = { riviera: 'Riviera', azulejo: 'Azulejo', serigrafia: 'Serigrafía', cartel: 'Cartel', ticket: 'Ticket', gaceta: 'Gaceta', trattoria: 'Trattoria', editorial: 'Editorial', sobremesa: 'Sobremesa', sumi: 'Sumi', brasserie: 'Brasserie', deco: 'Déco', mantel: 'Mantel', barra: 'Barra', autor: 'Autor' };

  // El estilo elegido se ve bajo el botón de la herramienta
  if (typeof selEstilo === 'function') {
    const original = selEstilo;
    window.selEstilo = selEstilo = function (el, estilo) {
      original(el, estilo);
      const n = $('#nEstilo'); if (n && NOMBRES[estilo]) n.textContent = NOMBRES[estilo];
    };
    if (typeof estiloActual !== 'undefined' && NOMBRES[estiloActual]) $('#nEstilo').textContent = NOMBRES[estiloActual];
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

  // Barra con filete al bajar
  const nav = $('#nav');
  const marcarNav = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', marcarNav, { passive: true }); marcarNav();

  // Precios anual / mensual
  const pintarPrecio = anual => {
    $('#tAno').setAttribute('aria-pressed', anual); $('#tMes').setAttribute('aria-pressed', !anual);
    $('#proAmount').textContent = anual ? '9,90 €' : '12,90 €';
    $('#proCond').textContent = anual ? 'Con el plan anual: 118,80 € al año. IVA incluido.' : 'Mes a mes, cancela cuando quieras. IVA incluido.';
  };
  $('#tAno').addEventListener('click', () => pintarPrecio(true));
  $('#tMes').addEventListener('click', () => pintarPrecio(false));

  // ── Selector de estilos ──
  const chips = $$('#chips button');
  const figuras = $$('#pickSheet figure');
  let tocado = false, ciclo = null, elegido = 'riviera';
  const elegir = (k, auto) => {
    elegido = k;
    chips.forEach(c => c.setAttribute('aria-selected', String(c.dataset.k === k)));
    figuras.forEach(f => f.classList.toggle('on', f.dataset.k === k));
    $('#probarEstiloNom').textContent = NOMBRES[k] || k;
    if (!auto) { const c = chips.find(x => x.dataset.k === k); if (c && window.innerWidth < 900) c.parentNode.scrollTo({ left: c.offsetLeft - 20, behavior: 'smooth' }); }
  };
  chips.forEach(c => c.addEventListener('click', () => { tocado = true; clearInterval(ciclo); elegir(c.dataset.k); }));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      clearInterval(ciclo);
      if (e.isIntersecting && !tocado) ciclo = setInterval(() => {
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
  window.addEventListener('DOMContentLoaded', () => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto || !window.gsap || !window.ScrollTrigger) return;
    // Si las animaciones llegan tarde (red lenta), no se rehace la portada que ya se ve
    const tarde = performance.now() > 1500;
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

    // Portada: el titular entra por líneas y la carta se compone sola
    const demo = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    const filas = $$('#sheet .m-head > *, #sheet .m-sec-t, #sheet .m-row, #sheet .m-foot');
    demo
      .set('#ready', { autoAlpha: 0, y: 16 })
      .set(filas, { autoAlpha: 0, y: 10 })
      .set('#sheet', { autoAlpha: 0, y: 30, rotate: 2 })
      .set('#scan', { top: '0%', autoAlpha: 0 })
      .fromTo('#photo', { autoAlpha: 0, x: -30, rotate: -10 }, { autoAlpha: 1, x: 0, rotate: -6, duration: .8 })
      .to('#scan', { autoAlpha: 1, duration: .2 }, '-=.1')
      .to('#scan', { top: '100%', duration: 1.3, ease: 'power1.inOut' })
      .to('#scan', { autoAlpha: 0, duration: .2 })
      .to('#sheet', { autoAlpha: 1, y: 0, rotate: 0, duration: .9 }, '-=.5')
      .to(filas, { autoAlpha: 1, y: 0, duration: .5, stagger: .07 }, '-=.5')
      .to('#ready', { autoAlpha: 1, y: 0, duration: .6, ease: 'back.out(1.6)' }, '-=.1')
      .add(() => ciclarPortada());
    // Tras componerse en Sobremesa, la misma carta va pasando por otros estilos
    function ciclarPortada() {
      const lista = [['riviera', 'Riviera'], ['serigrafia', 'Serigrafía'], ['cartel', 'Cartel'], ['sumi', 'Sumi'], ['azulejo', 'Azulejo'], ['gaceta', 'Gaceta'], ['sobremesa', 'Sobremesa']];
      const capa = $('#sheetAlt');
      const imgs = lista.map(([k], n) => {
        if (n === 0) return capa.querySelector('img'); // Riviera ya está en la página
        const im = new Image(); im.alt = ''; im.decoding = 'async';
        im.sizes = '(max-width: 900px) 70vw, 430px'; im.srcset = '/ejemplo/portada-' + k + '-640.webp 640w, /ejemplo/portada-' + k + '.webp 900w';
        capa.appendChild(im); return im;
      });
      const txt = $('#readyEstilo');
      let i = 0, visible = true, capaZ = 1;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe($('#demo'));
      const paso = () => {
        if (!visible || document.hidden) return;
        i = (i + 1) % lista.length;
        // la nueva entra por encima; la anterior se quita cuando ya está tapada
        const nueva = imgs[i];
        nueva.style.zIndex = ++capaZ;
        nueva.classList.add('on');
        setTimeout(() => imgs.forEach(im => { if (im !== nueva) im.classList.remove('on'); }), 1000);
        txt.textContent = 'Estilo ' + lista[i][1] + ' · 1 página';
        gsap.fromTo('#ready', { scale: .96 }, { scale: 1, duration: .4, ease: 'back.out(2)' });
      };
      setTimeout(() => { paso(); setInterval(paso, 2600); }, 1800);
    }

    if (window.SplitText && !tarde) {
      const st = new SplitText('#heroTitle', { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.from(st.lines, { yPercent: 105, duration: 1, ease: 'expo.out', stagger: .09, delay: .1 });
    }
    if (!tarde) gsap.from('.nhero .eyebrow, .nhero .lead, .hero-ctas, .hero-trust', { autoAlpha: 0, y: 18, duration: .8, ease: 'power3.out', stagger: .08, delay: .35 });
    if (tarde) { demo.progress(1); } else demo.play(0).delay(.4);

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const d = $('#demo');
      const rx = gsap.quickTo('#sheet', 'rotationY', { duration: .8, ease: 'power3' });
      const ry = gsap.quickTo('#sheet', 'rotationX', { duration: .8, ease: 'power3' });
      gsap.set('#demo', { perspective: 900 });
      d.addEventListener('pointermove', e => { const r = d.getBoundingClientRect(); rx(((e.clientX - r.left) / r.width - .5) * 10); ry(-((e.clientY - r.top) / r.height - .5) * 8); });
      d.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
    gsap.to('#photo', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.nhero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('#sheet', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.nhero', start: 'top top', end: 'bottom top', scrub: true } });

    $$('.rv').forEach(el => gsap.from(el, {
      autoAlpha: 0, y: 36, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    }));
    gsap.from('.anno .pin-dot', { scale: 0, duration: .6, ease: 'back.out(2.2)', stagger: .18, scrollTrigger: { trigger: '.anno', start: 'top 70%', once: true } });

    const precio = { v: 12.5 };
    const fmt = v => v.toFixed(2).replace('.', ',');
    gsap.timeline({ scrollTrigger: { trigger: '#proBox', start: 'top 65%', once: true } })
      .to(precio, { v: 13.5, duration: 1.2, ease: 'power2.inOut', delay: .4, onUpdate: () => { $('#edPrice').textContent = fmt(precio.v); } })
      .add(() => { $('#saved').textContent = 'Guardando…'; })
      .add(() => { $('#saved').textContent = 'Guardado'; $('#edOut').textContent = 'PDF actualizado · 13,50 €'; }, '+=.7')
      .from('.ed-out', { scale: .97, duration: .5, ease: 'back.out(2)' }, '<');

    window.addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
