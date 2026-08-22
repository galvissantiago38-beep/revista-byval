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
  { id: 'rosa-marca',  nombre: 'Rosa fuerte' },
  { id: 'lila',        nombre: 'Lila pastel' },
  { id: 'cielo',       nombre: 'Azul pastel' },
  { id: 'menta',       nombre: 'Verde pastel' },
  { id: 'mantequilla', nombre: 'Amarillo pastel' },
  { id: 'naranja',     nombre: 'Naranja de la marca' },
  { id: 'acento',      nombre: 'Naranja profundo' },
  { id: 'gris-marca',  nombre: 'Gris' },
  { id: 'tinta',       nombre: 'Café oscuro' }
];

export const ALINEACIONES = [
  { id: 'left',   nombre: 'Izquierda' },
  { id: 'center', nombre: 'Centro' },
  { id: 'right',  nombre: 'Derecha' }
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

/* ═══════════════════════════════════════════════════════════════
   DISEÑOS DE HOJA
   ───────────────────────────────────────────────────────────────
   Esto es lo que se elige al crear una página: no "tipo editorial"
   sino "cómo se ve la hoja". Cada uno trae su dibujito para el
   selector y deja la hoja ya compuesta; después se mueve a gusto.
   ═══════════════════════════════════════════════════════════════ */

/* Rectángulos = fotos, rayas = texto. El lienzo del dibujo es 100×133. */
const D = {
  papel: '<rect x="0" y="0" width="100" height="133" class="d-papel"/>',
  foto:  (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="d-foto"/>`,
  color: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="d-color"/>`,
  raya:  (x, y, w, alto = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${alto}" class="d-texto"/>`,
  titulo:(x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="9" class="d-titulo"/>`
};

export const PLANTILLAS = {

  'foto-grande': {
    nombre: 'Una foto grande',
    pista: 'La foto ocupa toda la hoja y el texto va encima',
    tipo: 'editorial',
    icono: D.foto(0, 0, 100, 133) + D.titulo(8, 92, 62) + D.raya(8, 110, 46),
    crear: () => ({
      fondo: { color: 'crema', imagen: null, foco: { x: 50, y: 40 }, velo: 55 },
      bloques: [
        bloqueTexto({ texto: 'TU TITULAR\nAQUÍ', estilo: 'display', color: 'tinta', x: 8, y: 60, ancho: 72, tam: 15 }),
        bloqueTexto({ texto: 'Una línea corta para acompañar.', estilo: 'parrafo', color: 'gris-marca', x: 8, y: 86, ancho: 55, tam: 3 })
      ]
    })
  },

  'dos-fotos': {
    nombre: 'Dos fotos',
    pista: 'Lado a lado, del mismo tamaño',
    tipo: 'editorial',
    icono: D.papel + D.raya(6, 8, 30, 2.5) + D.foto(6, 16, 41, 82) + D.foto(53, 16, 41, 82) + D.raya(6, 108, 55),
    crear: () => ({
      fondo: { color: 'papel', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueTexto({ texto: 'LA PAREJA', estilo: 'etiqueta', color: 'acento', x: 6, y: 6, ancho: 40, tam: 2 }),
        bloqueFoto({ x: 6, y: 12, ancho: 42, alto: 62 }),
        bloqueFoto({ x: 52, y: 12, ancho: 42, alto: 62 }),
        bloqueTexto({ texto: 'Dos piezas que se llevan juntas.', estilo: 'parrafo', color: 'tinta', x: 6, y: 80, ancho: 58, tam: 3.2 })
      ]
    })
  },

  'tres-fotos': {
    nombre: 'Tres fotos',
    pista: 'Una grande arriba y dos abajo',
    tipo: 'editorial',
    icono: D.papel + D.raya(6, 7, 34, 2.5) + D.foto(6, 14, 88, 54) + D.foto(6, 72, 42, 40) + D.foto(52, 72, 42, 40) + D.raya(6, 120, 48, 2.5),
    crear: () => ({
      fondo: { color: 'rosa-claro', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueTexto({ texto: 'LA COLECCIÓN', estilo: 'etiqueta', color: 'acento', x: 6, y: 5, ancho: 44, tam: 2 }),
        bloqueFoto({ x: 6, y: 11, ancho: 88, alto: 42 }),
        bloqueFoto({ x: 6, y: 56, ancho: 42, alto: 32 }),
        bloqueFoto({ x: 52, y: 56, ancho: 42, alto: 32 }),
        bloqueTexto({ texto: 'Tejidos con personalidad', estilo: 'parrafo', color: 'tinta', x: 6, y: 91, ancho: 60, tam: 3 })
      ]
    })
  },

  'collage': {
    nombre: 'Collage de cuatro',
    pista: 'Cuatro fotos sueltas y un poco torcidas',
    tipo: 'editorial',
    icono: D.papel + D.foto(5, 8, 44, 44) + D.foto(53, 16, 42, 38) + D.foto(5, 60, 38, 42) + D.foto(47, 62, 48, 40) + D.raya(8, 116, 40, 4),
    crear: () => ({
      fondo: { color: 'rosa-palo', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueFoto({ x: 5, y: 8, ancho: 44, alto: 34, rotar: -3 }),
        bloqueFoto({ x: 53, y: 15, ancho: 42, alto: 30, rotar: 4 }),
        bloqueFoto({ x: 5, y: 47, ancho: 38, alto: 34, rotar: 2 }),
        bloqueFoto({ x: 47, y: 50, ancho: 48, alto: 32, rotar: -2 }),
        bloqueTexto({ texto: 'todo junto', estilo: 'manuscrita', color: 'acento', x: 8, y: 84, ancho: 55, tam: 13, rotar: -3 })
      ]
    })
  },

  'tira': {
    nombre: 'Tira de fotos',
    pista: 'Tres fotos apiladas, una debajo de otra',
    tipo: 'editorial',
    icono: D.papel + D.foto(30, 6, 44, 34) + D.foto(30, 46, 44, 34) + D.foto(30, 86, 44, 34) + D.raya(8, 20, 16, 2.5) + D.raya(8, 60, 16, 2.5) + D.raya(8, 100, 16, 2.5),
    crear: () => ({
      fondo: { color: 'crema', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueFoto({ x: 30, y: 4, ancho: 44, alto: 28 }),
        bloqueFoto({ x: 30, y: 35, ancho: 44, alto: 28 }),
        bloqueFoto({ x: 30, y: 66, ancho: 44, alto: 28 }),
        bloqueTexto({ texto: 'UNO', estilo: 'etiqueta', color: 'gris-marca', x: 7, y: 14, ancho: 20, tam: 1.8 }),
        bloqueTexto({ texto: 'DOS', estilo: 'etiqueta', color: 'gris-marca', x: 7, y: 45, ancho: 20, tam: 1.8 }),
        bloqueTexto({ texto: 'TRES', estilo: 'etiqueta', color: 'gris-marca', x: 7, y: 76, ancho: 20, tam: 1.8 })
      ]
    })
  },

  'foto-lado': {
    nombre: 'Foto y texto al lado',
    pista: 'La foto a la derecha, la historia a la izquierda',
    tipo: 'editorial',
    icono: D.papel + D.foto(48, 12, 47, 74) + D.titulo(6, 28, 36) + D.raya(6, 58, 34) + D.raya(6, 66, 34) + D.raya(6, 74, 24),
    crear: () => ({
      fondo: { color: 'papel', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueFoto({ x: 46, y: 10, ancho: 48, alto: 62 }),
        bloqueTexto({ texto: 'hecho\na mano', estilo: 'manuscrita', color: 'acento', x: 6, y: 22, ancho: 42, tam: 15, rotar: -4 }),
        bloqueTexto({
          texto: 'Cuenta aquí la historia de la pieza: de dónde salió, cuánto tardó, por qué vale la pena.',
          estilo: 'parrafo', color: 'tinta', x: 6, y: 60, ancho: 34, tam: 3
        }),
        bloqueTexto({ texto: 'BY VAL', estilo: 'etiqueta', color: 'gris-marca', x: 6, y: 88, ancho: 30, tam: 1.8 })
      ]
    })
  },

  'cita': {
    nombre: 'Solo una frase',
    pista: 'Hoja de color con una frase grande, sin fotos',
    tipo: 'editorial',
    icono: D.color(0, 0, 100, 133) + D.raya(14, 16, 26, 2.5) + D.titulo(14, 46, 72) + D.titulo(14, 60, 54) + D.raya(14, 108, 22, 2.5),
    crear: () => ({
      fondo: { color: 'rosa-marca', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        bloqueTexto({ texto: 'MANIFIESTO', estilo: 'etiqueta', color: 'tinta', x: 12, y: 12, ancho: 40, tam: 2 }),
        bloqueTexto({ texto: 'Ponle color a los días grises.', estilo: 'cita', color: 'tinta', x: 12, y: 34, ancho: 70, tam: 9 }),
        bloqueTexto({ texto: 'BY VAL', estilo: 'etiqueta', color: 'tinta', x: 12, y: 82, ancho: 40, tam: 2 })
      ]
    })
  },

  'prenda': {
    nombre: 'Ficha de una prenda',
    pista: 'Foto, precio, tallas y botón de WhatsApp',
    tipo: 'producto',
    icono: D.papel + D.foto(8, 8, 84, 70) + D.titulo(8, 84, 54) + D.raya(8, 100, 68) + D.raya(8, 108, 40) + D.color(8, 118, 40, 9),
    crear: () => null
  },

  'lookbook': {
    nombre: 'Lookbook de 4 prendas',
    pista: 'Cuatro prendas del catálogo en composición de revista',
    tipo: 'doble',
    icono: D.papel + D.raya(6, 10, 40, 3) + D.foto(6, 22, 42, 58) + D.foto(52, 22, 42, 26) + D.foto(52, 52, 42, 50) + D.foto(6, 84, 42, 18),
    crear: () => null
  },

  'portada': {
    nombre: 'Portada',
    pista: 'La primera hoja, con tu logo',
    tipo: 'portada',
    icono: D.foto(0, 0, 100, 133) + D.titulo(22, 50, 56) + D.raya(30, 66, 40, 2.5) + D.raya(28, 112, 44, 2.5),
    crear: () => null
  },

  'indice': {
    nombre: 'Índice',
    pista: 'La lista de todo lo que hay, con su número de página',
    tipo: 'indice',
    icono: D.papel + D.titulo(8, 14, 52) + D.raya(8, 40, 84) + D.raya(8, 56, 84) + D.raya(8, 72, 84) + D.raya(8, 88, 84) + D.raya(8, 104, 84),
    crear: () => null
  },

  'contraportada': {
    nombre: 'Contraportada',
    pista: 'La última hoja: contacto, redes y gracias',
    tipo: 'contraportada',
    icono: D.foto(0, 0, 100, 133) + D.titulo(24, 44, 52) + D.raya(30, 64, 40, 2.5) + D.raya(34, 74, 32, 2.5) + D.color(30, 96, 40, 9),
    crear: () => null
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
  el.classList.toggle('pagina--oscura', ['tinta', 'acento', 'gris-marca', 'naranja'].includes(fondo.color));

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
