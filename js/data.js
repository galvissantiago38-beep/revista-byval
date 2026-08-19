/* ═══════════════════════════════════════════════════════════════
   DATA — capa de datos y almacenamiento
   ───────────────────────────────────────────────────────────────
   Todo el acceso a datos pasa por aquí. Si algún día quieres un
   backend real (Supabase, Firebase, tu propia API), solo hay que
   reescribir este archivo: el resto del proyecto no se entera.

   · localStorage → configuración, productos, páginas, vistas, favoritos
   · IndexedDB    → imágenes en base64 (pesan demasiado para localStorage)
   ═══════════════════════════════════════════════════════════════ */

const CLAVES = {
  config:    'revista.config',
  productos: 'revista.productos',
  paginas:   'revista.paginas',
  vistas:    'revista.vistas',
  deseos:    'revista.deseos',
  version:   'revista.version',
  sello:     'revista.sello',      // marca del datos.json que ya importamos
  esAdmin:   'revista.esAdmin'     // este navegador es el de la tienda
};

const VERSION_DATOS = 3;

/** Archivo que publicas junto a la revista para que las clientas vean TU catálogo. */
const ARCHIVO_PUBLICADO = 'datos.json';

/* ═══════════ IMÁGENES DE EJEMPLO GENERADAS POR CÓDIGO ═══════════ */

/** Generador pseudoaleatorio estable: la misma semilla da siempre el mismo dibujo. */
function azarEstable (semilla) {
  let s = 0;
  for (let i = 0; i < semilla.length; i++) s = (s * 31 + semilla.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Solo pasteles: los marcadores tienen que verse suaves, nunca oscuros. */
const PALETA_SVG = ['#F2D8D8', '#FCEFEF', '#FFFFFF', '#FDF6F0', '#DCE8F5', '#E9DDF3', '#FBEBCB', '#DFEEE5'];

/**
 * Dibuja una foto de moda de mentira: fondo en degradado, telas y una
 * silueta. Sirve de relleno editorial hasta que subas tus fotos reales.
 */
export function marcadorSVG ({ titulo = '', semilla = 'a', ancho = 900, alto = 1200, variante = 'retrato' } = {}) {
  const r = azarEstable(semilla + variante);
  const elegir = () => PALETA_SVG[Math.floor(r() * PALETA_SVG.length)];
  const fondoA = elegir();
  const fondoB = elegir();
  const tono = elegir();

  let formas = '';

  if (variante === 'retrato') {
    const cx = ancho / 2 + (r() - 0.5) * ancho * 0.14;
    formas += `
      <ellipse cx="${cx}" cy="${alto * 0.24}" rx="${ancho * 0.13}" ry="${ancho * 0.16}" fill="${tono}" opacity=".85"/>
      <path d="M${cx - ancho * 0.26} ${alto} C ${cx - ancho * 0.24} ${alto * 0.55}, ${cx - ancho * 0.1} ${alto * 0.4}, ${cx} ${alto * 0.4}
               C ${cx + ancho * 0.1} ${alto * 0.4}, ${cx + ancho * 0.24} ${alto * 0.55}, ${cx + ancho * 0.26} ${alto} Z"
            fill="${elegir()}" opacity=".9"/>
      <path d="M${cx - ancho * 0.13} ${alto} C ${cx - ancho * 0.08} ${alto * 0.62}, ${cx + ancho * 0.08} ${alto * 0.62}, ${cx + ancho * 0.13} ${alto} Z"
            fill="${elegir()}" opacity=".55"/>`;
  } else if (variante === 'tela') {
    for (let i = 0; i < 7; i++) {
      const y = alto * (0.12 + i * 0.12);
      formas += `<path d="M0 ${y} C ${ancho * 0.3} ${y - alto * 0.08 * r()}, ${ancho * 0.7} ${y + alto * 0.08 * r()}, ${ancho} ${y}
                          L ${ancho} ${y + alto * 0.11} C ${ancho * 0.7} ${y + alto * 0.06}, ${ancho * 0.3} ${y + alto * 0.16}, 0 ${y + alto * 0.11} Z"
                       fill="${elegir()}" opacity="${(0.28 + r() * 0.4).toFixed(2)}"/>`;
    }
  } else { // 'geo' — composición editorial abstracta
    for (let i = 0; i < 5; i++) {
      const x = r() * ancho, y = r() * alto, rr = (0.1 + r() * 0.28) * ancho;
      formas += r() > 0.5
        ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${elegir()}" opacity="${(0.3 + r() * 0.4).toFixed(2)}"/>`
        : `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${rr.toFixed(0)}" height="${(rr * 1.6).toFixed(0)}" fill="${elegir()}" opacity="${(0.3 + r() * 0.4).toFixed(2)}" transform="rotate(${(r() * 40 - 20).toFixed(1)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }
  }

  const rotulo = titulo
    ? `<text x="${ancho / 2}" y="${alto - 58}" text-anchor="middle" font-family="Georgia,serif"
             font-size="${Math.round(ancho * 0.045)}" letter-spacing="${ancho * 0.012}" fill="#403939" opacity=".55">${escaparXML(titulo)}</text>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${fondoA}"/><stop offset="1" stop-color="${fondoB}"/>
      </linearGradient>
      <filter id="suave"><feGaussianBlur stdDeviation="${ancho * 0.02}"/></filter>
    </defs>
    <rect width="${ancho}" height="${alto}" fill="url(#g)"/>
    <g filter="url(#suave)">${formas}</g>
    ${rotulo}
  </svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s+/g, ' '));
}

function escaparXML (t) {
  return String(t).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

/* ═══════════ INDEXEDDB PARA LAS IMÁGENES ═══════════ */

const DB_NOMBRE = 'revistaDB';
const DB_ALMACEN = 'imagenes';
let dbPromesa = null;

function abrirDB () {
  if (dbPromesa) return dbPromesa;
  dbPromesa = new Promise((ok, mal) => {
    const pedido = indexedDB.open(DB_NOMBRE, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(DB_ALMACEN)) db.createObjectStore(DB_ALMACEN, { keyPath: 'id' });
    };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => mal(pedido.error);
  });
  return dbPromesa;
}

async function enDB (modo, trabajo) {
  const db = await abrirDB();
  return new Promise((ok, mal) => {
    const tx = db.transaction(DB_ALMACEN, modo);
    const almacen = tx.objectStore(DB_ALMACEN);
    const pedido = trabajo(almacen);
    tx.oncomplete = () => ok(pedido?.result);
    tx.onerror = () => mal(tx.error);
  });
}

/* ═══════════ LECTURA / ESCRITURA EN localStorage ═══════════ */

function leer (clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir (clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
    return false;
  }
}

export function nuevoId (prefijo = 'id') {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ═══════════ CONFIGURACIÓN POR DEFECTO ═══════════ */

const CONFIG_INICIAL = {
  marca: 'BY VAL',
  temporada: 'Tejidos con personalidad',
  lema: '¡Ponle color a los días grises!',
  whatsapp: '573017510667',            // indicativo + número, sin + ni espacios
  mensajeWhatsapp: 'Hola {marca}, me encantó {producto} ({precio}). ¿Está disponible?',
  instagram: '@by____val',
  tiktok: '',
  correo: '',
  horarios: 'Lunes a sábado · 9:00 a 18:00',
  ciudad: 'Hecho en Colombia',
  moneda: 'COP',
  segundosAutolectura: 6,
  // Seguridad básica de fachada; para seguridad real hace falta un backend.
  claveAdmin: 'admin123'
};

/* ═══════════ CONTENIDO DE EJEMPLO (12 PÁGINAS) ═══════════ */

function productosIniciales () {
  const p = (id, nombre, categoria, precio, extra = {}) => ({
    id,
    nombre,
    categoria,
    descripcionCorta: extra.corta || '',
    descripcionLarga: extra.larga || '',
    precio,
    precioAnterior: extra.antes || null,
    tallas: extra.tallas || ['Única'],
    colores: extra.colores || [{ nombre: 'Rosa palo', hex: '#F2D8D8' }],
    stock: extra.stock ?? 6,
    etiqueta: extra.etiqueta || '',
    visible: true,
    imagenes: [{ id: `ph:${id}`, foco: { x: 50, y: 40 } }],
    principal: 0
  });

  return [
    p('cardigan-blues', 'Cardigan Blues', 'Cardigans', 265000, {
      corta: 'Tejido a mano en punto grueso, botones de madera.',
      larga: 'Punto grueso trabajado a mano, con botones de madera y bolsillos al frente. El azul Blues es de los que levantan un lunes cualquiera. Se lleva abierto sobre una camiseta o cerrado como abrigo liviano.',
      etiqueta: 'Nuevo', stock: 5,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Blues', hex: '#7BA7D7' }, { nombre: 'Rosa palo', hex: '#F2D8D8' }]
    }),
    p('cardigan-lila', 'Cardigan Lila Pop', 'Cardigans', 265000, {
      corta: 'El mismo punto, en un lila que no pasa desapercibido.',
      larga: 'Mismo tejido del Blues, otro estado de ánimo. El lila pop es el color que más nos piden y el que más rápido se va. Manga amplia y caída suave en los hombros.',
      etiqueta: 'Últimas unidades', stock: 2,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Lila Pop', hex: '#B79BD8' }]
    }),
    p('capa-huevo', 'Capa Huevo', 'Capas', 298000, {
      corta: 'Forma redonda, sin mangas, se pone encima de todo.',
      larga: 'La favorita de la casa. Forma redonda que abraza sin apretar, sin mangas, pensada para ponerse encima de lo que ya tienes puesto. Cabe cualquier cosa debajo y sigue viéndose bien.',
      stock: 4,
      colores: [{ nombre: 'Crudo', hex: '#F2E9E1' }, { nombre: 'Tennis Green', hex: '#4E8A6B' }]
    }),
    p('vestido-blues', 'Vestido Blues', 'Vestidos', 345000, {
      corta: 'Tejido largo con tirante ancho y espalda cerrada.',
      larga: 'Largo hasta la pantorrilla, tirante ancho y espalda cerrada. El punto es más fino que el de los cardigans, así que cae en vez de abultar. Va solo en verano y con camiseta debajo el resto del año.',
      stock: 3,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Blues', hex: '#7BA7D7' }]
    }),
    p('chaleco-yellow', 'Chaleco Yellow Pop', 'Chalecos', 189000, {
      corta: 'Amarillo que se ve desde la otra cuadra.',
      larga: 'Corto, sin mangas y de un amarillo que no pide permiso. Este es el que te pones cuando el día viene gris y toca hacer algo al respecto.',
      etiqueta: 'Oferta', antes: 219000, stock: 7,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Yellow Pop', hex: '#F2C94C' }]
    }),
    p('saco-tennis', 'Saco Tennis Green', 'Sacos', 289000, {
      corta: 'Cuello alto, punto cerrado, verde profundo.',
      larga: 'Cuello alto que se puede doblar, punto cerrado que abriga de verdad. El verde tennis es un color serio que igual se lleva bien con los tonos vivos de la colección.',
      stock: 5,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Tennis Green', hex: '#4E8A6B' }, { nombre: 'Gris', hex: '#736666' }]
    }),
    p('top-rosa', 'Top Rosa Palo', 'Tops', 145000, {
      corta: 'Punto fino, tirantes delgados, el básico de la casa.',
      larga: 'Punto fino, tirantes delgados y el rosa palo de la marca. Es la pieza que combina con todas las demás y por eso siempre se repone.',
      stock: 9,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Rosa palo', hex: '#F2D8D8' }, { nombre: 'Crudo', hex: '#F2E9E1' }]
    }),
    p('bufanda-larga', 'Bufanda Larga', 'Accesorios', 98000, {
      corta: 'Dos metros de punto para dar dos vueltas.',
      larga: 'Dos metros completos: alcanza para dar dos vueltas y que todavía sobre. Tejida en el mismo hilo de los cardigans, así que hacen juego sin esfuerzo.',
      stock: 12,
      colores: [{ nombre: 'Lila Pop', hex: '#B79BD8' }, { nombre: 'Yellow Pop', hex: '#F2C94C' }]
    }),
    p('gorro-pop', 'Gorro Pop', 'Accesorios', 72000, {
      corta: 'Ajustado, con vuelta ancha, en los cuatro colores.',
      larga: 'Ajustado pero sin apretar, con vuelta ancha al frente. Está en los cuatro colores de la colección para que armes el juego que quieras.',
      etiqueta: 'Nuevo', stock: 15,
      colores: [
        { nombre: 'Blues', hex: '#7BA7D7' },
        { nombre: 'Lila Pop', hex: '#B79BD8' },
        { nombre: 'Yellow Pop', hex: '#F2C94C' },
        { nombre: 'Tennis Green', hex: '#4E8A6B' }
      ]
    }),
    p('falda-punto', 'Falda de Punto', 'Faldas', 215000, {
      corta: 'Midi, cintura elástica, cae recta.',
      larga: 'Midi, con cintura elástica forrada y caída recta. Se lleva con el Top Rosa Palo para un conjunto completo, o con camisa blanca para el día a día.',
      stock: 6,
      tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Gris', hex: '#736666' }, { nombre: 'Crudo', hex: '#F2E9E1' }]
    })
  ];
}

function paginasIniciales () {
  return [
    { id: 'pg01', tipo: 'portada', seccion: 'Portada', titulo: '', imagen: 'ph:portada', visible: true },
    { id: 'pg02', tipo: 'indice', seccion: 'Contenido', titulo: 'En este número', visible: true },
    {
      id: 'pg03', tipo: 'editorial', seccion: 'Editorial', visible: true,
      fondo: { color: 'crema', imagen: 'ph:editorial-1', foco: { x: 50, y: 30 }, velo: 70 },
      bloques: [
        { id: 'b31', clase: 'texto', texto: 'MANIFIESTO', estilo: 'etiqueta', tam: 2, color: 'acento', alinear: 'left', rotar: 0, x: 9, y: 9, ancho: 44 },
        { id: 'b32', clase: 'texto', texto: 'LOS DÍAS\nGRISES\nTAMBIÉN SE\nVISTEN', estilo: 'display', tam: 13, color: 'tinta', alinear: 'left', rotar: 0, x: 9, y: 40, ancho: 74 },
        { id: 'b33', clase: 'texto', texto: 'Todo lo que ves acá se teje a mano, en tandas pequeñas. Por eso ninguna pieza sale exactamente igual a la otra.', estilo: 'parrafo', tam: 3, color: 'gris-marca', alinear: 'left', rotar: 0, x: 9, y: 82, ancho: 50 }
      ]
    },
    { id: 'pg04', tipo: 'producto', seccion: 'Cardigans', producto: 'cardigan-blues', visible: true },
    { id: 'pg05', tipo: 'producto', seccion: 'Capas', producto: 'capa-huevo', visible: true },
    {
      id: 'pg06', tipo: 'doble', seccion: 'Lookbook', titulo: 'Los cuatro colores',
      subtitulo: 'Blues · Lila Pop · Yellow Pop · Tennis Green',
      productos: ['cardigan-lila', 'chaleco-yellow', 'saco-tennis', 'gorro-pop'], visible: true
    },
    { id: 'pg07', tipo: 'producto', seccion: 'Vestidos', producto: 'vestido-blues', visible: true },
    {
      id: 'pg08', tipo: 'editorial', seccion: 'Editorial', visible: true,
      fondo: { color: 'rosa-palo', imagen: null, foco: { x: 50, y: 50 }, velo: 0 },
      bloques: [
        { id: 'b81', clase: 'texto', texto: 'EL TALLER', estilo: 'etiqueta', tam: 2, color: 'tinta', alinear: 'left', rotar: 0, x: 11, y: 11, ancho: 44 },
        { id: 'b82', clase: 'foto', imagen: 'ph:editorial-2', foco: { x: 50, y: 45 }, rotar: 3, redondo: false, x: 46, y: 20, ancho: 44, alto: 44 },
        { id: 'b83', clase: 'texto', texto: 'hecho\na mano', estilo: 'manuscrita', tam: 16, color: 'acento', alinear: 'left', rotar: -5, x: 8, y: 26, ancho: 44 },
        { id: 'b84', clase: 'texto', texto: 'Una prenda tejida a mano tarda días en salir. Ese tiempo se nota: en el peso, en cómo cae, en que aguanta temporadas enteras sin deformarse. No hacemos cientos de cada modelo: hacemos los que alcanzamos a hacer bien.', estilo: 'parrafo', tam: 3, color: 'tinta', alinear: 'left', rotar: 0, x: 11, y: 62, ancho: 40 },
        { id: 'b85', clase: 'texto', texto: 'BY VAL', estilo: 'etiqueta', tam: 1.8, color: 'tinta', alinear: 'left', rotar: 0, x: 11, y: 87, ancho: 30 }
      ]
    },
    { id: 'pg09', tipo: 'producto', seccion: 'Chalecos', producto: 'chaleco-yellow', visible: true },
    { id: 'pg10', tipo: 'producto', seccion: 'Tops', producto: 'top-rosa', visible: true },
    { id: 'pg11', tipo: 'producto', seccion: 'Accesorios', producto: 'bufanda-larga', visible: true },
    { id: 'pg12', tipo: 'contraportada', seccion: 'Gracias', imagen: 'ph:contraportada', visible: true }
  ];
}

/** Todos los ids de imagen que usa una página, incluidos los bloques editoriales. */
function imagenesDePagina (pg) {
  const ids = [];
  if (pg.imagen) ids.push(pg.imagen);
  if (pg.fondo?.imagen) ids.push(pg.fondo.imagen);
  (pg.bloques || []).forEach(b => { if (b.imagen) ids.push(b.imagen); });
  return ids;
}

/* ═══════════ API PÚBLICA ═══════════ */

/** Busca el datos.json publicado. Si no existe, sigue de largo sin ruido. */
async function leerPublicado () {
  try {
    const respuesta = await fetch(ARCHIVO_PUBLICADO, { cache: 'no-cache' });
    if (!respuesta.ok) return null;
    const paquete = await respuesta.json();
    return paquete?.formato === 'revista-digital' ? paquete : null;
  } catch {
    return null;   // no hay archivo publicado, o estamos abriendo con file://
  }
}

export const Datos = {

  /**
   * Prepara los datos al abrir la revista.
   *
   * Orden de prioridad:
   *   1. El navegador de la tienda (el que entró al panel) manda: se respeta
   *      siempre lo que hay en su localStorage.
   *   2. En cualquier otro dispositivo, si junto a la revista hay un
   *      `datos.json` publicado, ese es el catálogo que se muestra. Así el
   *      link que compartes enseña TUS prendas y no las de ejemplo.
   *   3. Si no hay nada de lo anterior, contenido de ejemplo.
   */
  async iniciar () {
    const esAdmin = leer(CLAVES.esAdmin, false);

    if (!esAdmin) {
      const publicado = await leerPublicado();
      // Reimportamos solo si el archivo publicado cambió desde la última visita.
      if (publicado && publicado.exportado !== leer(CLAVES.sello, null)) {
        await this.importar(publicado);
        escribir(CLAVES.sello, publicado.exportado || 'sin-fecha');
        return this;
      }
    }

    if (leer(CLAVES.version, 0) !== VERSION_DATOS) {
      // Contenido de ejemplo nuevo, pero sin cambiarte la contraseña del panel.
      const anterior = leer(CLAVES.config, {});
      escribir(CLAVES.productos, productosIniciales());
      escribir(CLAVES.paginas, paginasIniciales());
      escribir(CLAVES.config, { ...CONFIG_INICIAL, claveAdmin: anterior.claveAdmin || CONFIG_INICIAL.claveAdmin });
      escribir(CLAVES.version, VERSION_DATOS);
    }
    return this;
  },

  /** El panel llama a esto al entrar: este navegador pasa a ser el de la tienda. */
  marcarComoAdmin () { escribir(CLAVES.esAdmin, true); },

  /* ── Configuración ── */
  obtenerConfig () { return { ...CONFIG_INICIAL, ...leer(CLAVES.config, {}) }; },
  guardarConfig (parcial) {
    const nueva = { ...this.obtenerConfig(), ...parcial };
    escribir(CLAVES.config, nueva);
    return nueva;
  },

  /* ── Productos ── */
  obtenerProductos () { return leer(CLAVES.productos, []); },
  obtenerProducto (id) { return this.obtenerProductos().find(p => p.id === id) || null; },

  guardarProducto (producto) {
    const lista = this.obtenerProductos();
    const i = lista.findIndex(p => p.id === producto.id);
    if (i >= 0) lista[i] = producto; else lista.push({ ...producto, id: producto.id || nuevoId('prod') });
    escribir(CLAVES.productos, lista);
    return lista;
  },

  duplicarProducto (id) {
    const original = this.obtenerProducto(id);
    if (!original) return null;
    const copia = structuredClone(original);
    copia.id = nuevoId('prod');
    copia.nombre = `${original.nombre} (copia)`;
    this.guardarProducto(copia);
    return copia;
  },

  eliminarProducto (id) {
    escribir(CLAVES.productos, this.obtenerProductos().filter(p => p.id !== id));
    // También lo sacamos de las páginas que lo usaban.
    const paginas = this.obtenerPaginas()
      .filter(pg => pg.producto !== id)
      .map(pg => pg.productos ? { ...pg, productos: pg.productos.filter(x => x !== id) } : pg);
    this.guardarPaginas(paginas);
  },

  /* ── Páginas ── */
  obtenerPaginas () { return leer(CLAVES.paginas, []); },
  obtenerPaginasVisibles () { return this.obtenerPaginas().filter(p => p.visible !== false); },
  guardarPaginas (paginas) { escribir(CLAVES.paginas, paginas); return paginas; },

  /* ── Imágenes (IndexedDB) ── */
  async guardarImagen (dataUrl) {
    const id = nuevoId('img');
    await enDB('readwrite', a => a.put({ id, dataUrl }));
    return id;
  },

  async obtenerImagen (id) {
    if (!id) return null;
    if (id.startsWith('ph:')) return null;    // los placeholders se generan al vuelo
    const fila = await enDB('readonly', a => a.get(id));
    return fila ? fila.dataUrl : null;
  },

  async borrarImagen (id) {
    if (!id || id.startsWith('ph:')) return;
    await enDB('readwrite', a => a.delete(id));
  },

  /**
   * Devuelve una URL usable en un <img> para cualquier id de imagen,
   * sea un placeholder generado o una foto subida por la tienda.
   */
  async urlImagen (id, pista = {}) {
    if (!id) return marcadorSVG({ titulo: pista.titulo, semilla: pista.semilla || 'x', variante: pista.variante });
    if (id.startsWith('ph:')) {
      const semilla = id.slice(3);
      return marcadorSVG({ titulo: pista.titulo, semilla, variante: pista.variante || 'retrato' });
    }
    const guardada = await this.obtenerImagen(id);
    return guardada || marcadorSVG({ titulo: pista.titulo, semilla: id, variante: pista.variante });
  },

  /** Precarga en memoria todas las imágenes que la revista va a necesitar. */
  async mapaDeImagenes () {
    const mapa = new Map();
    const pendientes = [];

    const agregar = (id, pista) => {
      if (!id || mapa.has(id)) return;
      mapa.set(id, null);
      pendientes.push(this.urlImagen(id, pista).then(url => mapa.set(id, url)));
    };

    this.obtenerPaginas().forEach(pg => {
      const variante = pg.tipo === 'editorial' ? 'tela' : 'geo';
      imagenesDePagina(pg).forEach(id => agregar(id, { titulo: pg.titulo || '', variante }));
    });
    this.obtenerProductos().forEach(pr => {
      (pr.imagenes || []).forEach(im => agregar(im.id, { titulo: pr.nombre, variante: 'retrato' }));
    });

    await Promise.all(pendientes);
    return mapa;
  },

  /* ── Contador de vistas ── */
  obtenerVistas () { return leer(CLAVES.vistas, { paginas: {}, productos: {} }); },

  registrarVista (tipo, id) {
    if (!id) return;
    const v = this.obtenerVistas();
    const grupo = tipo === 'producto' ? 'productos' : 'paginas';
    v[grupo][id] = (v[grupo][id] || 0) + 1;
    escribir(CLAVES.vistas, v);
  },

  /* ── Lista de deseos (del lado de la clienta) ── */
  obtenerDeseos () { return leer(CLAVES.deseos, []); },
  alternarDeseo (id) {
    const lista = this.obtenerDeseos();
    const i = lista.indexOf(id);
    if (i >= 0) lista.splice(i, 1); else lista.push(id);
    escribir(CLAVES.deseos, lista);
    return lista;
  },

  /* ── Exportar / importar ── */
  async exportar () {
    const productos = this.obtenerProductos();
    const paginas = this.obtenerPaginas();

    // Recogemos también las fotos reales para que el respaldo sirva en otro computador.
    const ids = new Set();
    paginas.forEach(pg => imagenesDePagina(pg).forEach(id => ids.add(id)));
    productos.forEach(pr => (pr.imagenes || []).forEach(im => ids.add(im.id)));

    const imagenes = {};
    for (const id of ids) {
      const url = await this.obtenerImagen(id);
      if (url) imagenes[id] = url;
    }

    // La contraseña NUNCA sale de este navegador: el archivo exportado se
    // publica en internet y cualquiera podría abrirlo y leerla.
    const { claveAdmin, ...configPublica } = this.obtenerConfig();

    return {
      formato: 'revista-digital',
      version: VERSION_DATOS,
      exportado: new Date().toISOString(),
      config: configPublica,
      productos, paginas, imagenes,
      vistas: this.obtenerVistas()
    };
  },

  async importar (paquete) {
    if (!paquete || paquete.formato !== 'revista-digital') {
      throw new Error('El archivo no parece un respaldo de la revista.');
    }
    // Al importar respetamos la contraseña de ESTE navegador; el archivo no la trae.
    if (paquete.config) {
      const actual = leer(CLAVES.config, {});
      escribir(CLAVES.config, {
        ...CONFIG_INICIAL,
        ...paquete.config,
        claveAdmin: actual.claveAdmin || CONFIG_INICIAL.claveAdmin
      });
    }
    if (paquete.productos) escribir(CLAVES.productos, paquete.productos);
    if (paquete.paginas) escribir(CLAVES.paginas, paquete.paginas);
    if (paquete.vistas) escribir(CLAVES.vistas, paquete.vistas);

    for (const [id, dataUrl] of Object.entries(paquete.imagenes || {})) {
      await enDB('readwrite', a => a.put({ id, dataUrl }));
    }
    escribir(CLAVES.version, VERSION_DATOS);
  },

  /** Vuelve al contenido de ejemplo (no borra las fotos guardadas). */
  restablecer () {
    escribir(CLAVES.productos, productosIniciales());
    escribir(CLAVES.paginas, paginasIniciales());
    escribir(CLAVES.config, CONFIG_INICIAL);
    escribir(CLAVES.vistas, { paginas: {}, productos: {} });
  }
};

/* ═══════════ UTILIDADES COMPARTIDAS ═══════════ */

export function formatearPrecio (valor, moneda = 'COP') {
  if (valor === null || valor === undefined || valor === '') return '';
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: moneda, maximumFractionDigits: 0
    }).format(Number(valor));
  } catch {
    return `$ ${Number(valor).toLocaleString('es-CO')}`;
  }
}

/** Arma el enlace de WhatsApp con el mensaje ya escrito. */
export function enlaceWhatsapp (config, texto) {
  const numero = String(config.whatsapp || '').replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
