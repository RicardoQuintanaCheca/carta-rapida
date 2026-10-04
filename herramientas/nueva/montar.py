# Monta public/nueva.html: diseño nuevo + herramienta real (mismo HTML y JS que la portada actual)
import re, sys, pathlib
AQUI = pathlib.Path(__file__).parent
REPO = AQUI.parent.parent / 'public'
SALIDA = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
INDEXABLE = SALIDA == 'index.html'

# portada-fuente.html es la portada anterior: de ella salen la cabecera SEO, el HTML y el JS de la herramienta
idx = (AQUI / 'portada-fuente.html').read_text()
proto = (AQUI / 'plantilla.html').read_text()
L = idx.split('\n')

def entre(a, b):  # líneas a..b (1-indexadas, inclusivas)
    return '\n'.join(L[a-1:b])

def linea(pat, desde=1):
    for i in range(desde-1, len(L)):
        if pat in L[i]: return i+1
    raise SystemExit('no encuentro ' + pat)

# ── Cabecera: la de la portada, con fuentes nuevas ──
i_style = linea('<style>')
i_fin_style = linea('</style>', i_style)
i_head_fin = linea('</head>')
head = entre(1, i_style-1)
if not INDEXABLE:
    head = head.replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, nofollow">')
head = head.replace('<meta name="theme-color" content="#FF6B35">', '<meta name="theme-color" content="#FFFFFF">')
head = re.sub(r'<link rel="preload" as="image"[^>]*>\n', '', head)
# Vista previa al compartir, con la identidad nueva
for viejo, nuevo in [
    ('content="Deja Canva: tu carta, lista para imprimir en 30 segundos"', 'content="Tu carta, maquetada como en una imprenta · Carta Rápida"'),
    ('content="https://cartarapida.es/og-deja-canva.jpg"', 'content="https://cartarapida.es/og-portada.jpg"'),
    ('content="Deja Canva: una carta de restaurante antes y después de pasar por Carta Rápida"', 'content="Una carta de restaurante hecha en Word, antes y después de pasar por Carta Rápida"'),
]:
    assert viejo in head, viejo
    head = head.replace(viejo, nuevo)
head = re.sub(r'<link href="https://fonts.googleapis.com/css2\?family=Bricolage[^>]*>',
              '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Jost:wght@400;500&display=swap">', head)
css_viejo = entre(i_style+1, i_fin_style-1)
scripts_head = entre(i_fin_style+1, i_head_fin-1)

# ── Herramienta (HTML tal cual) ──
i_tool = linea('<section class="tool-section" id="herramienta">')
i_tool_fin = linea('</section>', i_tool)
tool = entre(i_tool, i_tool_fin)
# Barra de «app» con los tres pasos, arriba de la tarjeta de la herramienta
tool = tool.replace('<section class="tool-section" id="herramienta">\n  <div class="wrap">',
  '<section class="tool-section" id="herramienta">\n  <div class="wrap">\n    <div class="n-app" aria-hidden="true"><span class="n-app-marca">Carta <b>Rápida</b></span><ol class="n-app-pasos"><li data-p="1">Tu carta</li><li data-p="2">Estilo</li><li data-p="3">PDF</li></ol></div>', 1)
assert 'n-app-pasos' in tool
# Ajustes plegables: menos fricción
tool = tool.replace('<div class="t2-card t2-toggles-card">\n        <div class="t2-eyebrow">02 · AJUSTES <span class="t2-eyebrow-nota">· opcional</span></div>',
  '<div class="t2-card t2-toggles-card" id="opciones">\n        <button type="button" class="n-opc" aria-expanded="false" aria-controls="opciones" onclick="nOpciones(this)"><span>Opciones <small>nombre, logotipo, idioma…</small></span><i aria-hidden="true"></i></button>')
assert 'n-opc' in tool
tool = tool.replace('<div class="t2-eyebrow t2-eyebrow-subir">01 · SUBE TU CARTA</div>', '')
tool = tool.replace('📸 Súbeme una foto primero', 'Sube una foto primero')
tool = tool.replace('¿No tienes la carta a mano? <b>Pruébalo con una de ejemplo →</b>', '¿No tienes la carta a mano? <b>Prueba con una de ejemplo</b>')
tool = tool.replace('<div class="t2-microcopy">Gratis · sin registro · listo en 30 s</div>',
  '<div class="t2-microcopy">Gratis · sin tarjeta · estilo: <b id="nEstilo">Sobremesa</b> <span>(lo cambias al ver tu carta)</span></div>')

# ── Piezas finales de la portada (modal, cookies, visor, script) ──
i_cuenta = linea('<script src="/cuenta.js"></script>')
i_barra = linea('<!-- BARRA MÓVIL -->', i_cuenta)
modal = entre(i_cuenta, i_barra-1)
i_footer = linea('<footer class="site-footer">', i_barra)
i_footer_fin = linea('</footer>', i_footer)
i_script = linea('<script>', i_footer_fin)
cookies_visor = entre(i_footer_fin+1, i_script-1)
i_script_fin = max(i for i, l in enumerate(L, 1) if l.strip() == '</script>')
script_viejo = entre(i_script, i_script_fin)
i_seo = linea('<section class="seo-section">')
seo = entre(i_seo+2, linea('</section>', i_seo)-2)
# FAQ real (para que coincida con el schema de la cabecera)
i_faq = linea('<section class="faq-section" id="faq">')
faq_html = entre(i_faq, linea('</section>', i_faq))
faqs = re.findall(r'<div class="faq-question"><h3>(.*?)</h3>.*?<div class="faq-answer">(.*?)</div>\s*</div>', faq_html, re.S)

# ── Diseño nuevo: CSS y HTML del prototipo, con nombres que no chocan con la herramienta ──
renombra = ['hero-copy', 'nav-links', 'nav-cta', 'hero', 'nav', 'logo', 'dot', 'pro', 'wrap']
css_nuevo = proto[proto.find('<style>')+7:proto.find('</style>')]
for n in renombra:
    css_nuevo = re.sub(r'\.' + re.escape(n) + r'(?![\w-])', '.n' + n, css_nuevo)
cuerpo = proto[proto.find('</style>')+8:proto.find('<script src=')]
def ren_clases(m):
    return 'class="' + ' '.join('n' + c if c in renombra else c for c in m.group(1).split()) + '"'
cuerpo = re.sub(r'class="([^"]+)"', ren_clases, cuerpo)
js_nuevo = (AQUI / 'nueva.js').read_text()
extra = (AQUI / 'nueva.css').read_text()

# Imágenes reales
cuerpo = cuerpo.replace('{{img:antes}}', '/ejemplo/antes-640.webp')
# Estilos: la misma carta de ejemplo (Casa Pepe) compuesta con el motor real
cuerpo = re.sub(r'src="\{\{img:(\w+)\}\}"', lambda m: 'src="/ejemplo/portada-%s.webp" srcset="/ejemplo/portada-%s-640.webp 640w, /ejemplo/portada-%s.webp 900w" sizes="(max-width: 900px) 92vw, 500px" width="900" height="1273"' % ((m.group(1),) * 3), cuerpo)

# Barra: enlaces reales
cuerpo = cuerpo.replace('<a class="nlogo" href="#inicio"', '<a class="nlogo" href="/"')
cuerpo = cuerpo.replace('<a class="entrar" href="#precios">Entrar</a>', '<a class="entrar" href="/panel" id="navCuenta">Entrar</a>')

# Pruébala: cabecera + herramienta real
i_a = cuerpo.find('<section class="sec" id="prueba">')
i_b = cuerpo.find('</section>', i_a) + len('</section>')
prueba = '''<section class="sec n-prueba" id="prueba">
    <div class="nwrap">
      <div class="sec-head">
        <div>
          <div class="eyebrow">Pruébala ahora</div>
          <h2 class="h-l rv">Tres pasos. <span class="grey">Ninguno es «aprende a diseñar».</span></h2>
        </div>
        <ol class="n-pasos rv">
          <li><span>1</span>Haz una foto a tu carta</li>
          <li><span>2</span>Elige el estilo</li>
          <li><span>3</span>Descarga el PDF</li>
        </ol>
      </div>
    </div>
''' + tool + '''
  </section>'''
cuerpo = cuerpo[:i_a] + prueba + cuerpo[i_b:]

# Estilos: el botón lleva el estilo elegido a la herramienta
cuerpo = cuerpo.replace('<a class="btn btn-ink" href="#prueba">Probar con mi carta</a>',
  '<button class="btn btn-ink" type="button" id="probarEstilo"><span>Probar <span id="probarEstiloNom">Riviera · Pro</span> con mi carta</span></button>')

# Pro: llamadas reales
cuerpo = cuerpo.replace('''          </ul>
        </div>
        <div class="editor"''', '''          </ul>
          <div class="n-pro-ctas">
            <button class="btn btn-accent" type="button" onclick="probarPro()">Pruébalo 7 días gratis</button>
            <span class="n-nota">Sin tarjeta · después, desde 9,90 €/mes</span>
          </div>
        </div>
        <div class="editor"''')
assert 'n-pro-ctas' in cuerpo

# Precios: botones reales
cuerpo = cuerpo.replace('<a class="btn btn-ghost" href="#prueba">Crear mi carta</a>', '<a class="btn btn-ghost" href="#prueba">Hacer mi carta gratis</a>')
cuerpo = cuerpo.replace('<a class="btn btn-accent" href="#prueba">Probar 7 días gratis</a>',
  '<div class="n-plan-ctas"><button class="btn btn-accent" type="button" onclick="probarPro()">Probar 7 días gratis</button><button class="n-directo" type="button" onclick="hacersePro()">o activa Pro ya</button></div>')
cuerpo = cuerpo.replace('''<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>3 ajustes por carta</li>''',
  '''<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>Platos fuertes destacados</li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>3 ajustes por carta</li>''')
cuerpo = cuerpo.replace('''      </div>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="nwrap faq">''', '''      </div>
      <p class="n-precios-nota rv">La prueba no pide tarjeta y no se convierte en pago sola. Los PDF que descargues son tuyos para siempre. Factura con tu CIF.</p>
    </div>
  </section>

  <section class="sec" style="padding-top:0" id="faq">
    <div class="nwrap faq">''')
assert 'n-precios-nota' in cuerpo

# Preguntas: las de verdad
if faqs:
    det = '\n'.join('        <details%s><summary>%s<i aria-hidden="true"></i></summary><p>%s</p></details>' % (' open' if k == 0 else '', re.sub(r'\s+', ' ', q).strip(), re.sub(r'\s+', ' ', a).strip()) for k, (q, a) in enumerate(faqs))
    cuerpo = re.sub(r'(<div class="nwrap faq">.*?</div>\s*<div>\n)(.*?)(\n      </div>\s*</div>\s*</section>)', lambda m: m.group(1) + det + m.group(3), cuerpo, count=1, flags=re.S)
else:
    print('AVISO: no he podido leer las preguntas de la portada')

# Final, Kartia, texto SEO y pie reales
cuerpo = cuerpo.replace('<a class="btn btn-accent" href="#prueba">Sube una foto de tu carta</a>',
  '<div class="n-final-ctas"><a class="btn btn-accent" href="#prueba">Sube una foto de tu carta</a><button class="btn n-btn-claro" type="button" onclick="probarPro()">Probar Pro 7 días gratis</button></div>')
i_f = cuerpo.find('<footer class="foot">')
i_g = cuerpo.find('</footer>', i_f) + len('</footer>')
pie = '''<div class="n-kartia rv">
      <div><b>¿Y el portamenú?</b> Carta Rápida es de Kartia, el taller español que fabrica cartas y portamenús a mano para hostelería desde 2018.</div>
      <a class="btn btn-ghost" href="https://kartia.es/portamenus/?utm_source=cartarapida&amp;utm_medium=referral&amp;utm_campaign=banda" target="_blank" rel="noopener">Ver portamenús</a>
    </div>
    <details class="n-seo">
      <summary>Más sobre el diseño de cartas de restaurante<i aria-hidden="true"></i></summary>
      <div class="n-seo-in">
''' + seo + '''
      </div>
    </details>
    <footer class="foot">
      <span>© 2026 Kartia — Gastrotouch Marketing Solutions S.L.</span>
      <nav aria-label="Enlaces">
        <a href="/panel">Mis cartas</a>
        <a href="https://kartia.es/?utm_source=cartarapida&amp;utm_medium=referral&amp;utm_campaign=pie">kartia.es</a>
        <a href="https://escandallo.kartia.es">Escandallos</a>
        <a href="mailto:hola@kartia.es">Contacto</a>
        <a href="/legal/aviso-legal.html">Aviso legal</a>
        <a href="/legal/privacidad.html">Privacidad</a>
        <a href="/legal/condiciones.html">Condiciones</a>
        <a href="/legal/cookies.html" onclick="if(window.abrirCookies){abrirCookies();return false;}">Cookies</a>
      </nav>
    </footer>'''
cuerpo = cuerpo[:i_f] + pie + cuerpo[i_g:]

cuerpo += '\n<a class="n-barra" id="nBarra" href="#prueba"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></svg>Sube una foto de tu carta</a>'
cuerpo += '\n<button class="n-barra n-descarga" id="nDescarga" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span id="nDescargaTxt">Descargar PDF</span></button>'
html = head + '\n<style>\n' + css_viejo + '\n</style>\n<style>\n/* ═══ Diseño nuevo ═══ */\n' + css_nuevo + '\n/* ═══ Herramienta con el diseño nuevo ═══ */\n' + extra + '\n</style>\n' + scripts_head + '\n</head>\n<body class="n">\n' + cuerpo + '\n' + modal + '\n' + cookies_visor + '\n' + script_viejo + '''
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js" defer></script>
<script>
''' + js_nuevo + '''
</script>
</body>
</html>
'''
# Los iconos son decorativos: que los lectores de pantalla no los lean
html = re.sub(r'<svg(?![^>]*aria-hidden)', '<svg aria-hidden="true"', html)
(REPO / SALIDA).write_text(html)
print(SALIDA, len(html)//1024, 'KB ·', len(faqs), 'preguntas')
