/* ═══════════════════════════════════════════════════════════════
   EDITORIAL — páginas libres con bloques que se colocan a mano
   ───────────────────────────────────────────────────────────────
   Una página editorial es un fondo (color o foto) más una lista de
   BLOQUES. Cada bloque es texto o foto y guarda su posición en
   PORCENTAJE de la página, no en píxeles. Por eso se ve igual en un
   computador grande, en la vista previa del panel y en un celular.

   Este archivo lo usan los dos lados: la revista lo pinta y el panel
   lo pinta exactamente igual mientras editas.
   ═══════════════════════════════════════════════════════════════ */

export const ESTILOS = {
  display:    { nombre: 'Titular gigante', tam: 16 },
  titular:    { nombre: 'Titular de revista', tam: 9 },
  manuscrita: { nombre: 'Caligrafía', tam: 14 },
  cita:       { nombre: 'Cita con comillas', tam: 7 },
  parrafo:    { nombre: 'Párrafo', tam: 3.2 },
  etiqueta:   { nombre: 'Etiqueta pequeña', tam: 2 }
};

/* Solo colores de la marca: así ninguna página se sale de la identidad. */
export const COLORES = [
  { id: 'papel',       nombre: 'Blanco' },
  { id: 'crema',       nombre: 'Blanco cálido' },
  { id: 'rosa-claro',  nombre: 'Rosa muy claro' },
  { id: 'rosa-palo',   nombre: 'Rosa palo' },
  { id: 'lila',        nombre: 'Lila pastel' },
  { id: 'cielo',       nombre: 'Azul pastel' },
  { id: 'menta',       nombre: 'Verde pastel' },
  { id: 'mantequilla', nombre: 'Amarillo pastel' },
  { id: 'acento',      nombre: 'Rosa profundo' },
  { id: 'gris-marca',  nombre: 'Gris' },
  { id: 'tinta',       nombre: 'Café oscuro' }
];

export const ALINEACIONES = [
  { id: 'left', nombre: 'Izquierda' },
  { id: 'center', nombre: 'Centro' },
  { id: 'right', nombre: 'Derecha' }
];

let contador = 0;
function idBloque () { return `b${Date.now().toString(36)}${(contador++).toString(36)}`; }

/* ═══════════ BLOQUES NUEVOS ═══════════ */

export function bloqueTexto (parcial = {}) {
  const estilo = parcial.estilo || 'display';
  return {
    id: idBloque(),
    clase: 'texto',
    texto: parcial.texto ?? 'Escribe aquí',
    estilo,
    tam: parcial.tam ?? ESTILOS[estilo].tam,
    color: parcial.color || 'tinta',
    alinear: parcial.alinear || 'left',
    rotar: parcial.rotar ?? 0,
    x: parcial.x ?? 10,
    y: parcial.y ?? 40,
    ancho: parcial.ancho ?? 60
  };
}

export function bloqueFoto (parcial = {}) {
  return {
    id: idBloque(),
    clase: 'foto',
    imagen: parcial.imagen || null,
    foco: parcial.foco || { x: 50, y: 50 },
    rotar: parcial.rotar ?? 0,
    redondo: parcial.redondo ?? false,
    x: parcial.x ?? 15,
    y: parcial.y ?? 15,
    ancho: parcial.ancho ?? 50,
    alto: parcial.alto ?? 55
  };
}

/** Página editorial vacía, lista para empezar a componer. */
export function editorialEnBlanco () {
  return {
    fondo: { color: 'papel', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
    bloques: [bloqueTexto({ texto: 'TU TITULAR', y: 38 })]
  };
}

/* ═══════════ PLANTILLAS ═══════════ */
/* Puntos de partida inspirados en composiciones de revista. Se aplican
   sobre la página y después mueves lo que quieras. */

export const PLANTILLAS = {
  'foto-titular': {
    nombre: 'Foto a sangre + titular',
    crear: () => ({
      fondo: { color: 'crema', imagen: null, foco: { x: 50, y: 35 }, velo: 70 },
      bloques: [
        bloqueTexto({ texto: 'EDICIÓN 01', estilo: 'etiqueta', color: 'acento', x: 9, y: 9, ancho: 40, tam: 2 }),
        bloqueTexto({ texto: 'YES\nMAM', estilo: 'display', color: 'tinta', x: 9, y: 52, ancho: 60, tam: 20 }),
        bloqueTexto({ texto: 'Tejidos con personalidad, hechos a mano.', estilo: 'parrafo', color: 'gris-marca', x: 9, y: 84, ancho: 52, tam: 3 })
      ]
    })
  },

  'cita-color': {
    nombre: 'Cita sobre bloque de color',
    crear: () => ({
      fondo: { color: 'rosa-palo', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueTexto({ texto: 'MANIFIESTO', estilo: 'etiqueta', color: 'gris-marca', x: 12, y: 12, ancho: 40, tam: 2 }),
        bloqueTexto({
          texto: 'Ponle color a los días grises.',
          estilo: 'cita', color: 'tinta', x: 12, y: 34, ancho: 68, tam: 9, alinear: 'left'
        }),
        bloqueTexto({ texto: 'BY VAL', estilo: 'etiqueta', color: 'tinta', x: 12, y: 82, ancho: 40, tam: 2 })
      ]
    })
  },

  'foto-lado': {
    nombre: 'Foto al lado + texto',
    crear: () => ({
      fondo: { color: 'papel', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueFoto({ x: 42, y: 8, ancho: 50, alto: 62 }),
        bloqueTexto({ texto: 'hecho\na mano', estilo: 'manuscrita', color: 'acento', x: 7, y: 22, ancho: 45, tam: 15, rotar: -4 }),
        bloqueTexto({
          texto: 'Cada pieza se teje en tandas pequeñas. Por eso ninguna sale exactamente igual a la otra, y por eso cuando un color se acaba hay que esperar.',
          estilo: 'parrafo', color: 'tinta', x: 7, y: 62, ancho: 32, tam: 3
        }),
        bloqueTexto({ texto: 'PÁGINA 03', estilo: 'etiqueta', color: 'gris-marca', x: 7, y: 88, ancho: 30, tam: 1.8 })
      ]
    })
  },

  'collage': {
    nombre: 'Collage de dos fotos',
    crear: () => ({
      fondo: { color: 'rosa-claro', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueFoto({ x: 6, y: 10, ancho: 44, alto: 46 }),
        bloqueFoto({ x: 44, y: 40, ancho: 48, alto: 48 }),
        bloqueTexto({ texto: 'LOS\nCUATRO\nCOLORES', estilo: 'display', color: 'tinta', x: 52, y: 6, ancho: 44, tam: 9 }),
        bloqueTexto({ texto: 'Blues · Lila Pop · Yellow Pop · Tennis Green', estilo: 'etiqueta', color: 'gris-marca', x: 6, y: 60, ancho: 34, tam: 1.8 })
      ]
    })
  }
};

/* ═══════════ PINTADO ═══════════ */

/**
 * Dibuja una página editorial dentro de `el`.
 * @param {HTMLElement} el       el elemento .pagina
 * @param {Object} pagina        datos de la página (fondo + bloques)
 * @param {Function} urlDeImagen (id) => url lista para un <img>
 */
export function pintarEditorial (el, pagina, urlDeImagen) {
  const fondo = pagina.fondo || { color: 'papel' };
  el.classList.add('editorial-libre');
  el.style.background = `var(--${fondo.color || 'papel'})`;

  // Los fondos oscuros necesitan que el folio y la sección se vean claros.
  el.classList.toggle('pagina--oscura', ['tinta', 'acento', 'gris-marca'].includes(fondo.color));

  if (fondo.imagen) {
    const medio = document.createElement('div');
    medio.className = 'pagina__medio';
    const img = document.createElement('img');
    img.src = urlDeImagen(fondo.imagen);
    img.alt = '';
    img.style.objectPosition = `${fondo.foco?.x ?? 50}% ${fondo.foco?.y ?? 50}%`;
    medio.append(img);
    if (fondo.velo) {
      const velo = document.createElement('div');
      velo.className = 'pagina__velo';
      velo.style.opacity = String(fondo.velo / 100);
      medio.append(velo);
    }
    el.append(medio);
  }

  const lienzo = document.createElement('div');
  lienzo.className = 'lienzo';

  (pagina.bloques || []).forEach(bloque => lienzo.append(pintarBloque(bloque, urlDeImagen)));
  el.append(lienzo);
}

export function pintarBloque (bloque, urlDeImagen) {
  const nodo = document.createElement('div');
  nodo.className = `eb eb--${bloque.clase}`;
  nodo.dataset.bloque = bloque.id;

  Object.assign(nodo.style, {
    left: `${bloque.x}%`,
    top: `${bloque.y}%`,
    width: `${bloque.ancho}%`,
    transform: bloque.rotar ? `rotate(${bloque.rotar}deg)` : ''
  });

  if (bloque.clase === 'foto') {
    nodo.style.height = `${bloque.alto}%`;
    if (bloque.redondo) nodo.style.borderRadius = '50%';
    const img = document.createElement('img');
    img.src = bloque.imagen ? urlDeImagen(bloque.imagen) : urlDeImagen(null);
    img.alt = '';
    img.style.objectPosition = `${bloque.foco?.x ?? 50}% ${bloque.foco?.y ?? 50}%`;
    nodo.append(img);
    return nodo;
  }

  nodo.classList.add(`eb-${bloque.estilo}`);
  Object.assign(nodo.style, {
    fontSize: `${bloque.tam}cqw`,
    color: `var(--${bloque.color})`,
    textAlign: bloque.alinear
  });
  nodo.textContent = bloque.texto;
  return nodo;
}
