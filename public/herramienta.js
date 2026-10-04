
  const MASCOTA_POSES = {
    feliz:      '/mascota/kart-feliz.webp',
    asombrado:  '/mascota/kart-asombrado.webp',
    riendo:     '/mascota/kart-riendo.webp',
    pensando:   '/mascota/kart-pensando.webp',
    trabajando: '/mascota/kart-trabajando.webp',
    sudando:    '/mascota/kart-sudando.webp',
    asustado:   '/mascota/kart-asustado.webp',
    durmiendo:  '/mascota/kart-durmiendo.webp'
  };

  function setPose(nombre) {
    if (!MASCOTA_POSES[nombre]) return;
    const imgs = document.querySelectorAll('.mascota-kart');
    imgs.forEach(img => {
      img.style.transition = 'opacity 0.2s';
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = MASCOTA_POSES[nombre];
        img.style.opacity = '1';
      }, 200);
    });
  }

  function setPoseInstant(nombre) {
    if (!MASCOTA_POSES[nombre]) return;
    document.querySelectorAll('.mascota-kart').forEach(img => {
      img.style.transition = 'none';
      img.src = MASCOTA_POSES[nombre];
      img.style.opacity = '1';
    });
  }

  const HERO_ROTATION_POSES = ['feliz', 'trabajando', 'asombrado'];
  let heroRotationIndex = 0;
  let heroRotationInterval = null;

  function iniciarRotacionHero() {
    if (heroRotationInterval) return;
    heroRotationInterval = setInterval(() => {
      if (isProcessing) return;
      heroRotationIndex = (heroRotationIndex + 1) % HERO_ROTATION_POSES.length;
      const pose = HERO_ROTATION_POSES[heroRotationIndex];
      const heroMascota = document.querySelector('.mascota-hero');
      if (heroMascota && MASCOTA_POSES[pose]) {
        heroMascota.style.transition = 'opacity 0.2s';
        heroMascota.style.opacity = '0';
        setTimeout(() => { heroMascota.src = MASCOTA_POSES[pose]; heroMascota.style.opacity = '1'; }, 200);
      }
    }, 5000);
  }

  window.addEventListener('load', () => {

    setTimeout(iniciarRotacionHero, 2000);

    if (window.matchMedia('(hover: hover)').matches) {
      const heroCta = document.querySelector('.btn-primary');
      if (heroCta) {
        let ctaLeaveTimer = null;
        heroCta.addEventListener('mouseenter', () => {
          clearTimeout(ctaLeaveTimer);
          setPose('asombrado');
        });
        heroCta.addEventListener('mouseleave', () => {
          ctaLeaveTimer = setTimeout(() => setPose('feliz'), 400);
        });
      }
    }
  });

  let filesList = [], logoFile = null, logoDataUrl = null;
  let descActivo = false, logoActivo = false, neuroActivo = true, tradActivo = false;
  let idiomaSeleccionado = null, textoActivo = false, cartaActual = null;
  let estiloActual = 'sobremesa';
  const ESTILOS_PRO = ['riviera', 'sumi', 'cartel', 'serigrafia', 'azulejo', 'marinero', 'brunch', 'vermut'];
  const esEstiloPro = e => ESTILOS_PRO.includes(e);
  let licencia = null, ajustesUsados = 0, cabeceraModo = 'logo';
  const AJUSTES_GRATIS = 3;
  const ESTILOS_VALIDOS = ['riviera', 'azulejo', 'serigrafia', 'cartel', 'bloque', 'marinero', 'brunch', 'vermut', 'pizarra', 'ticket', 'gaceta', 'trattoria', 'editorial', 'sobremesa', 'sumi', 'brasserie', 'deco', 'mantel', 'barra', 'autor'];

  const MAX_FOTOS = 5;
  const MAX_MB = 25;
  const TIPOS_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_DIM = 1600;
  const CALIDAD_FOTO = 0.85;

  // Los duplicados los resuelve el servidor (solo repeticiones exactas dentro de una misma sección).
  // Aquí no se borra nada: un mismo plato en dos secciones o con dos precios es una variante real.
  function eliminarDuplicados(carta) { return carta; }

  function mostrarErrorUpload(msg) {
    const el = document.getElementById('uploadError');
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 5000);
  }

  function comprimirImagen(file) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w >= h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
            else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
          }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = cv.toDataURL('image/jpeg', CALIDAD_FOTO);
          cv.toBlob(blob => {
            const nombre = file.name.replace(/\.[^.]+$/, '.jpg');
            resolve({ file: new File([blob], nombre, { type: 'image/jpeg' }), dataUrl });
          }, 'image/jpeg', CALIDAD_FOTO);
        };
        img.src = e.target.result;
      };
      r.readAsDataURL(file);
    });
  }

  function selEstilo(el, estilo) {
    if (!ESTILOS_VALIDOS.includes(estilo)) return;
    estiloActual = estilo;
    document.querySelectorAll('.t2-scard').forEach(b => b.classList.toggle('on', b.classList.contains(estilo)));
    document.querySelectorAll('.res-estilo, .res-mini').forEach(b => b.classList.toggle('on', b.dataset.estilo === estilo));
    if (cartaActual) { renderVista(); pintarPlan(); }
  }

  // Galería de estilos con miniatura para la columna lateral (escritorio)
  (function crearGaleria() {
    const g = document.getElementById('resGaleria');
    document.querySelectorAll('.res-estilo').forEach(chip => {
      const e = chip.dataset.estilo;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'res-mini' + (e === estiloActual ? ' on' : '');
      b.dataset.estilo = e;
      b.setAttribute('aria-label', 'Estilo ' + chip.textContent);
      b.innerHTML = '<span class="rm-img" style="background-image:url(/carta/muestra-' + e + '.webp)"></span><span class="rm-nom">' + chip.textContent.replace('Pro', '').trim() + '</span>';
      b.onclick = () => cambiarEstiloResultado(e);
      g.appendChild(b);
    });
  })();

  function cambiarEstiloResultado(estilo) {
    const tarjeta = document.querySelector('.t2-scard.' + estilo);
    selEstilo(tarjeta, estilo);
  }


  /* ── Visor: ver cada estilo en grande ── */
  const visor = { i: 0, lista: [] };
  (function prepararVisor() {
    const ojo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    document.querySelectorAll('.t2-scard-grid .t2-scard').forEach((card, i) => {
      const estilo = ESTILOS_VALIDOS.find(e => card.classList.contains(e));
      if (!estilo) return;
      visor.lista.push({ estilo, nombre: card.querySelector('.t2-scard-name').textContent, mood: card.querySelector('.t2-scard-mood').textContent });
      const celda = document.createElement('div');
      celda.className = 't2-scard-celda';
      card.parentNode.insertBefore(celda, card);
      celda.appendChild(card);
      const ver = document.createElement('button');
      ver.type = 'button';
      ver.className = 't2-ver';
      ver.innerHTML = ojo + 'Ver';
      ver.setAttribute('aria-label', 'Ver el estilo ' + visor.lista[visor.lista.length - 1].nombre + ' en grande');
      const n = visor.lista.length - 1;
      ver.onclick = (ev) => { ev.stopPropagation(); abrirVisor(n); };
      celda.appendChild(ver);
    });
  })();

  let visorFoco = null;
  function abrirVisor(i) {
    medir('visor_abierto', { estilo: visor.lista[i] && visor.lista[i].estilo });
    visorFoco = document.activeElement;
    const v = document.getElementById('visor');
    v.hidden = false;
    document.body.style.overflow = 'hidden';
    mostrarEnVisor(i);
    document.querySelector('.visor-cerrar').focus();
  }
  function mostrarEnVisor(i) {
    const n = visor.lista.length;
    visor.i = (i + n) % n;
    const e = visor.lista[visor.i];
    const img = document.getElementById('visorImg');
    img.classList.add('cargando');
    img.onload = () => img.classList.remove('cargando');
    img.src = '/carta/grande-' + e.estilo + '.webp';
    img.alt = 'Ejemplo de carta en estilo ' + e.nombre;
    document.getElementById('visorNombre').textContent = e.nombre;
    document.getElementById('visorMood').textContent = e.mood;
    document.getElementById('visorCuenta').textContent = (visor.i + 1) + ' / ' + n;
    const b = document.getElementById('visorElegir');
    const elegido = e.estilo === estiloActual;
    b.textContent = elegido ? '✓ Es tu estilo' : 'Elegir ' + e.nombre;
    b.classList.toggle('elegido', elegido);
    document.getElementById('visorHoja').scrollTop = 0;
    // Precarga el siguiente para que el paso sea instantáneo
    const sig = visor.lista[(visor.i + 1) % n];
    (new Image()).src = '/carta/grande-' + sig.estilo + '.webp';
  }
  function moverVisor(d) { mostrarEnVisor(visor.i + d); }
  function cerrarVisor() {
    const v = document.getElementById('visor');
    if (v.hidden) return;
    v.hidden = true;
    v.classList.remove('ampliado');
    document.body.style.overflow = '';
    if (visorFoco && visorFoco.focus) visorFoco.focus();
  }
  function elegirDesdeVisor() {
    const e = visor.lista[visor.i];
    selEstilo(document.querySelector('.t2-scard.' + e.estilo), e.estilo);
    updateToolBubble('¡Buena elección! ' + e.nombre + ' ✨');
    cerrarVisor();
  }
  document.addEventListener('keydown', (ev) => {
    if (document.getElementById('visor').hidden) return;
    if (ev.key === 'Escape') cerrarVisor();
    else if (ev.key === 'ArrowRight') moverVisor(1);
    else if (ev.key === 'ArrowLeft') moverVisor(-1);
  });
  (function deslizarVisor() {
    const hoja = document.getElementById('visorHoja');
    let x0 = null, y0 = null;
    hoja.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } else x0 = null; }, { passive: true });
    hoja.addEventListener('touchend', (e) => {
      if (x0 === null || document.getElementById('visor').classList.contains('ampliado')) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) moverVisor(dx < 0 ? 1 : -1);
      x0 = null;
    });
  })();

  /* ── Vista previa: un iframe con el mismo motor y estilos que el PDF ── */
  const vista = { iframe: null, lista: false, pendiente: false, id: 0, ancho: 794, alto: 1123, ampliada: false };

  function prepararVista() {
    if (vista.iframe) return;
    const f = document.createElement('iframe');
    f.title = 'Vista previa de tu carta';
    f.src = '/carta/vista.html';
    f.setAttribute('scrolling', 'no');
    f.tabIndex = -1;
    f.style.width = vista.ancho + 'px';
    f.style.height = vista.alto + 'px';
    document.getElementById('vistaEscala').appendChild(f);
    vista.iframe = f;
    ajustarVista();
  }

  function renderVista() {
    prepararVista();
    document.getElementById('vistaMarco').classList.add('cargando');
    vista.pendiente = true;
    if (vista.lista) enviarVista();
  }

  function enviarVista() {
    vista.pendiente = false;
    vista.id++;
    vista.iframe.contentWindow.postMessage({ tipo: 'componer', id: vista.id, carta: cartaActual, estilo: estiloActual, logo: logoEnCabecera(), credito: !esPro() }, location.origin);
  }

  function ajustarVista() {
    if (!vista.iframe) return;
    const marco = document.getElementById('vistaMarco');
    const cs = getComputedStyle(marco);
    const disponible = marco.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ajuste = Math.min(1, disponible / vista.ancho);
    const esc = vista.ampliada ? Math.min(1, ajuste * 2) : ajuste;
    const escala = document.getElementById('vistaEscala');
    vista.iframe.style.width = vista.ancho + 'px';
    vista.iframe.style.height = vista.alto + 'px';
    vista.iframe.style.transform = 'scale(' + esc + ')';
    escala.style.width = Math.floor(vista.ancho * esc) + 'px';
    escala.style.height = Math.ceil(vista.alto * esc) + 'px';
  }

  function alternarAmpliar() {
    vista.ampliada = !vista.ampliada;
    document.getElementById('vistaMarco').classList.toggle('ampliada', vista.ampliada);
    document.getElementById('vistaAmpliar').textContent = vista.ampliada ? 'Reducir' : 'Ampliar';
    ajustarVista();
    const marco = document.getElementById('vistaMarco');
    marco.scrollLeft = (marco.scrollWidth - marco.clientWidth) / 2;
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.tipo === 'vista-lista') {
      vista.lista = true;
      if (vista.pendiente) enviarVista();
    } else if (e.data.tipo === 'compuesta' && e.data.id === vista.id) {
      document.getElementById('vistaMarco').classList.remove('cargando');
      if (e.data.error || !e.data.info) { console.error('[vista]', e.data.error); return; }
      vista.ancho = Math.ceil(e.data.ancho) || 794;
      vista.alto = Math.ceil(e.data.alto) || 1123;
      ajustarVista();
      const i = e.data.info;
      document.getElementById('resInfo').textContent = 'A4 · ' + i.paginas + (i.paginas > 1 ? ' páginas' : ' página') + ' · ' + i.platos + ' platos';
    }
  });
  window.addEventListener('resize', ajustarVista);

  function handleFiles(input) { if (input.files.length) addFiles(Array.from(input.files)); input.value = ''; }
  function addMoreFiles(input) { if (input.files.length) addFiles(Array.from(input.files)); input.value = ''; }

  function addFiles(newFiles) {
    const invalidos = newFiles.filter(f => !TIPOS_VALIDOS.includes(f.type));
    if (invalidos.length) {
      mostrarErrorUpload('Solo se aceptan imágenes JPG, PNG o WEBP.');
      return;
    }
    const grandes = newFiles.filter(f => f.size > MAX_MB * 1024 * 1024);
    if (grandes.length) {
      mostrarErrorUpload(`Imagen demasiado grande. El máximo es ${MAX_MB} MB por foto.`);
      return;
    }
    if (filesList.length + newFiles.length > MAX_FOTOS) {
      mostrarErrorUpload(`Máximo ${MAX_FOTOS} fotos por carta. Ya tienes ${filesList.length}.`);
      return;
    }

    mostrarErrorUpload('');
    document.getElementById('uploadGrid').style.display = 'none';
    document.getElementById('fotosPreview').classList.add('on');
    document.getElementById('addCamaraBtn').classList.add('on');

    let pendientes = newFiles.length;
    fotosCargando += newFiles.length;
    renderThumbs();
    newFiles.forEach(file => {
      comprimirImagen(file).then(({ file: comprimido, dataUrl }) => {
        filesList.push({ file: comprimido, dataUrl });
      }).catch(() => {
        mostrarErrorUpload('No hemos podido leer una de las fotos. Prueba con otra.');
      }).finally(() => {
        fotosCargando--; pendientes--;
        renderThumbs();
        if (pendientes === 0) {
          if (!filesList.length) volverASubida();
          checkReady();
          medir('fotos_subidas', { fotos: filesList.length });
        }
      });
    });
  }
  let fotosCargando = 0;
  function volverASubida() {
    document.getElementById('uploadGrid').style.display = '';
    document.getElementById('fotosPreview').classList.remove('on');
  }

  function removePhoto(index) {
    filesList.splice(index, 1);
    if (filesList.length === 0 && !fotosCargando) volverASubida();
    renderThumbs(); checkReady();
  }

  function renderThumbs() {
    const n = filesList.length;
    document.getElementById('fotosContainer').innerHTML = filesList.map((f, i) => `
      <div class="foto-item">
        <img class="foto-thumb" src="${f.dataUrl}" alt="Página ${i + 1} de tu carta">
        <span class="foto-num">Pág. ${i + 1}</span>
        <button type="button" class="foto-remove" onclick="removePhoto(${i})" aria-label="Quitar la página ${i + 1}" title="Quitar esta página">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>`).join('') + Array.from({ length: fotosCargando }, () => `
      <div class="foto-item cargando"><span class="foto-spin"></span><span class="foto-num">Subiendo…</span></div>`).join('');
    document.getElementById('fotosTit').textContent = fotosCargando ? 'Subiendo tu carta…' : (n === 1 ? 'Carta subida' : `Carta subida · ${n} páginas`);
    document.querySelector('#fotosPreview .fotos-ok').style.visibility = fotosCargando ? 'hidden' : 'visible';
    document.getElementById('fotosCount').textContent = `${n}/${MAX_FOTOS}`;
    document.getElementById('fotosAddBtn').classList.toggle('lleno', n + fotosCargando >= MAX_FOTOS);
  }

  function toggleLogo() {
    const wasOff = !logoActivo;
    logoActivo = !logoActivo;
    document.getElementById('logoToggle').classList.toggle('on', logoActivo);
    document.getElementById('logoDrop').classList.toggle('on', logoActivo);
    if (!logoActivo) removeLogo();
    if (wasOff) {
      setPose('asombrado'); setTimeout(() => setPose('feliz'), 800);
      if (window.cargarBgRemoval) {
        window.cargarBgRemoval().catch(err => console.warn('Precarga bg-removal falló:', err));
      }
    }
  }

  function toggleDesc() {
    const wasOff = !descActivo;
    descActivo = !descActivo;
    document.getElementById('descToggle').classList.toggle('on', descActivo);
    if (wasOff) { setPose('asombrado'); setTimeout(() => setPose('feliz'), 800); }
  }

  function toggleNeuro() {
    const wasOff = !neuroActivo;
    neuroActivo = !neuroActivo;
    document.getElementById('neuroToggle').classList.toggle('on', neuroActivo);
    if (wasOff) { setPose('asombrado'); setTimeout(() => setPose('feliz'), 800); }
  }

  function toggleTraducir() {
    const wasOff = !tradActivo;
    tradActivo = !tradActivo;
    document.getElementById('tradToggle').classList.toggle('on', tradActivo);
    document.getElementById('idiomaZone').classList.toggle('on', tradActivo);
    if (!tradActivo) { idiomaSeleccionado = null; document.querySelectorAll('.idioma-btn').forEach(b => b.classList.remove('on')); }
    if (wasOff) { setPose('asombrado'); setTimeout(() => setPose('feliz'), 800); }
  }

  function selIdioma(el, codigo) {
    idiomaSeleccionado = codigo;
    document.querySelectorAll('.idioma-btn').forEach(b => b.classList.remove('on'));
    el.classList.add('on');
  }

  function toggleTexto() {
    textoActivo = !textoActivo;
    document.getElementById('textoDrop').classList.toggle('on', textoActivo);
    document.getElementById('textoArrow').classList.toggle('open', textoActivo);
    if (textoActivo) {
      document.getElementById('textoDrop').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('txt').focus();
    }
  }

  function abrirTexto() {
    if (!textoActivo) toggleTexto();
    else {
      document.getElementById('textoDrop').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('txt').focus();
    }
    updateToolBubble('¡Pega el texto de tu carta abajo! 📋');
  }

  async function convertirPdfAPng(pdfFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          await window.cargarPdfJs();
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 3.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('No se pudo convertir el PDF')); return; }
            resolve(new File([blob], 'logo.png', { type: 'image/png' }));
          }, 'image/png', 1.0);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsArrayBuffer(pdfFile);
    });
  }

  async function handleLogo(input) {
    if (!input.files[0]) return;
    let file = input.files[0];
    if (file.type === 'application/pdf') {
      try {
        file = await convertirPdfAPng(file);
      } catch (err) {
        alert('No se pudo procesar el PDF. Intenta subir una imagen (PNG o JPG).');
        console.error('Error conversión PDF:', err);
        input.value = '';
        return;
      }
    }
    try {
      updateToolBubble('Limpiando tu logotipo... ✨');
      const bgRemoval = await window.cargarBgRemoval();
      const blob = await bgRemoval.removeBackground(file, {
        output: { format: 'image/png', quality: 1.0 },
        model: 'medium',
        debug: false
      });
      file = new File([blob], 'logo-limpio.png', { type: 'image/png' });
      updateToolBubble('¡Logo listo! ✨');
    } catch (err) {
      console.warn('Eliminación de fondo falló, usando logo original:', err);
      updateToolBubble('Logo cargado');
    }
    logoFile = file;
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let top = canvas.height, bottom = 0, left = canvas.width, right = 0;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const rr = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
            if (!(a < 20 || (rr > 235 && g > 235 && b > 235))) {
              if (y < top) top = y; if (y > bottom) bottom = y;
              if (x < left) left = x; if (x > right) right = x;
            }
          }
        }
        if (top > bottom || left > right) {
          const red = Math.min(1, 1200 / Math.max(canvas.width, canvas.height));
          const out = document.createElement('canvas'); out.width = Math.round(canvas.width * red); out.height = Math.round(canvas.height * red);
          out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
          logoDataUrl = out.toDataURL('image/png'); cabeceraModo = 'logo';
        }
        else {
          const pad = 4, cx = Math.max(0,left-pad), cy = Math.max(0,top-pad);
          const cw = Math.min(canvas.width-cx,right-left+pad*2+1), ch = Math.min(canvas.height-cy,bottom-top+pad*2+1);
          const red = Math.min(1, 1200 / Math.max(cw, ch));
          const out = document.createElement('canvas'); out.width = Math.round(cw * red); out.height = Math.round(ch * red);
          const octx = out.getContext('2d'); octx.imageSmoothingQuality = 'high';
          octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, out.width, out.height);
          logoDataUrl = out.toDataURL('image/png'); cabeceraModo = 'logo';
        }
        document.getElementById('logoThumb').src = logoDataUrl;
        document.getElementById('logoName').textContent = logoFile.name;
        document.getElementById('logoDrop').classList.remove('on');
        document.getElementById('logoPreview').classList.add('on');
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(logoFile);
  }

  function removeLogo() {
    logoFile = null; logoDataUrl = null;
    document.getElementById('logoPreview').classList.remove('on');
    if (logoActivo) document.getElementById('logoDrop').classList.add('on');
  }

  function setEstado(estado) {
    const block = document.getElementById('estadoBlock');
    const eyebrow = document.getElementById('estadoEyebrow');
    const titulo = document.getElementById('estadoTitulo');
    const btn = document.getElementById('estadoBtn');
    if (!block) return;
    if (estado === 'procesando') { block.style.display = 'none'; return; }
    block.style.display = 'flex';
    block.dataset.estado = estado;
    if (estado === 'inicial') {
      eyebrow.textContent = 'PASO 1 · FOTO O TEXTO';
      titulo.textContent = 'Sube tu carta para empezar';
      btn.innerHTML = 'Empezar →';
      btn.disabled = false;
    } else if (estado === 'subida') {
      eyebrow.textContent = 'PASO 2 · PULSA PROCESAR';
      titulo.textContent = 'Carta subida · lista para procesar';
      btn.innerHTML = 'Rehacer mi carta →';
      btn.disabled = false;
    } else if (estado === 'listo') {
      eyebrow.textContent = 'A4 · LISTO PARA IMPRIMIR' + (logoDataUrl ? ' · CON TU LOGO' : '');
      titulo.textContent = 'Tu PDF está listo.';
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar PDF';
      btn.disabled = false;
    }
  }

  function estadoBtnClick() {
    const estado = document.getElementById('estadoBlock').dataset.estado;
    if (estado === 'inicial') {
      document.getElementById('uploadGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (estado === 'subida') {
      run();
    } else if (estado === 'listo') {
      descargar();
    }
  }

  function checkReady() {
    const hay = filesList.length > 0 || document.getElementById('txt').value.trim();
    const btn = document.getElementById('mainBtn');
    btn.disabled = !hay;
    btn.textContent = hay ? 'Crear mi carta →' : '📸 Súbeme una foto primero';
    setEstado(hay ? 'subida' : 'inicial');
  }

  function checkAjuste(el) {
    document.getElementById('rehacerBtn').classList.toggle('activo', el.value.trim().length > 0);
  }

  function onTextInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    checkReady();
  }

  const PASOS_BASE = [
    { emoji: '👀', bubble: 'Leyendo tu carta...', verb: 'Leyendo', subtitle: 'Platos, precios y secciones', pose: 'pensando' },
    { emoji: '💰', bubble: 'Revisando precios...', verb: 'Revisando', subtitle: 'Precios a la española, sin símbolo €', pose: 'pensando' },
    { emoji: '📐', bubble: 'Ordenando secciones...', verb: 'Ordenando', subtitle: 'En el orden natural de una comida', pose: 'trabajando' },
    { emoji: '⭐', bubble: 'Destacando lo que más vende...', verb: 'Destacando', subtitle: 'Especialidad y platos de más valor, primero', pose: 'trabajando', si: () => neuroActivo },
    { emoji: '✍️', bubble: 'Escribiendo descripciones...', verb: 'Escribiendo', subtitle: 'Breves, concretas y sin adornos', pose: 'sudando', si: () => descActivo },
    { emoji: '🌍', bubble: 'Traduciendo...', verb: 'Traduciendo', subtitle: 'Con vocabulario de hostelería', pose: 'sudando', si: () => tradActivo && idiomaSeleccionado },
    { emoji: '🖋️', bubble: 'Maquetando...', verb: 'Maquetando', subtitle: 'Tipografía, columnas y aire', pose: 'sudando' },
  ];
  let stepsProcesado = PASOS_BASE;
  let progressStepInterval = null;
  let currentStep = 0;
  let isProcessing = false;

  function goStep(i) {
    const emoji = document.getElementById('progressEmoji');
    const bubbleText = document.getElementById('progressBubbleText');
    const verb = document.getElementById('progressVerb');
    const texto = document.getElementById('progressTexto');
    const counter = document.getElementById('progressCounter');
    const pills = document.querySelectorAll('.timeline-pill');
    if (!verb) return;
    verb.style.opacity = '0'; texto.style.opacity = '0';
    if (bubbleText) { document.getElementById('progressBubble').style.opacity = '0'; }
    setTimeout(function() {
      const s = stepsProcesado[i];
      if (s.pose) setPose(s.pose);
      if (emoji) { emoji.textContent = s.emoji; emoji.style.animation = 'none'; void emoji.offsetWidth; emoji.style.animation = 'emojiBounce 0.5s ease-out'; }
      if (bubbleText) bubbleText.textContent = s.bubble;
      verb.textContent = s.verb; texto.textContent = s.subtitle;
      if (counter) counter.textContent = 'Paso ' + (i + 1) + ' de ' + stepsProcesado.length;
      pills.forEach(function(p, idx) {
        p.classList.remove('active', 'completed');
        if (idx < i) p.classList.add('completed');
        else if (idx === i) p.classList.add('active');
      });
      verb.style.opacity = '1'; texto.style.opacity = '1';
      if (bubbleText) { document.getElementById('progressBubble').style.opacity = '1'; }
    }, 250);
  }

  let progressInterval = null;

  function startCountdown(s) {
    const barWrap = document.getElementById('progressBarWrap');
    if (!barWrap) return;
    setEstado('procesando');
    barWrap.style.display = 'block';
    stepsProcesado = PASOS_BASE.filter(p => !p.si || p.si());
    const tl = document.getElementById('progressTimeline');
    if (tl) tl.innerHTML = stepsProcesado.map((_, i) => `<div class="timeline-pill${i === 0 ? ' active' : ''}" data-step="${i}"></div>`).join('');
    currentStep = 0;
    goStep(0);
    clearInterval(progressStepInterval);
    progressStepInterval = setInterval(function() {
      if (currentStep >= stepsProcesado.length - 1) { clearInterval(progressStepInterval); return; }
      currentStep++;
      goStep(currentStep);
    }, 3500);
  }

  function stopCountdown() {
    clearInterval(progressInterval);
    clearInterval(progressStepInterval);
    const barWrap = document.getElementById('progressBarWrap');
    setTimeout(() => {
      if (barWrap) barWrap.style.display = 'none';
      document.getElementById('msgTyping').style.display = 'none';
    }, 400);
  }

  function status(text) {
    stopCountdown();
    document.getElementById('statusText').textContent = text;
    document.getElementById('msgStatus').style.display = 'flex';
    scroll();
  }

  async function run() {
    const textoManual = document.getElementById('txt').value.trim();
    if (filesList.length === 0 && !textoManual) return;
    if (fotosCargando) { mostrarErrorUpload('Espera un segundo, aún se está subiendo una página.'); return; }
    isProcessing = true;
    document.getElementById('inputWrap').style.opacity = '0.4';
    document.getElementById('inputWrap').style.pointerEvents = 'none';
    document.getElementById('mainBtn').style.opacity = '0.4';
    document.getElementById('mainBtn').style.pointerEvents = 'none';
    const segundos = filesList.length > 1 ? 25 : 15;
    document.getElementById('msgTyping').style.display = 'flex';
    startCountdown(segundos); scroll();
    // Llevar al usuario a la animación de progreso (queda debajo de los estilos)
    requestAnimationFrame(() => {
      const prog = document.getElementById('progressBarWrap');
      const destino = prog && prog.offsetParent !== null ? prog : document.getElementById('msgTyping');
      destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    try {
      const formData = new FormData();
      filesList.forEach((f, i) => formData.append(`foto_${i}`, f.file));
      if (textoManual) formData.append('texto', textoManual);
      formData.append('descripciones', descActivo ? 'si' : 'no');
      formData.append('neuromarketing', neuroActivo ? 'si' : 'no');
      formData.append('idioma', tradActivo && idiomaSeleccionado ? idiomaSeleccionado : 'es');
      formData.append('estilo', estiloActual);
      formData.append('nombre', document.getElementById('nombreRest').value.trim());
      formData.append('subtitulo', document.getElementById('subtituloRest').value.trim());
      const res = await fetch('/procesar', { method: 'POST', body: formData, headers: cabeceraLicencia() });
      const data = await res.json();
      stopCountdown();
      if (!data.ok && data.limite && data.pro) setTimeout(() => mostrarPro(data.error), 400);
      if (!data.ok) throw new Error(data.error || 'Ha habido un problema. Inténtalo de nuevo.');
      medir('carta_generada', { fotos: filesList.length, estilo: estiloActual });
      cartaGuardadaId = null;
      mostrarCarta(data.carta);
    } catch (err) {
      stopCountdown();
      isProcessing = false;
      setPose('asustado');
      setTimeout(() => setPose('feliz'), 4000);
      const mensajeError = mensajeAmable(err);
      document.getElementById('inputWrap').style.opacity = '1';
      document.getElementById('inputWrap').style.pointerEvents = 'auto';
      document.getElementById('mainBtn').style.opacity = '1';
      document.getElementById('mainBtn').style.pointerEvents = 'auto';
      document.getElementById('mainBtn').disabled = false;
      setEstado(filesList.length > 0 || document.getElementById('txt').value.trim() ? 'subida' : 'inicial');
      status(mensajeError);
    }
  }

  async function rehacer() {
    const ajuste = document.getElementById('ajusteTxt').value.trim();
    if (!ajuste || !cartaActual) return;
    if (!esPro() && ajustesUsados >= AJUSTES_GRATIS) { mostrarPro('Has usado los 3 ajustes gratis de esta carta. Con Carta Pro son ilimitados.'); return; }
    const btn = document.getElementById('rehacerBtn');
    btn.classList.remove('activo');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> REHACIENDO…`;
    document.getElementById('msgStatus').style.display = 'none';
    document.getElementById('msgTyping').style.display = 'flex';
    startCountdown(10); scroll();
    try {
      const res = await fetch('/rehacer', { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabeceraLicencia() }, body: JSON.stringify({ carta: cartaActual, ajuste }) });
      const data = await res.json();
      stopCountdown();
      if (!data.ok && data.pro) { stopCountdown(); ajustesUsados = AJUSTES_GRATIS; setEstado('listo'); pintarPlan(); btn.classList.add('activo'); btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> REHACER CON ESTE AJUSTE`; mostrarPro(data.error); return; }
      if (!data.ok) throw new Error(data.error || 'Ha habido un problema al aplicar el ajuste. Inténtalo de nuevo.');
      document.getElementById('ajusteTxt').value = '';
      if (!esPro()) ajustesUsados++;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> REHACER CON ESTE AJUSTE`;
      mostrarCarta(data.carta);
    } catch (err) {
      stopCountdown();
      isProcessing = false;
      setPose('asustado');
      setTimeout(() => setPose('feliz'), 4000);
      const mensajeError = mensajeAmable(err);
      setEstado('listo');
      status(mensajeError);
      btn.classList.add('activo');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> REHACER CON ESTE AJUSTE`;
    }
  }

  // Los mensajes del servidor ya vienen en castellano claro; los de red se traducen aquí
  function mensajeAmable(err) {
    const m = String(err && err.message || '');
    if (/Failed to fetch|NetworkError|network|Load failed/i.test(m)) return 'Sin conexión. Comprueba tu internet e inténtalo de nuevo.';
    if (/Unexpected token|JSON/i.test(m)) return 'El servidor ha tardado demasiado. Inténtalo de nuevo en unos segundos.';
    return m || 'Ha habido un problema. Inténtalo de nuevo.';
  }

  function mostrarCarta(carta) {
    cartaActual = eliminarDuplicados(carta);
    document.getElementById('msgStatus').style.display = 'none';
    document.getElementById('msgResult').style.display = 'flex';
    document.getElementById('actions').classList.add('on');
    document.getElementById('ajusteWrap').classList.add('on');
    document.getElementById('inputWrap').style.display = 'none';
    document.getElementById('mainBtn').style.display = 'none';
    document.querySelectorAll('.res-estilo, .res-mini').forEach(b => b.classList.toggle('on', b.dataset.estilo === estiloActual));
    pintarPlan();
    renderVista();
    isProcessing = false;
    setPose('riendo');
    setTimeout(() => setPose('feliz'), 3000);
    setEstado('listo');
    setTimeout(() => { document.getElementById('toolCta').classList.add('on'); document.getElementById('nuevaCartaBtn').classList.add('on'); }, 500);
    document.getElementById('msgResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleFaq(el) {
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) el.classList.add('open');
  }

  function nuevaCarta() {
    // Reset estado
    filesList = []; logoFile = null; logoDataUrl = null;
    descActivo = false; logoActivo = false; neuroActivo = true; tradActivo = false;
    idiomaSeleccionado = null; textoActivo = false; cartaActual = null;
    estiloActual = 'sobremesa'; ajustesUsados = 0; cabeceraModo = 'logo'; cartaGuardadaId = null;
    document.getElementById('nombreRest').value = ''; document.getElementById('subtituloRest').value = '';

    // Reset UI — mensajes y resultado
    document.getElementById('msgResult').style.display = 'none';
    document.getElementById('msgStatus').style.display = 'none';
    document.getElementById('msgTyping').style.display = 'none';
    document.getElementById('resInfo').textContent = '';
    document.getElementById('actions').classList.remove('on');
    document.getElementById('ajusteWrap').classList.remove('on');
    document.getElementById('ajusteTxt').value = '';
    document.getElementById('toolCta').classList.remove('on');
    document.getElementById('nuevaCartaBtn').classList.remove('on');
    if (vista.ampliada) alternarAmpliar();

    // Reset input
    document.getElementById('inputWrap').style.display = '';
    document.getElementById('inputWrap').style.opacity = '1';
    document.getElementById('inputWrap').style.pointerEvents = 'auto';
    document.getElementById('mainBtn').style.display = '';
    document.getElementById('mainBtn').style.opacity = '1';
    document.getElementById('mainBtn').style.pointerEvents = 'auto';
    document.getElementById('mainBtn').disabled = true;
    setEstado('inicial');

    // Reset fotos
    fotosCargando = 0;
    document.getElementById('uploadGrid').style.display = '';
    document.getElementById('fotosPreview').classList.remove('on');
    document.getElementById('fotosContainer').innerHTML = '';
    document.getElementById('addCamaraBtn').classList.remove('on');

    // Reset logo
    document.getElementById('logoToggle').classList.remove('on');
    document.getElementById('logoDrop').classList.remove('on');
    document.getElementById('logoPreview').classList.remove('on');

    // Reset toggles
    document.getElementById('descToggle').classList.remove('on');
    document.getElementById('neuroToggle').classList.add('on');
    document.getElementById('tradToggle').classList.remove('on');
    document.getElementById('idiomaZone').classList.remove('on');
    document.querySelectorAll('.idioma-btn').forEach(b => b.classList.remove('on'));

    // Reset texto
    document.getElementById('txt').value = '';
    document.getElementById('textoDrop').classList.remove('on');
    document.getElementById('textoArrow').classList.remove('open');

    // Reset estilo
    selEstilo(document.querySelector('.t2-scard.sobremesa'), 'sobremesa');

    // Reset montaje
    document.getElementById('leadForm').style.display = '';
    document.getElementById('leadLegal').style.display = '';
    document.getElementById('leadOk').style.display = 'none';
    document.getElementById('leadBtn').disabled = false;
    document.getElementById('leadBtn').textContent = 'Quiero verla';
    document.getElementById('leadTel').value = '';

    // Scroll arriba
    document.getElementById('herramienta').scrollIntoView({ behavior: 'smooth' });
  }

  let descargando = false;
  async function descargar() {
    if (!cartaActual || descargando) return;
    if (!esPro() && cartaTraducida()) { mostrarPro('Tu carta está traducida, y la traducción es de Carta Pro. Pruébalo gratis 7 días para descargarla.'); return; }
    if (!esPro() && esEstiloPro(estiloActual)) { mostrarPro('Riviera, Sumi, Cartel, Serigrafía y Azulejo son estilos Pro. Pruébalos gratis 7 días o elige otro estilo para descargarla gratis.'); return; }
    let emailDescarga = '';
    if (!esPro() && !(window.Cuenta && Cuenta.estado)) {
      emailDescarga = await pedirEmail();
      if (!emailDescarga) return;
    }
    descargando = true;
    const btn = document.getElementById('dlBtn');
    const htmlBtn = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Preparando tu PDF…';
    const cabeceras = { 'Content-Type': 'application/json' };
    if (licencia && licencia.caduca > Date.now()) cabeceras['X-Licencia'] = licencia.licencia;
    try {
      const res = await fetch('/pdf', {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify({ carta: cartaActual, estilo: estiloActual, logo: logoEnCabecera(), email: emailDescarga })
      });
      if (!res.ok) {
        let msg = 'No hemos podido generar el PDF. Inténtalo de nuevo.';
        let d = {};
        try { d = await res.json(); if (d.error) msg = d.error; } catch (e) {}
        if (res.status === 402) { if (licencia) olvidarLicencia(); if (window.Cuenta) await Cuenta.cargar(); pintarPlan(); renderVista(); mostrarPro(msg); return; }
        throw new Error(msg);
      }
      if ((res.headers.get('Content-Type') || '').includes('json')) {
        const d = await res.json();
        if (d.enviado) {
          document.getElementById('enviadaEmail').textContent = d.email;
          document.getElementById('enviadaVelo').hidden = false;
          document.body.style.overflow = 'hidden';
          updateToolBubble('Te la hemos enviado por email 📬');
          medir('pdf_descargado', { plan: planActual(), estilo: estiloActual, via: 'email' });
          return;
        }
        throw new Error(d.error || 'No hemos podido generar el PDF. Inténtalo de nuevo.');
      }
      const blob = await res.blob();
      const nombre = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre ? nombre[1] : 'carta.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setPose('riendo'); setTimeout(() => setPose('feliz'), 2500);
      updateToolBubble('¡Tu carta está descargada! 🎉');
      medir('pdf_descargado', { plan: planActual(), estilo: estiloActual });
      if (!esPro() && logoEnCabecera()) mostrarPro('Descargada con tu nombre en lugar del logo: el logo es de Carta Pro. Pruébalo gratis 7 días y vuelve a descargarla.');
      else if (!esPro()) mostrarPro('¿Te ha gustado? Con Pro la guardas y cambias los precios cuando quieras, sin firma y con tu logo.');
    } catch (err) {
      status(mensajeAmable(err));
    } finally {
      descargando = false;
      btn.disabled = false;
      btn.innerHTML = htmlBtn;
      pintarPlan();
    }
  }

  /* ── Analítica: solo tras aceptar cookies (y solo si está configurada) ── */
  let ga4Id = '', analiticaCargada = false;
  function medir(evento, datos) {
    try { if (analiticaCargada && window.gtag) gtag('event', evento, datos || {}); } catch (e) {}
  }
  function cargarAnalitica() {
    if (analiticaCargada || !ga4Id) return;
    analiticaCargada = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', ga4Id, { anonymize_ip: true });
    const sc = document.createElement('script');
    sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4Id);
    document.head.appendChild(sc);
  }
  function elegirCookies(si) {
    try { localStorage.setItem('cr_consentimiento', JSON.stringify({ si, t: Date.now() })); } catch (e) {}
    document.getElementById('cookiesAviso').classList.remove('on');
    if (si) cargarAnalitica();
  }
  function abrirCookies() { if (ga4Id) document.getElementById('cookiesAviso').classList.add('on'); else location.href = '/legal/cookies.html'; }
  (async function iniciarAnalitica() {
    try {
      const c = await (await fetch('/config')).json();
      ga4Id = c.ga4 || '';
      if (!ga4Id) return;
      let elegido = null;
      try { elegido = JSON.parse(localStorage.getItem('cr_consentimiento')); } catch (e) {}
      if (elegido && Date.now() - elegido.t < 365 * 864e5) { if (elegido.si) cargarAnalitica(); }
      else document.getElementById('cookiesAviso').classList.add('on');
    } catch (e) {}
  })();

  /* ── Carta de ejemplo y antes/después ── */
  const CARTA_EJEMPLO = {"nombre_restaurante":"Casa Pepe","subtitulo":"Taberna tradicional desde 1962 · Chamberí","idioma":"es","nota_pie":"IVA incluido. Consulte la carta de alérgenos a nuestro personal.","servicios":[{"nombre":"Pan y cubierto","precio":"1.8"}],"secciones":[{"nombre":"Para picar","platos":[{"nombre":"Jamón ibérico de bellota","racion":"100 g","precio":"24"},{"nombre":"Croquetas caseras de cocido","racion":"8 uds.","precio":"12.5","alergenos":"1, 7"},{"nombre":"Patatas bravas","descripcion":"Salsa brava de la casa","precio":"6.5"},{"nombre":"Pimientos de Padrón","precio":"7"},{"nombre":"Boquerones en vinagre","precio":"8.5"}]},{"nombre":"De la huerta","platos":[{"nombre":"Ensalada de tomate Raf","descripcion":"Con ventresca y cebolleta","precio":"11"},{"nombre":"Alcachofas confitadas","descripcion":"Con jamón y yema curada","precio":"13.5"},{"nombre":"Pisto manchego con huevo","precio":"10"}]},{"nombre":"Del mar","platos":[{"nombre":"Pescado del día","descripcion":"Preguntar al camarero","precio":"SPM"},{"nombre":"Calamares a la andaluza","precio":"14"},{"nombre":"Pulpo a feira","descripcion":"Con cachelos y pimentón","precio":"19.5"},{"nombre":"Arroz negro","racion":"mín. 2 pers.","precio":"17/pers"}]},{"nombre":"Carnes","platos":[{"nombre":"Chuletón de vaca vieja","descripcion":"Madurado 45 días","precio":"65/kg"},{"nombre":"Rabo de toro","descripcion":"Guisado al vino tinto","precio":"18.5"},{"nombre":"Cachopo asturiano","descripcion":"Para compartir","precio":"21"}]},{"nombre":"Postres","platos":[{"nombre":"Tarta de queso","precio":"6.5"},{"nombre":"Arroz con leche","descripcion":"Requemado","precio":"5.5"},{"nombre":"Flan de huevo","precio":"5"}]},{"nombre":"Vinos · copa / botella","platos":[{"nombre":"Rioja crianza","precio":"3.5 | 18"},{"nombre":"Ribera del Duero roble","precio":"3.8 | 19.5"},{"nombre":"Albariño","precio":"4 | 22"}]}]};
  function probarEjemplo() {
    medir('ejemplo_probado');
    cartaGuardadaId = null;
    mostrarCarta(JSON.parse(JSON.stringify(CARTA_EJEMPLO)));
    updateToolBubble('¡Así quedaría! Ahora prueba con la tuya 📸');
  }
  function antesEstilo(btn, estilo, nombre) {
    document.querySelectorAll('.antes-estilos button').forEach(b => { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    const img = document.getElementById('antesImg');
    img.srcset = '/ejemplo/despues-' + estilo + '-640.webp 640w, /ejemplo/despues-' + estilo + '.webp 900w';
    img.src = '/ejemplo/despues-' + estilo + '.webp';
    img.alt = 'La misma carta rediseñada en estilo ' + nombre;
    adTocado = true;
    medir('hero_estilo', { estilo: estilo });
  }

  /* ── Arrastrar y soltar fotos (ordenador) ── */
  (function () {
    const velo = document.createElement('div');
    velo.className = 'drop-velo';
    velo.innerHTML = '<div class="drop-caja"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg><b>Suelta aquí tu carta</b><span>JPG, PNG o WEBP · hasta 5 páginas</span></div>';
    document.body.appendChild(velo);
    let capas = 0;
    const conArchivos = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    const herramientaAbierta = () => document.getElementById('inputWrap').style.display !== 'none' && !isProcessing;
    const cerrar = () => { capas = 0; document.body.classList.remove('arrastrando'); };
    window.addEventListener('dragenter', e => {
      if (!conArchivos(e)) return;
      capas++;
      const logo = e.target.closest && e.target.closest('#logoDrop');
      document.body.classList.toggle('arrastrando', herramientaAbierta() && !logo);
    });
    window.addEventListener('dragleave', e => { if (conArchivos(e) && --capas <= 0) cerrar(); });
    window.addEventListener('dragover', e => { if (conArchivos(e)) { e.preventDefault(); e.dataTransfer.dropEffect = herramientaAbierta() ? 'copy' : 'none'; } });
    window.addEventListener('drop', e => {
      if (!conArchivos(e)) return;
      e.preventDefault(); cerrar();
      const archivos = Array.from(e.dataTransfer.files || []);
      if (!archivos.length) return;
      if (e.target.closest && e.target.closest('#logoDrop')) { handleLogo({ files: archivos }); return; }
      if (!herramientaAbierta()) return;
      addFiles(archivos);
      medir('fotos_arrastradas', { fotos: archivos.length });
      const destino = document.getElementById('fotosPreview');
      setTimeout(() => destino.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    });
  })();

  function periodoPrecios(p) {
    document.querySelectorAll('.precio-periodo button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    document.getElementById('precioCifra').innerHTML = p === 'ano' ? '9,90 €<small>/mes</small>' : '12,90 €<small>/mes</small>';
    document.getElementById('precioCond').textContent = p === 'ano' ? 'Con el plan anual (118,80 € al año) · IVA incluido' : 'Mes a mes, cancela cuando quieras · IVA incluido';
  }

  /* ── Ir a la herramienta ── */
  function irHerramienta(e) {
    if (e) e.preventDefault();
    const destino = window.innerWidth < 1024 ? document.getElementById('uploadGrid') : document.getElementById('herramienta');
    const vis = destino && destino.offsetParent !== null ? destino : document.getElementById('herramienta');
    const y = vis.getBoundingClientRect().top + window.scrollY - (window.innerWidth < 1024 ? 90 : 0);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* ── Antes / después del hero: arrastrar para comparar ── */
  let adTocado = false;
  (function () {
    const marco = document.getElementById('adMarco');
    const mango = document.getElementById('adMango');
    if (!marco || !mango) return;
    const poner = p => {
      p = Math.max(0, Math.min(100, p));
      marco.style.setProperty('--pos', p + '%');
      mango.setAttribute('aria-valuenow', Math.round(p));
    };
    const desdeEvento = e => {
      const r = marco.getBoundingClientRect();
      poner((e.clientX - r.left) / r.width * 100);
    };
    let arrastrando = false;
    marco.addEventListener('pointerdown', e => {
      arrastrando = true; adTocado = true; marco.classList.add('activo');
      try { marco.setPointerCapture(e.pointerId); } catch (err) {}
      desdeEvento(e);
    });
    marco.addEventListener('pointermove', e => { if (arrastrando) desdeEvento(e); });
    const soltar = () => { if (arrastrando) { arrastrando = false; marco.classList.remove('activo'); medir('hero_comparar'); } };
    marco.addEventListener('pointerup', soltar);
    marco.addEventListener('pointercancel', soltar);
    mango.addEventListener('keydown', e => {
      const actual = parseFloat(getComputedStyle(marco).getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') { poner(actual - 5); adTocado = true; e.preventDefault(); }
      if (e.key === 'ArrowRight') { poner(actual + 5); adTocado = true; e.preventDefault(); }
    });
    // Animación de entrada: enseña el "antes" y barre hacia el "después"
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tramos = [[40, 90, 700], [90, 8, 1500], [8, 34, 800]];
    let i = 0, t0 = null;
    const facil = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function paso(ts) {
      if (adTocado || i >= tramos.length) return;
      if (t0 === null) t0 = ts;
      const [a, b, d] = tramos[i];
      const k = Math.min(1, (ts - t0) / d);
      poner(a + (b - a) * facil(k));
      if (k >= 1) { i++; t0 = null; }
      requestAnimationFrame(paso);
    }
    setTimeout(() => requestAnimationFrame(paso), 900);
  })();

  /* ── Barra fija en móvil: aparece al salir del hero y se oculta en la herramienta ── */
  (function () {
    const barra = document.getElementById('barraMovil');
    const hero = document.querySelector('section.hero');
    const tool = document.getElementById('herramienta');
    const fin = document.querySelector('.final-cta');
    if (!barra || !hero || !tool || !('IntersectionObserver' in window)) return;
    const vistos = new Set();
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(en => en.isIntersecting ? vistos.add(en.target) : vistos.delete(en.target));
      const mostrar = !vistos.has(hero) && !vistos.has(tool) && !(fin && vistos.has(fin)) && !cartaActual;
      barra.classList.toggle('on', mostrar);
    }, { threshold: 0.05 });
    [hero, tool, fin].forEach(el => el && io.observe(el));
  })();

  /* ── Carta Pro: cuenta (email + contraseña) con prueba de 7 días y membresía ── */
  const almacen = {
    leer(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    borrar(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  // Licencias antiguas de pago único (antes de las cuentas): se respetan hasta que caduquen
  (function cargarLicencia() {
    const l = almacen.leer('cr_licencia');
    if (l && l.licencia && l.caduca > Date.now()) licencia = l; else almacen.borrar('cr_licencia');
  })();
  function esPro() { return (window.Cuenta && Cuenta.esPro()) || !!(licencia && licencia.caduca > Date.now()); }
  function planActual() { return window.Cuenta && Cuenta.estado ? Cuenta.estado.plan : (esPro() ? 'pro' : 'gratis'); }
  function cartaTraducida() { return !!cartaActual && String(cartaActual.idioma || 'es').slice(0, 2).toLowerCase() !== 'es'; }
  function olvidarLicencia() { licencia = null; almacen.borrar('cr_licencia'); }
  function cabeceraLicencia() { return licencia && licencia.caduca > Date.now() ? { 'X-Licencia': licencia.licencia } : {}; }
  // Pase de 7 días: pago único, sin cuenta
  async function comprarPase() {
    try {
      if (cartaActual && typeof guardarPendiente === 'function') guardarPendiente();
      const r = await fetch('/pase/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: almacen.leer('cr_email') || '' }) });
      const d = await r.json();
      if (d.ok && d.url) { medir('begin_checkout', { tipo: 'pase' }); location.href = d.url; return; }
      status(d.error || 'No hemos podido abrir el pago. Inténtalo de nuevo.');
    } catch (e) { status('No hemos podido abrir el pago. Inténtalo de nuevo.'); }
  }
  async function vueltaDelPase(valor) {
    history.replaceState(null, '', location.pathname);
    if (valor === 'quiero') return comprarPase();
    const hay = typeof restaurarPendiente === 'function' ? restaurarPendiente() : false;
    if (valor === 'cancelado') { if (hay) status('Pago cancelado. Tu carta sigue aquí.'); return; }
    try {
      const r = await fetch('/pase/confirmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesion: valor }) });
      const d = await r.json();
      if (!d.ok) { status(d.error || 'No hemos podido comprobar el pago.'); return; }
      licencia = { licencia: d.licencia, caduca: d.caduca };
      almacen.guardar('cr_licencia', licencia);
      pintarPlan(); if (cartaActual) renderVista();
      medir('purchase', { tipo: 'pase', value: 15, currency: 'EUR' });
      updateToolBubble('¡Pase activado! 7 días sin firma, con tu logo y los 20 estilos ✨');
      document.getElementById('herramienta').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { status('No hemos podido comprobar el pago. Si te lo han cobrado, escríbenos a hola@cartarapida.es.'); }
  }
  let cartaGuardadaId = null;

  const fechaCorta = ms => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  function pintarPlan() {
    const pro = esPro();
    const c = window.Cuenta && Cuenta.estado;
    const estado = document.getElementById('planEstado');
    if (c && c.plan !== 'gratis') {
      estado.innerHTML = '<b>✓ ' + Cuenta.esc(Cuenta.textoPlan()) + '</b>'
        + (c.plan === 'prueba' ? ' · Tu carta sale sin firma, con tu logo y en el idioma que elijas. <button type="button" class="enlace-pro" onclick="hacersePro()">Hazte Pro</button>' : '')
        + '<br><a href="/panel">Ir a mis cartas →</a>';
      estado.classList.add('on');
    } else if (licencia && pro) {
      estado.innerHTML = '<b>✓ Carta Pro activa</b> hasta el ' + fechaCorta(licencia.caduca) + '.';
      estado.classList.add('on');
    } else {
      estado.classList.remove('on');
    }
    const texto = document.getElementById('dlTexto');
    const nota = document.getElementById('dlNota');
    const boton = document.getElementById('dlBtn');
    const traducida = cartaTraducida();
    const estiloPro = esEstiloPro(estiloActual);
    boton.classList.toggle('dl-secundario', !pro && (traducida || estiloPro));
    if (pro) {
      texto.textContent = 'Descargar PDF';
      nota.textContent = 'A4 listo para imprimir · sin firma' + (logoEnCabecera() ? ' · con tu logo' : '') + ' · cambia de estilo y vuelve a descargar cuando quieras';
    } else if (traducida) {
      texto.textContent = 'Desbloquear la carta traducida';
      nota.textContent = 'La traducción es de Carta Pro. Pruébala gratis 7 días, sin tarjeta.';
    } else if (estiloPro) {
      texto.textContent = 'Desbloquear el estilo ' + nombreEstilo(estiloActual);
      nota.textContent = 'Es un estilo Pro. Pruébalo gratis 7 días o elige un estilo sin la etiqueta Pro.';
    } else {
      texto.textContent = 'Descargar gratis';
      nota.textContent = 'Versión gratis: A4 con una firma pequeña de Carta Rápida al pie' + (logoEnCabecera() ? '. Sale con tu nombre en lugar del logo' : '') + '.';
    }
    document.getElementById('proCaja').classList.toggle('on', !pro);
    const plan = planActual();
    document.getElementById('guardarTexto').textContent = cartaGuardadaId ? 'Guardada ✓ · abrir en mi panel' : 'Guardar en mis cartas';
    document.getElementById('guardarBtn').classList.toggle('guardada', !!cartaGuardadaId);
    document.getElementById('guardarNota').textContent = cartaGuardadaId ? 'Los cambios que hagas aquí no se guardan solos: edítala desde tu panel.'
      : plan === 'gratis' ? 'Guárdala y cambia platos y precios cuando quieras. Pruébalo gratis 7 días.' : 'Guárdala en tu panel y cambia platos y precios cuando quieras.';
    pintarCabecera();
    const quedan = Math.max(0, AJUSTES_GRATIS - ajustesUsados);
    document.getElementById('ajusteCuenta').innerHTML = pro ? 'Ajustes ilimitados con Carta Pro'
      : quedan ? 'Te quedan <b>' + quedan + '</b> ' + (quedan === 1 ? 'ajuste gratis' : 'ajustes gratis') + ' en esta carta'
      : 'Has usado los ajustes gratis · <b>ilimitados con Carta Pro</b>';
    marcarEstilosPro();
  }
  function nombreEstilo(e) {
    const b = document.querySelector('.res-estilo[data-estilo="' + e + '"]');
    return b ? b.textContent.replace('Pro', '').trim() : e;
  }
  // Etiqueta "Pro" en los estilos de pago (se quita si ya eres Pro)
  function marcarEstilosPro() {
    const pro = esPro();
    document.querySelectorAll('.t2-scard, .res-estilo, .res-mini').forEach(el => {
      const e = el.dataset.estilo || ESTILOS_VALIDOS.find(x => el.classList.contains(x));
      if (!esEstiloPro(e)) return;
      let t = el.querySelector('.etq-pro');
      if (!t) { t = document.createElement('span'); t.className = 'etq-pro'; t.textContent = 'Pro'; el.appendChild(t); }
      t.hidden = pro;
    });
  }

  function logoEnCabecera() { return logoDataUrl && cabeceraModo === 'logo' ? logoDataUrl : null; }

  function pintarCabecera() {
    if (!cartaActual) return;
    const n = document.getElementById('resNombre'), sub = document.getElementById('resSubtitulo');
    if (document.activeElement !== n) n.value = cartaActual.nombre_restaurante || '';
    if (document.activeElement !== sub) sub.value = cartaActual.subtitulo || '';
    const conLogo = !!logoEnCabecera();
    n.classList.toggle('vacio', !n.value.trim() && (!conLogo || !esPro()));
    document.getElementById('cabeceraModo').classList.toggle('on', !!logoDataUrl);
    document.querySelectorAll('#cabeceraModo button').forEach(b => b.classList.toggle('on', b.dataset.modo === (conLogo ? 'logo' : 'nombre')));
    // Con el logotipo arriba, el nombre y la frase no pintan nada: se esconden
    n.style.display = sub.style.display = conLogo ? 'none' : '';
    const aviso = document.getElementById('cabeceraAviso');
    aviso.textContent = conLogo
      ? (esPro() ? 'Arriba sale tu logotipo.' : 'Estás viendo tu logotipo, que es de Carta Pro. En la versión gratis sale el nombre: pulsa «Nombre» para revisarlo.')
      : (!n.value.trim() ? 'No hemos encontrado el nombre en tu carta. Escríbelo y aparece al momento.' : 'Cambia el nombre cuando quieras: gratis y al momento.');
  }

  function cambiarCabecera(modo) {
    cabeceraModo = modo;
    pintarPlan();
    renderVista();
  }

  let temporizadorCabecera = null;
  function editarCabecera() {
    if (!cartaActual) return;
    cartaActual.nombre_restaurante = document.getElementById('resNombre').value.replace(/\s+/g, ' ').trimStart().slice(0, 60);
    cartaActual.subtitulo = document.getElementById('resSubtitulo').value.replace(/\s+/g, ' ').trimStart().slice(0, 90);
    if (logoDataUrl && cabeceraModo === 'logo') cabeceraModo = 'nombre'; // si edita el nombre, que lo vea
    pintarPlan();
    clearTimeout(temporizadorCabecera);
    temporizadorCabecera = setTimeout(renderVista, 350);
  }

  function mostrarPro(motivo) {
    const caja = document.getElementById('proCaja');
    const m = document.getElementById('proMotivo');
    if (motivo) { m.textContent = motivo; m.classList.add('on'); } else m.classList.remove('on');
    caja.classList.add('on');
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function datosCarta() {
    return {
      restaurante: cartaActual ? cartaActual.nombre_restaurante : '',
      estilo: estiloActual,
      platos: cartaActual ? cartaActual.secciones.reduce((n, s) => n + s.platos.length, 0) : 0
    };
  }

  // Prueba de 7 días: crear cuenta (o entrar) y, si hay carta, guardarla en el panel
  function probarPro(motivo) {
    if (window.Cuenta && Cuenta.estado) {
      if (Cuenta.estado.plan === 'gratis') return hacersePro(motivo);
      return;
    }
    Cuenta.acceso({
      modo: 'crear', motivo: typeof motivo === 'string' ? motivo : '', datos: datosCarta,
      alEntrar: async (c, modo) => {
        pintarPlan(); renderVista();
        if (c.plan === 'gratis') { hacersePro(modo === 'entrar' ? 'Tu prueba ya terminó. Activa Pro para seguir.' : ''); return; }
        setPose('riendo'); setTimeout(() => setPose('feliz'), 2500);
        if (cartaActual) {
          await guardarEnPanel(true);
          updateToolBubble(modo === 'crear' ? '¡Prueba activada! Tu carta ya está guardada ✨' : '¡Hola de nuevo! Carta guardada ✨');
        } else {
          updateToolBubble('¡Prueba activada! Sube tu carta ✨');
        }
      }
    });
  }
  function hacersePro(motivo) {
    Cuenta.planes({ motivo: typeof motivo === 'string' ? motivo : '', antesDePagar: guardarPendiente });
  }

  // Guardar la carta en el panel (Pro o prueba)
  async function guardarEnPanel(silencio) {
    if (!cartaActual) return;
    if (cartaGuardadaId && silencio !== true) { location.href = '/panel#carta=' + cartaGuardadaId; return; }
    if (!Cuenta.estado) return probarPro('Crea tu cuenta y tu carta se guarda en tu panel para editarla cuando quieras.');
    if (Cuenta.estado.plan === 'gratis') return hacersePro('Guardar y editar tus cartas es de Carta Pro.');
    const btn = document.getElementById('guardarBtn');
    btn.disabled = true;
    document.getElementById('guardarTexto').textContent = 'Guardando…';
    const d = await Cuenta.api('/cartas', { carta: cartaActual, estilo: estiloActual, logo: logoDataUrl, cabecera: cabeceraModo });
    btn.disabled = false;
    if (d.ok) {
      cartaGuardadaId = d.id;
      medir('carta_guardada', { estilo: estiloActual });
      Cuenta.aviso('Carta guardada en tu panel.', { href: '/panel#carta=' + d.id, texto: 'Abrir →' });
    } else if (d.status === 402) {
      hacersePro(d.error);
    } else {
      Cuenta.aviso(d.error || 'No se ha podido guardar.');
    }
    pintarPlan();
  }

  // Antes de ir a la pasarela guardamos la carta, para recuperarla al volver
  function guardarPendiente() {
    if (!cartaActual) return;
    const completo = { carta: cartaActual, estilo: estiloActual, logo: logoDataUrl, modo: cabeceraModo, ajustes: ajustesUsados, guardada: cartaGuardadaId, t: Date.now() };
    if (!almacen.guardar('cr_pendiente', completo)) almacen.guardar('cr_pendiente', { ...completo, logo: null });
  }

  function restaurarPendiente() {
    const p = almacen.leer('cr_pendiente');
    almacen.borrar('cr_pendiente');
    if (!p || !p.carta || Date.now() - p.t > 6 * 60 * 60 * 1000) return false;
    if (p.logo) { logoDataUrl = p.logo; logoActivo = true; }
    if (ESTILOS_VALIDOS.includes(p.estilo)) selEstilo(document.querySelector('.t2-scard.' + p.estilo), p.estilo);
    ajustesUsados = p.ajustes || 0;
    if (p.modo === 'nombre' || p.modo === 'logo') cabeceraModo = p.modo;
    mostrarCarta(p.carta);
    cartaGuardadaId = p.guardada || null;
    pintarPlan();
    return true;
  }

  function cerrarEnviada() { document.getElementById('enviadaVelo').hidden = true; document.body.style.overflow = ''; }
  function otroEmail() { cerrarEnviada(); almacen.guardar('cr_email', ''); document.getElementById('emailDescarga').value = ''; descargar(); }

  // ── Email para descargar la versión gratis ──
  let emailPendiente = null;
  function pedirEmail() {
    return new Promise(res => {
      emailPendiente = res;
      const v = document.getElementById('emailVelo');
      v.hidden = false;
      document.body.style.overflow = 'hidden';
      const i = document.getElementById('emailDescarga');
      const guardado = almacen.leer('cr_email');
      if (guardado && !i.value) i.value = guardado;
      setTimeout(() => i.focus(), 30);
    });
  }
  function cerrarEmail(valor) {
    document.getElementById('emailVelo').hidden = true;
    document.body.style.overflow = '';
    const r = emailPendiente; emailPendiente = null;
    if (r) r(valor || null);
  }
  document.getElementById('emailVelo').addEventListener('mousedown', e => { if (e.target.id === 'emailVelo') cerrarEmail(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('emailVelo').hidden) cerrarEmail(); });
  document.getElementById('emailForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const i = document.getElementById('emailDescarga');
    const email = i.value.trim().toLowerCase();
    const err = document.getElementById('emailError');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { i.classList.add('error'); err.textContent = 'Revisa el email.'; i.focus(); return; }
    i.classList.remove('error'); err.textContent = '';
    const btn = document.getElementById('emailBtn');
    btn.disabled = true;
    try {
      await fetch('/guardar-email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, origen: 'carta-rapida-descarga', novedades: document.getElementById('emailNovedades').checked, ...datosCarta() }) });
    } catch (e) {}
    btn.disabled = false;
    almacen.guardar('cr_email', email);
    medir('generate_lead', { origen: 'descarga' });
    cerrarEmail(email);
  });

  // Vuelta de la pasarela (membresía) y licencias antiguas
  window.addEventListener('cuenta', () => { pintarPlan(); if (cartaActual) renderVista(); pintarNavCuenta(); });
  function pintarNavCuenta() {
    const c = window.Cuenta && Cuenta.estado;
    const a = document.getElementById('navCuenta');
    if (!a) return;
    a.textContent = c ? 'Mis cartas' : 'Entrar';
    a.href = c ? '/panel' : '/panel';
  }
  (async function iniciarCuenta() {
    const pase = new URLSearchParams(location.search).get('pase');
    if (pase) setTimeout(() => vueltaDelPase(pase), 300);
    if (!window.Cuenta) return;
    await Cuenta.cargar();
    const params = new URLSearchParams(location.search);
    if (params.get('suscripcion')) {
      await Cuenta.vueltaDelPago(async (ok) => {
        const hay = restaurarPendiente();
        if (ok && hay) { if (!cartaGuardadaId) await guardarEnPanel(true); updateToolBubble('¡Ya eres Pro! Tu carta está guardada ✨'); }
        else if (!ok && hay) status('Pago cancelado. Tu carta sigue aquí: puedes descargarla gratis o probar Pro 7 días.');
      });
    }
  })();

  async function pedirMontaje(ev) {
    ev.preventDefault();
    const input = document.getElementById('leadEmail');
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input.classList.add('error'); input.focus(); return; }
    input.classList.remove('error');
    const btn = document.getElementById('leadBtn');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      // Se envía la carta tal cual la ve el cliente (estilo y logo) para que Kartia pueda hacer el montaje
      const res = await fetch(cartaActual ? '/solicitar-montaje' : '/guardar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          telefono: document.getElementById('leadTel').value.trim(),
          origen: 'carta-rapida-montaje',
          carta: cartaActual,
          logo: logoDataUrl,
          restaurante: cartaActual ? cartaActual.nombre_restaurante : '',
          estilo: estiloActual,
          platos: cartaActual ? cartaActual.secciones.reduce((n, s) => n + s.platos.length, 0) : 0
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Email no válido');
      document.getElementById('leadForm').style.display = 'none';
      document.getElementById('leadLegal').style.display = 'none';
      document.getElementById('leadOk').style.display = 'block';
      medir('generate_lead', { origen: 'montaje' });
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Quiero verla';
      input.classList.add('error');
    }
  }

  function scroll() {}

  // Tool bubble: update from toggle onclicks
  function updateToolBubble(msg) {
    var el = document.getElementById('toolBubble');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(function() { el.textContent = msg; el.style.opacity = '1'; }, 150);
  }

  // Speech bubble en hero — cycling
  (function() {
    var el = document.getElementById('speechBubble');
    if (!el) return;
    var msgs = ['¡Hola! ¿Empezamos? 🥑', '¡Lánzame tu carta! 📷', 'Cocinando magia… ✨', '¡30 segundos! ⏱️'];
    var idx = 0;
    setInterval(function() {
      idx = (idx + 1) % msgs.length;
      el.style.opacity = '0';
      setTimeout(function() { el.textContent = msgs[idx]; el.style.opacity = '1'; }, 200);
    }, 4000);
    el.style.transition = 'opacity 0.2s';
  })();

  let idleTimer = null;
  let idleSleeping = false;
  function resetIdleTimer() {
    if (isProcessing) return;
    if (idleSleeping) { idleSleeping = false; setPoseInstant('feliz'); }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!isProcessing) { idleSleeping = true; setPose('durmiendo'); }
    }, 60000);
  }
  ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach(ev => {
    document.addEventListener(ev, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();
