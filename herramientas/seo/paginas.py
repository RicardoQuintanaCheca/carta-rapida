#!/usr/bin/env python3
"""Páginas de entrada por tipo de local. Uso: python3 herramientas/seo/paginas.py
Genera public/<slug>/index.html y public/sitemap.xml. Sin datos inventados: solo lo que la herramienta hace."""
import json, pathlib, datetime, html
RAIZ = pathlib.Path(__file__).parent.parent.parent / 'public'
WEB = 'https://www.cartarapida.es'
HOY = datetime.date.today().isoformat()
NOMBRE = {'riviera':'Riviera','sobremesa':'Sobremesa','serigrafia':'Serigrafía','gaceta':'Gaceta','cartel':'Cartel','bloque':'Bloque','marinero':'Marinero','brunch':'Brunch','vermut':'Vermut','pizarra':'Pizarra','brasserie':'Brasserie','sumi':'Sumi','editorial':'Editorial','azulejo':'Azulejo','trattoria':'Trattoria','ticket':'Ticket','deco':'Déco','mantel':'Mantel','barra':'Barra','autor':'Autor'}
PRO = {'riviera','sumi','cartel','serigrafia','azulejo','marinero','brunch','vermut'}

AL = json.loads((pathlib.Path(__file__).parent / 'alergenos.json').read_text(encoding='utf-8'))
AL_QUE = {1:'Trigo, centeno, cebada, avena, espelta, kamut y sus variedades híbridas, y lo que se elabora con ellos.',
 2:'Gambas, langostinos, cigalas, cangrejos, bogavante y los productos hechos con ellos.',
 3:'Huevos y los productos a base de huevo.',
 4:'Pescado y los productos a base de pescado.',
 5:'Cacahuetes y los productos a base de cacahuetes.',
 6:'Soja y los productos a base de soja.',
 7:'Leche y sus derivados, incluida la lactosa.',
 8:'Almendras, avellanas, nueces, anacardos, pacanas, nueces de Brasil, pistachos y nueces de macadamia.',
 9:'Apio y los productos derivados.',
 10:'Mostaza y los productos derivados.',
 11:'Granos de sésamo y los productos a base de sésamo.',
 12:'Dióxido de azufre y sulfitos en concentraciones superiores a 10 mg/kg o 10 mg/litro.',
 13:'Altramuces y los productos a base de altramuces.',
 14:'Mejillones, almejas, calamar, sepia, pulpo, caracoles y los productos hechos con ellos.'}
def fig_al(base, alt, pie, ancho='(max-width: 860px) 78vw, 340px'):
    return ('<figure><img src="/ejemplo/%s-640.webp" srcset="/ejemplo/%s-640.webp 640w, /ejemplo/%s.webp 900w" sizes="%s" width="900" height="1274" alt="%s" loading="lazy" decoding="async"><figcaption>%s</figcaption></figure>'
            % (base, base, base, ancho, html.escape(alt, quote=True), html.escape(pie)))
TRES_FORMAS = ('<section><div class="w"><h2>Tres formas de enseñarlos. Tú eliges.</h2><p class="lead" style="margin-top:0">La misma carta de ejemplo, con los alérgenos que ha marcado el restaurante.</p><div class="tres">'
  + fig_al('alergenos-iconos', 'Carta de restaurante con iconos de alérgenos junto a cada plato y leyenda al pie', 'Con iconos, del color de tu carta')
  + fig_al('alergenos-numeros', 'Carta de restaurante con los alérgenos indicados con números y leyenda numerada al pie', 'Con números y leyenda al pie')
  + fig_al('alergenos-tabla', 'Tabla de alérgenos de un restaurante con los platos en filas y los 14 alérgenos en columnas', 'O solo en la tabla, para sala')
  + '</div></div></section>')
LOS_14 = ('<section><div class="w"><h2>Los catorce, uno a uno</h2><p class="lead" style="margin-top:0">En el orden del anexo II del Reglamento (UE) 1169/2011. Los iconos son los que usa Carta Rápida en la carta y en la tabla.</p><ol class="al14">'
  + ''.join('<li>%s<div><b>%s</b><span>%s</span></div></li>' % (a['svg'], html.escape(a['es']), html.escape(AL_QUE[a['id']])) for a in AL)
  + '</ol><p class="nota">El anexo recoge algunas excepciones para derivados muy procesados. Ante la duda, manda el texto oficial y la ficha técnica de tu proveedor.</p></div></section>')

def fig_f(base, w, h, alt, medida, nombre, texto, pro, ancho):
    ch = round(w * 640 / 900)
    return ('<figure><img src="/ejemplo/%s-640.webp" srcset="/ejemplo/%s-640.webp %dw, /ejemplo/%s.webp %dw" sizes="%s" width="%d" height="%d" alt="%s" loading="lazy" decoding="async"><figcaption><span>%s</span><b>%s%s</b>%s</figcaption></figure>'
            % (base, base, ch, base, w, ancho, w, h, html.escape(alt, quote=True), html.escape(medida), html.escape(nombre), '<i>Pro</i>' if pro else '', html.escape(texto)))
TRES_FORMATOS = ('<section><div class="w"><h2>La misma carta, en los tres formatos</h2><p class="lead" style="margin-top:0">Uno al lado del otro, para que veas la diferencia de tamaño. Es una carta de ejemplo.</p><div class="fmts">'
  + fig_f('formato-a4', 900, 1273, 'Carta de restaurante en formato A4, a dos columnas', '210 × 297 mm', 'A4', 'El folio de siempre. Para funda, tablilla o portamenús.', False, '(max-width: 860px) 55vw, 290px')
  + fig_f('formato-slim', 600, 1273, 'La misma carta en formato A4 slim, alta y estrecha, a una columna', '140 × 297 mm', 'A4 slim', 'Igual de alta, más estrecha. Se sujeta con una mano.', True, '(max-width: 860px) 36vw, 190px')
  + fig_f('formato-cuadernillo-abierto', 1800, 1272, 'La misma carta en cuadernillo, abierta por las páginas interiores', 'Hojas A3 dobladas · A4 cerrado', 'Cuadernillo con elástico', 'Con portada y contraportada. Abierto ocupa un A3.', True, '(max-width: 860px) 92vw, 580px')
  + '</div></div></section>')
def fig_ancha(base, alt, pie):
    return ('<figure class="ancha"><img src="/ejemplo/%s-640.webp" srcset="/ejemplo/%s-640.webp 1280w, /ejemplo/%s.webp 1800w" sizes="(max-width: 860px) 92vw, 820px" width="1800" height="1272" alt="%s" loading="lazy" decoding="async"><figcaption>%s</figcaption></figure>'
            % (base, base, base, html.escape(alt, quote=True), html.escape(pie)))
MONTAJE = ('<section><div class="w"><h2>Cómo sale montado el PDF</h2><p class="lead" style="margin-top:0">No recibes las páginas sueltas una detrás de otra. Recibes las hojas A3 tal como hay que imprimirlas, con cada página en su sitio.</p>'
  + fig_ancha('formato-cuadernillo-hoja', 'Hoja A3 del cuadernillo por la cara exterior: contraportada a la izquierda y portada a la derecha, con marcas de plegado en el centro', 'Cara exterior de la primera hoja: contraportada a la izquierda, portada a la derecha. Las dos rayitas del centro marcan por dónde se dobla.')
  + fig_ancha('formato-cuadernillo-azulejo-abierto', 'Hoja A3 del cuadernillo por la cara interior, con dos páginas de carta', 'La otra cara de esa misma hoja: las páginas de dentro.')
  + '<ol class="pasos" style="margin-top:36px"><li>Imprime en A3 a doble cara<span>Volteando por el borde corto. Es una opción de la impresora o de la copistería.</span></li><li>Dobla cada hoja por el centro<span>Si el papel es grueso, pide que te lo hiendan antes para que no se cuartee.</span></li><li>Mete unas hojas dentro de otras<span>En orden, y pasa el elástico por el lomo.</span></li></ol>'
  + '</div></section>')

MENUS = ('<section><div class="w"><h2>El mismo menú, en tres estilos</h2><p class="lead" style="margin-top:0">Es un menú de ejemplo. Hay veinte estilos y en todos sale centrado, con el precio al pie.</p><div class="tres">'
  + fig_al('menu-pizarra', 'Menú del día en estilo Pizarra, con títulos a mano', 'Pizarra')
  + fig_al('menu-sobremesa', 'Menú del día en estilo Sobremesa, clásico y centrado', 'Sobremesa')
  + fig_al('menu-gaceta', 'Menú del día en estilo Gaceta, como la cabecera de un periódico', 'Gaceta')
  + '</div>' + fig_ancha('menu-a5-dos-por-folio', 'Menú del día dos veces en un folio apaisado, con marca de corte', 'Y en A5: el menú sale dos veces en cada folio. Cortas por el centro.')
  + '</div></section>')

def fig_rs(base, h, alt, pie):
    return ('<figure><img src="/ejemplo/%s-640.webp" srcset="/ejemplo/%s-640.webp 640w, /ejemplo/%s.webp 900w" sizes="(max-width: 860px) 78vw, 340px" width="900" height="%d" alt="%s" loading="lazy" decoding="async"><figcaption>%s</figcaption></figure>'
            % (base, base, base, h, html.escape(alt, quote=True), html.escape(pie)))
REDES = ('<section><div class="w"><h2>Tres formatos. La misma imagen de tu local.</h2><p class="lead" style="margin-top:0">Son ejemplos sacados de una carta de prueba. Salen a 1080 píxeles de ancho, el tamaño que piden Instagram y Facebook.</p><div class="tres" style="align-items:start">'
  + fig_rs('redes-plato-cuadrada', 900, 'Imagen cuadrada con un plato en grande, su descripción y su precio', 'Cuadrada · un plato')
  + fig_rs('redes-menu-vertical', 1126, 'Menú del día en una imagen vertical para publicar en Instagram', 'Vertical · el menú del día')
  + fig_rs('redes-menu-historia', 1600, 'Menú del día en formato historia para Instagram y el estado de WhatsApp', 'Historia · Instagram y estado de WhatsApp')
  + '</div></div></section>')

COMUN_FAQ = [
  ('¿Cuánto cuesta?', 'Dos cartas al mes son gratis, con 12 estilos, y el PDF te llega al email. Carta Pro cuesta 12,90 € al mes y añade los 8 estilos restantes, guardar tus cartas, cambiar precios sin empezar de cero, tu logotipo y la traducción. Tiene 7 días de prueba gratis, sin tarjeta, y te das de baja cuando quieras.'),
  ('¿En qué formato me llega?', 'En PDF tamaño A4, listo para imprimir en tu impresora o en una copistería. Con Carta Pro puedes elegir también A4 slim (140 × 297 mm) o cuadernillo con elástico, en hojas A3 dobladas.'),
]

PAGINAS = [
 dict(slug='plantillas-carta-restaurante', menu='Plantillas de carta',
  title='Plantillas de carta de restaurante: 20 estilos listos para imprimir',
  desc='20 plantillas de carta de restaurante que se rellenan solas: subes una foto de tu carta y la recibes maquetada en PDF A4. 12 estilos gratis.',
  h1='Plantillas de carta de restaurante que se rellenan solas.',
  golpe='Una plantilla normal te deja el trabajo a ti. Esta no.',
  intro='Con una plantilla de las de siempre eliges un diseño bonito y después tecleas cuarenta platos, uno a uno, cuadrando precios y saltos de línea. Aquí haces una foto a la carta que ya tienes, eliges estilo y recibes el PDF en A4.',
  estilos=list(NOMBRE.keys()), todos=True,
  bloques=[
   ('Veinte estilos, no veinte colores de lo mismo', 'Hay cartas de tinta y papel para un restaurante de mantel, cartas de tiza para un bar, cartas de bloque para una hamburguesería y cartas claras para un brunch. Cada estilo cambia la tipografía, la retícula y los adornos. Doce son gratis; ocho son de Carta Pro.'),
   ('Cómo funciona', 'Uno: haces una foto a tu carta, o pegas el texto si lo tienes en el ordenador. Dos: eliges el estilo y lo cambias las veces que quieras viendo tu propia carta, no un ejemplo. Tres: pides el PDF y te llega al email en A4.'),
   ('Lo que no tienes que hacer', 'No tecleas platos. No arrastras cajas de texto. No ajustas márgenes. No buscas una tipografía que combine. Si la carta ocupa más de una página, se reparte sola.'),
  ],
  faq=[('¿Puedo cambiar de plantilla después de subir mi carta?', 'Sí. Subes la carta una vez y vas probando estilos sobre tus propios platos hasta que uno te encaje.'),
       ('¿Las plantillas son editables?', 'Con la versión gratis recibes el PDF terminado. Con Carta Pro guardas la carta y cambias platos y precios cuando quieras, sin volver a empezar.')]),
 dict(slug='carta-para-bar', menu='Carta para bar',
  title='Carta para bar: diseña e imprime la tuya en 30 segundos',
  desc='Haz la carta de tu bar sin diseñar nada: foto a la que tienes, eliges estilo y la imprimes en A4. Raciones, tapas y bebidas ordenadas solas.',
  h1='La carta de tu bar, lista antes de que se enfríe el café.',
  golpe='Tienes un bar. No tienes una tarde libre para maquetar.',
  intro='La carta de un bar cambia más que la de nadie: sube la caña, entra una ración nueva, se acaba el producto de temporada. Si cada cambio te cuesta una tarde, la carta se queda vieja y con tachones. Aquí es una foto y medio minuto.',
  estilos=['vermut','pizarra','barra','ticket'],
  bloques=[
   ('Tapas, raciones y bebidas, cada cosa en su sitio', 'La carta se ordena por secciones tal y como la tienes: para picar, raciones, bocadillos, bebidas. Si un plato tiene media ración y ración, salen los dos precios alineados.'),
   ('Estilos que pegan con una barra', 'Vermut es una etiqueta clásica con cinta. Pizarra parece escrita a rotulador. Barra y Ticket son directas, de las que se leen de pie. Pruebas las cuatro sobre tu carta y te quedas con la que encaje con tu local.'),
   ('Para cuando suben los precios', 'Con Carta Pro la carta se queda guardada. Cambias el precio de la caña, guardas y tienes el PDF nuevo. Sin abrir ningún programa.'),
  ],
  faq=[('¿Sirve si mi carta está escrita a mano o en una pizarra?', 'Sí, mientras se lea bien en la foto. Hazla de frente y con luz. Si algún plato sale mal, lo corriges antes de pedir el PDF.'),
       ('¿Puedo poner la carta en dos idiomas?', 'La traducción de la carta es una función de Carta Pro.')]),
 dict(slug='carta-para-cafeteria', menu='Carta para cafetería',
  title='Carta para cafetería y brunch: maquetada en 30 segundos',
  desc='Carta de cafetería o brunch con diseño cuidado y sin diseñar: foto a tu carta, eliges estilo y la recibes en PDF A4 para imprimir.',
  h1='Una carta de cafetería que apetece leer.',
  golpe='El café lo haces bien. La carta no debería ser lo que desentona.',
  intro='En una cafetería la carta se mira despacio, con el móvil al lado y sin prisa. Si está hecha en un documento de texto con letra por defecto, se nota. Aquí subes la que tienes y la recibes con un diseño limpio, en A4.',
  estilos=['brunch','sobremesa','editorial','autor'],
  bloques=[
   ('Cafés, tostadas, bollería y brunch', 'Las secciones salen como las tienes en tu carta. Los suplementos y las aclaraciones de cada plato van debajo, en pequeño, sin ensuciar la línea del precio.'),
   ('Estilos claros, con aire', 'Brunch usa colores suaves y formas redondas. Sobremesa y Editorial son tipográficas, con mucho blanco. Autor es sobria. Todas se imprimen sobre fondo blanco, así que no gastas tinta de más.'),
   ('Carta de temporada sin drama', 'Cambias la carta de otoño por la de invierno pegando el texto nuevo o haciendo otra foto. El diseño se mantiene.'),
  ],
  faq=[('¿Puedo añadir mi logotipo?', 'Sí, con Carta Pro. Se limpia el fondo del logotipo y se coloca en la cabecera.'),
       ('¿Qué pasa si tengo pocos platos?', 'La carta se ajusta al contenido: con pocos platos la letra crece y la página no queda vacía.')]),
 dict(slug='carta-para-pizzeria', menu='Carta para pizzería',
  title='Carta para pizzería: plantilla que se rellena con una foto',
  desc='Diseña la carta de tu pizzería sin teclear cada pizza: foto a la carta actual, eliges estilo y la tienes en PDF A4 lista para imprimir.',
  h1='Treinta pizzas en la carta. Cero que teclear.',
  golpe='Lo largo de una carta de pizzería es lo que nadie quiere maquetar.',
  intro='Una pizzería tiene la carta más larga del barrio: pizzas, ingredientes de cada una, tamaños, extras, pastas, postres. Pasar eso a una plantilla a mano es una tarde entera. Aquí haces una foto y la carta sale ordenada, con los ingredientes debajo de cada pizza.',
  estilos=['trattoria','mantel','cartel','gaceta'],
  bloques=[
   ('Ingredientes debajo de cada pizza', 'El nombre va en grande y los ingredientes en una línea más pequeña debajo, como en una carta de imprenta. Si tienes dos tamaños con dos precios, salen los dos.'),
   ('Estilos de casa italiana', 'Trattoria y Mantel tienen aire de casa de comidas. Cartel es contundente, para leer desde lejos. Gaceta ordena mucho contenido en poco espacio, que es lo que necesita una carta larga.'),
   ('Si la carta no cabe en una hoja', 'Se reparte en las páginas que haga falta, sin cortar una sección por la mitad.'),
  ],
  faq=[('¿Mi carta tiene varias hojas, puedo subirlas todas?', 'Sí. Puedes subir varias fotos de la misma carta y salen juntas en un solo PDF.'),
       ('¿Puedo marcar las pizzas más vendidas?', 'Hay una opción para destacar tus platos fuertes, que los coloca primero en cada sección.')]),
 dict(slug='carta-para-marisqueria', menu='Carta para marisquería',
  title='Carta para marisquería: diseño marinero listo para imprimir',
  desc='Carta de marisquería o restaurante de pescado con diseño marinero, hecha desde una foto de tu carta. PDF A4 para imprimir en 30 segundos.',
  h1='La carta de tu marisquería, con el precio de hoy.',
  golpe='El marisco cambia de precio cada semana. La carta también debería poder.',
  intro='En una marisquería el producto manda y el precio se mueve. Una carta que cuesta rehacer acaba llena de pegatinas o con el "s/m" en media página. Aquí rehaces la carta en medio minuto cada vez que cambia la lonja.',
  estilos=['marinero','riviera','azulejo','brasserie'],
  bloques=[
   ('Precio por peso, por unidad o por ración', 'Si tu carta dice "€/kg", "unidad" o "ración", sale igual en la carta nueva, alineado con el precio.'),
   ('Estilos de costa', 'Marinero lleva olas y un salvavidas en la cabecera. Riviera es azul y luminoso. Azulejo recuerda a una casa de comidas del sur. Brasserie es clásico, de mantel blanco.'),
   ('Cambiar un precio sin rehacer la carta', 'Con Carta Pro la carta queda guardada: cambias el precio de la gamba, guardas y descargas el PDF nuevo.'),
  ],
  faq=[('¿Puedo poner "según mercado" en lugar de precio?', 'Sí. Si en tu carta un plato va a precio según mercado, en la carta nueva se mantiene así, sin número.'),
       ('¿Se imprime bien en una impresora normal?', 'Sí. Las cartas van sobre fondo blanco y en A4, pensadas para una impresora de oficina.')]),
 dict(slug='carta-para-hamburgueseria', menu='Carta para hamburguesería',
  title='Carta para hamburguesería: diseño con carácter en 30 segundos',
  desc='Haz la carta de tu hamburguesería sin diseñador: foto a tu carta, eliges un estilo con carácter y la imprimes en A4.',
  h1='Una carta con tanto carácter como tu hamburguesa.',
  golpe='Una smash burger no se presenta con letra de informe.',
  intro='Una hamburguesería vende actitud: el nombre de cada burger, los extras, las salsas. Una carta en letra genérica le quita la mitad de la gracia. Aquí subes la tuya y eliges un estilo con peso.',
  estilos=['bloque','cartel','serigrafia','ticket'],
  bloques=[
   ('Burgers, extras, entrantes y bebidas', 'Cada burger con sus ingredientes debajo y el precio a la derecha. Los extras y suplementos van en su propia sección.'),
   ('Estilos que gritan', 'Bloque lleva una cabecera negra con franja de cuadros de diner. Cartel y Serigrafía son de letra grande y tinta plana. Ticket imita un recibo de caja.'),
   ('Carta nueva cada vez que cambias la burger del mes', 'Pegas el texto nuevo o haces otra foto y tienes la carta actualizada con el mismo diseño.'),
  ],
  faq=[('¿Puedo usar los colores de mi marca?', 'Cada estilo tiene sus colores. Puedes añadir tu logotipo con Carta Pro; los colores del estilo no se cambian.'),
       ('¿Sirve para la carta de reparto o para llevar?', 'Recibes un PDF en A4 que puedes imprimir o enviar. No genera una carta web ni un código QR.')]),
 dict(slug='menu-del-dia', cta=('Hacer mi menú del día', '/panel#menu=nuevo'), menu='Menú del día',
  title='Plantilla de menú del día para imprimir: lista en dos minutos',
  desc='Haz el menú del día de tu restaurante sin abrir Word: primeros, segundos, postres y precio en una hoja lista para imprimir. La fecha se pone sola.',
  h1='El menú del día, impreso antes de abrir.',
  golpe='Cambia todos los días. No puede costarte veinte minutos todos los días.',
  intro='El menú del día es la hoja que más se imprime en un restaurante y la que peor suele quedar: un documento de texto retocado encima del de ayer, con la fecha de la semana pasada. Aquí lo montas una vez y cada mañana solo cambias los platos.',
  estilos=['pizarra','gaceta','sobremesa','mantel'],
  hero=('menu-pizarra', 'Menú del día de un restaurante con primeros, segundos, postres y el precio al pie', 'Menú del día de ejemplo'),
  extra=MENUS,
  bloques=[
   ('Lo montas una vez', 'Nombre o logotipo, estilo, precio del menú y lo que incluye. Eso se queda guardado. No vuelves a tocarlo hasta que suba el precio.'),
   ('Cada mañana, solo los platos', 'Abres el menú y la fecha ya es la de hoy. Cambias los primeros, los segundos y el postre, y descargas el PDF. Los platos que ya has puesto otros días te los ofrece al empezar a escribir.'),
   ('Sale centrado y con el precio grande', 'Como se espera de un menú del día: platos centrados, sin precio en cada línea, y abajo el precio del menú con lo que incluye. Si un plato lleva suplemento, se indica a su lado.'),
  ],
  secciones=[
   ('Gratis o con Carta Pro', 'Sin cuenta puedes pegar el texto de tu menú en la herramienta y recibirlo maquetado como una carta, dos veces al mes. El modo de menú del día, con el precio único, la fecha automática, los platos habituales y el formato A5, es de Carta Pro, que se prueba 7 días gratis y sin tarjeta.'),
   ('Media hoja basta', 'Un menú del día no necesita un folio entero. En el formato A5 el menú sale dos veces en cada folio: imprimes, cortas por el centro y tienes dos hojas. La mitad de papel y de tinta.'),
   ('Con el mismo diseño que tu carta', 'El menú nuevo hereda el nombre, el logotipo y el estilo de tu carta. El cliente ve la carta y el menú del día como parte del mismo sitio, no como un papel suelto.'),
  ],
  faq=[('¿Puedo poner «pan, bebida y postre incluidos»?', 'Sí. Hay una casilla para lo que incluye el menú y sale debajo del precio.'),
       ('¿Tengo que rehacerlo cada día?', 'No. El menú queda guardado. Cambias los platos que cambien y descargas el PDF nuevo, con la fecha del día.'),
       ('¿Y si un plato lleva suplemento?', 'Escribes el suplemento en su casilla, por ejemplo +4, y sale junto al plato.'),
       ('¿Sirve para un menú de fin de semana o un menú degustación?', 'Sí. El rótulo «Menú del día» se puede cambiar por el que quieras, y la fecha se puede quitar o sustituir por otro texto.'),
       ('¿Es una plantilla de Word?', 'No. No descargas una plantilla para rellenar: escribes los platos y recibes el PDF ya maquetado.')]),
 dict(slug='como-hacer-un-menu-del-dia', cta=('Hacer mi menú del día', '/panel#menu=nuevo'), menu='Cómo hacer un menú del día',
  title='Cómo hacer un menú del día: qué poner y cómo presentarlo',
  desc='Qué lleva un menú del día bien hecho: cuántos platos, cómo escribir el precio, qué decir que incluye y cómo imprimirlo cada mañana sin perder tiempo.',
  h1='Cómo hacer un menú del día que se lea de un vistazo.',
  golpe='El cliente lo decide en diez segundos, de pie, en la puerta.',
  intro='Un menú del día tiene un trabajo muy concreto: que quien pasa por delante sepa qué hay, cuánto cuesta y qué entra en el precio, sin preguntar. Lo demás sobra. Esta es la estructura que funciona y cómo dejarla impresa cada mañana.',
  estilos=['pizarra','sobremesa','gaceta','trattoria'],
  hero=('menu-sobremesa', 'Menú del día centrado con primeros, segundos y postres y el precio destacado', 'Menú del día de ejemplo'),
  extra=MENUS,
  bloques=[
   ('Tres bloques y un precio', 'Primeros, segundos y postres, con tres o cuatro opciones en cada uno. Con más, el cliente tarda en elegir y la cocina sufre. Con menos de dos, no parece un menú.'),
   ('El precio, una vez y grande', 'En un menú del día los platos no llevan precio: lo lleva el menú. Va destacado, abajo o arriba, y justo al lado lo que incluye: pan, bebida, postre o café.'),
   ('La fecha', 'Un menú con la fecha de hoy dice que la cocina ha cocinado hoy. Uno sin fecha, o con la de ayer, dice lo contrario.'),
  ],
  secciones=[
   ('Cómo escribir los platos', 'Nombre claro y corto: «Lentejas estofadas», no «Nuestras lentejas de la abuela a fuego lento». Si hace falta una aclaración, va en una línea pequeña debajo. Los suplementos, junto al plato que los lleva.'),
   ('Lo que no debe faltar', 'El precio final que paga el cliente, lo que incluye y lo que no (segunda bebida, café, suplementos), y la información de alérgenos o la indicación de dónde pedirla. Si tienes dudas sobre lo que te exige tu comunidad autónoma, consúltalo con tu gestoría o con la autoridad de consumo.'),
   ('Centrado', 'Una hoja corta se lee mejor centrada: el ojo baja en línea recta de los primeros al precio. Las columnas y los precios alineados a la derecha son para la carta, no para el menú.'),
   ('Que no te cueste tiempo', 'El menú cambia a diario, así que lo que cuenta es cuánto tardas en rehacerlo. Con Carta Pro lo dejas montado y cada mañana solo cambias los platos; la fecha se pone sola.'),
  ],
  faq=[('¿Cuántos platos debe tener un menú del día?', 'Lo habitual son tres o cuatro primeros, tres o cuatro segundos y dos o tres postres. Lo importante es que la cocina pueda sacarlos bien en hora punta.'),
       ('¿Hay que poner los alérgenos en el menú del día?', 'Tienes que poder informar de ellos igual que en la carta. Puedes ponerlos en la propia hoja o indicar que el personal dispone de la información.'),
       ('¿En qué tamaño se imprime?', 'En A4 si va en un atril o en la puerta. En A5 si va en la mesa: ocupa menos y de cada folio salen dos.')]),
 dict(slug='menu-del-dia-a5', cta=('Hacer mi menú del día', '/panel#menu=nuevo'), menu='Menú del día en A5',
  title='Menú del día en A5: dos por folio, listos para cortar',
  desc='Imprime el menú del día en A5: sale dos veces en cada folio, con marca de corte. La mitad de papel y una hoja que cabe en la mesa.',
  h1='El menú del día en media hoja. Dos por folio.',
  golpe='Un folio entero para nueve platos es tirar papel.',
  intro='Un menú del día tiene pocas líneas. En A4 queda bien en la puerta, pero en la mesa ocupa demasiado y gastas una hoja por menú. En A5 (14,8 × 21 cm) cabe todo, se lee igual y de cada folio salen dos.',
  estilos=['pizarra','gaceta','sobremesa','ticket'],
  hero=('menu-a5-dos-por-folio', 'Menú del día dos veces en un folio apaisado, con marca de corte en el centro', 'Así sale el PDF: un folio, dos menús', 1800, 1273),
  extra=MENUS,
  bloques=[
   ('Un folio, dos menús', 'El PDF es un A4 apaisado con el menú repetido a izquierda y derecha. Imprimes a tamaño real, cortas por la marca del centro y tienes dos hojas A5.'),
   ('La letra no se encoge sin control', 'El menú se recompone para el A5: si los platos caben con una letra cómoda, va en una hoja. Si no, pasa a dos antes que dejar una letra ilegible.'),
   ('Mismo menú, dos tamaños', 'Puedes descargar el A4 para la puerta y el A5 para las mesas. Es el mismo menú guardado: cambias de formato con un clic.'),
  ],
  secciones=[
   ('Cómo imprimirlo', 'En cualquier impresora A4, a tamaño real o al 100 %, sin «ajustar a la página». Corta con guillotina o con cúter y regla por las dos marcas pequeñas del centro.'),
   ('Cuántos folios necesito', 'La mitad que mesas. Para veinte mesas, diez folios. Si además cambias el menú a diario, a final de mes se nota.'),
  ],
  faq=[('¿Qué mide una hoja A5?', '14,8 × 21 cm: justo la mitad de un folio A4.'),
       ('¿Puedo imprimirlo en mi impresora normal?', 'Sí. Es un folio A4 apaisado. Solo hay que cortarlo después.'),
       ('¿El formato A5 es gratis?', 'Es parte del menú del día de Carta Pro, que puedes probar 7 días gratis y sin tarjeta.'),
       ('¿Sirve también para la carta?', 'De momento el A5 dos por folio es solo para el menú del día. Para la carta están el A4, el A4 slim y el cuadernillo.')]),
 dict(slug='menu-del-dia-con-alergenos', cta=('Hacer mi menú del día', '/panel#menu=nuevo'), menu='Menú del día con alérgenos',
  title='Menú del día con alérgenos: cómo indicarlos sin recargar la hoja',
  desc='Cómo poner los alérgenos en el menú del día de tu restaurante: un icono discreto junto a cada plato y la leyenda al pie. Los marcas una vez por plato.',
  h1='El menú del día, con sus alérgenos. Sin que parezca un prospecto.',
  golpe='El menú cambia cada día. La obligación de informar, no.',
  intro='Con la carta es fácil: los alérgenos se revisan una vez y ahí se quedan. Con el menú del día cambian los platos cada mañana y la información tiene que cambiar con ellos. Lo normal es que no se ponga nada y se confíe en que el camarero lo sepa. Aquí van en la propia hoja.',
  estilos=['sobremesa','pizarra','azulejo','gaceta'],
  hero=('menu-azulejo', 'Menú del día con iconos de alérgenos junto a cada plato y la leyenda al pie', 'Menú del día de ejemplo, con alérgenos'),
  extra=MENUS,
  bloques=[
   ('Un icono junto al plato', 'Marcas qué lleva cada plato y sale a su lado con un pictograma fino, del color del texto. O con un número, si lo prefieres. No añade líneas ni desordena el menú.'),
   ('La leyenda se monta sola', 'Al pie aparece solo la leyenda de los alérgenos que usa el menú de hoy, centrada, con el nombre de cada uno.'),
   ('Los marcas tú', 'Carta Rápida no deduce ingredientes ni alérgenos. Qué lleva cada plato lo sabes tú, por tus recetas y las fichas de tus proveedores.'),
  ],
  secciones=[
   ('¿Es obligatorio ponerlos en el menú del día?', 'Tienes que poder informar de los catorce alérgenos de declaración obligatoria (Reglamento UE 1169/2011; en España, Real Decreto 126/2015) también en los platos del menú. La norma española permite hacerlo de palabra si hay un cartel que indique dónde pedir la información y un registro escrito o electrónico disponible. Ponerlos en la hoja evita preguntas en hora punta. Si tienes dudas sobre tu caso, consulta a la autoridad sanitaria de tu comunidad autónoma.'),
   ('Y la tabla, para sala', 'Con las mismas marcas se genera la tabla de alérgenos en PDF: los platos del menú en filas y los catorce alérgenos en columnas, con fecha.'),
  ],
  faq=[('¿La herramienta me dice qué alérgenos lleva cada plato?', 'No. No los calcula ni los adivina: los marcas tú.'),
       ('¿Tengo que marcarlos cada día?', 'Los marcas en los platos del menú de hoy. Al cambiar un plato por otro, revisa sus alérgenos antes de imprimir.'),
       ('¿Puedo no mostrarlos en la hoja y tener solo la tabla?', 'Sí. Puedes elegir iconos, números o no mostrarlos en el menú y descargar solo la tabla.'),
       ('¿Es gratis?', 'El menú del día y los alérgenos son de Carta Pro, que puedes probar 7 días gratis y sin tarjeta.')]),
 dict(slug='alternativa-a-canva-para-cartas', menu='Alternativa a Canva',
  title='Alternativa a Canva para cartas de restaurante: sin teclear platos',
  desc='Canva es una herramienta de diseño. Esto es otra cosa: haces una foto a tu carta y la recibes maquetada en PDF A4. Sin plantillas que rellenar.',
  h1='Si lo que quieres es la carta, no aprender a diseñar.',
  golpe='Canva te da un lienzo. Tú querías la carta terminada.',
  intro='Canva es una buena herramienta de diseño general. El problema no es Canva: es que para hacer una carta tienes que elegir plantilla, borrar los platos de ejemplo, teclear los tuyos uno a uno y cuadrar cada línea. Carta Rápida solo hace cartas, y por eso se salta todo eso.',
  estilos=['riviera','sobremesa','gaceta','vermut'],
  bloques=[
   ('La diferencia, en una frase', 'En una herramienta de diseño tú maquetas. Aquí subes una foto de la carta que ya tienes y la maquetación sale hecha.'),
   ('Cuándo te conviene cada una', 'Si quieres diseñar un cartel, una publicación para redes o algo a tu medida, usa una herramienta de diseño. Si quieres tu carta en A4, bien compuesta y hoy, usa esto.'),
   ('Lo que cuesta de verdad', 'El precio de hacer una carta a mano no es la suscripción: son las horas. Aquí son treinta segundos, y dos cartas al mes son gratis.'),
  ],
  faq=[('¿Puedo retocar el diseño a mano?', 'No es un editor de diseño: eliges entre 20 estilos y la carta se compone sola. Lo que sí puedes corregir es el contenido: platos, precios y secciones.'),
       ('¿Necesito registrarme?', 'Para probar y ver tu carta maquetada, no. Para recibir el PDF te pedimos un email, que es donde te lo enviamos.')]),
 dict(slug='plantilla-carta-restaurante-word', menu='Plantilla en Word',
  title='Plantilla de carta de restaurante en Word: la alternativa que no hay que rellenar',
  desc='¿Buscas una plantilla de carta de restaurante en Word? Antes de teclear cuarenta platos, prueba esto: foto a tu carta y la recibes maquetada en PDF A4.',
  h1='Antes de abrir Word, haz una foto a tu carta.',
  golpe='La plantilla de Word es gratis. La tarde que le echas, no.',
  intro='Una plantilla de Word parece la solución rápida: la descargas, cambias el nombre y a escribir. Luego llegan los platos largos que descuadran la línea, los precios que no se alinean y la segunda página que se queda con tres platos sueltos. Aquí no rellenas nada: subes la carta que ya tienes y sale compuesta.',
  estilos=['sobremesa','gaceta','mantel','editorial'],
  bloques=[
   ('Lo que pasa con las plantillas de Word', 'Están pensadas para la carta de ejemplo, no para la tuya. En cuanto tu carta tiene más platos, nombres más largos o una sección de más, el diseño se rompe y acabas peleándote con tabuladores.'),
   ('Lo que hace esto distinto', 'El diseño se adapta a tu contenido, no al revés. Si tienes pocos platos, la letra crece. Si tienes muchos, se reparten en columnas o en más páginas sin partir una sección.'),
   ('¿Y si ya tengo la carta en Word?', 'Mejor todavía. Copias el texto, lo pegas en la herramienta y eliges estilo. No hace falta ni la foto.'),
  ],
  faq=[('¿Me dan un archivo de Word editable?', 'No. Recibes un PDF en A4 listo para imprimir. Si quieres cambiar platos y precios más adelante sin empezar de cero, eso lo hace Carta Pro: la carta queda guardada y la editas desde el navegador.'),
       ('¿Puedo pegar el texto en lugar de subir una foto?', 'Sí. Si tienes la carta escrita en Word, en un correo o en una nota, la pegas tal cual.')]),
 dict(slug='crear-carta-restaurante-online', menu='Crear carta online',
  title='Crear la carta de tu restaurante online y gratis, en 30 segundos',
  desc='Crea la carta de tu restaurante online sin instalar nada: subes una foto de la que tienes, eliges estilo y la recibes en PDF A4 para imprimir. Dos al mes, gratis.',
  h1='Crea tu carta online. Sin instalar nada. Sin diseñar nada.',
  golpe='Desde el móvil, entre el servicio de comidas y el de cenas.',
  intro='No hace falta programa, ni cuenta, ni ordenador. Abres la web desde el móvil, haces una foto a la carta que tienes ahora mismo en la mesa y en medio minuto la ves maquetada. Si te gusta, pides el PDF y te llega al email.',
  estilos=['riviera','sobremesa','bloque','pizarra'],
  bloques=[
   ('Qué necesitas', 'La carta que ya tienes, aunque esté impresa hace años, escrita a mano o en un documento. Y un email para recibir el PDF. Nada más.'),
   ('Qué recibes', 'Una carta en PDF tamaño A4, compuesta con tipografía y retícula de imprenta, sobre fondo blanco para que imprimirla no te cueste un cartucho.'),
   ('Carta impresa, no carta con QR', 'Esto hace la carta que va en la mesa o en el portamenús. No crea una carta web ni un código QR. Si lo que buscas es una carta digital para el móvil del cliente, es otro tipo de herramienta.'),
  ],
  faq=[('¿Funciona desde el móvil?', 'Sí. Está pensada para hacer la foto y elegir estilo desde el propio móvil.'),
       ('¿Tengo que registrarme?', 'Para ver tu carta maquetada, no. Para recibir el PDF te pedimos un email, que es donde te lo enviamos.')]),
 dict(slug='carta-con-alergenos', menu='Carta con alérgenos',
  title='Carta de restaurante con alérgenos: cómo ponerlos y dejarla lista para imprimir',
  desc='Cómo indicar los alérgenos en la carta de tu restaurante y dejarla maquetada en PDF A4. Qué pide la normativa y cómo hacerlo sin rehacer la carta entera.',
  h1='Los alérgenos, en la carta. Sin que la carta parezca un prospecto.',
  golpe='Informar es obligatorio. Que quede feo, no.',
  intro='En la Unión Europea los establecimientos que sirven comida tienen que poder informar al cliente de los catorce alérgenos de declaración obligatoria (Reglamento UE 1169/2011; en España lo desarrolla el Real Decreto 126/2015). Muchos restaurantes lo resuelven indicándolos en la propia carta. El problema es que, mal puestos, convierten una carta limpia en una sopa de iconos.',
  estilos=['gaceta','sobremesa','brasserie','editorial'],
  hero=('alergenos-iconos', 'Carta de restaurante con iconos de alérgenos junto a cada plato', 'Carta de ejemplo con los alérgenos marcados'),
  extra=TRES_FORMAS,
  bloques=[
   ('Cómo se indican en la carta', 'Lo habitual es poner los alérgenos junto a cada plato, con su nombre o con un número o código que se explica al pie. Si tu carta ya los lleva así, aquí se mantienen tal cual: nombres como nombres, números como números.'),
   ('Lo que esta herramienta hace y lo que no', 'Recoge los alérgenos que ya figuran en tu carta y los coloca ordenados bajo cada plato. Con Carta Pro, además, los marcas tú plato a plato y salen en la carta con un pictograma discreto o con un número, y con su leyenda al pie. No los calcula ni los adivina: qué alérgenos lleva cada plato lo sabes tú, por tus recetas y tus proveedores.'),
   ('La tabla de alérgenos, en un PDF', 'Con Carta Pro descargas además la tabla completa: tus platos en filas y los catorce alérgenos en columnas, en un A4 con espacio para fecha y firma. Es el documento que se tiene en sala y se enseña cuando lo piden.'),
   ('La nota al pie', 'Frases como "Disponemos de información sobre alérgenos, consulte a nuestro personal" se conservan en el pie de la carta, junto al IVA o el servicio de pan.'),
  ],
  secciones=[
   ('Los catorce alérgenos de declaración obligatoria', 'Cereales con gluten, crustáceos, huevos, pescado, cacahuetes, soja, leche, frutos de cáscara, apio, mostaza, sésamo, dióxido de azufre y sulfitos, altramuces y moluscos. Son los que recoge el anexo II del Reglamento (UE) 1169/2011.'),
   ('¿Tienen que estar por escrito en la carta?', 'La norma española permite dar la información de forma oral siempre que haya un cartel visible que indique dónde pedirla y exista un registro escrito o electrónico a disposición del cliente y de la inspección. Aun así, ponerlos en la carta evita preguntas en pleno servicio y errores de comunicación. Si tienes dudas sobre tu caso, consulta a la autoridad sanitaria de tu comunidad autónoma.'),
  ],
  faq=[('¿La herramienta añade los alérgenos por mí?', 'No. Reproduce los que ya aparecen en tu carta y, con Carta Pro, pinta los que tú marques. La información sobre alérgenos es responsabilidad del establecimiento.'),
       ('¿Los iconos de alérgenos y la tabla son gratis?', 'Son de Carta Pro, que puedes probar 7 días gratis y sin tarjeta. En la versión gratis se mantienen los alérgenos tal como vienen escritos en tu carta.'),
       ('¿Mi carta usa números para los alérgenos, se respetan?', 'Sí. Si usas números o códigos, se mantienen como números.')]),

 dict(slug='tabla-de-alergenos-restaurante', menu='Tabla de alérgenos',
  title='Tabla de alérgenos para restaurante en PDF, hecha con tus platos',
  desc='La tabla de alérgenos de tu restaurante en PDF A4: tus platos en filas y los 14 alérgenos en columnas, con fecha y firma. Sale de tu propia carta.',
  h1='La tabla de alérgenos, con tus platos. No con los de una plantilla.',
  golpe='Marcas. Descargas. A la carpeta de sala.',
  intro='La tabla de alérgenos es ese documento que se guarda en sala y se enseña cuando un cliente pregunta o cuando llega una inspección: todos los platos en filas, los catorce alérgenos en columnas y un punto donde toca. Lo habitual es bajarse una plantilla en blanco y copiar la carta a mano. Aquí sale de la carta que ya tienes.',
  estilos=['sobremesa','gaceta','brasserie','editorial'],
  hero=('alergenos-tabla', 'Tabla de alérgenos de restaurante en A4 con platos en filas y los 14 alérgenos en columnas', 'Tabla de ejemplo, generada desde la carta'),
  extra=TRES_FORMAS,
  bloques=[
   ('De tu carta a la tabla', 'Subes una foto de tu carta y la herramienta la lee: secciones, platos y precios. En tu panel marcas qué alérgenos lleva cada plato, con un clic por casilla. La tabla se monta sola con esos mismos platos, en el mismo orden.'),
   ('Qué lleva el PDF', 'Un A4 sobrio, pensado para imprimir en blanco y negro: tu logotipo o el nombre del local, la fecha de actualización, los catorce alérgenos con su nombre y su icono, y al pie un espacio para «revisada por», fecha y firma.'),
   ('Lo que no hace', 'No calcula ni adivina alérgenos. Qué lleva cada plato lo sabes tú, por tus recetas y las fichas de tus proveedores. La herramienta lo ordena y lo deja presentable; la información es tuya.'),
  ],
  secciones=[
   ('Sin revisar no es lo mismo que sin alérgenos', 'Una fila vacía puede significar dos cosas: que el plato no lleva ninguno o que nadie lo ha mirado todavía. En la tabla se distinguen. Los platos que marcas como revisados y limpios dicen «Sin alérgenos declarados»; los que faltan se quedan en blanco y la tabla avisa de que hay filas pendientes.'),
   ('¿Es obligatorio tenerla?', 'La norma española permite informar de los alérgenos de palabra siempre que haya un cartel visible que diga dónde pedir la información y exista un registro escrito o electrónico a disposición del cliente y de la inspección. La tabla es la forma más directa de tener ese registro. Si tienes dudas sobre tu caso, consulta a la autoridad sanitaria de tu comunidad autónoma.'),
   ('Cuándo hay que rehacerla', 'Cada vez que cambia un plato, una receta o un proveedor. Como sale de la carta guardada en tu panel, cambias la casilla y descargas el PDF nuevo, con la fecha del día.'),
  ],
  faq=[('¿Es una plantilla en blanco para rellenar?', 'No. La tabla se genera con los platos de tu carta y los alérgenos que tú marcas. No hay que copiar nada a mano.'),
       ('¿La tabla de alérgenos es gratis?', 'Es de Carta Pro, que puedes probar 7 días gratis y sin tarjeta. Durante la prueba puedes marcar los alérgenos y descargar la tabla.'),
       ('¿En qué formato se descarga?', 'En PDF, tamaño A4, lista para imprimir. No es un Excel ni un Word.'),
       ('¿Puedo poner también los alérgenos en la carta?', 'Sí. Con lo mismo que marcas para la tabla, la carta puede enseñarlos con iconos o con números y su leyenda al pie. O no enseñarlos y tener solo la tabla.')]),
 dict(slug='los-14-alergenos', menu='Los 14 alérgenos',
  title='Los 14 alérgenos de declaración obligatoria: lista e iconos',
  desc='Los 14 alérgenos que un restaurante tiene que poder declarar, uno a uno, con su icono y lo que incluye cada grupo. Y cómo ponerlos en la carta.',
  h1='Los 14 alérgenos. Uno a uno y sin letra pequeña.',
  golpe='Son catorce grupos. No hace falta aprenderse un prospecto.',
  intro='El Reglamento (UE) 1169/2011 recoge en su anexo II catorce sustancias o grupos que causan alergias o intolerancias. Un restaurante tiene que poder decir cuáles lleva cada plato. Esta es la lista, con lo que entra en cada grupo, y debajo cómo llevarla a tu carta.',
  estilos=['gaceta','azulejo','sobremesa','brasserie'],
  hero=('alergenos-iconos-gaceta', 'Carta de restaurante con los iconos de alérgenos junto a cada plato', 'Carta de ejemplo con los alérgenos marcados'),
  extra=LOS_14 + TRES_FORMAS,
  bloques=[
   ('Catorce grupos, no catorce ingredientes', 'Cada alérgeno es una familia. «Frutos de cáscara» son ocho frutos distintos; «cereales con gluten» incluye trigo, cebada, centeno y avena. Por eso conviene mirar la ficha técnica de cada producto y no fiarse del nombre del plato.'),
   ('Cómo llevarlos a la carta', 'Con Carta Pro marcas los de cada plato en una rejilla y salen en la carta con un icono discreto, del color del texto, o con un número. La leyenda al pie se monta sola, solo con los que usa tu carta.'),
   ('Y la tabla para sala', 'Con las mismas marcas se genera la tabla en PDF: platos en filas, los catorce en columnas. Es el papel que se enseña cuando preguntan.'),
  ],
  secciones=[
   ('¿Existen unos iconos oficiales?', 'No. El reglamento obliga a informar de las sustancias; no fija un dibujo concreto. Los iconos que ves en cartas y carteles son de quien los ha diseñado. Los de esta página son los que usa Carta Rápida, y por eso van siempre acompañados de su leyenda con el nombre.'),
   ('¿Y las trazas?', 'El anexo habla de alérgenos presentes como ingrediente. La mención a posibles trazas por contaminación cruzada es otra cosa y depende de cómo trabaje tu cocina. Si la necesitas, puedes escribirla en la nota al pie de la carta.'),
  ],
  faq=[('¿Cuáles son los 14 alérgenos?', 'Cereales con gluten, crustáceos, huevos, pescado, cacahuetes, soja, leche, frutos de cáscara, apio, mostaza, sésamo, dióxido de azufre y sulfitos, altramuces y moluscos.'),
       ('¿Puedo descargar los iconos sueltos?', 'No se descargan por separado. Aparecen en tu carta y en tu tabla de alérgenos cuando marcas los de cada plato.'),
       ('¿La herramienta me dice qué alérgenos lleva cada plato?', 'No. No los calcula ni los adivina: los marcas tú, que conoces tus recetas y a tus proveedores.'),
       ('¿Marcar alérgenos es gratis?', 'Es de Carta Pro, que puedes probar 7 días gratis y sin tarjeta.')]),
 dict(slug='traducir-carta-restaurante', menu='Traducir la carta',
  title='Traducir la carta de tu restaurante al inglés, francés o alemán',
  desc='Traduce la carta de tu restaurante al inglés, francés o alemán y recíbela maquetada en PDF A4. Platos, descripciones y secciones, en un minuto.',
  h1='Tu carta en inglés, sin "wine in rags".',
  golpe='El turista pide lo que entiende. Lo que no entiende, no lo pide.',
  intro='Una carta solo en español en zona de turistas es dinero que se queda en la mesa: el cliente señala lo único que reconoce. Y una carta traducida palabra por palabra da para foto en redes, pero no en el buen sentido. Con Carta Pro traduces la carta entera y la recibes ya maquetada.',
  estilos=['riviera','brasserie','sobremesa','azulejo'],
  bloques=[
   ('Qué se traduce', 'Los nombres de los platos, las descripciones, las secciones, el subtítulo y las notas del pie. El nombre de tu restaurante y los precios no se tocan.'),
   ('Idiomas', 'Inglés, francés y alemán. Recibes la carta traducida con el mismo diseño que la original, para que puedas imprimir las dos.'),
   ('Revísala antes de imprimir', 'Los platos con nombre propio o muy local (un "pisto", unas "migas") conviene repasarlos: a veces es mejor dejar el nombre original y explicar el plato en la descripción. Puedes corregir cualquier texto antes de pedir el PDF.'),
  ],
  faq=[('¿La traducción es gratis?', 'La traducción es una función de Carta Pro (12,90 € al mes). Puedes probarla antes de pagar para ver cómo queda tu carta.'),
       ('¿Puedo tener la carta en dos idiomas en la misma hoja?', 'Cada carta sale en un idioma. Lo habitual es imprimir una carta en español y otra traducida.')]),
 dict(slug='carta-de-vinos', menu='Carta de vinos',
  title='Carta de vinos para restaurante: diseño limpio y lista para imprimir',
  desc='Haz la carta de vinos de tu restaurante sin maquetar: foto o texto, eliges estilo y la recibes en PDF A4. Copa y botella, alineadas.',
  h1='Una carta de vinos que se lee con una copa en la mano.',
  golpe='Si el cliente no encuentra el vino, pide una caña.',
  intro='La carta de vinos es la que más se actualiza y la que peor se maqueta: referencias que entran y salen, añadas que cambian, precios por copa y por botella. Aquí subes la lista como la tengas y sale ordenada por secciones, con los dos precios alineados.',
  estilos=['brasserie','sobremesa','autor','deco'],
  bloques=[
   ('Copa y botella', 'Si un vino tiene dos precios, salen los dos, uno al lado del otro. Sin tabuladores ni puntos suspensivos hechos a mano.'),
   ('Por tipo, por zona o como la tengas', 'Las secciones se respetan tal y como están en tu carta: blancos, tintos, espumosos, o por denominación de origen. La bodega o la uva que pongas junto al vino va debajo, en pequeño.'),
   ('Cuando cambia una añada', 'Con Carta Pro la carta queda guardada: cambias la referencia o el precio y descargas el PDF nuevo.'),
  ],
  faq=[('¿Puedo hacer la carta de vinos separada de la de comida?', 'Sí. Cada carta que subes es un PDF independiente.'),
       ('¿Sirve para cervezas, cócteles o destilados?', 'Sí. Funciona con cualquier lista de productos con nombre y precio organizada por secciones.')]),
 dict(slug='carta-de-cocteles', menu='Carta de cócteles',
  title='Carta de cócteles para bar o coctelería: lista para imprimir en 30 segundos',
  desc='Diseña la carta de cócteles de tu bar sin maquetar: pegas la lista, eliges estilo y la recibes en PDF A4. Ingredientes debajo de cada cóctel.',
  h1='La carta de cócteles, tan cuidada como el cóctel.',
  golpe='Nadie paga doce euros por algo que viene en una hoja de cálculo.',
  intro='En coctelería la carta es parte del producto: el nombre, los ingredientes, el orden. Una lista en letra genérica le quita valor a lo que hay en la copa. Aquí pegas tu carta y eliges un estilo con personalidad.',
  estilos=['deco','sumi','vermut','autor'],
  bloques=[
   ('Ingredientes debajo del nombre', 'El nombre del cóctel va en grande y los ingredientes en una línea más fina debajo. El precio, a la derecha.'),
   ('Clásicos, de autor, sin alcohol', 'Las secciones salen como las tengas. Si marcas algún cóctel como especialidad de la casa, puede ir destacado.'),
   ('Carta corta, carta con aire', 'Con pocos cócteles la letra crece y la página respira, que es lo que pide una carta de coctelería.'),
  ],
  faq=[('¿Puedo cambiar la carta cada temporada?', 'Sí. Pegas la carta nueva y eliges el mismo estilo. Con Carta Pro, además, queda guardada y solo cambias lo que cambia.'),
       ('¿Hay formatos más pequeños que A4?', 'No. Con Carta Pro hay un formato más estrecho, el A4 slim (140 × 297 mm), y un cuadernillo de hojas A3 dobladas. Para una carta más pequeña que esas puedes imprimirla reducida desde las opciones de tu impresora.')]),
 dict(slug='imprimir-carta-restaurante', menu='Imprimir la carta',
  title='Imprimir la carta de un restaurante: tamaño, papel y cómo presentarla',
  desc='Cómo imprimir la carta de tu restaurante para que aguante el servicio: tamaño A4, papel, impresora o copistería, y cómo presentarla en la mesa.',
  h1='Una carta bien impresa se nota antes de leerla.',
  golpe='El diseño es la mitad. La otra mitad es el papel y dónde lo pones.',
  intro='Puedes tener la carta mejor maquetada del barrio y estropearla al imprimirla en un folio fino que se arruga a la primera gota. Aquí va lo básico para que la carta que sale de la impresora esté a la altura de tu cocina.',
  estilos=['sobremesa','brasserie','riviera','gaceta'],
  bloques=[
   ('Tamaño', 'El PDF sale en A4 (210 × 297 mm), que es el tamaño que admite cualquier impresora y cualquier copistería. Con Carta Pro puedes pedirlo también en A4 slim (140 × 297 mm) o en cuadernillo, montado en hojas A3. Al imprimir, elige "tamaño real" o "100 %" para que no se recorten los márgenes.'),
   ('Papel', 'Un papel de más gramaje que el folio normal aguanta mejor el uso y no transparenta. Si la carta va a ir sin funda, pide en la copistería un papel grueso o un acabado que resista manchas.'),
   ('Impresora o copistería', 'Las cartas van sobre fondo blanco, así que una impresora de oficina las saca bien. Para muchas copias o papel grueso, una copistería sale mejor y más barato por unidad.'),
  ],
  secciones=[
   ('Cómo presentarla en la mesa', 'Una hoja suelta dura poco: se mancha, se dobla y da sensación de provisional. Un portamenús la protege, permite cambiar la hoja cuando cambian los precios y hace que la carta se perciba como parte del local. Carta Rápida es de Kartia, taller español que fabrica portamenús a mano desde 2018; las cartas en A4 que salen de aquí están pensadas para ir dentro.'),
   ('Cada cuánto reimprimir', 'Cada vez que cambie un precio o un plato. Una carta con tachones o pegatinas transmite dejadez. Por eso conviene que rehacerla cueste medio minuto y no una tarde.'),
  ],
  faq=[('¿La carta se puede imprimir a doble cara?', 'Sí. Si tu carta ocupa dos páginas, puedes imprimirlas a doble cara desde las opciones de tu impresora. Si lo que quieres es un cuadernillo que se dobla, Carta Pro te da el PDF con las páginas ya colocadas para eso.'),
       ('¿Hacéis vosotros la impresión?', 'No imprimimos cartas. Recibes el PDF y lo imprimes donde prefieras. Lo que sí fabrica Kartia son los portamenús.')]),
 dict(slug='tamanos-carta-restaurante', menu='Tamaños de carta',
  title='Tamaños de carta de restaurante: A4, A4 slim y cuadernillo',
  desc='Qué tamaño de carta le conviene a tu restaurante: A4, A4 slim (140 × 297 mm) o cuadernillo en A3 doblado. Medidas, para qué sirve cada uno y cómo imprimirlos.',
  h1='El tamaño de la carta se elige antes que el diseño.',
  golpe='Un folio, una carta estrecha o un cuadernillo. Depende de cuánto tengas que contar.',
  intro='Hay tres formatos que resuelven casi cualquier carta impresa: el A4 de toda la vida, el A4 slim, que es igual de alto pero más estrecho, y el cuadernillo, que son hojas A3 dobladas por la mitad. Aquí van las medidas de cada uno, cuándo conviene y cómo se imprime. Carta Rápida saca tu carta en los tres.',
  estilos=['sobremesa','gaceta','brasserie','azulejo'],
  hero=('formato-a4', 'Carta de restaurante de ejemplo en formato A4', 'Carta de ejemplo en A4'),
  extra=TRES_FORMATOS,
  bloques=[
   ('A4 · 210 × 297 mm', 'El más usado. Cabe en cualquier impresora, en cualquier funda y en la mayoría de portamenús. Si tu carta entra en una o dos caras, no necesitas otra cosa. Es el formato de la versión gratis.'),
   ('A4 slim · 140 × 297 mm', 'Igual de alto que un folio y un tercio más estrecho. Va a una sola columna, se lee de arriba abajo y se sujeta con una mano. Funciona muy bien para cartas cortas, vinos, cócteles y postres.'),
   ('Cuadernillo · A3 doblado', 'Cada hoja A3 doblada por la mitad da cuatro páginas A4. Tiene portada y contraportada y se sujeta con un elástico en el lomo. Para cartas largas, o cuando quieres que la carta se abra como un libro.'),
  ],
  secciones=[
   ('Cómo elegir', 'Mira cuánto ocupa tu carta. Si entra en una o dos caras de folio, A4. Si es una carta corta o una segunda carta (vinos, cócteles, postres), el slim queda más fino que un folio medio vacío. Si pasas de dos caras o quieres portada, cuadernillo.'),
   ('Cambiar de formato no es rehacer la carta', 'Con Carta Pro eliges el formato en el editor y la carta se recoloca sola: columnas, tamaño de letra y saltos de página. Puedes tener la misma carta en A4 para la barra y en cuadernillo para la sala.'),
   ('Cómo se imprime cada uno', 'El A4, en cualquier impresora. El slim sale en un PDF de 14 × 29,7 cm: en imprenta se pide a ese tamaño y en casa se imprime a tamaño real en un folio y se corta el sobrante. El cuadernillo sale montado en A3 apaisado y se imprime a doble cara volteando por el borde corto.'),
  ],
  faq=[('¿Cuál es el tamaño normal de una carta de restaurante?', 'El A4, 210 × 297 mm. Es el que admite cualquier impresora y para el que están hechos la mayoría de portamenús y fundas.'),
       ('¿Qué mide una carta A4 slim?', '140 × 297 mm: la altura de un folio y 7 cm menos de ancho.'),
       ('¿Los tres formatos son gratis?', 'El A4 sí. El A4 slim y el cuadernillo con elástico son de Carta Pro, que puedes probar 7 días gratis y sin tarjeta.'),
       ('¿Hay formato A5?', 'De momento no. Los formatos son A4, A4 slim y cuadernillo en A3 doblado.')]),
 dict(slug='carta-restaurante-a4-slim', menu='Carta A4 slim',
  title='Carta de restaurante alargada: formato A4 slim, 140 × 297 mm',
  desc='Carta de restaurante alta y estrecha en formato A4 slim (140 × 297 mm). Sube tu carta y recíbela maquetada a una columna, en un PDF a esa medida listo para imprenta.',
  h1='La carta estrecha. La que se sujeta con una mano.',
  golpe='14 centímetros de ancho. Lo que no cabe, sobraba.',
  intro='El A4 slim mide 140 × 297 mm: la altura de un folio y siete centímetros menos de ancho. Es el formato de las cartas de vinos, de cócteles y de muchos restaurantes que quieren una carta corta y fina en la mesa. El problema es maquetarla: una carta pensada para folio no se estrecha sin más. Aquí se recompone sola.',
  estilos=['sobremesa','brasserie','editorial','gaceta'],
  hero=('formato-slim', 'Carta de restaurante de ejemplo en formato A4 slim, alta y estrecha', 'Carta de ejemplo en A4 slim', 600, 1273),
  extra=TRES_FORMATOS,
  bloques=[
   ('Una columna, de arriba abajo', 'En 14 cm dos columnas no se leen. La carta pasa a una sola: sección, platos y precios en vertical. Si no entra en una cara, sigue en la siguiente.'),
   ('El PDF sale a medida', 'No es un A4 con márgenes anchos. El PDF mide 14 × 29,7 cm exactos, que es lo que te va a pedir la imprenta.'),
   ('Mismo estilo, mismos platos', 'Eliges el formato en el editor de Carta Pro y la carta que ya tienes se recoloca. No tecleas nada otra vez, y puedes volver al A4 cuando quieras.'),
  ],
  secciones=[
   ('Cómo imprimirla', 'En imprenta o copistería, pídela a 14 × 29,7 cm. En una impresora de casa, imprime «a tamaño real» sobre un folio y corta el sobrante con cúter y regla. De un A4 sale una carta; de un A3, tres.'),
   ('Para qué carta funciona', 'Cartas cortas, de vinos, de cócteles, de postres o de menú degustación. Si tu carta tiene muchas secciones y platos con descripción larga, en slim se va a varias páginas: ahí compensa un A4 o un cuadernillo.'),
  ],
  faq=[('¿Qué medidas tiene el A4 slim?', '140 × 297 mm. La misma altura que un A4 y dos tercios de su ancho.'),
       ('¿Puedo imprimirla en mi impresora?', 'Sí, a tamaño real sobre un folio A4, y después cortas el sobrante. En imprenta te la entregan ya cortada.'),
       ('¿El A4 slim es gratis?', 'Es de Carta Pro, que puedes probar 7 días gratis y sin tarjeta. La versión gratis sale en A4.')]),
 dict(slug='carta-restaurante-cuadernillo', menu='Carta en cuadernillo',
  title='Carta de restaurante en cuadernillo: A3 doblado y ordenado',
  desc='Carta de restaurante en cuadernillo con elástico: hojas A3 dobladas, con portada y contraportada, y las páginas ya ordenadas en el PDF para imprimir.',
  h1='La carta en cuadernillo, con las páginas en su sitio.',
  golpe='Imprimes, doblas y pasas el elástico. El orden ya viene hecho.',
  intro='Un cuadernillo son hojas A3 dobladas por la mitad y metidas unas dentro de otras, sujetas con un elástico en el lomo. Queda como un libro pequeño, con su portada. Lo difícil no es doblar: es que en cada hoja van páginas que no son seguidas, y si las colocas mal, la carta sale desordenada. Aquí el PDF ya sale montado.',
  estilos=['azulejo','sobremesa','gaceta','brasserie'],
  hero=('formato-cuadernillo-azulejo', 'Portada de una carta de restaurante en cuadernillo', 'Portada de un cuadernillo de ejemplo'),
  extra=MONTAJE + TRES_FORMATOS,
  bloques=[
   ('Portada y contraportada', 'La primera página es la portada, con el nombre del local. La última, la contraportada. La carta empieza al abrir.'),
   ('Páginas de cuatro en cuatro', 'Cada hoja A3 son cuatro páginas. Si tu carta no llena la última hoja, las páginas en blanco se quedan en el interior de las tapas, no en mitad de la carta.'),
   ('El orden, resuelto', 'En una carta de ocho páginas, la primera hoja lleva por fuera la contraportada y la portada, y por dentro las páginas 2 y 7. Tú no tienes que saberlo: el PDF sale así.'),
  ],
  secciones=[
   ('Cuántas hojas necesito', 'Una hoja A3 da para portada, contraportada y dos páginas de carta. Dos hojas, seis páginas de carta. Tres hojas, diez. El editor te dice cuántas hojas ocupa la tuya antes de descargar.'),
   ('Por qué con elástico y no grapado', 'Porque los precios cambian. Con elástico sacas la hoja que ha cambiado, imprimes la nueva y la vuelves a meter. Grapado, tiras el cuadernillo entero.'),
   ('Papel', 'Para las hojas de dentro vale un papel algo más grueso que el folio normal. Si la cubierta va en cartulina, pide que te la hiendan: el hendido es la marca que se hace antes de doblar para que el papel no se cuartee por el lomo.'),
  ],
  faq=[('¿Tengo que ordenar yo las páginas?', 'No. El PDF sale en hojas A3 apaisadas con cada página ya colocada para que, al doblar, queden seguidas.'),
       ('¿Cómo se imprime a doble cara?', 'En A3, a doble cara y volteando por el borde corto. Antes de imprimir todas las copias, haz una de prueba y dóblala.'),
       ('¿No tengo impresora A3?', 'Lleva el PDF a una copistería: es un trabajo habitual. Diles A3, doble cara, volteo por el borde corto.'),
       ('¿Cuántas páginas puede tener?', 'Hasta 14 páginas de carta más portada y contraportada, que son cuatro hojas A3.'),
       ('¿El cuadernillo es gratis?', 'Es de Carta Pro, que puedes probar 7 días gratis y sin tarjeta.')]),
 dict(slug='como-hacer-la-carta-de-un-restaurante', menu='Cómo hacer la carta',
  title='Cómo hacer la carta de un restaurante: guía práctica paso a paso',
  desc='Guía práctica para hacer la carta de tu restaurante: cuántos platos, cómo ordenarlos, cómo poner los precios y cómo dejarla lista para imprimir.',
  h1='Cómo hacer la carta de un restaurante, sin teoría de más.',
  golpe='Primero se decide qué va en la carta. Luego, cómo se ve.',
  intro='La carta es el único vendedor que atiende a todas las mesas. Antes de pensar en tipografías conviene resolver tres cosas: qué platos entran, en qué orden y cómo se escriben. El diseño viene después, y es la parte que menos tiempo debería llevarte.',
  estilos=['sobremesa','gaceta','riviera','mantel'],
  bloques=[
   ('1. Decide qué entra', 'Una carta larga no vende más: hace dudar al cliente y complica la cocina. Quédate con los platos que salen bien, se venden y dejan margen. Lo demás, fuera o a sugerencias.'),
   ('2. Ordena por secciones', 'Agrupa como el cliente piensa la comida: para picar, entrantes, principales, postres, bebidas. Dentro de cada sección, pon primero lo que más te interesa vender.'),
   ('3. Escribe claro', 'Nombre del plato, una línea de descripción si aporta algo y el precio. Sin adjetivos de relleno. Si un plato necesita tres líneas para explicarse, el problema no es la carta.'),
  ],
  secciones=[
   ('Los precios', 'Alineados a la derecha y sin el símbolo del euro repetido en cada línea, que solo añade ruido. Si un plato tiene media ración y ración, o copa y botella, pon los dos precios juntos. Indica al pie si el IVA está incluido y si cobras pan o servicio.'),
   ('Los platos de la casa', 'Marca pocos. Si todo está destacado, nada lo está. Dos o tres especialidades por carta, colocadas al principio de su sección.'),
   ('Los alérgenos', 'Tienes que poder informar de los catorce alérgenos de declaración obligatoria. Muchos locales los indican junto a cada plato o con un código explicado al pie.'),
   ('El diseño', 'Una tipografía legible, buen contraste, aire entre secciones y fondo blanco si la vas a imprimir tú. No hace falta más. Es justo la parte que resuelve Carta Rápida: subes la carta con las decisiones ya tomadas y sale compuesta en A4.'),
   ('Revísala y cámbiala', 'Lee la carta impresa antes de sacar cincuenta copias: erratas, precios, platos que ya no haces. Y revísala cada temporada. Una carta que no cambia nunca suele ser una carta que nadie mira.'),
  ],
  faq=[('¿Cuántos platos debe tener una carta?', 'No hay un número mágico. Como referencia práctica: los que tu cocina pueda sacar bien en hora punta y el cliente pueda leer sin agobiarse.'),
       ('¿Es mejor una hoja o varias?', 'Si cabe en una hoja a doble cara sin apretar la letra, mejor. Si no, sepárala: comida por un lado, bebidas y vinos por otro.')]),
 dict(slug='menu-de-navidad-restaurante', menu='Menú de Navidad',
  title='Plantilla de menú de Navidad para restaurante, lista para imprimir',
  desc='Haz el menú de Navidad de tu restaurante sin maquetar: pegas los platos y el precio, eliges estilo y lo recibes en PDF A4. Para comidas de empresa, Nochebuena y Nochevieja.',
  h1='El menú de Navidad, hecho antes de que llamen las empresas.',
  golpe='En octubre te piden el menú. En noviembre ya han reservado en otro sitio.',
  intro='Las comidas de empresa se deciden con el menú delante. Quien lo manda primero, y bien presentado, se lleva la reserva. Aquí pegas los platos, el precio por persona y lo que incluye, y en medio minuto tienes un PDF que puedes imprimir, enviar por correo o por WhatsApp.',
  estilos=['deco','brasserie','autor','sobremesa'],
  bloques=[
   ('Menú cerrado, precio por persona', 'Entrantes a compartir, principal a elegir, postre y bebida. Lo escribes como lo vas a servir y sale ordenado, con el precio por persona bien visible y la nota de lo que incluye al pie.'),
   ('Varios menús, uno por hoja', 'Si ofreces dos o tres menús de grupo a distinto precio, haz una carta para cada uno. Así el cliente compara sin liarse y tú envías solo el que te interesa.'),
   ('Elegante sin disfrazarlo', 'No hay estilos con abetos ni bolas. Hay estilos sobrios, de los que funcionan en Navidad y siguen sirviendo en enero. Déco y Brasserie son los más de celebración.'),
  ],
  secciones=[
   ('Qué debe llevar un menú de grupo', 'El precio por persona y si incluye IVA. Qué bebida entra y hasta cuándo. Si hay opción vegetariana o para alérgicos. El mínimo de comensales y cómo se reserva. Son las cuatro preguntas que te van a hacer por teléfono si no están en la hoja.'),
   ('Nochebuena, Nochevieja y Reyes', 'Sirve igual para el menú de una noche concreta: pones la fecha en el subtítulo, los platos en orden de servicio y el precio. Si incluye cotillón o uvas, va en la nota del pie.'),
  ],
  faq=[('¿Puedo enviar el menú por WhatsApp o por correo?', 'Sí. Recibes un PDF en A4 que puedes reenviar a tus clientes o imprimir.'),
       ('¿Puedo hacer varios menús de Navidad?', 'La versión gratis da para dos cartas al mes. Si vas a preparar más, o quieres retocarlos según te pidan, Carta Pro los guarda y te deja cambiarlos sin empezar de cero, y puedes probarlo 7 días gratis.')]),
 dict(slug='diseno-carta-restaurante', menu='Diseño de carta',
  title='Diseño de carta de restaurante sin diseñador: 20 estilos en 30 segundos',
  desc='Diseño de carta de restaurante con tipografía y retícula de imprenta, sin contratar a nadie: subes tu carta, eliges entre 20 estilos y la recibes en PDF A4.',
  h1='Diseño de carta de restaurante, sin esperar al diseñador.',
  golpe='Un diseñador tarda una semana. Tu carta cambia cada mes.',
  intro='Encargar el diseño de la carta tiene sentido una vez. El problema viene después: cada cambio de precio o de plato es otro correo, otra espera y otra factura, y al final la carta se queda desactualizada. Aquí el diseño ya está hecho: son 20 estilos pensados para carta impresa, y tu contenido entra solo.',
  estilos=['riviera','sumi','serigrafia','editorial'],
  bloques=[
   ('Qué hace que una carta parezca diseñada', 'Una sola familia tipográfica bien elegida, jerarquía clara entre sección, plato y descripción, precios alineados y aire. No son adornos: es orden. Cada estilo trae eso resuelto.'),
   ('Veinte estilos, de la taberna al restaurante de autor', 'Hay estilos de tinta y papel, de tiza, de cartel, de azulejo y de línea fina. Los pruebas todos sobre tu propia carta y eliges viendo tus platos, no un ejemplo.'),
   ('Lo que no es', 'No es un editor para mover cajas ni cambiar colores a mano. Si necesitas un diseño único para tu marca, eso es trabajo de un diseñador. Si necesitas una carta bien compuesta hoy y poder cambiarla mañana, es esto.'),
  ],
  faq=[('¿Puedo poner mi logotipo?', 'Sí, con Carta Pro. Se limpia el fondo del logotipo y se coloca en la cabecera de la carta.'),
       ('¿Puedo usar mi propia tipografía o mis colores?', 'No. Cada estilo tiene su tipografía y sus colores, y la carta se compone sola dentro de ese estilo.')]),
]

CSS = """
@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-display:swap;font-weight:200 800;font-stretch:100%;src:url(/fuentes/bricolage.woff2) format("woff2-variations")}
:root{--ink:#0C0C0D;--muted:#6C6C72;--line:#E6E6EA;--soft:#F3F3F5;--accent:#FF4A1C;--accent-ink:#C93A0E}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:"Bricolage Grotesque",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#fff;font-size:18px;line-height:1.55;overflow-x:clip}
a{color:inherit}.w{max-width:1120px;margin:0 auto;padding:0 20px}
.nav{display:flex;align-items:center;justify-content:space-between;height:68px}
.logo{font-weight:800;font-size:20px;text-decoration:none;letter-spacing:-.02em}.logo b{color:var(--accent);font-weight:800}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 26px;border-radius:14px;background:var(--accent);color:#fff;font-weight:650;text-decoration:none;font-size:18px;transition:transform .16s ease-out}
.btn:active{transform:scale(.97)}.btn.s{min-height:44px;padding:0 18px;font-size:16px;background:var(--ink);border-radius:12px}
.btn.o{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}
.hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(28px,5vw,72px);align-items:center;padding-top:clamp(28px,5vw,64px);padding-bottom:clamp(40px,6vw,80px)}
.miga{font-size:14px;color:var(--muted);margin:0 0 18px}.miga a{text-decoration:none}.miga a:hover{text-decoration:underline}
h1{font-size:clamp(38px,6vw,76px);line-height:.96;letter-spacing:-.04em;font-weight:800;margin:0;text-wrap:balance}
.golpe{font-size:clamp(20px,2.2vw,26px);font-weight:700;letter-spacing:-.02em;line-height:1.2;margin:22px 0 0;text-wrap:balance}
.lead{color:var(--muted);margin:14px 0 0;max-width:34em}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.trust{display:flex;flex-wrap:wrap;gap:8px 20px;margin:20px 0 0;padding:0;list-style:none;color:var(--muted);font-size:15px}
.trust li::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:middle}
.hoja{margin:0;justify-self:center;width:min(100%,420px)}
.hoja img{display:block;width:100%;height:auto;border-radius:6px;box-shadow:0 0 0 1px var(--line),0 40px 70px -40px rgba(12,12,13,.45)}
.hoja figcaption{font-size:14px;color:var(--muted);margin-top:12px;text-align:center}
section{padding:clamp(44px,7vw,88px) 0}
h2{font-size:clamp(28px,3.6vw,46px);line-height:1.02;letter-spacing:-.035em;font-weight:800;margin:0 0 18px;text-wrap:balance}
.gris{background:var(--soft)}
.prosa{max-width:820px}.prosa h2{font-size:clamp(24px,2.6vw,34px);margin-top:36px}.prosa h2:first-child{margin-top:0}.prosa p{margin:0;color:#3a3a3f}
.bloques{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,3vw,40px)}
.bloques h2{font-size:clamp(22px,2.2vw,28px);letter-spacing:-.025em;line-height:1.1}
.bloques p{margin:0;color:#3a3a3f}
.estilos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(14px,2vw,28px);margin-top:28px}
.estilos figure{margin:0}.estilos img{display:block;width:100%;height:auto;border-radius:4px;box-shadow:0 0 0 1px var(--line),0 20px 40px -28px rgba(12,12,13,.4)}
.estilos figcaption{font-size:15px;font-weight:650;margin-top:10px}.estilos figcaption span{font-weight:500;color:var(--accent-ink);font-size:13px;margin-left:6px}
.pasos{counter-reset:p;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;list-style:none;padding:0;margin:26px 0 0}
.pasos li{counter-increment:p;border-top:2px solid var(--ink);padding-top:14px;font-weight:650}
.pasos li::before{content:counter(p);display:block;font-size:40px;font-weight:800;letter-spacing:-.04em;color:var(--accent);line-height:1}
.pasos li span{display:block;font-weight:400;color:var(--muted);font-size:16px;margin-top:4px}
.faq details{border-top:1px solid var(--line);padding:18px 0}.faq details:last-child{border-bottom:1px solid var(--line)}
.faq summary{font-weight:700;font-size:20px;letter-spacing:-.015em;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";color:var(--accent);font-weight:500}.faq details[open] summary::after{content:"–"}
.faq p{margin:10px 0 0;color:#3a3a3f;max-width:46em}
.fin{background:var(--accent);color:var(--ink);text-align:center}.fin h2{font-size:clamp(34px,5vw,64px)}.fin .btn{background:var(--ink);margin-top:10px}
.tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(16px,2.6vw,36px);margin-top:28px}
.tres figure{margin:0}.tres img{display:block;width:100%;height:auto;border-radius:4px;box-shadow:0 0 0 1px var(--line),0 24px 44px -30px rgba(12,12,13,.45)}
.tres figcaption{font-size:16px;font-weight:650;margin-top:12px}
.al14{list-style:none;padding:0;margin:28px 0 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 clamp(24px,4vw,56px)}
.al14 li{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-top:1px solid var(--line)}
.al14 .al-i{width:40px;height:40px;flex:none;color:var(--ink)}
.al14 b{display:block;font-size:20px;letter-spacing:-.02em;line-height:1.2}.al14 span{display:block;color:#3a3a3f;font-size:16px;margin-top:3px}
.fmts{display:grid;grid-template-columns:3fr 2fr 6fr;gap:clamp(14px,2.6vw,40px);align-items:start;margin-top:28px}
.fmts figure,.ancha{margin:0}.fmts img,.ancha img{display:block;width:100%;height:auto;border-radius:4px;background:#fff;box-shadow:0 0 0 1px var(--line),0 24px 44px -30px rgba(12,12,13,.45)}
.fmts figcaption{margin-top:14px;font-size:15px;color:#3a3a3f;line-height:1.4}.fmts figcaption b{display:block;color:var(--ink);font-size:18px;font-weight:700;letter-spacing:-.02em}
.fmts figcaption span{display:block;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:2px}
.fmts figcaption i{font-style:normal;font-size:12px;font-weight:700;color:var(--accent-ink);border:1px solid currentColor;border-radius:99px;padding:1px 8px;margin-left:8px;vertical-align:2px}
.ancha{max-width:820px;margin-top:28px}.ancha figcaption{font-size:15px;color:var(--muted);margin-top:12px}
.nota{color:var(--muted);font-size:15px;margin:22px 0 0;max-width:46em}
.otras{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0;padding:0;list-style:none}
.otras a{display:block;padding:10px 16px;border-radius:99px;box-shadow:inset 0 0 0 1.5px var(--line);text-decoration:none;font-size:16px;font-weight:600}
.otras a:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
footer{padding-top:32px;padding-bottom:48px;color:var(--muted);font-size:15px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between}
footer nav{display:flex;flex-wrap:wrap;gap:8px 18px}footer a{text-decoration:none}footer a:hover{text-decoration:underline}
@media (max-width:860px){body{font-size:17px}.hero{grid-template-columns:minmax(0,1fr)}.hoja{width:min(78%,340px)}.bloques,.pasos,.al14{grid-template-columns:minmax(0,1fr)}.tres{grid-template-columns:minmax(0,1fr);max-width:340px}.fmts{grid-template-columns:3fr 2fr;align-items:start}.fmts figure:last-child{grid-column:1/-1}.estilos{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{width:100%}.nav .btn{width:auto}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""

def e(t): return html.escape(t, quote=True)

def img(k, ancho, clase='', prioridad=False):
    extra = ' fetchpriority="high"' if prioridad else ' loading="lazy" decoding="async"'
    return ('<img src="/ejemplo/portada-%s-640.webp" srcset="/ejemplo/portada-%s-640.webp 640w, /ejemplo/portada-%s.webp 900w" sizes="%s" '
            'width="900" height="1273" alt="Carta de restaurante de ejemplo en estilo %s"%s>') % (k, k, k, ancho, e(NOMBRE[k]), extra)

def pagina(p):
    url = '%s/%s/' % (WEB, p['slug'])
    faq = p['faq'] + COMUN_FAQ
    ld = [
      {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Carta Rápida","item":WEB + "/"},
        {"@type":"ListItem","position":2,"name":p['menu'],"item":url}]},
      {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q, a in faq]},
    ]
    primero = p['estilos'][0]
    cta = p.get('cta', ('Sube una foto de tu carta', '/#herramienta'))
    hero = p.get('hero')
    hero_base = hero[0] if hero else 'portada-' + primero
    hero_w, hero_h = (hero[3], hero[4]) if hero and len(hero) > 3 else (900, 1274)
    hero_estilo = ' style="width:min(100%,540px)"' if hero_w > 900 else ' style="width:min(%d%%,%dpx)"' % (round(78 * hero_w / 900), round(420 * hero_w / 900)) if hero_w != 900 else ''
    otras = ''.join('<li><a href="/%s/">%s</a></li>' % (o['slug'], e(o['menu'])) for o in PAGINAS if o['slug'] != p['slug'])
    figs = ''.join('<figure>%s<figcaption>%s%s</figcaption></figure>' % (
        img(k, '(max-width: 860px) 44vw, 250px'), e(NOMBRE[k]), '<span>Pro</span>' if k in PRO else '') for k in p['estilos'])
    prosa = ''
    if p.get('secciones'):
        prosa = '<section><div class="w prosa">' + ''.join('<h2>%s</h2><p>%s</p>' % (e(t), e(x)) for t, x in p['secciones']) + '</div></section>'
    titulo_estilos = 'Los 20 estilos' if p.get('todos') else 'Estilos que encajan'
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preload" as="image" href="/ejemplo/{hero_base}-640.webp" imagesrcset="/ejemplo/{hero_base}-640.webp {round(hero_w * 640 / 900)}w, /ejemplo/{hero_base}.webp {hero_w}w" imagesizes="(max-width: 860px) 78vw, 420px" fetchpriority="high">
<link rel="preload" href="/fuentes/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<title>{e(p['title'] + (' | Carta Rápida' if len(p['title']) <= 47 else ''))}</title>
<meta name="description" content="{e(p['desc'])}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(p['title'])}">
<meta property="og:description" content="{e(p['desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Carta Rápida">
<meta property="og:image" content="{WEB}/og-portada.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#FF4A1C">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>{CSS}</style>
</head>
<body>
<header class="w nav"><a class="logo" href="/" aria-label="Carta Rápida, inicio">Carta <b>Rápida</b></a><a class="btn s" href="/#herramienta">Empezar gratis</a></header>
<main>
<div class="w hero">
  <div>
    <p class="miga"><a href="/">Carta Rápida</a> › {e(p['menu'])}</p>
    <h1>{e(p['h1'])}</h1>
    <p class="golpe">{e(p['golpe'])}</p>
    <p class="lead">{e(p['intro'])}</p>
    <div class="ctas"><a class="btn" href="{cta[1]}">{cta[0]}</a><a class="btn o" href="#estilos">Ver los estilos</a></div>
    <ul class="trust">{''.join('<li>%s</li>' % e(x) for x in p['trust']) if p.get('trust') else '<li>7 días gratis</li><li>Sin tarjeta</li><li>Sin subir fotos</li>' if p.get('cta') else '<li>Gratis</li><li>Sin tarjeta</li><li>PDF A4 en 30 segundos</li>'}</ul>
  </div>
  <figure class="hoja"{hero_estilo}>{('<img src="/ejemplo/%s-640.webp" srcset="/ejemplo/%s-640.webp %dw, /ejemplo/%s.webp %dw" sizes="(max-width: 860px) 78vw, 420px" width="%d" height="%d" alt="%s" fetchpriority="high">' % (hero_base, hero_base, round(hero_w * 640 / 900), hero_base, hero_w, hero_w, hero_h, e(hero[1]))) if hero else img(primero, '(max-width: 860px) 78vw, 420px', prioridad=True)}<figcaption>{e(hero[2]) if hero else 'Carta de ejemplo en estilo ' + e(NOMBRE[primero])}</figcaption></figure>
</div>
<section class="gris"><div class="w bloques">{''.join('<div><h2>%s</h2><p>%s</p></div>' % (e(t), e(x)) for t, x in p['bloques'])}</div></section>
{p.get('extra', '')}{prosa}<section id="estilos"><div class="w">
  <h2>{titulo_estilos}</h2>
  <p class="lead" style="margin-top:0">Los ves sobre una carta de ejemplo. Cuando subas la tuya, los pruebas con tus platos.</p>
  <div class="estilos">{figs}</div>
  <div class="ctas"><a class="btn" href="/#herramienta">Probar con mi carta</a>{'' if p.get('todos') else '<a class="btn o" href="/plantillas-carta-restaurante/">Ver los 20 estilos</a>'}</div>
</div></section>
<section class="gris"><div class="w">
  <h2>Tres pasos. Ninguno es aprender a diseñar.</h2>
  <ol class="pasos"><li>Haz una foto a tu carta<span>O pega el texto, si lo tienes escrito.</span></li><li>Elige el estilo<span>Lo cambias las veces que quieras, sobre tus platos.</span></li><li>Recibe el PDF<span>En A4, en tu email, listo para imprimir.</span></li></ol>
</div></section>
<section class="faq"><div class="w">
  <h2>Preguntas frecuentes</h2>
  {''.join('<details><summary>%s</summary><p>%s</p></details>' % (e(q), e(a)) for q, a in faq)}
</div></section>
<section class="fin"><div class="w"><h2>Tu carta, hoy.</h2><a class="btn" href="{cta[1]}">{cta[0]}</a></div></section>
<section><div class="w"><h2 style="font-size:clamp(22px,2.4vw,30px)">Más cartas por tipo de local</h2><ul class="otras">{otras}</ul></div></section>
</main>
<footer class="w"><span>Carta Rápida es de <a href="https://kartia.es" style="text-decoration:underline">Kartia</a>, portamenús hechos a mano en España.</span>
<nav aria-label="Legal"><a href="/legal/aviso-legal.html">Aviso legal</a><a href="/legal/privacidad.html">Privacidad</a><a href="/legal/cookies.html">Cookies</a><a href="/legal/condiciones.html">Condiciones</a></nav></footer>
<script>
/* Analítica en las páginas de entrada: misma elección de cookies que la herramienta, y solo tras aceptar */
addEventListener('load',function(){{setTimeout(function(){{
fetch('/config').then(function(r){{return r.json()}}).then(function(c){{
var id=c.ga4;if(!id)return;
function cargar(){{window.dataLayer=window.dataLayer||[];window.gtag=function(){{dataLayer.push(arguments)}};
gtag('consent','default',{{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'denied'}});
gtag('js',new Date());gtag('config',id,{{anonymize_ip:true}});
var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.appendChild(s);
document.addEventListener('click',function(ev){{var a=ev.target.closest&&ev.target.closest('a.btn');if(a)gtag('event','landing_cta',{{destino:a.getAttribute('href')}})}})}}
var el=null;try{{el=JSON.parse(localStorage.getItem('cr_consentimiento'))}}catch(e){{}}
if(el&&Date.now()-el.t<365*864e5){{if(el.si)cargar();return}}
var d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-label','Cookies');
d.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:900;max-width:560px;margin:0 auto;background:#0E0E0E;color:#F4EFE6;border-radius:16px;padding:16px 18px;box-shadow:0 16px 40px rgba(0,0,0,.35);font-size:13.5px;line-height:1.5';
d.innerHTML='Usamos cookies de analítica para saber qué funciona y mejorar la herramienta. Solo si nos dejas. <a href="/legal/cookies.html" style="color:#FFB38F">Más información sobre las cookies</a><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" data-c="0" style="flex:1 1 120px;padding:11px 14px;border-radius:10px;border:1px solid #3A342C;background:transparent;color:#F4EFE6;font:600 13.5px inherit;cursor:pointer">Rechazar</button><button type="button" data-c="1" style="flex:1 1 120px;padding:11px 14px;border-radius:10px;border:1px solid #F4EFE6;background:#F4EFE6;color:#0E0E0E;font:600 13.5px inherit;cursor:pointer">Aceptar</button></div>';
d.addEventListener('click',function(ev){{var b=ev.target.closest('button');if(!b)return;var si=b.dataset.c==='1';
try{{localStorage.setItem('cr_consentimiento',JSON.stringify({{si:si,t:Date.now()}}))}}catch(e){{}}d.remove();if(si)cargar()}});
document.body.appendChild(d)}}).catch(function(){{}})}},800)}});
</script>
</body>
</html>
'''

for p in PAGINAS:
    d = RAIZ / p['slug']; d.mkdir(exist_ok=True)
    (d / 'index.html').write_text(pagina(p), encoding='utf-8')

urls = [(WEB + '/', '1.0')] + [('%s/%s/' % (WEB, p['slug']), '0.8') for p in PAGINAS]
(RAIZ / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    '  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <priority>%s</priority>\n  </url>\n' % (u, HOY, pr) for u, pr in urls) + '</urlset>\n', encoding='utf-8')
print(len(PAGINAS), 'páginas ·', len(urls), 'URL en el sitemap')
