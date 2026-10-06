/* Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011, anexo II), en su orden oficial.
   Pictogramas propios, de trazo, que toman el color del texto: así encajan en cualquier estilo de carta. */
(function (global) {
  const hoja = (x, y) => `<path d="M${x} ${y}c1.9 2.2 2.4 4.4 0 6.6-2.4-2.2-1.9-4.4 0-6.6z"/>`;
  const foliolo = g => `<path transform="rotate(${g} 12 13.5)" d="M12 13.5c-1.2-2.8-1.2-6.4 0-9.6 1.2 3.2 1.2 6.8 0 9.6z"/>`;
  const ALERGENOS = [
    { id: 1, clave: 'gluten', es: 'Gluten', en: 'Gluten', fr: 'Gluten', de: 'Gluten', it: 'Glutine', pt: 'Glúten', zh: '麸质',
      svg: '<path d="M12 22V8"/><path d="M12 8c-1.6-1.6-1.6-4 0-6 1.6 2 1.6 4.4 0 6z"/><path d="M12 12.6c-2.4.2-4-1-4.4-3.2 2.4-.2 4 1 4.4 3.2z"/><path d="M12 12.6c2.4.2 4-1 4.4-3.2-2.4-.2-4 1-4.4 3.2z"/><path d="M12 17.2c-2.4.2-4-1-4.4-3.2 2.4-.2 4 1 4.4 3.2z"/><path d="M12 17.2c2.4.2 4-1 4.4-3.2-2.4-.2-4 1-4.4 3.2z"/>' },
    { id: 2, clave: 'crustaceos', es: 'Crustáceos', en: 'Crustaceans', fr: 'Crustacés', de: 'Krebstiere', it: 'Crostacei', pt: 'Crustáceos', zh: '甲壳类',
      svg: '<ellipse cx="12" cy="14.5" rx="5.6" ry="4"/><path d="M7.4 12C5.2 10.6 4.2 8.4 4.8 5.6"/><path d="M4.8 5.6c1.7.2 2.7 1.3 2.7 3"/><path d="M16.6 12c2.2-1.4 3.2-3.6 2.6-6.4"/><path d="M19.2 5.6c-1.7.2-2.7 1.3-2.7 3"/><path d="M6.7 16l-3.2 1.4"/><path d="M8 17.9l-2.3 2.6"/><path d="M17.3 16l3.2 1.4"/><path d="M16 17.9l2.3 2.6"/><path d="M10.4 10.6V8.8"/><path d="M13.6 10.6V8.8"/>' },
    { id: 3, clave: 'huevos', es: 'Huevos', en: 'Eggs', fr: 'Œufs', de: 'Eier', it: 'Uova', pt: 'Ovos', zh: '蛋类',
      svg: '<path d="M12 2.8c3.4 0 6.6 5.4 6.6 10.2a6.6 6.6 0 0 1-13.2 0C5.4 8.2 8.6 2.8 12 2.8z"/><path d="M9 12.6c0-2 .8-3.8 1.9-5"/>' },
    { id: 4, clave: 'pescado', es: 'Pescado', en: 'Fish', fr: 'Poisson', de: 'Fisch', it: 'Pesce', pt: 'Peixe', zh: '鱼类',
      svg: '<path d="M21.5 12c-2-3.6-4.8-5.4-8-5.4S7.8 8.4 6.2 12c1.6 3.6 4.1 5.4 7.3 5.4s6-1.8 8-5.4z"/><path d="M6.2 12L2.5 8.2v7.6z"/><path d="M12.8 9.2c.9 1.8.9 3.8 0 5.6"/><circle cx="17" cy="11" r=".9" fill="currentColor" stroke="none"/>' },
    { id: 5, clave: 'cacahuetes', es: 'Cacahuetes', en: 'Peanuts', fr: 'Arachides', de: 'Erdnüsse', it: 'Arachidi', pt: 'Amendoins', zh: '花生',
      svg: '<path d="M8.9 11.6C7.4 10.6 7 9 7.5 7.2 8.2 4.8 10 3.4 12 3.4s3.8 1.4 4.5 3.8c.5 1.8.1 3.4-1.4 4.4 1.9 1 2.6 2.8 2.4 4.8-.3 2.8-2.6 4.6-5.5 4.6s-5.2-1.8-5.5-4.6c-.2-2 .5-3.8 2.4-4.8z"/><path d="M10.6 7.4h.01M13.4 9h.01M10.4 15.4h.01M13.6 17h.01M12.2 13.4h.01" stroke-width="2.2"/>' },
    { id: 6, clave: 'soja', es: 'Soja', en: 'Soy', fr: 'Soja', de: 'Soja', it: 'Soia', pt: 'Soja', zh: '大豆',
      svg: '<path d="M3.6 20.4C3.2 11.5 10 4 20.4 3.6 20.8 12.5 14 20 3.6 20.4z"/><circle cx="8.6" cy="15.4" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="15.4" cy="8.6" r="1.8"/>' },
    { id: 7, clave: 'lacteos', es: 'Lácteos', en: 'Milk', fr: 'Lait', de: 'Milch', it: 'Latte', pt: 'Leite', zh: '乳制品',
      svg: '<path d="M9.5 2.5h5v3.2l2.3 3.6c.4.7.7 1.4.7 2.2V20a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20v-8.5c0-.8.3-1.5.7-2.2l2.3-3.6z"/><path d="M9.5 5.7h5"/><path d="M6.5 14.6c1.8-1.2 3.6 1.2 5.5 0s3.7-1.2 5.5 0"/>' },
    { id: 8, clave: 'frutos', es: 'Frutos de cáscara', en: 'Tree nuts', fr: 'Fruits à coque', de: 'Schalenfrüchte', it: 'Frutta a guscio', pt: 'Frutos de casca rija', zh: '坚果',
      svg: '<path d="M5.5 10.5c0 5 2.8 9 6.5 11 3.7-2 6.5-6 6.5-11z"/><path d="M4.5 10.5c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6z"/><path d="M12 4.5V2.5"/>' },
    { id: 9, clave: 'apio', es: 'Apio', en: 'Celery', fr: 'Céleri', de: 'Sellerie', it: 'Sedano', pt: 'Aipo', zh: '芹菜',
      svg: '<path d="M12 21.5V10"/><path d="M9.6 21.5c0-4.4-.8-7.4-3-10.2"/><path d="M14.4 21.5c0-4.4.8-7.4 3-10.2"/><path d="M12 10c-1.7-1.7-1.7-4.6 0-6.8 1.7 2.2 1.7 5.1 0 6.8z"/><path transform="rotate(-36 6.6 11.3)" d="M6.6 11.3c-1.5-1.5-1.5-4 0-6 1.5 2 1.5 4.5 0 6z"/><path transform="rotate(36 17.4 11.3)" d="M17.4 11.3c-1.5-1.5-1.5-4 0-6 1.5 2 1.5 4.5 0 6z"/><path d="M8.6 21.5h6.8"/>' },
    { id: 10, clave: 'mostaza', es: 'Mostaza', en: 'Mustard', fr: 'Moutarde', de: 'Senf', it: 'Senape', pt: 'Mostarda', zh: '芥末',
      svg: '<path d="M9 9.5h6l1 2.5v8a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20v-8z"/><path d="M10.5 9.5V7.5h3v2"/><path d="M12 7.5V2.5"/><path d="M8 15.5h8"/>' },
    { id: 11, clave: 'sesamo', es: 'Sésamo', en: 'Sesame', fr: 'Sésame', de: 'Sesam', it: 'Sesamo', pt: 'Sésamo', zh: '芝麻',
      svg: hoja(12, 2.8) + hoja(6.6, 12.6) + hoja(17.4, 12.6) },
    { id: 12, clave: 'sulfitos', es: 'Sulfitos', en: 'Sulphites', fr: 'Sulfites', de: 'Sulfite', it: 'Solfiti', pt: 'Sulfitos', zh: '亚硫酸盐',
      svg: '<path d="M7 3h10c0 5.6-1.9 9-5 9S7 8.6 7 3z"/><path d="M7.4 6.8h9.2"/><path d="M12 12v8.8"/><path d="M8 21h8"/>' },
    { id: 13, clave: 'altramuces', es: 'Altramuces', en: 'Lupin', fr: 'Lupin', de: 'Lupinen', it: 'Lupini', pt: 'Tremoço', zh: '羽扇豆',
      svg: [-78, -52, -26, 0, 26, 52, 78].map(foliolo).join('') + '<path d="M12 13.5V22"/>' },
    { id: 14, clave: 'moluscos', es: 'Moluscos', en: 'Molluscs', fr: 'Mollusques', de: 'Weichtiere', it: 'Molluschi', pt: 'Moluscos', zh: '软体动物',
      svg: '<path d="M4 11.5C4 7 7.6 4 12 4s8 3 8 7.5c0 2.8-1.6 5.2-4 7l-1.5 1.5h-5L8 18.5c-2.4-1.8-4-4.2-4-7z"/><path d="M12 20V4.2"/><path d="M11 20L6.4 7"/><path d="M13 20l4.6-13"/>' }
  ];
  const POR_ID = Object.fromEntries(ALERGENOS.map(a => [a.id, a]));
  const icono = (id, extra) => POR_ID[id] ? `<svg class="al-i${extra ? ' ' + extra : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${POR_ID[id].svg}</svg>` : '';
  const nombre = (id, idioma) => POR_ID[id] ? (POR_ID[id][idioma] || POR_ID[id].es) : '';
  // De lo que venga (array, "1, 7", [1,"7"]) a una lista limpia de ids 1–14, ordenada y sin repetir
  const limpiar = v => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[^\d]+/)).map(Number).filter(n => POR_ID[n]))].sort((a, b) => a - b);
  global.Alergenos = { ALERGENOS, POR_ID, icono, nombre, limpiar };
})(typeof window !== 'undefined' ? window : globalThis);
