/* ═══════════════════════════════════════════════════════════════
   APP — arma la revista y conecta todas las funciones de la clienta
   ═══════════════════════════════════════════════════════════════ */

import { Flipbook, SonidoPapel } from './flipbook.js';
import { Datos, formatearPrecio, enlaceWhatsapp, marcadorSVG } from './data.js';
import { pintarEditorial } from './editorial.js';

/* ── Estado en memoria ──────────────────────────────────────── */
const estado = {
  config: null,
  paginas: [],          // datos de páginas visibles
  productos: new Map(), // id → producto
  imagenes: new Map(),  // id → dataURL
  elementos: [],        // elementos .pagina renderizados
  deseos: new Set(),
  look: new Set(),
  paginaLook: null,
  clicsLogo: 0
};

const $  = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

let flipbook = null;
const sonido = new SonidoPapel();

/* ═══════════════════════════════════════════════════════════════
   ARRANQUE
   ═══════════════════════════════════════════════════════════════ */
async function arrancar () {
  await Datos.iniciar();
  estado.config = Datos.obtenerConfig();
  Datos.obtenerProductos().forEach(p => estado.productos.set(p.id, p));
  estado.paginas = Datos.obtenerPaginasVisibles();
  estado.imagenes = await Datos.mapaDeImagenes();
  estado.deseos = new Set(Datos.obtenerDeseos());

  document.title = `${estado.config.marca} — ${estado.config.temporada}`;
  $('#marcaCabecera').textContent = estado.config.marca;

  construirRevista();
  conectarInterfaz();
  registrarServiceWorker();

  // Fuera pantalla de carga, entra la invitación a abrir el libro.
  await esperarFuentes();
  $('#cargando').classList.add('oculta');
  $('#escena').hidden = false;
  requestAnimationFrame(() => $('#escena').classList.add('visible'));
  setTimeout(() => { $('#cargando').hidden = true; }, 700);

  aplicarEnlaceDirecto();
}

function esperarFuentes () {
  const espera = document.fonts?.ready ?? Promise.resolve();
  return Promise.race([espera, new Promise(r => setTimeout(r, 2500))]);
}

/* ═══════════════════════════════════════════════════════════════
   CONSTRUCCIÓN DE LAS PÁGINAS
   ═══════════════════════════════════════════════════════════════ */
function construirRevista () {
  clonesMiniatura.clear();
  const lista = [...estado.paginas];
  estado.elementos = lista.map((pg, i) => crearPagina(pg, i));
  if (estado.paginaLook) estado.elementos.push(estado.paginaLook);

  if (!flipbook) {
    flipbook = new Flipbook($('#libro'), {
      marco: $('#libroMarco'),
      sonido,
      onCambio: alCambiarPagina
    });
  }
  flipbook.cargar(estado.elementos);

  const rango = $('#rangoPaginas');
  rango.max = String(estado.elementos.length - 1);
}

/** Envoltorio común: filete dorado, sección al margen y número de página. */
function crearPagina (pg, indice) {
  const el = document.createElement('article');
  el.className = 'pagina';
  el.dataset.indice = String(indice);
  el.dataset.id = pg.id;
  el.dataset.tipo = pg.tipo;
  if (indice % 2 === 0) el.classList.add('pagina--par');

  const constructores = {
    portada: paginaPortada,
    indice: paginaIndice,
    editorial: paginaEditorial,
    producto: paginaProducto,
    doble: paginaDoble,
    contraportada: paginaContraportada
  };
  (constructores[pg.tipo] || paginaEditorial)(el, pg, indice);

  const filete = document.createElement('div');
  filete.className = 'pagina__filete';
  const seccion = document.createElement('span');
  seccion.className = 'pagina__seccion';
  seccion.textContent = pg.seccion || '';
  const folio = document.createElement('span');
  folio.className = 'pagina__folio';
  folio.textContent = String(indice + 1);
  el.append(filete, seccion, folio);

  return el;
}

/** Devuelve siempre una imagen usable: la guardada o un marcador generado. */
function imagenDe (id, pista = {}) {
  return estado.imagenes.get(id) || marcadorSVG({
    titulo: pista.titulo || '',
    semilla: id || pista.semilla || 'sin-foto',
    variante: pista.variante || 'retrato'
  });
}

function ponerMedio (el, idImagen, alt) {
  const medio = document.createElement('div');
  medio.className = 'pagina__medio';
  const img = document.createElement('img');
  img.src = imagenDe(idImagen, { titulo: alt, variante: 'tela' });
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  const velo = document.createElement('div');
  velo.className = 'pagina__velo';
  medio.append(img, velo);
  el.append(medio);
  // El velo aclara la foto, así que el texto sigue siendo oscuro sobre pastel.
  el.classList.add('pagina--clara');
  return img;
}

function cuerpo (el, clase = '') {
  const c = document.createElement('div');
  c.className = `pagina__cuerpo ${clase}`.trim();
  el.append(c);
  return c;
}

/* ── 1. Portada ─────────────────────────────────────────────── */
function paginaPortada (el, pg) {
  el.classList.add('portada');
  ponerMedio(el, pg.imagen, `Portada de la revista ${estado.config.marca}`);
  const c = cuerpo(el, 'portada__cuerpo');

  const marca = document.createElement('button');
  marca.className = 'portada__marca';
  marca.id = 'logoPortada';
  marca.textContent = estado.config.marca;
  marca.setAttribute('aria-label', `${estado.config.marca}. Toca cinco veces para una sorpresa`);

  const temporada = document.createElement('p');
  temporada.className = 'portada__temporada';
  temporada.textContent = estado.config.temporada;

  const arriba = document.createElement('div');
  arriba.append(marca, temporada);

  const lema = document.createElement('p');
  lema.className = 'portada__lema';
  lema.textContent = estado.config.lema || '';

  const pie = document.createElement('p');
  pie.className = 'portada__pie';
  pie.textContent = `${estado.paginas.length} páginas · ${estado.config.ciudad || ''}`;

  c.append(arriba, lema, pie);
}

/* ── 2. Índice ──────────────────────────────────────────────── */
function paginaIndice (el, pg) {
  const c = cuerpo(el, 'indice__cuerpo');

  const titulo = document.createElement('h1');
  titulo.className = 'indice__titulo';
  titulo.textContent = pg.titulo || 'Contenido';
  const sub = document.createElement('p');
  sub.className = 'indice__sub';
  sub.textContent = estado.config.temporada;

  const lista = document.createElement('ul');
  lista.className = 'indice__lista';

  entradasDeIndice().forEach(entrada => {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.className = 'indice__fila';
    boton.dataset.saltar = String(entrada.indice);
    boton.innerHTML = `
      <span class="indice__nombre"></span>
      <span class="indice__puntos"></span>
      <span class="indice__num"></span>`;
    $('.indice__nombre', boton).textContent = entrada.titulo;
    $('.indice__num', boton).textContent = String(entrada.indice + 1).padStart(2, '0');
    li.append(boton);
    lista.append(li);
  });

  c.append(titulo, sub, lista);
}

/** Secciones que aparecen en el índice (saltamos portada e índice). */
function entradasDeIndice () {
  return estado.paginas
    .map((pg, indice) => ({ pg, indice }))
    .filter(({ pg }) => !['portada', 'indice'].includes(pg.tipo))
    .map(({ pg, indice }) => ({
      indice,
      titulo: pg.tipo === 'producto'
        ? (estado.productos.get(pg.producto)?.nombre || pg.seccion)
        : (pg.titulo || pg.cita || pg.seccion)
    }));
}

/* ── 3. Editorial ───────────────────────────────────────────── */
function paginaEditorial (el, pg) {
  // Páginas compuestas desde el panel: fondo + bloques colocados a mano.
  if (pg.bloques) {
    pintarEditorial(el, pg, id => imagenDe(id, { variante: 'tela' }));
    return;
  }
  // Formato clásico (cita + texto + firma), por si viene de una revista vieja.
  el.classList.add('editorial');
  ponerMedio(el, pg.imagen, pg.cita || 'Fotografía editorial');
  const c = cuerpo(el, 'editorial__cuerpo');

  const cita = document.createElement('blockquote');
  cita.className = 'editorial__cita';
  cita.textContent = pg.cita || '';

  const texto = document.createElement('p');
  texto.className = 'editorial__texto';
  texto.textContent = pg.texto || '';

  const firma = document.createElement('p');
  firma.className = 'editorial__firma';
  firma.textContent = pg.firma || estado.config.marca;

  c.append(cita, texto, firma);
}

/* ── 4. Producto ────────────────────────────────────────────── */
function paginaProducto (el, pg) {
  const producto = estado.productos.get(pg.producto);
  const c = cuerpo(el, 'producto__cuerpo');

  if (!producto) {
    c.innerHTML = '<p class="producto__desc">Esta página todavía no tiene un producto asignado.</p>';
    return;
  }
  el.dataset.producto = producto.id;

  /* Foto con corazón, etiqueta y lupa */
  const foto = document.createElement('div');
  foto.className = 'producto__foto';
  const img = document.createElement('img');
  const idImg = producto.imagenes?.[producto.principal || 0]?.id;
  const foco = producto.imagenes?.[producto.principal || 0]?.foco || { x: 50, y: 40 };
  img.src = imagenDe(idImg, { titulo: producto.nombre });
  img.alt = `${producto.nombre} — ${producto.descripcionCorta || producto.categoria}`;
  img.style.objectPosition = `${foco.x}% ${foco.y}%`;
  img.loading = 'lazy';
  foto.append(img);

  if (producto.etiqueta) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'producto__etiqueta';
    etiqueta.textContent = producto.etiqueta;
    foto.append(etiqueta);
  }

  const corazon = document.createElement('button');
  corazon.className = 'producto__corazon';
  corazon.dataset.deseo = producto.id;
  corazon.setAttribute('aria-label', `Agregar ${producto.nombre} a favoritos`);
  corazon.setAttribute('aria-pressed', String(estado.deseos.has(producto.id)));
  corazon.classList.toggle('marcado', estado.deseos.has(producto.id));
  corazon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9z"/></svg>';
  foto.append(corazon);

  const lupa = document.createElement('div');
  lupa.className = 'lupa';
  foto.append(lupa);
  conectarLupa(foto, img, lupa);

  /* Ficha */
  const info = document.createElement('div');
  info.className = 'producto__info';
  info.innerHTML = `
    <p class="producto__categoria"></p>
    <h2 class="producto__nombre"></h2>
    <p class="producto__desc"></p>
    <div class="producto__precios">
      <span class="producto__precio"></span>
      <span class="producto__antes"></span>
    </div>
    <div class="producto__opciones"></div>`;

  $('.producto__categoria', info).textContent = producto.categoria || '';
  $('.producto__nombre', info).textContent = producto.nombre;
  $('.producto__desc', info).textContent = producto.descripcionCorta || producto.descripcionLarga || '';
  $('.producto__precio', info).textContent = formatearPrecio(producto.precio, estado.config.moneda);
  const antes = $('.producto__antes', info);
  if (producto.precioAnterior) antes.textContent = formatearPrecio(producto.precioAnterior, estado.config.moneda);
  else antes.remove();

  const opciones = $('.producto__opciones', info);
  if (producto.tallas?.length) {
    const bloque = document.createElement('div');
    bloque.innerHTML = '<span class="opcion__rotulo">Tallas</span><div class="tallas"></div>';
    producto.tallas.forEach(t => {
      const s = document.createElement('span');
      s.className = 'talla';
      s.textContent = t;
      $('.tallas', bloque).append(s);
    });
    opciones.append(bloque);
  }
  if (producto.colores?.length) {
    const bloque = document.createElement('div');
    bloque.innerHTML = '<span class="opcion__rotulo">Colores</span><div class="colores"></div>';
    producto.colores.forEach(col => {
      const s = document.createElement('span');
      s.className = 'color-punto';
      s.style.background = col.hex;
      s.title = col.nombre;
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', `Color ${col.nombre}`);
      $('.colores', bloque).append(s);
    });
    opciones.append(bloque);
  }

  const pedir = document.createElement('a');
  pedir.className = 'boton boton--primario';
  pedir.href = enlaceWhatsapp(estado.config, mensajeDeProducto(producto));
  pedir.target = '_blank';
  pedir.rel = 'noopener';
  pedir.textContent = 'Lo quiero';
  info.append(pedir);

  c.append(foto, info);
}

function mensajeDeProducto (producto) {
  const plantilla = estado.config.mensajeWhatsapp || 'Hola, me interesa {producto} ({precio}).';
  return plantilla
    .replaceAll('{marca}', estado.config.marca)
    .replaceAll('{producto}', producto.nombre)
    .replaceAll('{precio}', formatearPrecio(producto.precio, estado.config.moneda));
}

/** Lupa de aumento al pasar el mouse (solo donde hay puntero fino). */
function conectarLupa (foto, img, lupa) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) { lupa.remove(); return; }
  foto.addEventListener('pointermove', e => {
    const caja = foto.getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    const escala = 2.4;
    lupa.style.backgroundImage = `url("${img.src}")`;
    lupa.style.backgroundSize = `${caja.width * escala}px ${caja.height * escala}px`;
    lupa.style.backgroundPosition = `${-x * escala + lupa.offsetWidth / 2}px ${-y * escala + lupa.offsetHeight / 2}px`;
    lupa.style.left = `${x - lupa.offsetWidth / 2}px`;
    lupa.style.top = `${y - lupa.offsetHeight / 2}px`;
  });
}

/* ── 5. Página doble tipo lookbook ──────────────────────────── */
function paginaDoble (el, pg) {
  const c = cuerpo(el, 'doble__cuerpo');

  const titulo = document.createElement('h2');
  titulo.className = 'doble__titulo';
  titulo.textContent = pg.titulo || 'Colección';
  const sub = document.createElement('p');
  sub.className = 'doble__sub';
  sub.textContent = pg.subtitulo || '';

  const rejilla = document.createElement('div');
  rejilla.className = 'lookbook';

  (pg.productos || []).slice(0, 4).forEach(id => {
    const producto = estado.productos.get(id);
    if (!producto) return;
    const pieza = document.createElement('button');
    pieza.className = 'lookbook__pieza';
    pieza.dataset.irProducto = producto.id;
    const idImg = producto.imagenes?.[producto.principal || 0]?.id;
    pieza.innerHTML = `
      <img alt="" loading="lazy">
      <span class="lookbook__pie">
        <span class="lookbook__nombre"></span>
        <span class="lookbook__precio"></span>
      </span>`;
    const img = $('img', pieza);
    img.src = imagenDe(idImg, { titulo: producto.nombre });
    img.alt = producto.nombre;
    $('.lookbook__nombre', pieza).textContent = producto.nombre;
    $('.lookbook__precio', pieza).textContent = formatearPrecio(producto.precio, estado.config.moneda);
    rejilla.append(pieza);
  });

  c.append(titulo, sub, rejilla);
}

/* ── 6. Contraportada ───────────────────────────────────────── */
function paginaContraportada (el, pg) {
  el.classList.add('contra');
  ponerMedio(el, pg.imagen, 'Contraportada');
  const c = cuerpo(el, 'contra__cuerpo');

  const gracias = document.createElement('p');
  gracias.className = 'contra__gracias';
  gracias.textContent = 'Gracias por mirar.';

  const datos = document.createElement('div');
  datos.className = 'contra__dato';
  datos.innerHTML = '';
  [estado.config.ciudad, estado.config.horarios, estado.config.correo]
    .filter(Boolean)
    .forEach(linea => {
      const p = document.createElement('div');
      p.textContent = linea;
      datos.append(p);
    });

  const redes = document.createElement('div');
  redes.className = 'contra__redes';
  if (estado.config.instagram) {
    const a = document.createElement('a');
    a.className = 'contra__red';
    a.href = `https://instagram.com/${estado.config.instagram.replace('@', '')}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'Instagram';
    redes.append(a);
  }
  if (estado.config.tiktok) {
    const a = document.createElement('a');
    a.className = 'contra__red';
    a.href = `https://tiktok.com/@${estado.config.tiktok.replace('@', '')}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = 'TikTok';
    redes.append(a);
  }

  const escribir = document.createElement('a');
  escribir.className = 'boton boton--fantasma';
  escribir.href = enlaceWhatsapp(estado.config, `Hola ${estado.config.marca}, vengo de la revista.`);
  escribir.target = '_blank'; escribir.rel = 'noopener';
  escribir.textContent = 'Escríbenos por WhatsApp';

  c.append(gracias, datos, redes, escribir);
}

/* ── Página extra: el look armado por la clienta ────────────── */
function crearPaginaLook (ids) {
  const el = document.createElement('article');
  el.className = 'pagina pagina--par';
  el.dataset.tipo = 'look';

  const c = cuerpo(el, 'doble__cuerpo');
  const titulo = document.createElement('h2');
  titulo.className = 'doble__titulo';
  titulo.textContent = 'Tu look';
  const sub = document.createElement('p');
  sub.className = 'doble__sub';
  sub.textContent = `${ids.length} prenda${ids.length === 1 ? '' : 's'} elegidas por ti`;

  const rejilla = document.createElement('div');
  rejilla.className = 'look__rejilla';

  let total = 0;
  ids.forEach(id => {
    const producto = estado.productos.get(id);
    if (!producto) return;
    total += Number(producto.precio) || 0;
    const pieza = document.createElement('figure');
    pieza.className = 'look__pieza';
    const img = document.createElement('img');
    img.src = imagenDe(producto.imagenes?.[producto.principal || 0]?.id, { titulo: producto.nombre });
    img.alt = producto.nombre;
    pieza.append(img);
    rejilla.append(pieza);
  });

  const resumen = document.createElement('div');
  resumen.className = 'look__total';
  resumen.innerHTML = '<span>Total</span>';
  const valor = document.createElement('span');
  valor.textContent = formatearPrecio(total, estado.config.moneda);
  resumen.append(valor);

  const pedir = document.createElement('a');
  pedir.className = 'boton boton--primario';
  pedir.style.marginTop = '1em';
  pedir.href = enlaceWhatsapp(estado.config, mensajeDeLista(ids, 'Este es el look que armé'));
  pedir.target = '_blank'; pedir.rel = 'noopener';
  pedir.textContent = 'Pedir este look';

  c.append(titulo, sub, rejilla, resumen, pedir);

  const filete = document.createElement('div');
  filete.className = 'pagina__filete';
  el.append(filete);
  return el;
}

function mensajeDeLista (ids, encabezado) {
  const lineas = ids
    .map(id => estado.productos.get(id))
    .filter(Boolean)
    .map(p => `· ${p.nombre} — ${formatearPrecio(p.precio, estado.config.moneda)}`);
  const total = ids.reduce((s, id) => s + (Number(estado.productos.get(id)?.precio) || 0), 0);
  return `${encabezado} en la revista de ${estado.config.marca}:\n${lineas.join('\n')}\n\nTotal: ${formatearPrecio(total, estado.config.moneda)}`;
}

/* ═══════════════════════════════════════════════════════════════
   INTERFAZ
   ═══════════════════════════════════════════════════════════════ */
function conectarInterfaz () {
  /* Flechas */
  $('#flechaIzq').addEventListener('click', () => flipbook.anterior());
  $('#flechaDer').addEventListener('click', () => flipbook.siguiente());

  /* Teclado */
  document.addEventListener('keydown', alPulsarTecla);

  /* Clics dentro de las páginas (delegación) */
  $('#libro').addEventListener('click', alClicEnPagina);

  /* Doble clic = zoom */
  $('#libro').addEventListener('dblclick', e => {
    if (e.target.closest('button, a')) return;
    flipbook.alternarZoom(e);
  });
  conectarPellizco();

  /* Barra superior */
  $('#btnBuscar').addEventListener('click', () => abrirModal('#modalBuscar', '#campoBuscar'));
  $('#btnDeseos').addEventListener('click', abrirDeseos);
  $('#btnLook').addEventListener('click', abrirLook);
  $('#btnSonido').addEventListener('click', alternarSonido);
  $('#btnCompartir').addEventListener('click', compartir);
  $('#btnImprimir').addEventListener('click', imprimir);
  $('#btnPantalla').addEventListener('click', pantallaCompleta);
  $('#btnIndice').addEventListener('click', abrirIndice);

  /* Deslizador de páginas + miniaturas */
  conectarDeslizador();

  /* Modales: cerrar con la X, el fondo o Escape */
  $$('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-cerrar]')) cerrarModal(modal);
    });
  });

  /* Buscador */
  $('#campoBuscar').addEventListener('input', e => buscar(e.target.value));

  /* Favoritos y look */
  $('#btnDeseosWhatsapp').addEventListener('click', enviarDeseos);
  $('#btnCrearLook').addEventListener('click', generarLook);

  /* Estado inicial del botón de sonido */
  $('#btnSonido').classList.toggle('mudo', sonido.silenciado);

  /* Abrir el libro con el botón de invitación */
  $('#invitacion').hidden = false;
  $('#btnAbrir').addEventListener('click', abrirRevista);

  /* Al redimensionar, el motor decide si cambia de una a dos páginas */
  window.addEventListener('resize', debounce(() => flipbook.reconstruirSiCambiaModo(), 250));
}

function abrirRevista () {
  sonido.despertar();
  $('#invitacion').hidden = true;
  $('#libro').focus({ preventScroll: true });
  if (flipbook.paginaActual === 0) flipbook.siguiente();
}

/* ── Teclado ────────────────────────────────────────────────── */
function alPulsarTecla (e) {
  const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  const modalAbierto = $$('.modal').find(m => !m.hidden);

  if (e.key === 'Escape') {
    if (modalAbierto) return cerrarModal(modalAbierto);
    if (flipbook.escala > 1) return flipbook.aplicarZoom(1);
  }
  if (enCampo || modalAbierto) return;

  const atajos = {
    ArrowRight: () => flipbook.siguiente(),
    ArrowLeft: () => flipbook.anterior(),
    Home: () => flipbook.irAPagina(0),
    End: () => flipbook.irAPagina(estado.elementos.length - 1),
    b: () => abrirModal('#modalBuscar', '#campoBuscar'),
    f: abrirDeseos,
    l: abrirLook,
    m: alternarSonido,
    p: pantallaCompleta
  };
  const accion = atajos[e.key] || atajos[e.key.toLowerCase()];
  if (accion) { e.preventDefault(); accion(); }
}

/* ── Clics dentro de las páginas ────────────────────────────── */
function alClicEnPagina (e) {
  const saltar = e.target.closest('[data-saltar]');
  if (saltar) return flipbook.irAPagina(Number(saltar.dataset.saltar));

  const irProducto = e.target.closest('[data-ir-producto]');
  if (irProducto) return irAProducto(irProducto.dataset.irProducto);

  const corazon = e.target.closest('[data-deseo]');
  if (corazon) return alternarDeseo(corazon.dataset.deseo, corazon);

  const logo = e.target.closest('#logoPortada');
  if (logo) return contarClicsLogo();
}

/* ── Favoritos ──────────────────────────────────────────────── */
function alternarDeseo (id, boton) {
  const lista = Datos.alternarDeseo(id);
  estado.deseos = new Set(lista);
  const marcado = estado.deseos.has(id);

  $$(`[data-deseo="${id}"]`).forEach(b => {
    b.classList.toggle('marcado', marcado);
    b.setAttribute('aria-pressed', String(marcado));
  });
  if (boton && marcado) { boton.classList.remove('marcado'); void boton.offsetWidth; boton.classList.add('marcado'); }

  actualizarContadorDeseos();
  avisar(marcado ? 'Agregado a tus favoritos' : 'Quitado de tus favoritos', marcado);
}

function actualizarContadorDeseos () {
  const globo = $('#contadorDeseos');
  globo.textContent = String(estado.deseos.size);
  globo.hidden = estado.deseos.size === 0;
}

function abrirDeseos () {
  const lista = $('#listaDeseos');
  lista.textContent = '';
  const ids = [...estado.deseos].filter(id => estado.productos.has(id));

  if (!ids.length) {
    lista.innerHTML = '<li class="vacio">Todavía no has marcado ninguna prenda. Toca el corazón en las páginas de producto.</li>';
    $('#totalDeseos').textContent = '';
  } else {
    let total = 0;
    ids.forEach(id => {
      const p = estado.productos.get(id);
      total += Number(p.precio) || 0;
      const li = document.createElement('li');
      li.innerHTML = '<img alt=""><div><strong></strong><small></small></div><button class="quitar" aria-label="Quitar">&times;</button>';
      const img = $('img', li);
      img.src = imagenDe(p.imagenes?.[p.principal || 0]?.id, { titulo: p.nombre });
      img.alt = p.nombre;
      $('strong', li).textContent = p.nombre;
      $('small', li).textContent = formatearPrecio(p.precio, estado.config.moneda);
      $('.quitar', li).addEventListener('click', () => { alternarDeseo(id); abrirDeseos(); });
      lista.append(li);
    });
    $('#totalDeseos').textContent = `Total: ${formatearPrecio(total, estado.config.moneda)}`;
  }
  abrirModal('#modalDeseos');
}

function enviarDeseos () {
  const ids = [...estado.deseos].filter(id => estado.productos.has(id));
  if (!ids.length) return avisar('Marca al menos una prenda primero');
  window.open(enlaceWhatsapp(estado.config, mensajeDeLista(ids, 'Estos son mis favoritos')), '_blank', 'noopener');
}

/* ── Modo prueba de estilo ──────────────────────────────────── */
function abrirLook () {
  const rejilla = $('#rejillaLook');
  rejilla.textContent = '';

  [...estado.productos.values()].filter(p => p.visible !== false).forEach(p => {
    const boton = document.createElement('button');
    boton.className = 'mini-prenda';
    boton.classList.toggle('elegida', estado.look.has(p.id));
    boton.setAttribute('aria-pressed', String(estado.look.has(p.id)));
    boton.innerHTML = '<img alt=""><span></span>';
    const img = $('img', boton);
    img.src = imagenDe(p.imagenes?.[p.principal || 0]?.id, { titulo: p.nombre });
    img.alt = p.nombre;
    $('span', boton).textContent = p.nombre;
    boton.addEventListener('click', () => {
      estado.look.has(p.id) ? estado.look.delete(p.id) : estado.look.add(p.id);
      boton.classList.toggle('elegida', estado.look.has(p.id));
      boton.setAttribute('aria-pressed', String(estado.look.has(p.id)));
      actualizarTotalLook();
    });
    rejilla.append(boton);
  });

  actualizarTotalLook();
  abrirModal('#modalLook');
}

function actualizarTotalLook () {
  const total = [...estado.look].reduce((s, id) => s + (Number(estado.productos.get(id)?.precio) || 0), 0);
  $('#totalLook').textContent = estado.look.size
    ? `${estado.look.size} prendas · ${formatearPrecio(total, estado.config.moneda)}`
    : 'Ninguna prenda elegida';
}

function generarLook () {
  if (!estado.look.size) return avisar('Elige al menos una prenda');
  estado.paginaLook = crearPaginaLook([...estado.look]);
  cerrarModal($('#modalLook'));
  construirRevista();
  flipbook.irAPagina(estado.elementos.length - 1);
  avisar('Tu look está en la última página', true);
}

/* ── Buscador ───────────────────────────────────────────────── */
function buscar (texto) {
  const lista = $('#resultadosBuscar');
  lista.textContent = '';
  const q = texto.trim().toLowerCase();
  if (q.length < 2) return;

  const encontrados = [];
  estado.paginas.forEach((pg, indice) => {
    const producto = pg.producto ? estado.productos.get(pg.producto) : null;
    const texto = [
      pg.titulo, pg.seccion, pg.cita, pg.subtitulo,
      producto?.nombre, producto?.categoria, producto?.descripcionCorta, producto?.descripcionLarga
    ].filter(Boolean).join(' ').toLowerCase();

    if (texto.includes(q)) {
      encontrados.push({
        indice,
        titulo: producto?.nombre || pg.titulo || pg.seccion,
        detalle: producto ? producto.categoria : pg.tipo,
        imagen: producto ? producto.imagenes?.[producto.principal || 0]?.id : pg.imagen
      });
    }
  });

  if (!encontrados.length) {
    lista.innerHTML = '<li class="vacio">Nada por aquí. Prueba con otra palabra.</li>';
    return;
  }

  encontrados.forEach(r => {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.innerHTML = '<img alt=""><span><strong></strong><small></small></span><span class="num"></span>';
    const img = $('img', boton);
    img.src = imagenDe(r.imagen, { titulo: r.titulo });
    img.alt = '';
    $('strong', boton).textContent = r.titulo;
    $('small', boton).textContent = r.detalle;
    $('.num', boton).textContent = `pág. ${r.indice + 1}`;
    boton.addEventListener('click', () => {
      cerrarModal($('#modalBuscar'));
      flipbook.irAPagina(r.indice);
    });
    li.append(boton);
    lista.append(li);
  });
}

/* ── Índice desde la barra inferior ─────────────────────────── */
function abrirIndice () {
  const lista = $('#listaIndice');
  lista.textContent = '';
  entradasDeIndice().forEach(entrada => {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.innerHTML = '<span><strong></strong></span><span class="num"></span>';
    $('strong', boton).textContent = entrada.titulo;
    $('.num', boton).textContent = `pág. ${entrada.indice + 1}`;
    boton.addEventListener('click', () => {
      cerrarModal($('#modalIndice'));
      flipbook.irAPagina(entrada.indice);
    });
    li.append(boton);
    lista.append(li);
  });
  abrirModal('#modalIndice');
}

function irAProducto (id) {
  const indice = estado.paginas.findIndex(pg => pg.producto === id);
  if (indice >= 0) flipbook.irAPagina(indice);
}

/* ── Deslizador y miniaturas ────────────────────────────────── */
const clonesMiniatura = new Map();

function conectarDeslizador () {
  const rango = $('#rangoPaginas');
  const mini = $('#miniatura');

  rango.addEventListener('input', () => flipbook.irAPagina(Number(rango.value), { instantaneo: true }));

  rango.addEventListener('pointermove', e => {
    const caja = rango.getBoundingClientRect();
    const proporcion = Math.max(0, Math.min(1, (e.clientX - caja.left) / caja.width));
    const indice = Math.round(proporcion * (estado.elementos.length - 1));
    mostrarMiniatura(indice, e.clientX - caja.left);
  });
  rango.addEventListener('pointerleave', () => { mini.hidden = true; });
}

function mostrarMiniatura (indice, x) {
  const mini = $('#miniatura');
  const original = estado.elementos[indice];
  if (!original) return;

  let clon = clonesMiniatura.get(indice);
  if (!clon) {
    const lienzo = document.createElement('div');
    lienzo.className = 'miniatura__lienzo';
    lienzo.style.position = 'relative';
    const copia = original.cloneNode(true);
    copia.removeAttribute('inert');
    copia.setAttribute('aria-hidden', 'true');
    lienzo.append(copia);
    clon = lienzo;
    clonesMiniatura.set(indice, clon);
  }
  mini.textContent = '';
  mini.append(clon);
  mini.style.left = `${x}px`;
  mini.hidden = false;
}

/* ── Cambio de página ───────────────────────────────────────── */
function alCambiarPagina ({ pagina, visibles, total, alInicio, alFinal }) {
  $('#folio').textContent = `${pagina + 1} / ${total}`;
  $('#rangoPaginas').value = String(pagina);
  $('#flechaIzq').disabled = alInicio;
  $('#flechaDer').disabled = alFinal;

  if (!alInicio) $('#invitacion').hidden = true;

  // Contador de vistas: página y producto que se están mirando.
  visibles.forEach(i => {
    const datos = estado.paginas[i];
    if (!datos) return;
    Datos.registrarVista('pagina', datos.id);
    if (datos.producto) Datos.registrarVista('producto', datos.producto);
    (datos.productos || []).forEach(id => Datos.registrarVista('producto', id));
  });

  actualizarContadorDeseos();
  actualizarEnlace(pagina);

}

/** Mantiene ?pagina= en la barra de direcciones para poder compartir. */
function actualizarEnlace (pagina) {
  try {
    const url = new URL(location.href);
    url.searchParams.set('pagina', String(pagina + 1));
    history.replaceState(null, '', url);
  } catch {
    // Abriendo el archivo directo (file://) algunos navegadores no lo permiten.
  }
}

function aplicarEnlaceDirecto () {
  const params = new URLSearchParams(location.search);
  const idProducto = params.get('producto');
  const numero = Number(params.get('pagina'));

  if (idProducto) {
    $('#invitacion').hidden = true;
    return irAProducto(idProducto);
  }
  if (numero > 1) {
    $('#invitacion').hidden = true;
    flipbook.irAPagina(numero - 1);
  }
}

/* ── Compartir ──────────────────────────────────────────────── */
async function compartir () {
  const datos = {
    title: `${estado.config.marca} — ${estado.config.temporada}`,
    text: 'Mira esta revista, está preciosa.',
    url: location.href
  };
  if (navigator.share) {
    try { await navigator.share(datos); } catch { /* la clienta canceló */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(location.href);
    avisar('Enlace copiado', true);
  } catch {
    avisar('Copia el enlace desde la barra del navegador');
  }
}

/* ── Sonido y pantalla completa ─────────────────────────────── */
function alternarSonido () {
  const mudo = sonido.alternarSilencio();
  $('#btnSonido').classList.toggle('mudo', mudo);
  $('#btnSonido').setAttribute('aria-label', mudo ? 'Activar sonido de páginas' : 'Silenciar sonido de páginas');
  if (!mudo) sonido.pasar();
}

function pantallaCompleta () {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
}

/* ── Versión imprimible (Imprimir → Guardar como PDF) ───────── */
function imprimir () {
  const destino = $('#imprimible');
  destino.textContent = '';
  estado.elementos.forEach(pagina => {
    const hoja = document.createElement('div');
    hoja.className = 'hoja-impresa';
    const copia = pagina.cloneNode(true);
    copia.removeAttribute('inert');
    copia.setAttribute('aria-hidden', 'false');
    copia.querySelectorAll('.producto__corazon, .lupa').forEach(n => n.remove());
    hoja.append(copia);
    destino.append(hoja);
  });
  avisar('Elige "Guardar como PDF" en el destino');
  setTimeout(() => window.print(), 400);
}

/* ── Zoom con pellizco ──────────────────────────────────────── */
function conectarPellizco () {
  const punteros = new Map();
  let distanciaInicial = 0;
  let escalaInicial = 1;
  const escenario = $('#escenario');

  escenario.addEventListener('pointerdown', e => punteros.set(e.pointerId, e));
  escenario.addEventListener('pointermove', e => {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, e);
    if (punteros.size !== 2) return;

    const [a, b] = [...punteros.values()];
    const distancia = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!distanciaInicial) { distanciaInicial = distancia; escalaInicial = flipbook.escala; return; }
    flipbook.aplicarZoom(escalaInicial * (distancia / distanciaInicial));
  });
  const soltar = e => {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) distanciaInicial = 0;
  };
  escenario.addEventListener('pointerup', soltar);
  escenario.addEventListener('pointercancel', soltar);
}

/* ── Easter egg: pétalos ────────────────────────────────────── */
function contarClicsLogo () {
  estado.clicsLogo++;
  if (estado.clicsLogo < 5) return;
  estado.clicsLogo = 0;
  lloverPetalos();
}

function lloverPetalos () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const capa = $('#petalos');
  const tonos = ['--rosa-palo', '--rosa-claro', '--lila', '--mantequilla'];

  for (let i = 0; i < 46; i++) {
    const petalo = document.createElement('span');
    petalo.className = 'petalo';
    petalo.style.left = `${Math.random() * 100}%`;
    petalo.style.background = `var(${tonos[i % tonos.length]})`;
    petalo.style.animationDuration = `${2.4 + Math.random() * 1.6}s`;
    petalo.style.animationDelay = `${Math.random() * 0.8}s`;
    petalo.style.transform = `scale(${0.6 + Math.random()})`;
    capa.append(petalo);
  }
  setTimeout(() => { capa.textContent = ''; }, 3600);
}

/* ── Modales y avisos ───────────────────────────────────────── */
let foco = null;

function abrirModal (selector, selectorFoco) {
  const modal = $(selector);
  foco = document.activeElement;
  modal.hidden = false;
  ($(selectorFoco || '.modal__cerrar', modal))?.focus();
}

function cerrarModal (modal) {
  modal.hidden = true;
  foco?.focus?.();
}

function avisar (mensaje, exito = false) {
  const tostada = document.createElement('div');
  tostada.className = `tostada ${exito ? 'tostada--ok' : ''}`.trim();
  tostada.textContent = mensaje;
  $('#tostadas').append(tostada);
  setTimeout(() => tostada.remove(), 2600);
}

/* ── Utilidades ─────────────────────────────────────────────── */
function debounce (fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function registrarServiceWorker () {
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return;   // abriendo el archivo directo no aplica
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ── ¡Arranca! ──────────────────────────────────────────────── */
arrancar().catch(err => {
  console.error(err);
  $('#cargando').innerHTML = '<p class="cargando__texto">No se pudo cargar la revista. Recarga la página.</p>';
});
