/* ============================================================
   MOTOR DE MAQUETACIÓN — Carta Rápida (Kartia)
   Recibe el JSON de la carta y compone páginas A4 reales:
   - decide 1 o 2 columnas y 1 o más páginas
   - reparte las secciones entre columnas sin partirlas
   - ajusta el cuerpo de letra para llenar la página (con mínimos legibles)
   Sin dependencias. Se usa igual en pantalla y en el PDF.
   ============================================================ */
(function (global) {
  'use strict';

  const K_MIN = 0.86;   // por debajo, la letra ya no se lee bien impresa (~9,5 pt el plato)
  const K_COMODO = 0.87; // una sola página mientras la letra siga siendo cómoda (≈9,8 pt el plato); si no, dos
  // Tope de tamaño: una carta corta puede ir grande; una larga, contenida (más premium)
  const kMaxPara = platos => platos <= 8 ? 1.85 : platos <= 14 ? 1.45 : platos <= 24 ? 1.28 : 1.12;
  const HOLGURA = 0.975; // margen de seguridad: pantalla e impresora no miden idéntico

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Precios a la española: 2.5 → 2,50 · 16.00 → 16 · "5/u" se respeta
  function precio(p) {
    if (p == null) return '';
    let s = String(p).trim().replace(/€/g, '').trim();
    if (!s) return '';
    if (/^spm$/i.test(s)) return 'S/M';
    if (/^\d+([.,]\d+)?$/.test(s)) {
      const n = parseFloat(s.replace(',', '.'));
      if (Number.isInteger(n)) return String(n);
      return n.toFixed(2).replace('.', ',');
    }
    // Formatos mixtos ("3.5 | 18", "17/pers", "65/kg"): cada número a la española
    return s.replace(/\d+(?:[.,]\d+)?/g, n => {
      const v = parseFloat(n.replace(',', '.'));
      return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
    });
  }

  // Tipografía: evita que la última palabra quede sola en una línea
  function sinViuda(t) {
    const s = esc(t).trim();
    const i = s.lastIndexOf(' ');
    return i > 0 && s.length - i < 14 ? s.slice(0, i) + '&nbsp;' + s.slice(i + 1) : s;
  }

  /* ---------- Criterio editorial (por si la lectura no lo dejó limpio) ---------- */
  let IDIOMA = 'es';
  const TXT = {
    es: { rec: 'Recomendado', carta: 'Carta', alergenos: 'Alérgenos' },
    en: { rec: 'Recommended', carta: 'Menu', alergenos: 'Allergens' },
    fr: { rec: 'Recommandé', carta: 'Carte', alergenos: 'Allergènes' },
    de: { rec: 'Empfehlung', carta: 'Speisekarte', alergenos: 'Allergene' },
    it: { rec: 'Consigliato', carta: 'Menù', alergenos: 'Allergeni' },
    pt: { rec: 'Recomendado', carta: 'Ementa', alergenos: 'Alergénios' },
    zh: { rec: '推荐', carta: '菜单', alergenos: '过敏原' }
  };
  const t = k => (TXT[IDIOMA] || TXT.es)[k];

  // "LOMO BAJO DE VACA" → "Lomo bajo de vaca" (un diseñador nunca compone la carta entera en mayúsculas)
  function sinGritos(texto) {
    const s = String(texto == null ? '' : texto).trim().replace(/\s+/g, ' ').replace(/\.$/, '');
    const letras = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
    if (letras.length < 4) return s;
    const mayus = letras.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').length;
    if (mayus / letras.length < 0.7) return s;
    const baja = s.toLocaleLowerCase('es');
    return baja.charAt(0).toLocaleUpperCase('es') + baja.slice(1);
  }

  // La ración va aparte y en pequeño: "Jamón ibérico (80 g)" → nombre "Jamón ibérico" + ración "80 g"
  const RE_RACION = /\s*\(([^()]*(?:\d|\bud|\bunid|\bpax\b|\bpers|\bración|\bmedia\b|\bkg\b|\bg\b|\bml\b|\bcl\b|encargo)[^()]*)\)\s*$/i;
  function partir(p) {
    let nombre = sinGritos(p.nombre);
    let racion = String(p.racion || '').trim();
    const m = nombre.match(RE_RACION);
    if (m) { nombre = nombre.slice(0, m.index).trim(); if (!racion) racion = m[1].trim(); }
    return { nombre, racion, descripcion: sinGritos(p.descripcion), alergenos: String(p.alergenos || '').trim(), al: AL ? AL.limpiar(p.al) : [] };
  }

  /* ---------- Alérgenos marcados por el hostelero (ids 1–14 oficiales) ---------- */
  const AL = global.Alergenos || null;
  let MODO_AL = 'iconos'; // 'iconos' | 'numeros' | 'no' (solo en la tabla)
  const usados = c => AL ? AL.limpiar((c.secciones || []).flatMap(s => (s.platos || []).flatMap(p => AL.limpiar(p.al)))) : [];
  function leyenda(c) {
    const ids = MODO_AL === 'no' ? [] : usados(c);
    if (!ids.length) return '';
    return `<div class="pie-al"><span class="pie-al-t">${esc(t('alergenos'))}</span>${ids.map(id =>
      `<span class="pie-al-i">${MODO_AL === 'numeros' ? `<b>${id}</b>` : AL.icono(id)}${esc(AL.nombre(id, IDIOMA))}</span>`).join('')}</div>`;
  }

  // Todos los estilos comparten la misma estructura de plato; cambia la tipografía.
  // Regla de orden: el precio SIEMPRE en la línea del nombre, en la misma posición.
  function platoComun(p) {
    const d = partir(p);
    const pr = precio(p.precio);
    const ico = d.al.length && MODO_AL === 'iconos' ? `<span class="pl-ali" aria-label="${esc(d.al.map(id => AL.nombre(id, IDIOMA)).join(', '))}">${d.al.map(id => AL.icono(id)).join('')}</span>` : '';
    return `<div class="pl${p.destacado ? ' pl-dest' : ''}">`
      + (p.destacado ? `<div class="pl-etq">${esc(t('rec'))}</div>` : '')
      + `<div class="pl-l" style="--pw:${pr.length}"><span class="pl-n">${sinViuda(d.nombre)}${d.racion ? `<span class="pl-r">${esc(d.racion)}</span>` : ''}${d.al.length && MODO_AL === 'numeros' ? `<sup class="pl-als">${d.al.join(' · ')}</sup>` : ''}${d.descripcion ? '' : ico}</span>${pr ? `<span class="pl-g"></span><span class="pl-p">${pr}</span>` : ''}</div>`
      + (d.descripcion ? `<div class="pl-d">${sinViuda(d.descripcion)}${ico}</div>` : '')
      // Alérgenos en números (códigos de la carta): se rotulan para que se entiendan
      + (!d.al.length && d.alergenos ? `<div class="pl-a">${/^\d/.test(d.alergenos) ? esc(t('alergenos')) + ' ' : ''}${esc(d.alergenos)}</div>` : '')
      + `</div>`;
  }

  /* ---------- Plantillas por estilo ---------- */
  const ESTILOS = {
    mantel: {
      nombre: 'Mantel',
      cabecera(c, logo) {
        return `<header class="cab">
          ${logo ? `<img class="cab-logo" src="${logo}" alt="">` : `<div class="cab-nombre">${esc(c.nombre_restaurante)}</div>`}
          ${c.subtitulo ? `<div class="cab-sub">${esc(c.subtitulo)}</div>` : ''}
          <div class="cab-orla"><span></span><i></i><span></span></div>
        </header>`;
      },
      seccion(s) {
        return `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`;
      },
      plato: platoComun
    },

    barra: {
      nombre: 'Barra',
      cabecera(c, logo) {
        return `<header class="cab">
          ${logo ? `<img class="cab-logo" src="${logo}" alt="">` : `<div class="cab-nombre">${esc(c.nombre_restaurante)}</div>`}
          <div class="cab-meta">${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ''}<span class="cab-carta">${esc(t('carta'))}</span></div>
        </header>`;
      },
      seccion(s, i) {
        return `<section class="sec"><h2 class="sec-t"><span class="sec-num">${String(i + 1).padStart(2, '0')}</span><span class="sec-nom">${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`;
      },
      plato: platoComun
    },

    autor: {
      nombre: 'Autor',
      cabecera(c, logo) {
        return `<header class="cab">
          ${logo ? `<img class="cab-logo" src="${logo}" alt="">` : `<div class="cab-nombre">${esc(c.nombre_restaurante)}</div>`}
          ${c.subtitulo ? `<div class="cab-sub">${esc(c.subtitulo)}</div>` : ''}
        </header>`;
      },
      seccion(s) {
        return `<section class="sec"><h2 class="sec-t">${esc(sinGritos(s.nombre))}</h2>${s.platos.map(platoComun).join('')}</section>`;
      },
      plato: platoComun
    },

    /* ----- Colección nueva ----- */
    noche: {
      nombre: 'Medianoche',
      fuentes: ['300 1em "Cormorant Garamond"', '500 1em "Cormorant Garamond"', 'italic 500 1em "Cormorant Garamond"', 'italic 400 1em "Cormorant Garamond"', '400 1em "Cormorant Garamond"'],
      cabecera: (c, logo) => `<header class="cab"><div class="cab-over">${esc(t('carta'))}</div>${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: s => `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    sobremesa: {
      nombre: 'Sobremesa',
      fuentes: ['italic 400 1em "Cormorant Garamond"', 'italic 500 1em "Cormorant Garamond"', '600 1em "Cormorant Garamond"', '400 1em "Jost"', '500 1em "Jost"'],
      cabecera: (c, logo) => `<header class="cab">${nombreOLogo(c, logo)}<div class="cab-regla"></div>${subtit(c)}</header>`,
      seccion: (s, i) => `<section class="sec"><h2 class="sec-t"><span class="sec-num">${romano(i + 1)}</span><span class="sec-nom">${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    brasserie: {
      nombre: 'Brasserie',
      fuentes: ['400 1em "DM Serif Display"', 'italic 400 1em "DM Serif Display"', '600 1em "Libre Franklin"', '500 1em "Libre Franklin"', 'italic 400 1em "Playfair Display"', '400 1em "Playfair Display"'],
      cabecera: (c, logo) => `<header class="cab"><div class="cab-filete"></div>${nombreOLogo(c, logo)}${subtit(c)}<div class="cab-filete"></div></header>`,
      seccion: s => `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    editorial: {
      nombre: 'Editorial',
      fuentes: ['italic 300 1em "Fraunces"', '300 1em "Fraunces"', '500 1em "Manrope"', '600 1em "Manrope"', '700 1em "Manrope"'],
      cabecera: (c, logo) => `<header class="cab">${nombreOLogo(c, logo)}<div class="cab-lado">${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ''}<span class="cab-carta">${esc(t('carta'))}</span></div></header>`,
      seccion: (s, i) => `<section class="sec"><h2 class="sec-t"><span class="sec-num">${i + 1}</span><span class="sec-nom">${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    sumi: {
      nombre: 'Sumi',
      fuentes: ['500 1em "Shippori Mincho"', '600 1em "Shippori Mincho"', '400 1em "Zen Kaku Gothic New"', '500 1em "Zen Kaku Gothic New"'],
      cabecera: (c, logo) => `<header class="cab"><div class="sumi-sello"></div>${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: s => `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    deco: {
      nombre: 'Déco',
      fuentes: ['400 1em "Italiana"', '400 1em "Cinzel"', '500 1em "Cinzel"', '600 1em "Cormorant Garamond"', 'italic 400 1em "Cormorant Garamond"', 'italic 500 1em "Cormorant Garamond"'],
      cabecera: (c, logo) => `<header class="cab"><div class="deco-orn"><i></i><b></b><i></i></div>${nombreOLogo(c, logo)}${subtit(c)}<div class="deco-orn"><i></i><b></b><i></i></div></header>`,
      seccion: s => `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    azulejo: {
      nombre: 'Azulejo',
      fuentes: ['400 1em "Young Serif"', '400 1em "Figtree"', '500 1em "Figtree"', '600 1em "Figtree"', 'italic 400 1em "Figtree"'],
      cabecera: (c, logo) => `<header class="cab"><div class="azu-banda"></div>${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: s => `<section class="sec"><h2 class="sec-t"><i class="azu-flor"></i><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    trattoria: {
      nombre: 'Trattoria',
      fuentes: ['400 1em "DM Serif Display"', 'italic 400 1em "DM Serif Display"', '400 1em "Karla"', '600 1em "Karla"', 'italic 400 1em "Karla"'],
      cabecera: (c, logo) => `<header class="cab">${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: secBasica, plato: platoComun
    },
    cartel: {
      nombre: 'Cartel',
      fuentes: ['400 1em "Anton"', '500 1em "Archivo"', '600 1em "Archivo"', '800 1em "Archivo"', 'italic 400 1em "Archivo"'],
      cabecera: (c, logo) => `<header class="cab">${logo ? `<img class="cab-logo" src="${logo}" alt="">` : `<div class="cab-nombre">${esc(c.nombre_restaurante)}</div>`}${c.subtitulo ? `<div class="cab-sub">${esc(c.subtitulo)}</div>` : ''}</header>`,
      seccion: (s, i) => `<section class="sec"><h2 class="sec-t"><span class="sec-num">${String(i + 1).padStart(2, '0')}</span><span class="sec-nom">${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },
    ticket: {
      nombre: 'Ticket',
      fuentes: ['400 1em "Courier Prime"', '700 1em "Courier Prime"', 'italic 400 1em "Courier Prime"'],
      cabecera: (c, logo) => `<header class="cab"><div class="tk-linea">${'*'.repeat(3)} ${esc(t('carta'))} ${'*'.repeat(3)}</div>${nombreOLogo(c, logo)}${subtit(c)}<div class="tk-linea">${esc(fechaEdicion())}</div></header>`,
      seccion: secBasica, plato: platoComun
    },
    gaceta: {
      nombre: 'Gaceta',
      fuentes: ['400 1em "UnifrakturMaguntia"', '400 1em "Old Standard TT"', '700 1em "Old Standard TT"', 'italic 400 1em "Old Standard TT"', '600 1em "Archivo"'],
      cabecera: (c, logo) => `<header class="cab"><div class="gz-arriba"><span>${esc(c.subtitulo || '')}</span><span>${esc(fechaEdicion())}</span></div>${nombreOLogo(c, logo)}<div class="gz-abajo"><span>${esc(t('carta'))}</span></div></header>`,
      seccion: secBasica, plato: platoComun
    },
    serigrafia: {
      nombre: 'Serigrafía',
      fuentes: ['800 1em "Bricolage Grotesque"', '700 1em "Bricolage Grotesque"', '500 1em "Bricolage Grotesque"', '400 1em "Figtree"', '500 1em "Figtree"', '600 1em "Figtree"'],
      cabecera: (c, logo) => `<header class="cab">${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: secBasica, plato: platoComun
    },
    riviera: {
      nombre: 'Riviera',
      fuentes: ['700 1em "Syne"', '600 1em "Syne"', '300 1em "Space Grotesk"', '400 1em "Space Grotesk"', '500 1em "Space Grotesk"', '600 1em "Space Grotesk"'],
      cabecera: (c, logo) => `<header class="cab">${nombreOLogo(c, logo)}<div class="cab-lado">${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ''}</div></header>`,
      seccion: s => `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`,
      plato: platoComun
    },

    /* ----- Colección por tipo de local ----- */
    bloque: {
      nombre: 'Bloque',
      fuentes: ['400 1em "Anton"', '500 1em "Archivo"', '600 1em "Archivo"', '800 1em "Archivo"', 'italic 400 1em "Archivo"'],
      cabecera: (c, logo) => `<header class="cab">${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: secBasica, plato: platoComun
    },
    marinero: {
      nombre: 'Marinero',
      fuentes: ['700 1em "Zilla Slab"', '500 1em "Zilla Slab"', '400 1em "Figtree"', '500 1em "Figtree"', '600 1em "Figtree"', 'italic 400 1em "Figtree"'],
      cabecera: (c, logo) => `<header class="cab"><i class="ma-aro"></i>${nombreOLogo(c, logo)}${subtit(c)}<div class="ma-ola"></div></header>`,
      seccion: secBasica, plato: platoComun
    },
    brunch: {
      nombre: 'Brunch',
      fuentes: ['600 1em "Fredoka"', '500 1em "Fredoka"', '400 1em "Figtree"', '500 1em "Figtree"', '600 1em "Figtree"'],
      cabecera: (c, logo) => `<header class="cab"><i class="br-sol"></i><i class="br-aro"></i>${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: secBasica, plato: platoComun
    },
    vermut: {
      nombre: 'Vermut',
      fuentes: ['400 1em "Abril Fatface"', '500 1em "Libre Franklin"', '600 1em "Libre Franklin"', 'italic 400 1em "Playfair Display"'],
      cabecera: (c, logo) => `<header class="cab"><div class="vm-etq"><span class="vm-over"><i></i>${esc(t('carta'))}<i></i></span>${nombreOLogo(c, logo)}</div>${c.subtitulo ? `<div class="vm-cinta"><span>${esc(c.subtitulo)}</span></div>` : ''}</header>`,
      seccion: secBasica, plato: platoComun
    },
    pizarra: {
      nombre: 'Pizarra',
      fuentes: ['700 1em "Caveat"', '400 1em "Karla"', '600 1em "Karla"', 'italic 400 1em "Karla"'],
      cabecera: (c, logo) => `<header class="cab"><i class="pz-estrella"></i>${nombreOLogo(c, logo)}${subtit(c)}</header>`,
      seccion: secBasica, plato: platoComun
    }
  };

  function fechaEdicion() {
    try { const f = new Date().toLocaleDateString(IDIOMA === 'es' ? 'es-ES' : IDIOMA, { month: 'long', year: 'numeric' }); return f.charAt(0).toUpperCase() + f.slice(1); }
    catch (e) { return ''; }
  }
  function secBasica(s) { return `<section class="sec"><h2 class="sec-t"><span>${esc(sinGritos(s.nombre))}</span></h2>${s.platos.map(platoComun).join('')}</section>`; }

  function nombreOLogo(c, logo) {
    return logo ? `<img class="cab-logo" src="${logo}" alt="">` : `<div class="cab-nombre">${esc(c.nombre_restaurante)}</div>`;
  }
  function subtit(c) { return c.subtitulo ? `<div class="cab-sub">${esc(c.subtitulo)}</div>` : ''; }
  function romano(n) {
    const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let r = '';
    for (const [v, l] of t) while (n >= v) { r += l; n -= v; }
    return r;
  }

  function pie(c, esUltima, credito) {
    if (!esUltima) return `<footer class="pie"></footer>`;
    const serv = (c.servicios || []).map(s => `<span>${esc(s.nombre)}${precio(s.precio) ? `<b>${precio(s.precio)}</b>` : ''}</span>`).join('');
    return `<footer class="pie">
      ${leyenda(c)}
      ${serv ? `<div class="pie-serv">${serv}</div>` : ''}
      ${c.nota_pie ? `<div class="pie-nota">${esc(c.nota_pie)}</div>` : ''}
      ${credito ? `<div class="pie-credito">Carta compuesta con Carta Rápida · kartia.es</div>` : ''}
    </footer>`;
  }

  /* ---------- Reparto de secciones en columnas ----------
     Partición lineal óptima: conserva el orden de lectura y
     minimiza la columna más alta relativa a su capacidad. */
  function repartir(alturas, capacidades) {
    const n = alturas.length, m = capacidades.length;
    const pref = [0];
    alturas.forEach(h => pref.push(pref[pref.length - 1] + h));
    const suma = (a, b) => pref[b] - pref[a];
    // dp[j][i] = mejor ratio máximo usando j columnas para las primeras i secciones
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(Infinity));
    const corte = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    dp[0][0] = 0;
    for (let j = 1; j <= m; j++) {
      for (let i = 0; i <= n; i++) {
        for (let k = 0; k <= i; k++) {
          const r = Math.max(dp[j - 1][k], suma(k, i) / capacidades[j - 1]);
          // desempate: preferir columnas vacías al final, no en medio
          if (r < dp[j][i] - 1e-9) { dp[j][i] = r; corte[j][i] = k; }
        }
      }
    }
    const grupos = [];
    let i = n;
    for (let j = m; j >= 1; j--) { const k = corte[j][i]; grupos.unshift([k, i]); i = k; }
    return { ratio: dp[m][n], grupos };
  }

  /* Varias páginas: todas las columnas con un llenado parecido (sin una página
     intermedia medio vacía ni otra a reventar). Minimiza la desviación de cada
     columna respecto al llenado medio, sin pasarse nunca de la capacidad. */
  function repartirParejo(alturas, caps) {
    const n = alturas.length, m = caps.length;
    const pref = [0];
    alturas.forEach(h => pref.push(pref[pref.length - 1] + h));
    const media = pref[n] / caps.reduce((a, b) => a + b, 0);
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(Infinity));
    const corte = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    dp[0][0] = 0;
    for (let jj = 1; jj <= m; jj++) {
      for (let ii = 0; ii <= n; ii++) {
        for (let k = 0; k <= ii; k++) {
          if (!isFinite(dp[jj - 1][k])) continue;
          const r = (pref[ii] - pref[k]) / caps[jj - 1];
          if (r > HOLGURA) continue;
          const c = dp[jj - 1][k] + (r - media) * (r - media);
          if (c < dp[jj][ii] - 1e-12) { dp[jj][ii] = c; corte[jj][ii] = k; }
        }
      }
    }
    if (!isFinite(dp[m][n])) return null;
    const grupos = [];
    let ii = n;
    for (let jj = m; jj >= 1; jj--) { const k = corte[jj][ii]; grupos.unshift([k, ii]); ii = k; }
    return grupos;
  }

  /* ---------- Composición ---------- */
  function componer(destino, carta, opts) {
    opts = opts || {};
    const estilo = ESTILOS[opts.estilo] || ESTILOS.mantel;
    const claveEstilo = ESTILOS[opts.estilo] ? opts.estilo : 'mantel';
    // Solo se acepta un logo en data URL de imagen (evita inyectar HTML o cargar URLs externas)
    const logo = typeof opts.logo === 'string' && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(opts.logo) ? opts.logo : null;
    IDIOMA = String(carta.idioma || 'es').slice(0, 2);
    MODO_AL = ['numeros', 'no'].includes(carta.alergenos_modo) ? carta.alergenos_modo : 'iconos';
    const secciones = (carta.secciones || []).filter(s => s.platos && s.platos.length);
    // Secciones largas (8 platos o más) se trocean en bloques de ~4 platos para que
    // puedan continuar en la columna siguiente; el título va solo en el primer bloque.
    const htmlSec = [];
    secciones.forEach((s, i) => {
      if (s.platos.length < 8) { htmlSec.push(estilo.seccion(s, i)); return; }
      const trozos = [];
      for (let j = 0; j < s.platos.length; j += 4) trozos.push(s.platos.slice(j, j + 4));
      if (trozos.length > 1 && trozos[trozos.length - 1].length < 2) trozos[trozos.length - 2].push(...trozos.pop());
      trozos.forEach((platos, j) => {
        const sigue = j < trozos.length - 1 ? ' sec-sigue' : '';
        if (j === 0) htmlSec.push(estilo.seccion({ ...s, platos }, i).replace('<section class="sec"', `<section class="sec${sigue}"`));
        else htmlSec.push(`<section class="sec sec-cont${sigue}">${platos.map(platoComun).join('')}</section>`);
      });
    });
    const totalPlatos = secciones.reduce((a, s) => a + s.platos.length, 0);

    destino.innerHTML = '';
    const pliego = document.createElement('div');
    // Formato: A4 (por defecto), A4 slim (140 × 297 mm) o cuadernillo A4 en pliegos A3 con hendido.
    // El slim se compone sobre una hoja proporcionalmente más grande y se reduce: así los márgenes
    // y adornos de cada estilo encogen a la vez que la hoja, y la letra se compensa con la escala.
    const FORMATO = ['slim', 'elastico'].includes(opts.formato) ? opts.formato : 'a4';
    const S = FORMATO === 'slim' ? 0.8 : 1;
    const kMin = K_MIN / S, kComodo = K_COMODO / S;
    pliego.className = `carta est-${claveEstilo} fmt-${FORMATO}`;
    destino.appendChild(pliego);

    // Crea una página vacía con N columnas y devuelve sus piezas
    function pagina(cols, conCabecera, esUltima, k) {
      const p = document.createElement('div');
      p.className = `pagina cols-${cols}`;
      p.style.setProperty('--letras', Math.max(6, String(carta.nombre_restaurante || '').length));
      p.style.setProperty('--k', k);
      p.innerHTML = `${conCabecera ? estilo.cabecera(carta, logo) : `<header class="cab-corta">${esc(carta.nombre_restaurante || '')}</header>`}
        <main class="cuerpo">${Array.from({ length: cols }, () => '<div class="col"></div>').join('')}</main>
        ${pie(carta, esUltima, opts.credito !== false)}`;
      pliego.appendChild(p);
      return p;
    }

    // Mide una configuración: ¿cabe con este k? Devuelve el reparto
    function probar(cols, numPag, k) {
      pliego.innerHTML = '';
      const paginas = [];
      // En cuadernillo la cabecera grande va en la portada: dentro, solo el nombre en pequeño
      for (let i = 0; i < numPag; i++) paginas.push(pagina(cols, i === 0 && FORMATO !== 'elastico', i === numPag - 1, k));
      // Alturas de cada sección, medidas en una columna real
      const colRef = paginas[0].querySelector('.col');
      const alturas = htmlSec.map(h => {
        colRef.insertAdjacentHTML('beforeend', h);
        const el = colRef.lastElementChild;
        const cs = getComputedStyle(el);
        const alto = el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
        el.remove();
        return alto;
      });
      const caps = [];
      paginas.forEach(p => {
        const cuerpo = p.querySelector('.cuerpo');
        const h = cuerpo.getBoundingClientRect().height;
        for (let c = 0; c < cols; c++) caps.push(h);
      });
      const r = repartir(alturas, caps);
      return { cols, numPag, k, paginas, alturas, caps, ...r };
    }

    function mejorK(cols, numPag) {
      // con varias páginas hay sitio: la letra puede crecer un poco más
      const K_MAX = (numPag > 1 ? Math.min(1.3, kMaxPara(totalPlatos / numPag) * 1.1) : kMaxPara(totalPlatos)) / S;
      let lo = kMin, hi = K_MAX, mejor = null;
      const alMax = probar(cols, numPag, hi);
      if (alMax.ratio <= HOLGURA) return alMax;
      const alMin = probar(cols, numPag, lo);
      if (alMin.ratio > HOLGURA) return { ...alMin, noCabe: true };
      mejor = alMin;
      for (let it = 0; it < 12; it++) {
        const mid = (lo + hi) / 2;
        const t = probar(cols, numPag, mid);
        if (t.ratio <= HOLGURA) { mejor = t; lo = mid; } else hi = mid;
      }
      return mejor;
    }

    // Candidatas: 1 columna solo tiene sentido en cartas cortas
    const candidatas = [];
    const COLS = FORMATO === 'slim' ? 1 : 2; // la hoja estrecha va siempre a una columna
    if (totalPlatos <= 14 || COLS === 1) candidatas.push([1, 1]);
    if (COLS === 2) candidatas.push([2, 1]);
    let elegida = null;
    for (const [c, p] of candidatas) {
      const r = mejorK(c, p);
      if (r.noCabe) continue;
      // 1 columna solo si no obliga a una letra claramente menor que a 2 columnas
      if (!elegida || r.k > elegida.k * 1.08) elegida = r;
    }
    if (elegida && elegida.cols === 2 && elegida.k < kComodo) {
      const dos = mejorK(2, 2);
      if (!dos.noCabe && dos.k >= kComodo) elegida = dos;
    }
    let paginasNecesarias = 2;
    while (!elegida) {
      const r = mejorK(COLS, paginasNecesarias);
      if (!r.noCabe || paginasNecesarias >= (COLS === 1 ? 10 : FORMATO === 'elastico' ? 14 : 6)) elegida = r;
      paginasNecesarias++;
    }
    // Cuadernillo: portada + interior + contraportada tienen que sumar un múltiplo de 4.
    // Si falta una página, se reparte el interior en una más (letra más holgada) en vez de dejarla en blanco.
    const enBlanco = n => (4 - ((n + 2) % 4)) % 4;
    if (FORMATO === 'elastico' && enBlanco(elegida.numPag) % 2 === 1) {
      const n = elegida.numPag + 1;
      const una = totalPlatos / n <= 14 ? mejorK(1, n) : { noCabe: true };
      const r = una.noCabe ? mejorK(2, n) : una;
      if (!r.noCabe) elegida = r;
    }

    // Reconstruye con la configuración elegida y coloca las secciones
    const final = probar(elegida.cols, elegida.numPag, elegida.k);
    pliego.classList.toggle('multi', elegida.numPag > 1);
    if (elegida.numPag > 1) {
      const parejo = repartirParejo(final.alturas, final.caps);
      if (parejo) final.grupos = parejo;
    }
    const columnas = [];
    final.paginas.forEach(p => p.querySelectorAll('.col').forEach(c => columnas.push(c)));
    final.grupos.forEach(([a, b], idx) => {
      for (let i = a; i < b; i++) columnas[idx].insertAdjacentHTML('beforeend', htmlSec[i]);
    });

    // Aire sobrante: se reparte entre secciones y, en menor medida, entre platos.
    // Mismo valor en todas las columnas de una página (si no, se ve descuadrado).
    // Cada página calcula el suyo: así la primera (con cabecera) no queda con un
    // bloque flotando en medio. Lo que aún sobre, centra el bloque verticalmente.
    const PESO_PLATO = 0.3;
    const MM = 3.78;
    final.paginas.forEach(p => {
      const disponible = p.querySelector('.cuerpo').getBoundingClientRect().height * HOLGURA;
      let aire = Infinity;
      p.querySelectorAll('.col').forEach(c => {
        if (!c.children.length) return;
        const secs = c.querySelectorAll('.sec').length;
        const pls = c.querySelectorAll('.pl').length;
        const unidades = Math.max(1, secs - 1) + PESO_PLATO * Math.max(0, pls - secs);
        aire = Math.min(aire, (disponible - c.getBoundingClientRect().height) / unidades);
      });
      if (!isFinite(aire) || aire < 0) aire = 0;
      aire = Math.min(aire, (p.classList.contains('cols-1') ? 28 : 18) * MM); // máx. entre secciones
      const airePl = Math.min(aire * PESO_PLATO, 6 * MM);   // máx. ≈6 mm extra entre platos
      p.style.setProperty('--aire', aire.toFixed(1) + 'px');
      p.style.setProperty('--aire-pl', airePl.toFixed(1) + 'px');
    });

    let hojas = 0;
    if (FORMATO === 'elastico') {
      const suelta = (clase, html) => {
        const p = document.createElement('div');
        p.className = 'pagina ' + clase;
        p.style.setProperty('--letras', Math.max(6, String(carta.nombre_restaurante || '').length));
        p.style.setProperty('--k', 1);
        p.innerHTML = html;
        return p;
      };
      const blancas = enBlanco(final.paginas.length);
      const portada = suelta('portada', `<div class="portada-in">${estilo.cabecera(carta, logo)}</div>`);
      const contra = suelta('contra', `<div class="contra-in">${logo ? `<img class="cab-logo" src="${logo}" alt="">` : esc(carta.nombre_restaurante || '')}</div>`);
      pliego.insertBefore(portada, pliego.firstChild);
      // Las páginas en blanco, donde menos molestan: el reverso de la portada y el de la contraportada
      if (blancas >= 2) portada.after(suelta('blanca', ''));
      for (let i = blancas >= 2 ? 1 : 0; i < blancas; i++) pliego.appendChild(suelta('blanca', ''));
      pliego.appendChild(contra);
      const todas = [...pliego.children];
      hojas = todas.length / 4;
      // Imposición para imprimir a doble cara en A3 y hender por el centro:
      // hoja 1 anverso = contraportada | portada, reverso = pág. 2 | penúltima, y así hacia dentro.
      if (opts.imponer) {
        const N = todas.length;
        const cara = (izq, der, lado) => { const h = document.createElement('div'); h.className = 'hoja-a3 ' + lado; h.append(izq, der); return h; };
        const caras = [];
        for (let i = 0; i < N / 4; i++) {
          caras.push(cara(todas[N - 1 - 2 * i], todas[2 * i], 'anverso'));
          caras.push(cara(todas[2 * i + 1], todas[N - 2 - 2 * i], 'reverso'));
        }
        pliego.replaceChildren(...caras);
      }
    }
    const numPaginas = FORMATO === 'elastico' ? hojas * 4 : elegida.numPag;
    pliego.dataset.info = JSON.stringify({ columnas: elegida.cols, paginas: numPaginas, escala: +(elegida.k * S).toFixed(3), platos: totalPlatos, formato: FORMATO, ...(hojas ? { hojas } : {}) });
    return JSON.parse(pliego.dataset.info);
  }

  global.MotorCarta = { componer, ESTILOS, precio, platoComun, sinGritos, esc, t };
})(typeof window !== 'undefined' ? window : globalThis);
