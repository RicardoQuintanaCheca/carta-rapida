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

COMUN_FAQ = [
  ('¿Cuánto cuesta?', 'Dos cartas al mes son gratis, con 12 estilos, y el PDF te llega al email. Carta Pro cuesta 12,90 € al mes y añade los 8 estilos restantes, guardar tus cartas, cambiar precios sin empezar de cero, tu logotipo y la traducción. Si solo la necesitas una vez, hay un pase de 7 días por 15 €, sin suscripción.'),
  ('¿En qué formato me llega?', 'En PDF tamaño A4, listo para imprimir en tu impresora o en una copistería.'),
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
 dict(slug='menu-del-dia', menu='Menú del día',
  title='Plantilla de menú del día para imprimir: hecha en 30 segundos',
  desc='Haz el menú del día de tu restaurante cada mañana sin abrir Word: pegas los platos, eliges estilo e imprimes el PDF en A4.',
  h1='El menú del día, impreso antes de abrir.',
  golpe='Cambia todos los días. No puede costarte veinte minutos todos los días.',
  intro='El menú del día es la hoja que más se imprime en un restaurante y la que peor suele quedar: un documento de texto retocado encima del de ayer. Aquí pegas los primeros, los segundos y el precio, eliges estilo y lo imprimes.',
  estilos=['pizarra','ticket','gaceta','mantel'],
  bloques=[
   ('Pegas el texto y listo', 'No hace falta foto. Escribes o pegas los platos del día como los tengas, con sus secciones (primeros, segundos, postres) y el precio del menú.'),
   ('Estilos para una hoja corta', 'Pizarra parece escrita a mano con rotulador. Ticket es directo y pequeño. Gaceta y Mantel son más de casa de comidas. Con pocos platos la letra crece y la hoja no queda vacía.'),
   ('Dos cartas gratis al mes; para hacerlo a diario, Carta Pro', 'La versión gratis da para dos cartas al mes. Si vas a hacer el menú todos los días, Carta Pro te deja guardarlo y cambiar solo los platos.'),
  ],
  faq=[('¿Puedo poner "pan, bebida y postre incluidos"?', 'Sí. Las notas que pongas al final salen en el pie de la carta.'),
       ('¿Tengo que subir una foto cada día?', 'No. Puedes pegar el texto. Con Carta Pro, además, el menú queda guardado y solo cambias lo que cambia.')]),
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
  desc='Haz la tabla de alérgenos de tu restaurante en PDF A4: tus platos en filas y los 14 alérgenos en columnas, con fecha y firma. Sale de tu propia carta, sin rellenar una plantilla a mano.',
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
  desc='La lista de los 14 alérgenos que un restaurante tiene que poder declarar, uno a uno, con su icono y lo que incluye cada grupo. Y cómo ponerlos en la carta sin llenarla de símbolos.',
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
       ('¿Hay formatos más pequeños que A4?', 'El PDF sale en A4. Para una carta más pequeña puedes imprimirla reducida desde las opciones de tu impresora.')]),
 dict(slug='imprimir-carta-restaurante', menu='Imprimir la carta',
  title='Imprimir la carta de un restaurante: tamaño, papel y cómo presentarla',
  desc='Cómo imprimir la carta de tu restaurante para que aguante el servicio: tamaño A4, papel, impresora o copistería, y cómo presentarla en la mesa.',
  h1='Una carta bien impresa se nota antes de leerla.',
  golpe='El diseño es la mitad. La otra mitad es el papel y dónde lo pones.',
  intro='Puedes tener la carta mejor maquetada del barrio y estropearla al imprimirla en un folio fino que se arruga a la primera gota. Aquí va lo básico para que la carta que sale de la impresora esté a la altura de tu cocina.',
  estilos=['sobremesa','brasserie','riviera','gaceta'],
  bloques=[
   ('Tamaño', 'El PDF sale en A4 (210 × 297 mm), que es el tamaño que admite cualquier impresora y cualquier copistería. Al imprimir, elige "tamaño real" o "100 %" para que no se recorten los márgenes.'),
   ('Papel', 'Un papel de más gramaje que el folio normal aguanta mejor el uso y no transparenta. Si la carta va a ir sin funda, pide en la copistería un papel grueso o un acabado que resista manchas.'),
   ('Impresora o copistería', 'Las cartas van sobre fondo blanco, así que una impresora de oficina las saca bien. Para muchas copias o papel grueso, una copistería sale mejor y más barato por unidad.'),
  ],
  secciones=[
   ('Cómo presentarla en la mesa', 'Una hoja suelta dura poco: se mancha, se dobla y da sensación de provisional. Un portamenús la protege, permite cambiar la hoja cuando cambian los precios y hace que la carta se perciba como parte del local. Carta Rápida es de Kartia, taller español que fabrica portamenús a mano desde 2018; las cartas en A4 que salen de aquí están pensadas para ir dentro.'),
   ('Cada cuánto reimprimir', 'Cada vez que cambie un precio o un plato. Una carta con tachones o pegatinas transmite dejadez. Por eso conviene que rehacerla cueste medio minuto y no una tarde.'),
  ],
  faq=[('¿La carta se puede imprimir a doble cara?', 'Sí. Si tu carta ocupa dos páginas, puedes imprimirlas a doble cara desde las opciones de tu impresora.'),
       ('¿Hacéis vosotros la impresión?', 'No imprimimos cartas. Recibes el PDF y lo imprimes donde prefieras. Lo que sí fabrica Kartia son los portamenús.')]),
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
       ('¿Puedo hacer varios menús de Navidad?', 'La versión gratis da para dos cartas al mes. Si vas a preparar más, o quieres retocarlos según te pidan, Carta Pro los guarda y te deja cambiarlos sin empezar de cero; también hay un pase de 7 días por 15 €.')]),
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
.nota{color:var(--muted);font-size:15px;margin:22px 0 0;max-width:46em}
.otras{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0;padding:0;list-style:none}
.otras a{display:block;padding:10px 16px;border-radius:99px;box-shadow:inset 0 0 0 1.5px var(--line);text-decoration:none;font-size:16px;font-weight:600}
.otras a:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
footer{padding-top:32px;padding-bottom:48px;color:var(--muted);font-size:15px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between}
footer nav{display:flex;flex-wrap:wrap;gap:8px 18px}footer a{text-decoration:none}footer a:hover{text-decoration:underline}
@media (max-width:860px){body{font-size:17px}.hero{grid-template-columns:minmax(0,1fr)}.hoja{width:min(78%,340px)}.bloques,.pasos,.al14{grid-template-columns:minmax(0,1fr)}.tres{grid-template-columns:minmax(0,1fr);max-width:340px}.estilos{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{width:100%}.nav .btn{width:auto}}
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
    hero = p.get('hero')
    hero_base = hero[0] if hero else 'portada-' + primero
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
<link rel="preload" as="image" href="/ejemplo/{hero_base}-640.webp" imagesrcset="/ejemplo/{hero_base}-640.webp 640w, /ejemplo/{hero_base}.webp 900w" imagesizes="(max-width: 860px) 78vw, 420px" fetchpriority="high">
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
    <div class="ctas"><a class="btn" href="/#herramienta">Sube una foto de tu carta</a><a class="btn o" href="#estilos">Ver los estilos</a></div>
    <ul class="trust"><li>Gratis</li><li>Sin tarjeta</li><li>PDF A4 en 30 segundos</li></ul>
  </div>
  <figure class="hoja">{('<img src="/ejemplo/%s-640.webp" srcset="/ejemplo/%s-640.webp 640w, /ejemplo/%s.webp 900w" sizes="(max-width: 860px) 78vw, 420px" width="900" height="1274" alt="%s" fetchpriority="high">' % (hero_base, hero_base, hero_base, e(hero[1]))) if hero else img(primero, '(max-width: 860px) 78vw, 420px', prioridad=True)}<figcaption>{e(hero[2]) if hero else 'Carta de ejemplo en estilo ' + e(NOMBRE[primero])}</figcaption></figure>
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
<section class="fin"><div class="w"><h2>Tu carta, hoy.</h2><a class="btn" href="/#herramienta">Sube una foto de tu carta</a></div></section>
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
