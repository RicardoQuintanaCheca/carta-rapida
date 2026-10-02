// Común a las tres propuestas: la hoja va pasando por estilos y el selector A/B/C
(function () {
  const estilos = [['riviera', 'Riviera'], ['serigrafia', 'Serigrafía'], ['cartel', 'Cartel'], ['sumi', 'Sumi'], ['gaceta', 'Gaceta'], ['sobremesa', 'Sobremesa']];
  document.querySelectorAll('[data-hoja]').forEach(caja => {
    const imgs = estilos.map(([k], i) => { const im = new Image(); im.src = '/ejemplo/portada-' + k + '-640.webp'; im.alt = i ? '' : 'Carta de Casa Pepe en estilo Riviera'; if (!i) im.className = 'on'; caja.appendChild(im); return im; });
    const rot = document.querySelector(caja.dataset.hoja || '#x');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0, quieta = false;
    caja.addEventListener('pointerenter', () => quieta = true); caja.addEventListener('pointerleave', () => quieta = false);
    setInterval(() => { if (quieta || document.hidden) return; imgs[i].classList.remove('on'); i = (i + 1) % imgs.length; imgs[i].classList.add('on'); if (rot) rot.textContent = estilos[i][1]; }, 2400);
  });
  const p = location.pathname.replace(/\/$/, '').split('/').pop().replace('.html', '');
  const barra = document.createElement('nav');
  barra.className = 'elige'; barra.setAttribute('aria-label', 'Propuestas de diseño');
  barra.innerHTML = [['a', 'A · Imprenta'], ['b', 'B · Producto'], ['c', 'C · Cartel']].map(([k, n]) => `<a href="/disenos/${k}.html"${k === p ? ' aria-current="page"' : ''}>${n}</a>`).join('');
  document.body.appendChild(barra);
})();
