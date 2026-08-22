/* ═══════════════════════════════════════════════════════════════
   DATA — capa de datos
   ───────────────────────────────────────────────────────────────
   El catálogo vive en Supabase, así que se edita desde cualquier
   dispositivo y los cambios se ven al instante en el link público.

   · Supabase (tabla `revista`) → config, productos y páginas
   · Supabase Storage           → las fotos
   · localStorage               → copia local, para que la revista
                                  abra rápido y aguante sin internet

   El resto del proyecto pide los datos igual que antes: se cargan
   una vez al arrancar y después se leen de memoria.
   ═══════════════════════════════════════════════════════════════ */

import * as Nube from './nube.js';

const CLAVES = {
  copia:  'revista.copiaLocal',   // respaldo por si no hay internet
  deseos: 'revista.deseos'
};

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
 * silueta. Sirve de relleno hasta que subas tus fotos reales.
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

/* ═══════════ UTILIDADES ═══════════ */

function leerLocal (clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : porDefecto;
  } catch { return porDefecto; }
}

function escribirLocal (clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
  catch (e) { console.warn('No se pudo guardar la copia local:', e); return false; }
}

export function nuevoId (prefijo = 'id') {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ═══════════ CONFIGURACIÓN POR DEFECTO ═══════════ */

const CONFIG_INICIAL = {
  marca: 'BY VAL',
  temporada: 'Tejidos con personalidad',
  lema: '¡Ponle color a los días grises!',
  whatsapp: '573017510667',
  mensajeWhatsapp: 'Hola {marca}, me encantó {producto} ({precio}). ¿Está disponible?',
  instagram: '@by____val',
  tiktok: '',
  correo: '',
  horarios: 'Lunes a sábado · 9:00 a 18:00',
  ciudad: 'Hecho en Colombia',
  moneda: 'COP',
  sonidoHoja: 'suave'
};

/* ═══════════ CONTENIDO DE EJEMPLO ═══════════ */

function productosIniciales () {
  const p = (id, nombre, categoria, precio, extra = {}) => ({
    id, nombre, categoria,
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
      larga: 'Punto grueso trabajado a mano, con botones de madera y bolsillos al frente. El azul Blues es de los que levantan un lunes cualquiera.',
      etiqueta: 'Nuevo', stock: 5, tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Blues', hex: '#7BA7D7' }, { nombre: 'Rosa palo', hex: '#F2D8D8' }]
    }),
    p('cardigan-lila', 'Cardigan Lila Pop', 'Cardigans', 265000, {
      corta: 'El mismo punto, en un lila que no pasa desapercibido.',
      larga: 'Mismo tejido del Blues, otro estado de ánimo. Manga amplia y caída suave en los hombros.',
      etiqueta: 'Últimas unidades', stock: 2, tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Lila Pop', hex: '#B79BD8' }]
    }),
    p('capa-huevo', 'Capa Huevo', 'Capas', 298000, {
      corta: 'Forma redonda, sin mangas, se pone encima de todo.',
      larga: 'La favorita de la casa. Forma redonda que abraza sin apretar, pensada para ponerse encima de lo que ya tienes puesto.',
      stock: 4,
      colores: [{ nombre: 'Crudo', hex: '#F2E9E1' }, { nombre: 'Tennis Green', hex: '#4E8A6B' }]
    }),
    p('vestido-blues', 'Vestido Blues', 'Vestidos', 345000, {
      corta: 'Tejido largo con tirante ancho y espalda cerrada.',
      larga: 'Largo hasta la pantorrilla, tirante ancho y espalda cerrada. El punto es más fino que el de los cardigans, así que cae en vez de abultar.',
      stock: 3, tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Blues', hex: '#7BA7D7' }]
    }),
    p('chaleco-yellow', 'Chaleco Yellow Pop', 'Chalecos', 189000, {
      corta: 'Amarillo que se ve desde la otra cuadra.',
      larga: 'Corto, sin mangas y de un amarillo que no pide permiso. El que te pones cuando el día viene gris.',
      etiqueta: 'Oferta', antes: 219000, stock: 7, tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Yellow Pop', hex: '#F2C94C' }]
    }),
    p('saco-tennis', 'Saco Tennis Green', 'Sacos', 289000, {
      corta: 'Cuello alto, punto cerrado, verde profundo.',
      larga: 'Cuello alto que se puede doblar, punto cerrado que abriga de verdad.',
      stock: 5, tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Tennis Green', hex: '#4E8A6B' }, { nombre: 'Gris', hex: '#736666' }]
    }),
    p('top-rosa', 'Top Rosa Palo', 'Tops', 145000, {
      corta: 'Punto fino, tirantes delgados, el básico de la casa.',
      larga: 'Punto fino, tirantes delgados y el rosa palo de la marca. Es la pieza que combina con todas las demás.',
      stock: 9, tallas: ['S', 'M', 'L'],
      colores: [{ nombre: 'Rosa palo', hex: '#F2D8D8' }, { nombre: 'Crudo', hex: '#F2E9E1' }]
    }),
    p('bufanda-larga', 'Bufanda Larga', 'Accesorios', 98000, {
      corta: 'Dos metros de punto para dar dos vueltas.',
      larga: 'Dos metros completos: alcanza para dar dos vueltas y que todavía sobre.',
      stock: 12,
      colores: [{ nombre: 'Lila Pop', hex: '#B79BD8' }, { nombre: 'Yellow Pop', hex: '#F2C94C' }]
    }),
    p('gorro-pop', 'Gorro Pop', 'Accesorios', 72000, {
      corta: 'Ajustado, con vuelta ancha, en los cuatro colores.',
      larga: 'Ajustado pero sin apretar, con vuelta ancha al frente. Está en los cuatro colores de la colección.',
      etiqueta: 'Nuevo', stock: 15,
      colores: [
        { nombre: 'Blues', hex: '#7BA7D7' }, { nombre: 'Lila Pop', hex: '#B79BD8' },
        { nombre: 'Yellow Pop', hex: '#F2C94C' }, { nombre: 'Tennis Green', hex: '#4E8A6B' }
      ]
    }),
    p('falda-punto', 'Falda de Punto', 'Faldas', 215000, {
      corta: 'Midi, cintura elástica, cae recta.',
      larga: 'Midi, con cintura elástica forrada y caída recta. Se lleva con el Top Rosa Palo para un conjunto completo.',
      stock: 6, tallas: ['S', 'M', 'L'],
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
        { id: 'b84', clase: 'texto', texto: 'Una prenda tejida a mano tarda días en salir. Ese tiempo se nota: en el peso, en cómo cae, en que aguanta temporadas enteras sin deformarse.', estilo: 'parrafo', tam: 3, color: 'tinta', alinear: 'left', rotar: 0, x: 11, y: 62, ancho: 40 },
        { id: 'b85', clase: 'texto', texto: 'BY VAL', estilo: 'etiqueta', tam: 1.8, color: 'tinta', alinear: 'left', rotar: 0, x: 11, y: 87, ancho: 30 }
      ]
    },
    { id: 'pg09', tipo: 'producto', seccion: 'Chalecos', producto: 'chaleco-yellow', visible: true },
    { id: 'pg10', tipo: 'producto', seccion: 'Tops', producto: 'top-rosa', visible: true },
    { id: 'pg11', tipo: 'producto', seccion: 'Accesorios', producto: 'bufanda-larga', visible: true },
    { id: 'pg12', tipo: 'contraportada', seccion: 'Gracias', imagen: 'ph:contraportada', visible: true }
  ];
}

/* ═══════════════════════════════════════════════════════════════
   ESTADO EN MEMORIA
   Todo se carga una vez al arrancar; después se lee de aquí, que es
   instantáneo. Cada cambio se manda a la nube.
   ═══════════════════════════════════════════════════════════════ */

const memoria = {
  config: { ...CONFIG_INICIAL },
  productos: [],
  paginas: [],
  vistas: {},
  enLinea: false,       // ¿pudimos hablar con la base?
  motivo: '',           // por qué no, si no
  sello: null           // fecha de la última lectura, para no pisar a nadie
};

export function estadoDeConexion () {
  return { enLinea: memoria.enLinea, motivo: memoria.motivo };
}

/** Deja una copia en el navegador por si la próxima vez no hay internet. */
function guardarCopia () {
  escribirLocal(CLAVES.copia, {
    config: memoria.config, productos: memoria.productos, paginas: memoria.paginas
  });
}

/* ═══════════ API PÚBLICA ═══════════ */

export const Datos = {

  /** Carga el catálogo: la nube primero; si falla, la copia local. */
  async iniciar () {
    try {
      const fila = await Nube.leerRevista();
      memoria.config = { ...CONFIG_INICIAL, ...(fila.config || {}) };
      memoria.productos = fila.productos || [];
      memoria.paginas = fila.paginas || [];
      memoria.sello = fila.actualizado;
      memoria.enLinea = true;

      // Base recién creada: la sembramos con el contenido de ejemplo.
      if (!memoria.productos.length && !memoria.paginas.length) {
        memoria.productos = productosIniciales();
        memoria.paginas = paginasIniciales();
        if (Nube.haySesion()) await this.sincronizar();
      }

      guardarCopia();
    } catch (e) {
      // Sin internet o base caída: seguimos con lo último que vimos.
      memoria.enLinea = false;
      memoria.motivo = e.message || 'Sin conexión';
      const copia = leerLocal(CLAVES.copia, null);
      memoria.config = { ...CONFIG_INICIAL, ...(copia?.config || {}) };
      memoria.productos = copia?.productos || productosIniciales();
      memoria.paginas = copia?.paginas || paginasIniciales();
      console.warn('Revista sin conexión:', memoria.motivo);
    }

    memoria.vistas = memoria.enLinea ? await Nube.leerVistas() : {};
    return this;
  },

  /**
   * Manda el catálogo completo a la base.
   *
   * Viaja con el sello de la última lectura: si otro dispositivo guardó algo
   * mientras tanto, la base rechaza la escritura en vez de borrarle el trabajo
   * al otro. Entonces recargamos y avisamos, que es lo honesto.
   */
  async sincronizar () {
    if (!memoria.enLinea) {
      throw new Error('Sin conexión con la base: el cambio no se guardó.');
    }
    try {
      const fila = await Nube.guardarRevista({
        config: memoria.config,
        productos: memoria.productos,
        paginas: memoria.paginas,
        selloPrevio: memoria.sello
      });
      memoria.sello = fila.actualizado;
      guardarCopia();
    } catch (e) {
      if (e.name === 'ConflictoDeVersion') {
        await this.iniciar();
        throw new Error(
          'Otro dispositivo guardó cambios mientras tenías esto abierto. ' +
          'Recargué el catálogo: revisa y vuelve a hacer tu cambio.'
        );
      }
      throw e;
    }
  },

  /* ── Configuración ── */
  obtenerConfig () { return { ...memoria.config }; },
  async guardarConfig (parcial) {
    memoria.config = { ...memoria.config, ...parcial };
    await this.sincronizar();
    return this.obtenerConfig();
  },

  /* ── Productos ── */
  obtenerProductos () { return memoria.productos; },
  obtenerProducto (id) { return memoria.productos.find(p => p.id === id) || null; },

  async guardarProducto (producto) {
    const i = memoria.productos.findIndex(p => p.id === producto.id);
    if (i >= 0) memoria.productos[i] = producto;
    else memoria.productos.push({ ...producto, id: producto.id || nuevoId('prod') });
    await this.sincronizar();
    return memoria.productos;
  },

  async duplicarProducto (id) {
    const original = this.obtenerProducto(id);
    if (!original) return null;
    const copia = structuredClone(original);
    copia.id = nuevoId('prod');
    copia.nombre = `${original.nombre} (copia)`;
    await this.guardarProducto(copia);
    return copia;
  },

  async eliminarProducto (id) {
    memoria.productos = memoria.productos.filter(p => p.id !== id);
    memoria.paginas = memoria.paginas
      .filter(pg => pg.producto !== id)
      .map(pg => pg.productos ? { ...pg, productos: pg.productos.filter(x => x !== id) } : pg);
    await this.sincronizar();
  },

  /* ── Páginas ── */
  obtenerPaginas () { return memoria.paginas; },
  obtenerPaginasVisibles () { return memoria.paginas.filter(p => p.visible !== false); },
  async guardarPaginas (paginas) {
    memoria.paginas = paginas;
    await this.sincronizar();
    return paginas;
  },

  /* ── Fotos ── */

  /** Sube una foto a Storage y devuelve su identificador. */
  async guardarImagen (dataUrl) {
    const nombre = `${nuevoId('foto')}.jpg`;
    await Nube.subirFoto(dataUrl, nombre);
    return nombre;
  },

  async borrarImagen (id) {
    if (!id || id.startsWith('ph:')) return;
    await Nube.borrarFoto(id);
  },

  /**
   * Dirección lista para un <img>, sea un marcador generado o una foto real.
   * Es síncrona: las fotos ahora son URLs, no hay nada que ir a buscar.
   */
  urlImagen (id, pista = {}) {
    if (!id) return marcadorSVG({ titulo: pista.titulo, semilla: pista.semilla || 'x', variante: pista.variante });
    if (id.startsWith('ph:')) {
      return marcadorSVG({ titulo: pista.titulo, semilla: id.slice(3), variante: pista.variante || 'retrato' });
    }
    if (id.startsWith('http') || id.startsWith('data:')) return id;
    return Nube.urlDeFoto(id);
  },

  /** Mapa de id → URL con todo lo que la revista va a mostrar. */
  async mapaDeImagenes () {
    const mapa = new Map();
    const agregar = (id, pista) => { if (id && !mapa.has(id)) mapa.set(id, this.urlImagen(id, pista)); };

    memoria.paginas.forEach(pg => {
      const variante = pg.tipo === 'editorial' ? 'tela' : 'geo';
      if (pg.imagen) agregar(pg.imagen, { titulo: pg.titulo || '', variante });
      if (pg.fondo?.imagen) agregar(pg.fondo.imagen, { titulo: pg.titulo || '', variante });
      (pg.bloques || []).forEach(b => agregar(b.imagen, { variante }));
    });
    memoria.productos.forEach(pr => {
      (pr.imagenes || []).forEach(im => agregar(im.id, { titulo: pr.nombre, variante: 'retrato' }));
    });

    return mapa;
  },

  /* ── Contador de vistas ── */
  obtenerVistas () {
    const salida = { paginas: {}, productos: {} };
    for (const [clave, cuenta] of Object.entries(memoria.vistas)) {
      const [tipo, id] = clave.split(':');
      if (tipo === 'producto') salida.productos[id] = cuenta;
      else if (tipo === 'pagina') salida.paginas[id] = cuenta;
    }
    return salida;
  },

  registrarVista (tipo, id) {
    if (!id || !memoria.enLinea) return;
    Nube.sumarVista(`${tipo}:${id}`);
  },

  /* ── Lista de deseos (solo en el navegador de la clienta) ── */
  obtenerDeseos () { return leerLocal(CLAVES.deseos, []); },
  alternarDeseo (id) {
    const lista = this.obtenerDeseos();
    const i = lista.indexOf(id);
    if (i >= 0) lista.splice(i, 1); else lista.push(id);
    escribirLocal(CLAVES.deseos, lista);
    return lista;
  },

  /* ── Respaldo ── */
  async exportar () {
    return {
      formato: 'revista-digital',
      version: 4,
      exportado: new Date().toISOString(),
      config: memoria.config,
      productos: memoria.productos,
      paginas: memoria.paginas
    };
  },

  async importar (paquete) {
    if (!paquete || paquete.formato !== 'revista-digital') {
      throw new Error('El archivo no parece un respaldo de la revista.');
    }
    if (paquete.config) memoria.config = { ...CONFIG_INICIAL, ...paquete.config };
    if (paquete.productos) memoria.productos = paquete.productos;
    if (paquete.paginas) memoria.paginas = paquete.paginas;
    await this.sincronizar();
  },

  /** Vuelve al contenido de ejemplo. */
  async restablecer () {
    memoria.config = { ...CONFIG_INICIAL };
    memoria.productos = productosIniciales();
    memoria.paginas = paginasIniciales();
    await this.sincronizar();
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
