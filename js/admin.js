/* ═══════════════════════════════════════════════════════════════
   ADMIN — panel de administración de la revista
   ═══════════════════════════════════════════════════════════════ */

import { Datos, formatearPrecio, nuevoId, marcadorSVG } from './data.js';
import {
  ESTILOS, COLORES, ALINEACIONES, PLANTILLAS,
  bloqueTexto, bloqueFoto, editorialEnBlanco, pintarEditorial
} from './editorial.js';

const $  = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const estado = {
  config: null,
  productos: [],
  paginas: [],
  imagenes: new Map(),      // id → dataURL (caché para no releer IndexedDB)
  productoActual: null,     // copia de trabajo
  paginaActual: null,
  colaRecorte: [],          // fotos pendientes de recortar
  destinoRecorte: 'producto',
  bloqueSel: null           // id del bloque seleccionado en el compositor
};

/* ═══════════════════════════════════════════════════════════════
   ACCESO
   ═══════════════════════════════════════════════════════════════ */
const CLAVE_SESION = 'revista.sesionAdmin';

/**
 * El panel solo tiene sentido en el computador de la tienda.
 * En el sitio publicado no serviría de nada (los cambios se quedarían en el
 * navegador de quien entre, sin tocar el catálogo publicado) y además la
 * contraseña no se puede comprobar contra ningún servidor. Así que ahí no abre.
 */
function esEquipoDeLaTienda () {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '' ||
         /^192\.168\./.test(h) || /^10\./.test(h) ||
         /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

async function arrancar () {
  if (!esEquipoDeLaTienda()) return mostrarSoloLocal();

  await Datos.iniciar();
  estado.config = Datos.obtenerConfig();

  $('#formAcceso').addEventListener('submit', comprobarClave);

  if (sessionStorage.getItem(CLAVE_SESION) === '1') entrar();
}

function mostrarSoloLocal () {
  const caja = $('#formAcceso');
  caja.innerHTML = `
    <h1 class="acceso__titulo">Panel no disponible aquí</h1>
    <p class="acceso__ayuda">
      El panel se usa desde el computador de la tienda, abriendo
      <strong>ABRIR REVISTA.bat</strong> y entrando a
      <code>localhost:5173/admin.html</code>.
    </p>
    <a class="boton boton--primario" href="index.html">Ir a la revista</a>
    <p class="acceso__nota">
      Editar desde aquí no cambiaría el catálogo publicado: los datos viven en
      el navegador de cada quien.
    </p>`;
}

function comprobarClave (e) {
  e.preventDefault();
  const escrita = $('#claveAcceso').value;
  if (escrita === estado.config.claveAdmin) {
    sessionStorage.setItem(CLAVE_SESION, '1');
    entrar();
  } else {
    $('#errorAcceso').hidden = false;
    $('#claveAcceso').value = '';
    $('#claveAcceso').focus();
  }
}

async function entrar () {
  // Este navegador es el de la tienda: manda su localStorage, no el datos.json publicado.
  Datos.marcarComoAdmin();
  $('#acceso').hidden = true;
  $('#panel').hidden = false;
  await cargarTodo();
  conectarPanel();
}

function salir () {
  sessionStorage.removeItem(CLAVE_SESION);
  location.reload();
}

/* ═══════════════════════════════════════════════════════════════
   CARGA DE DATOS
   ═══════════════════════════════════════════════════════════════ */
async function cargarTodo () {
  estado.config = Datos.obtenerConfig();
  estado.productos = Datos.obtenerProductos();
  estado.paginas = Datos.obtenerPaginas();
  estado.imagenes = await Datos.mapaDeImagenes();

  $('#marcaLateral').textContent = estado.config.marca;
  pintarTablero();
  pintarListaProductos();
  pintarListaPaginas();
  pintarAjustes();
  pintarCategorias();
}

function urlDe (id, pista = {}) {
  if (!id) return marcadorSVG({ titulo: pista.titulo, semilla: 'vacio', variante: 'geo' });
  return estado.imagenes.get(id) || marcadorSVG({ titulo: pista.titulo, semilla: id, variante: pista.variante || 'retrato' });
}

/* ═══════════════════════════════════════════════════════════════
   NAVEGACIÓN
   ═══════════════════════════════════════════════════════════════ */
function conectarPanel () {
  $$('.menu__item').forEach(boton => {
    boton.addEventListener('click', () => cambiarVista(boton.dataset.vista));
  });
  $('#btnSalir').addEventListener('click', salir);

  conectarProductos();
  conectarPaginas();
  conectarAjustes();
  conectarRespaldo();
  conectarRecorte();

  $$('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-cerrar]')) modal.hidden = true;
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const abierto = $$('.modal').find(m => !m.hidden);
    if (abierto) abierto.hidden = true;
  });
}

function cambiarVista (nombre) {
  $$('.menu__item').forEach(b => b.classList.toggle('activo', b.dataset.vista === nombre));
  $$('.vista').forEach(v => v.classList.toggle('activa', v.id === `vista-${nombre}`));
}

/* ═══════════════════════════════════════════════════════════════
   RESUMEN
   ═══════════════════════════════════════════════════════════════ */
function pintarTablero () {
  const publicadas = estado.paginas.filter(p => p.visible !== false).length;
  const valorInventario = estado.productos.reduce(
    (s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0
  );
  const sinFoto = estado.productos.filter(
    p => !p.imagenes?.length || p.imagenes.every(i => i.id.startsWith('ph:'))
  ).length;

  const tarjetas = [
    { valor: estado.productos.length, rotulo: 'Prendas en total' },
    { valor: publicadas, rotulo: 'Páginas publicadas' },
    { valor: formatearPrecio(valorInventario, estado.config.moneda), rotulo: 'Valor del inventario' },
    { valor: sinFoto, rotulo: 'Prendas sin foto propia', aviso: sinFoto > 0 }
  ];

  $('#tarjetasResumen').innerHTML = tarjetas.map(t => `
    <div class="tarjeta ${t.aviso ? 'tarjeta--aviso' : ''}">
      <span class="tarjeta__valor">${t.valor}</span>
      <span class="tarjeta__rotulo">${t.rotulo}</span>
    </div>`).join('');

  const vistas = Datos.obtenerVistas();
  pintarRanking('#rankingProductos', vistas.productos, id => estado.productos.find(p => p.id === id)?.nombre);
  pintarRanking('#rankingPaginas', vistas.paginas, id => {
    const pg = estado.paginas.find(p => p.id === id);
    if (!pg) return null;
    const n = estado.paginas.indexOf(pg) + 1;
    return `${n}. ${pg.seccion || pg.tipo}`;
  });
}

function pintarRanking (selector, cuentas, nombrar) {
  const lista = $(selector);
  const filas = Object.entries(cuentas || {})
    .map(([id, n]) => ({ nombre: nombrar(id), n }))
    .filter(f => f.nombre)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);

  lista.innerHTML = filas.length
    ? filas.map(f => `<li><span>${escapar(f.nombre)}</span><span class="cuenta">${f.n} vistas</span></li>`).join('')
    : '<li><span>Todavía no hay visitas registradas.</span></li>';
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCTOS
   ═══════════════════════════════════════════════════════════════ */
function conectarProductos () {
  $('#btnNuevoProducto').addEventListener('click', () => abrirProducto(productoEnBlanco()));
  $('#filtroProductos').addEventListener('input', e => pintarListaProductos(e.target.value));
  $('#formProducto').addEventListener('submit', guardarProducto);
  $('#btnCancelarProducto').addEventListener('click', () => { $('#editorProducto').hidden = true; });
  $('#btnDuplicarProducto').addEventListener('click', duplicarProducto);
  $('#btnBorrarProducto').addEventListener('click', borrarProducto);
  $('#btnAgregarColor').addEventListener('click', agregarColor);

  // Contador en vivo de la descripción breve
  $('#pCorta').addEventListener('input', e => {
    const c = $('#contadorCorta');
    c.textContent = `${e.target.value.length}/90`;
    c.classList.toggle('pasado', e.target.value.length >= 90);
  });

  // Cualquier cambio refresca la vista previa
  $('#formProducto').addEventListener('input', () => {
    recogerFormulario();
    pintarPrevia();
  });

  conectarSoltarFotos();
}

function productoEnBlanco () {
  return {
    id: nuevoId('prod'),
    nombre: '', categoria: '', descripcionCorta: '', descripcionLarga: '',
    precio: 0, precioAnterior: null,
    tallas: ['XS', 'S', 'M', 'L'], colores: [], stock: 0,
    etiqueta: '', visible: true, imagenes: [], principal: 0,
    nuevo: true
  };
}

function pintarListaProductos (filtro = '') {
  const q = filtro.trim().toLowerCase();
  const lista = $('#listaProductos');
  const visibles = estado.productos.filter(p =>
    !q || `${p.nombre} ${p.categoria}`.toLowerCase().includes(q));

  lista.innerHTML = '';
  if (!visibles.length) {
    lista.innerHTML = '<li class="vacio">No hay prendas que coincidan.</li>';
    return;
  }

  visibles.forEach(p => {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.classList.toggle('activo', estado.productoActual?.id === p.id);
    boton.innerHTML = `<img alt=""><span><strong></strong><small></small></span>`;
    $('img', boton).src = urlDe(p.imagenes?.[p.principal || 0]?.id, { titulo: p.nombre });
    $('strong', boton).textContent = p.nombre || 'Sin nombre';
    $('small', boton).textContent = `${p.categoria || 'Sin categoría'} · ${formatearPrecio(p.precio, estado.config.moneda)}`;
    if (p.visible === false) {
      const marca = document.createElement('span');
      marca.className = 'oculto';
      marca.textContent = 'oculto';
      boton.append(marca);
    }
    boton.addEventListener('click', () => abrirProducto(structuredClone(p)));
    li.append(boton);
    lista.append(li);
  });
}

function abrirProducto (producto) {
  estado.productoActual = producto;
  $('#editorProducto').hidden = false;

  $('#pNombre').value = producto.nombre || '';
  $('#pCorta').value = producto.descripcionCorta || '';
  $('#pLarga').value = producto.descripcionLarga || '';
  $('#pPrecio').value = producto.precio ?? '';
  $('#pAntes').value = producto.precioAnterior ?? '';
  $('#pCategoria').value = producto.categoria || '';
  $('#pStock').value = producto.stock ?? 0;
  $('#pTallas').value = (producto.tallas || []).join(', ');
  $('#pEtiqueta').value = producto.etiqueta || '';
  $('#pVisible').checked = producto.visible !== false;
  $('#contadorCorta').textContent = `${(producto.descripcionCorta || '').length}/90`;
  $('#btnBorrarProducto').hidden = !!producto.nuevo;
  $('#btnDuplicarProducto').hidden = !!producto.nuevo;

  pintarColores();
  pintarGaleria();
  pintarPrevia();
  pintarListaProductos($('#filtroProductos').value);
  $('#pNombre').focus();
}

/** Vuelca el formulario dentro de la copia de trabajo. */
function recogerFormulario () {
  const p = estado.productoActual;
  if (!p) return;
  p.nombre = $('#pNombre').value.trim();
  p.descripcionCorta = $('#pCorta').value.trim();
  p.descripcionLarga = $('#pLarga').value.trim();
  p.precio = Number($('#pPrecio').value) || 0;
  p.precioAnterior = $('#pAntes').value ? Number($('#pAntes').value) : null;
  p.categoria = $('#pCategoria').value.trim();
  p.stock = Number($('#pStock').value) || 0;
  p.tallas = $('#pTallas').value.split(',').map(t => t.trim()).filter(Boolean);
  p.etiqueta = $('#pEtiqueta').value;
  p.visible = $('#pVisible').checked;
}

function guardarProducto (e) {
  e.preventDefault();
  recogerFormulario();
  const p = estado.productoActual;
  if (!p.nombre) return avisar('Ponle un nombre a la prenda');

  delete p.nuevo;
  Datos.guardarProducto(structuredClone(p));
  cargarTodo().then(() => {
    abrirProducto(structuredClone(Datos.obtenerProducto(p.id)));
    avisar('Prenda guardada', true);
  });
}

function duplicarProducto () {
  const copia = Datos.duplicarProducto(estado.productoActual.id);
  if (!copia) return;
  cargarTodo().then(() => {
    abrirProducto(structuredClone(copia));
    avisar('Prenda duplicada', true);
  });
}

function borrarProducto () {
  const p = estado.productoActual;
  confirmar(`Se eliminará “${p.nombre}” y saldrá de todas las páginas donde aparece.`, () => {
    Datos.eliminarProducto(p.id);
    estado.productoActual = null;
    $('#editorProducto').hidden = true;
    cargarTodo().then(() => avisar('Prenda eliminada', true));
  });
}

/* ── Colores ── */
function pintarColores () {
  const caja = $('#coloresEditor');
  caja.innerHTML = '';
  (estado.productoActual.colores || []).forEach((color, i) => {
    const ficha = document.createElement('span');
    ficha.className = 'color-ficha';
    ficha.innerHTML = '<i></i><span></span><button type="button" aria-label="Quitar color">&times;</button>';
    $('i', ficha).style.background = color.hex;
    $('span', ficha).textContent = color.nombre;
    $('button', ficha).addEventListener('click', () => {
      estado.productoActual.colores.splice(i, 1);
      pintarColores(); pintarPrevia();
    });
    caja.append(ficha);
  });
}

function agregarColor () {
  const nombre = $('#colorNombre').value.trim() || 'Color';
  const hex = $('#colorHex').value;
  estado.productoActual.colores = estado.productoActual.colores || [];
  estado.productoActual.colores.push({ nombre, hex });
  $('#colorNombre').value = '';
  pintarColores();
  pintarPrevia();
}

/* ── Galería de fotos ── */
function pintarGaleria () {
  const galeria = $('#galeriaFotos');
  galeria.innerHTML = '';
  const p = estado.productoActual;

  (p.imagenes || []).forEach((imagen, i) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.indice = String(i);
    li.classList.toggle('principal', i === (p.principal || 0));

    li.innerHTML = `
      <img alt="Foto ${i + 1} de ${escapar(p.nombre || 'la prenda')}" title="Toca sobre la foto para fijar el punto focal">
      <span class="marca-principal" ${i === (p.principal || 0) ? '' : 'hidden'}>Principal</span>
      <span class="punto-foco"></span>
      <div class="herramientas">
        <button type="button" data-accion="principal">Principal</button>
        <button type="button" data-accion="borrar">Quitar</button>
      </div>`;

    const img = $('img', li);
    img.src = urlDe(imagen.id, { titulo: p.nombre });

    // Punto focal visible sobre la miniatura
    const punto = $('.punto-foco', li);
    const foco = imagen.foco || { x: 50, y: 50 };
    Object.assign(punto.style, {
      position: 'absolute', width: '12px', height: '12px', borderRadius: '50%',
      border: '2px solid var(--papel)', background: 'var(--acento)',
      transform: 'translate(-50%,-50%)', pointerEvents: 'none',
      left: `${foco.x}%`, top: `${foco.y}%`
    });

    // Clic sobre la foto = mover el punto focal
    img.addEventListener('click', ev => {
      const caja = img.getBoundingClientRect();
      imagen.foco = {
        x: Math.round(((ev.clientX - caja.left) / caja.width) * 100),
        y: Math.round(((ev.clientY - caja.top) / caja.height) * 100)
      };
      pintarGaleria();
      pintarPrevia();
    });

    $('[data-accion="principal"]', li).addEventListener('click', () => {
      p.principal = i;
      pintarGaleria(); pintarPrevia();
    });
    $('[data-accion="borrar"]', li).addEventListener('click', () => {
      confirmar('¿Quitar esta foto de la prenda?', async () => {
        const [quitada] = p.imagenes.splice(i, 1);
        if (quitada && !quitada.id.startsWith('ph:')) await Datos.borrarImagen(quitada.id);
        if (p.principal >= p.imagenes.length) p.principal = 0;
        pintarGaleria(); pintarPrevia();
      });
    });

    galeria.append(li);
  });

  conectarArrastreGaleria(galeria);
}

/** Reordenar fotos arrastrando. */
function conectarArrastreGaleria (galeria) {
  let origen = null;
  galeria.addEventListener('dragstart', e => {
    origen = Number(e.target.closest('li')?.dataset.indice);
    e.target.closest('li')?.classList.add('arrastrando');
  });
  galeria.addEventListener('dragend', e => e.target.closest('li')?.classList.remove('arrastrando'));
  galeria.addEventListener('dragover', e => e.preventDefault());
  galeria.addEventListener('drop', e => {
    e.preventDefault();
    const destino = Number(e.target.closest('li')?.dataset.indice);
    if (Number.isNaN(origen) || Number.isNaN(destino) || origen === destino) return;
    const p = estado.productoActual;
    const principalId = p.imagenes[p.principal || 0]?.id;
    const [movida] = p.imagenes.splice(origen, 1);
    p.imagenes.splice(destino, 0, movida);
    p.principal = Math.max(0, p.imagenes.findIndex(i => i.id === principalId));
    pintarGaleria(); pintarPrevia();
  });
}

/* ── Vista previa en vivo ── */
function pintarPrevia () {
  const p = estado.productoActual;
  const caja = $('#previaProducto');
  caja.innerHTML = '';
  if (!p) return;

  const pagina = document.createElement('article');
  pagina.className = 'pagina pagina--par';
  pagina.innerHTML = `
    <div class="pagina__cuerpo producto__cuerpo">
      <div class="producto__foto"><img alt=""></div>
      <div class="producto__info">
        <p class="producto__categoria"></p>
        <h2 class="producto__nombre"></h2>
        <p class="producto__desc"></p>
        <div class="producto__precios">
          <span class="producto__precio"></span>
          <span class="producto__antes"></span>
        </div>
        <div class="producto__opciones"></div>
        <span class="boton boton--primario">Lo quiero</span>
      </div>
    </div>
    <div class="pagina__filete"></div>
    <span class="pagina__seccion"></span>
    <span class="pagina__folio"></span>`;

  const imagen = p.imagenes?.[p.principal || 0];
  const img = $('.producto__foto img', pagina);
  img.src = urlDe(imagen?.id, { titulo: p.nombre });
  img.alt = p.nombre || '';
  const foco = imagen?.foco || { x: 50, y: 40 };
  img.style.objectPosition = `${foco.x}% ${foco.y}%`;

  if (p.etiqueta) {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'producto__etiqueta';
    etiqueta.textContent = p.etiqueta;
    $('.producto__foto', pagina).append(etiqueta);
  }

  $('.producto__categoria', pagina).textContent = p.categoria || '';
  $('.producto__nombre', pagina).textContent = p.nombre || 'Nombre de la prenda';
  $('.producto__desc', pagina).textContent = p.descripcionCorta || p.descripcionLarga || '';
  $('.producto__precio', pagina).textContent = formatearPrecio(p.precio, estado.config.moneda);
  $('.producto__antes', pagina).textContent = p.precioAnterior
    ? formatearPrecio(p.precioAnterior, estado.config.moneda) : '';
  $('.pagina__seccion', pagina).textContent = p.categoria || '';
  $('.pagina__folio', pagina).textContent = '00';

  const opciones = $('.producto__opciones', pagina);
  if (p.tallas?.length) {
    const bloque = document.createElement('div');
    bloque.innerHTML = `<span class="opcion__rotulo">Tallas</span>
      <div class="tallas">${p.tallas.map(t => `<span class="talla">${escapar(t)}</span>`).join('')}</div>`;
    opciones.append(bloque);
  }
  if (p.colores?.length) {
    const bloque = document.createElement('div');
    bloque.innerHTML = '<span class="opcion__rotulo">Colores</span><div class="colores"></div>';
    p.colores.forEach(c => {
      const punto = document.createElement('span');
      punto.className = 'color-punto';
      punto.style.background = c.hex;
      $('.colores', bloque).append(punto);
    });
    opciones.append(bloque);
  }

  caja.append(pagina);
}

function pintarCategorias () {
  const lista = [...new Set(estado.productos.map(p => p.categoria).filter(Boolean))];
  $('#categorias').innerHTML = lista.map(c => `<option value="${escapar(c)}">`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   FOTOS: soltar, comprimir y recortar
   ═══════════════════════════════════════════════════════════════ */
function conectarSoltarFotos () {
  prepararZona($('#zonaSoltar'), $('#archivoFotos'), archivos => {
    if (!estado.productoActual) return avisar('Abre o crea una prenda primero');
    estado.destinoRecorte = 'producto';
    encolarRecortes(archivos);
  });

  prepararZona($('#zonaSoltarPagina'), $('#archivoPagina'), archivos => {
    if (!estado.paginaActual) return avisar('Elige una página primero');
    estado.destinoRecorte = 'pagina';
    encolarRecortes(archivos.slice(0, 1));
  });
}

function prepararZona (zona, entrada, alRecibir) {
  if (!zona) return;
  zona.addEventListener('click', () => entrada.click());
  zona.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrada.click(); }
  });
  entrada.addEventListener('change', () => {
    alRecibir([...entrada.files]);
    entrada.value = '';
  });
  ['dragenter', 'dragover'].forEach(ev =>
    zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach(ev =>
    zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('encima'); }));
  zona.addEventListener('drop', e => {
    const archivos = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
    if (archivos.length) alRecibir(archivos);
  });
}

function encolarRecortes (archivos) {
  estado.colaRecorte.push(...archivos);
  if (estado.colaRecorte.length === archivos.length) siguienteRecorte();
}

async function siguienteRecorte () {
  const archivo = estado.colaRecorte[0];
  if (!archivo) return;
  const url = await leerArchivo(archivo);
  abrirRecorte(url, estado.colaRecorte.length);
}

function leerArchivo (archivo) {
  return new Promise((ok, mal) => {
    const lector = new FileReader();
    lector.onload = () => ok(lector.result);
    lector.onerror = mal;
    lector.readAsDataURL(archivo);
  });
}

/* ── Recortador 3:4 con punto focal por arrastre ── */
const recorte = { img: null, natural: { w: 0, h: 0 }, marco: { w: 0, h: 0 }, escala: 1, base: 1, x: 0, y: 0 };

function conectarRecorte () {
  const marco = $('#marcoRecorte');
  const zoom = $('#zoomRecorte');

  zoom.addEventListener('input', () => {
    const centroX = (recorte.marco.w / 2 - recorte.x) / (recorte.natural.w * recorte.escala);
    const centroY = (recorte.marco.h / 2 - recorte.y) / (recorte.natural.h * recorte.escala);
    recorte.escala = recorte.base * (Number(zoom.value) / 100);
    recorte.x = recorte.marco.w / 2 - centroX * recorte.natural.w * recorte.escala;
    recorte.y = recorte.marco.h / 2 - centroY * recorte.natural.h * recorte.escala;
    colocarRecorte();
  });

  let arrastrando = null;
  marco.addEventListener('pointerdown', e => {
    arrastrando = { x: e.clientX - recorte.x, y: e.clientY - recorte.y };
    marco.classList.add('moviendo');
    marco.setPointerCapture(e.pointerId);
  });
  marco.addEventListener('pointermove', e => {
    if (!arrastrando) return;
    recorte.x = e.clientX - arrastrando.x;
    recorte.y = e.clientY - arrastrando.y;
    colocarRecorte();
  });
  const soltar = () => { arrastrando = null; marco.classList.remove('moviendo'); };
  marco.addEventListener('pointerup', soltar);
  marco.addEventListener('pointercancel', soltar);

  $('#btnAplicarRecorte').addEventListener('click', aplicarRecorte);
  $('#modalRecorte').addEventListener('click', e => {
    if (e.target.closest('[data-cerrar]') || e.target.id === 'modalRecorte') cancelarRecorte();
  });
}

function abrirRecorte (dataUrl, pendientes) {
  const modal = $('#modalRecorte');
  const img = $('#imgRecorte');
  modal.hidden = false;
  $('#infoRecorte').textContent = pendientes > 1 ? `Quedan ${pendientes} fotos` : '';

  img.onload = () => {
    const marco = $('#marcoRecorte').getBoundingClientRect();
    recorte.img = img;
    recorte.natural = { w: img.naturalWidth, h: img.naturalHeight };
    recorte.marco = { w: marco.width, h: marco.height };
    // Escala mínima para que la foto cubra el marco 3:4 sin huecos.
    recorte.base = Math.max(marco.width / img.naturalWidth, marco.height / img.naturalHeight);
    recorte.escala = recorte.base;
    recorte.x = (marco.width - img.naturalWidth * recorte.escala) / 2;
    recorte.y = (marco.height - img.naturalHeight * recorte.escala) / 2;
    $('#zoomRecorte').value = '100';

    Object.assign(img.style, { position: 'absolute', objectFit: 'unset' });
    colocarRecorte();
  };
  img.src = dataUrl;
}

function colocarRecorte () {
  const { img, natural, escala, marco } = recorte;
  if (!img) return;
  const ancho = natural.w * escala;
  const alto = natural.h * escala;
  // Nunca dejamos que se vean bordes vacíos.
  recorte.x = Math.min(0, Math.max(marco.w - ancho, recorte.x));
  recorte.y = Math.min(0, Math.max(marco.h - alto, recorte.y));
  Object.assign(img.style, {
    width: `${ancho}px`, height: `${alto}px`,
    left: `${recorte.x}px`, top: `${recorte.y}px`
  });
}

/** Dibuja el recorte visible en un canvas de 1200×1600 (máximo 1600 px). */
async function aplicarRecorte () {
  const { img, escala, marco } = recorte;
  if (!img) return;

  const sx = -recorte.x / escala;
  const sy = -recorte.y / escala;
  const sw = marco.w / escala;
  const sh = marco.h / escala;

  const ANCHO = 1200, ALTO = 1600;      // 3:4 con el lado largo en 1600 px
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ANCHO, ALTO);

  const dataUrl = lienzo.toDataURL('image/jpeg', 0.82);
  const id = await Datos.guardarImagen(dataUrl);
  estado.imagenes.set(id, dataUrl);

  if (estado.destinoRecorte === 'producto') {
    const p = estado.productoActual;
    p.imagenes = p.imagenes || [];
    p.imagenes.push({ id, foco: { x: 50, y: 40 } });
    pintarGaleria();
    pintarPrevia();
  } else if (estado.destinoRecorte === 'bloque') {
    const b = bloqueActivo();
    if (b) b.imagen = id;
    pintarLienzo();
  } else if (estado.paginaActual?.tipo === 'editorial') {
    // Foto de fondo de una página editorial compuesta
    estado.paginaActual.fondo = estado.paginaActual.fondo || {};
    estado.paginaActual.fondo.imagen = id;
    if (!estado.paginaActual.fondo.velo) estado.paginaActual.fondo.velo = 50;
    pintarLienzo();
    pintarPreviaFondoPagina();
  } else {
    estado.paginaActual.imagen = id;
    pintarPreviaFondoPagina();
  }

  estado.colaRecorte.shift();
  $('#modalRecorte').hidden = true;
  avisar('Foto lista', true);
  if (estado.colaRecorte.length) setTimeout(siguienteRecorte, 200);
}

function cancelarRecorte () {
  estado.colaRecorte = [];
  $('#modalRecorte').hidden = true;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTRUCTOR DE LA REVISTA
   ═══════════════════════════════════════════════════════════════ */
const ETIQUETAS_TIPO = {
  portada: 'Portada', indice: 'Índice', editorial: 'Editorial',
  producto: 'Producto', doble: 'Lookbook', contraportada: 'Contraportada'
};

function conectarPaginas () {
  $('#btnAgregarPagina').addEventListener('click', agregarPagina);
  $('#btnGuardarPagina').addEventListener('click', guardarPagina);
  $('#btnCerrarPagina').addEventListener('click', () => { $('#editorPagina').hidden = true; });
  conectarCompositor();
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSITOR EDITORIAL
   El lienzo pinta la página con el MISMO código que la revista, y
   encima le pone el arrastre y la selección. Lo que ves es lo que hay.
   ═══════════════════════════════════════════════════════════════ */

function paginaEnEdicion () { return estado.paginaActual; }
function bloques () { return paginaEnEdicion()?.bloques || []; }
function bloqueActivo () { return bloques().find(b => b.id === estado.bloqueSel) || null; }

function conectarCompositor () {
  // Rellenamos los desplegables una sola vez.
  $('#plantillaPagina').innerHTML = '<option value="">Empezar desde una plantilla…</option>' +
    Object.entries(PLANTILLAS).map(([id, p]) => `<option value="${id}">${p.nombre}</option>`).join('');
  $('#fondoColor').innerHTML = COLORES.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  $('#bqEstilo').innerHTML = Object.entries(ESTILOS).map(([id, e]) => `<option value="${id}">${e.nombre}</option>`).join('');
  $('#bqColor').innerHTML = COLORES.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  $('#bqAlinear').innerHTML = ALINEACIONES.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');

  $('#plantillaPagina').addEventListener('change', aplicarPlantilla);
  $('#btnAgregarTexto').addEventListener('click', () => agregarBloque(bloqueTexto()));
  $('#btnAgregarFoto').addEventListener('click', () => agregarBloque(bloqueFoto()));

  $('#fondoColor').addEventListener('change', e => {
    paginaEnEdicion().fondo.color = e.target.value;
    pintarLienzo();
  });
  $('#fondoVelo').addEventListener('input', e => {
    paginaEnEdicion().fondo.velo = Number(e.target.value);
    pintarLienzo();
  });

  // Controles del bloque seleccionado
  const alCambiar = (selector, campo, transformar = v => v) => {
    $(selector).addEventListener('input', e => {
      const b = bloqueActivo();
      if (!b) return;
      b[campo] = transformar(e.target.value);
      pintarLienzo();
      refrescarValores();
    });
  };
  alCambiar('#bqTexto', 'texto');
  alCambiar('#bqColor', 'color');
  alCambiar('#bqAlinear', 'alinear');
  alCambiar('#bqTam', 'tam', Number);
  alCambiar('#bqAncho', 'ancho', Number);
  alCambiar('#bqAlto', 'alto', Number);
  alCambiar('#bqRotar', 'rotar', Number);

  $('#bqEstilo').addEventListener('change', e => {
    const b = bloqueActivo();
    if (!b) return;
    b.estilo = e.target.value;
    b.tam = ESTILOS[b.estilo].tam;     // cada estilo trae su tamaño natural
    $('#bqTam').value = String(b.tam);
    pintarLienzo();
    refrescarValores();
  });
  $('#bqRedondo').addEventListener('change', e => {
    const b = bloqueActivo();
    if (!b) return;
    b.redondo = e.target.checked;
    pintarLienzo();
  });

  $('#btnBloqueBorrar').addEventListener('click', () => {
    const b = bloqueActivo();
    if (!b) return;
    confirmar('¿Quitar este bloque de la página?', () => {
      paginaEnEdicion().bloques = bloques().filter(x => x.id !== b.id);
      estado.bloqueSel = null;
      pintarLienzo();
    });
  });
  $('#btnBloqueCopiar').addEventListener('click', () => {
    const b = bloqueActivo();
    if (!b) return;
    const copia = structuredClone(b);
    copia.id = nuevoId('bq');
    copia.x = Math.min(90, b.x + 4);
    copia.y = Math.min(90, b.y + 4);
    agregarBloque(copia);
  });
  $('#btnBloqueFrente').addEventListener('click', () => moverEnPila(1));
  $('#btnBloqueAtras').addEventListener('click', () => moverEnPila(-1));

  prepararZona($('#zonaSoltarBloque'), $('#archivoBloque'), archivos => {
    if (!bloqueActivo()) return avisar('Elige primero un bloque de foto');
    estado.destinoRecorte = 'bloque';
    encolarRecortes(archivos.slice(0, 1));
  });

  // Suprimir borra el bloque seleccionado
  $('#lienzoEditor').addEventListener('keydown', e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && bloqueActivo()) {
      e.preventDefault();
      $('#btnBloqueBorrar').click();
    }
  });
}

function moverEnPila (direccion) {
  const lista = paginaEnEdicion().bloques;
  const i = lista.findIndex(b => b.id === estado.bloqueSel);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  pintarLienzo();
}

function agregarBloque (bloque) {
  const pg = paginaEnEdicion();
  pg.bloques = pg.bloques || [];
  pg.bloques.push(bloque);
  estado.bloqueSel = bloque.id;
  pintarLienzo();
}

function aplicarPlantilla (e) {
  const clave = e.target.value;
  e.target.value = '';
  if (!clave) return;
  confirmar('La plantilla reemplaza lo que hay en esta página. ¿Seguimos?', () => {
    const nueva = PLANTILLAS[clave].crear();
    const pg = paginaEnEdicion();
    pg.fondo = nueva.fondo;
    pg.bloques = nueva.bloques;
    estado.bloqueSel = null;
    pintarLienzo();
    avisar('Plantilla aplicada', true);
  });
}

/* ── Pintado del lienzo ── */
function pintarLienzo () {
  const pg = paginaEnEdicion();
  const lienzo = $('#lienzoEditor');
  lienzo.textContent = '';
  if (!pg || pg.tipo !== 'editorial') return;

  pg.fondo = pg.fondo || editorialEnBlanco().fondo;
  pg.bloques = pg.bloques || [];

  const pagina = document.createElement('article');
  pagina.className = 'pagina pagina--par';
  pintarEditorial(pagina, pg, id => urlDe(id, { variante: 'tela' }));

  const filete = document.createElement('div');
  filete.className = 'pagina__filete';
  pagina.append(filete);
  lienzo.append(pagina);

  // Marcamos el seleccionado y colgamos el arrastre en cada bloque.
  $$('.eb', pagina).forEach(nodo => {
    const bloque = pg.bloques.find(b => b.id === nodo.dataset.bloque);
    if (!bloque) return;
    nodo.classList.add('eb--editable');
    if (bloque.id === estado.bloqueSel) {
      nodo.classList.add('eb--sel');
      const asa = document.createElement('span');
      asa.className = 'eb__asa';
      asa.dataset.asa = '1';
      nodo.append(asa);
    }
    conectarArrastreBloque(nodo, bloque);
  });

  // Tocar el fondo (no un bloque) deselecciona.
  pagina.addEventListener('pointerdown', e => {
    if (e.target.closest('.eb')) return;
    estado.bloqueSel = null;
    pintarLienzo();
  });

  if ($('#fondoColor') !== document.activeElement) $('#fondoColor').value = pg.fondo.color || 'papel';
  if ($('#fondoVelo') !== document.activeElement) $('#fondoVelo').value = String(pg.fondo.velo || 0);
  refrescarInspector();
}

function conectarArrastreBloque (nodo, bloque) {
  nodo.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    const lienzo = $('#lienzoEditor').getBoundingClientRect();
    const redimensionando = e.target.dataset.asa === '1';
    const inicio = {
      x: e.clientX, y: e.clientY,
      bx: bloque.x, by: bloque.y,
      ancho: bloque.ancho, alto: bloque.alto
    };
    let movido = false;
    nodo.setPointerCapture(e.pointerId);

    const mover = ev => {
      const dx = ((ev.clientX - inicio.x) / lienzo.width) * 100;
      const dy = ((ev.clientY - inicio.y) / lienzo.height) * 100;
      if (Math.abs(ev.clientX - inicio.x) > 3 || Math.abs(ev.clientY - inicio.y) > 3) movido = true;

      if (redimensionando) {
        bloque.ancho = Math.max(5, Math.min(100, inicio.ancho + dx));
        nodo.style.width = `${bloque.ancho}%`;
        if (bloque.clase === 'foto') {
          bloque.alto = Math.max(5, Math.min(100, inicio.alto + dy));
          nodo.style.height = `${bloque.alto}%`;
        }
      } else {
        bloque.x = Math.max(-10, Math.min(100, inicio.bx + dx));
        bloque.y = Math.max(-10, Math.min(100, inicio.by + dy));
        nodo.style.left = `${bloque.x}%`;
        nodo.style.top = `${bloque.y}%`;
      }
    };

    const soltar = ev => {
      nodo.removeEventListener('pointermove', mover);
      nodo.removeEventListener('pointerup', soltar);
      nodo.removeEventListener('pointercancel', soltar);

      // Un clic sin arrastre selecciona; si ya estaba elegido y es foto, fija el foco.
      if (!movido) {
        if (bloque.clase === 'foto' && estado.bloqueSel === bloque.id) {
          const caja = nodo.getBoundingClientRect();
          bloque.foco = {
            x: Math.round(((ev.clientX - caja.left) / caja.width) * 100),
            y: Math.round(((ev.clientY - caja.top) / caja.height) * 100)
          };
          avisar('Punto de la foto ajustado');
        }
        estado.bloqueSel = bloque.id;
      }
      pintarLienzo();
    };

    nodo.addEventListener('pointermove', mover);
    nodo.addEventListener('pointerup', soltar);
    nodo.addEventListener('pointercancel', soltar);
  });
}

/* ── Inspector del bloque seleccionado ── */
function refrescarInspector () {
  const b = bloqueActivo();
  const inspector = $('#inspector');
  inspector.hidden = !b;
  if (!b) return;

  $('#inspectorTitulo').textContent = b.clase === 'foto' ? 'Foto' : 'Texto';
  $$('[data-bloque]', inspector).forEach(caja => { caja.hidden = caja.dataset.bloque !== b.clase; });

  // No pisamos el control que la persona está usando: le movería el cursor.
  const poner = (selector, valor) => {
    const campo = $(selector);
    if (campo !== document.activeElement) campo.value = String(valor);
  };

  if (b.clase === 'texto') {
    poner('#bqTexto', b.texto);
    poner('#bqEstilo', b.estilo);
    poner('#bqColor', b.color);
    poner('#bqAlinear', b.alinear);
    poner('#bqTam', b.tam);
  } else {
    $('#bqRedondo').checked = !!b.redondo;
    poner('#bqAlto', b.alto);
  }
  poner('#bqAncho', b.ancho);
  poner('#bqRotar', b.rotar || 0);
  refrescarValores();
}

function refrescarValores () {
  const b = bloqueActivo();
  if (!b) return;
  $('#valTam').textContent = b.clase === 'texto' ? `${b.tam}` : '';
  $('#valAncho').textContent = `${Math.round(b.ancho)}%`;
  $('#valAlto').textContent = b.clase === 'foto' ? `${Math.round(b.alto)}%` : '';
  $('#valRotar').textContent = `${b.rotar || 0}°`;
}

function pintarListaPaginas () {
  const lista = $('#listaPaginas');
  lista.innerHTML = '';

  estado.paginas.forEach((pg, i) => {
    const li = document.createElement('li');
    li.className = 'pagina-ficha';
    li.draggable = true;
    li.dataset.indice = String(i);
    li.classList.toggle('despublicada', pg.visible === false);
    li.classList.toggle('seleccionada', estado.paginaActual?.id === pg.id);

    li.innerHTML = `
      <span class="pagina-ficha__asa" aria-hidden="true">⠿</span>
      <span class="pagina-ficha__num">${i + 1}</span>
      <span class="pagina-ficha__datos"><strong></strong><small></small></span>
      <span class="pagina-ficha__tipo"></span>
      <span class="pagina-ficha__acciones">
        <button type="button" data-accion="subir" title="Subir" aria-label="Subir página">↑</button>
        <button type="button" data-accion="bajar" title="Bajar" aria-label="Bajar página">↓</button>
        <button type="button" data-accion="duplicar" title="Duplicar" aria-label="Duplicar página">⧉</button>
        <button type="button" data-accion="borrar" title="Eliminar" aria-label="Eliminar página">🗑</button>
      </span>`;

    $('strong', li).textContent = tituloDePagina(pg);
    $('small', li).textContent = pg.seccion || '';
    $('.pagina-ficha__tipo', li).textContent = ETIQUETAS_TIPO[pg.tipo] || pg.tipo;

    li.addEventListener('click', e => {
      if (e.target.closest('[data-accion]')) return;
      abrirPagina(pg);
    });
    $('[data-accion="subir"]', li).addEventListener('click', () => moverPagina(i, -1));
    $('[data-accion="bajar"]', li).addEventListener('click', () => moverPagina(i, 1));
    $('[data-accion="duplicar"]', li).addEventListener('click', () => duplicarPagina(i));
    $('[data-accion="borrar"]', li).addEventListener('click', () => borrarPagina(i));

    lista.append(li);
  });

  conectarArrastrePaginas(lista);
}

function tituloDePagina (pg) {
  if (pg.tipo === 'producto') {
    return estado.productos.find(p => p.id === pg.producto)?.nombre || 'Sin prenda asignada';
  }
  if (pg.bloques?.length) {
    // El titular más grande de la página es el mejor nombre para la lista.
    const textos = pg.bloques.filter(b => b.clase === 'texto' && b.texto);
    const principal = textos.sort((a, b) => b.tam - a.tam)[0];
    if (principal) return principal.texto.replace(/\n/g, ' ').slice(0, 48);
  }
  return pg.titulo || pg.cita || ETIQUETAS_TIPO[pg.tipo] || pg.tipo;
}

function conectarArrastrePaginas (lista) {
  let origen = null;
  lista.addEventListener('dragstart', e => {
    const ficha = e.target.closest('.pagina-ficha');
    if (!ficha) return;
    origen = Number(ficha.dataset.indice);
    ficha.classList.add('arrastrando');
    e.dataTransfer.effectAllowed = 'move';
  });
  lista.addEventListener('dragend', e => {
    e.target.closest('.pagina-ficha')?.classList.remove('arrastrando');
    $$('.pagina-ficha', lista).forEach(f => f.classList.remove('encima'));
  });
  lista.addEventListener('dragover', e => {
    e.preventDefault();
    const ficha = e.target.closest('.pagina-ficha');
    $$('.pagina-ficha', lista).forEach(f => f.classList.toggle('encima', f === ficha));
  });
  lista.addEventListener('drop', e => {
    e.preventDefault();
    const destino = Number(e.target.closest('.pagina-ficha')?.dataset.indice);
    if (origen === null || Number.isNaN(destino) || origen === destino) return;
    const [movida] = estado.paginas.splice(origen, 1);
    estado.paginas.splice(destino, 0, movida);
    Datos.guardarPaginas(estado.paginas);
    pintarListaPaginas();
    pintarTablero();
    avisar('Orden actualizado', true);
  });
}

function moverPagina (indice, delta) {
  const destino = indice + delta;
  if (destino < 0 || destino >= estado.paginas.length) return;
  const [movida] = estado.paginas.splice(indice, 1);
  estado.paginas.splice(destino, 0, movida);
  Datos.guardarPaginas(estado.paginas);
  pintarListaPaginas();
}

function agregarPagina () {
  const tipo = $('#tipoNuevaPagina').value;
  const nueva = {
    id: nuevoId('pg'),
    tipo,
    seccion: ETIQUETAS_TIPO[tipo],
    titulo: '', visible: true
  };
  if (tipo === 'doble') nueva.productos = [];
  if (tipo === 'producto') nueva.producto = estado.productos[0]?.id || '';
  if (tipo === 'editorial') Object.assign(nueva, editorialEnBlanco());

  estado.paginas.push(nueva);
  Datos.guardarPaginas(estado.paginas);
  pintarListaPaginas();
  pintarTablero();
  abrirPagina(nueva);
  avisar('Página agregada', true);
}

function duplicarPagina (indice) {
  const copia = structuredClone(estado.paginas[indice]);
  copia.id = nuevoId('pg');
  estado.paginas.splice(indice + 1, 0, copia);
  Datos.guardarPaginas(estado.paginas);
  pintarListaPaginas();
  pintarTablero();
  avisar('Página duplicada', true);
}

function borrarPagina (indice) {
  const pg = estado.paginas[indice];
  confirmar(`Se eliminará la página ${indice + 1} (${ETIQUETAS_TIPO[pg.tipo] || pg.tipo}).`, () => {
    estado.paginas.splice(indice, 1);
    Datos.guardarPaginas(estado.paginas);
    if (estado.paginaActual?.id === pg.id) {
      estado.paginaActual = null;
      $('#editorPagina').hidden = true;
    }
    pintarListaPaginas();
    pintarTablero();
    avisar('Página eliminada', true);
  });
}

function abrirPagina (pg) {
  estado.paginaActual = structuredClone(pg);
  const editor = $('#editorPagina');
  editor.hidden = false;
  $('#tituloEditorPagina').textContent = `${ETIQUETAS_TIPO[pg.tipo] || pg.tipo} · página ${estado.paginas.indexOf(pg) + 1}`;

  // Mostramos solo los campos que tienen sentido para este tipo de página.
  $$('[data-solo]', editor).forEach(fila => {
    fila.hidden = !fila.dataset.solo.split(' ').includes(pg.tipo);
  });

  $('#pgSeccion').value = pg.seccion || '';
  $('#pgTitulo').value = pg.titulo || '';
  $('#pgSubtitulo').value = pg.subtitulo || '';
  $('#pgCita').value = pg.cita || '';
  $('#pgTexto').value = pg.texto || '';
  $('#pgFirma').value = pg.firma || '';
  $('#pgVisible').checked = pg.visible !== false;

  $('#pgProducto').innerHTML = estado.productos
    .map(p => `<option value="${p.id}" ${p.id === pg.producto ? 'selected' : ''}>${escapar(p.nombre)}</option>`)
    .join('');

  $('#pgProductos').innerHTML = estado.productos.map(p => `
    <label>
      <input type="checkbox" value="${p.id}" ${(pg.productos || []).includes(p.id) ? 'checked' : ''}>
      <span>${escapar(p.nombre)}</span>
    </label>`).join('');

  // Las páginas editoriales se componen con bloques; si vienen del formato
  // viejo (cita + texto + firma), las convertimos sin perder lo escrito.
  if (pg.tipo === 'editorial') {
    if (!estado.paginaActual.bloques) convertirEditorialClasica(estado.paginaActual);
    estado.bloqueSel = null;
    pintarLienzo();
  }

  pintarPreviaFondoPagina();
  pintarListaPaginas();
}

/** Pasa una página editorial del formato antiguo al compositor. */
function convertirEditorialClasica (pg) {
  const base = editorialEnBlanco();
  pg.fondo = { ...base.fondo, imagen: pg.imagen || null, velo: pg.imagen ? 50 : 0, color: pg.imagen ? 'tinta' : 'rosa-palo' };
  const claro = !!pg.imagen;
  pg.bloques = [];
  if (pg.cita) {
    pg.bloques.push(bloqueTexto({
      texto: pg.cita, estilo: 'display', tam: 13,
      color: claro ? 'papel' : 'tinta', x: 9, y: 42, ancho: 74
    }));
  }
  if (pg.texto) {
    pg.bloques.push(bloqueTexto({
      texto: pg.texto, estilo: 'parrafo', tam: 3,
      color: claro ? 'papel' : 'tinta', x: 9, y: 76, ancho: 52
    }));
  }
  if (pg.firma) {
    pg.bloques.push(bloqueTexto({
      texto: pg.firma, estilo: 'etiqueta', tam: 1.8,
      color: claro ? 'papel' : 'gris-marca', x: 9, y: 90, ancho: 40
    }));
  }
  if (!pg.bloques.length) pg.bloques = base.bloques;
}

function pintarPreviaFondoPagina () {
  const caja = $('#previaFondoPagina');
  const pg = estado.paginaActual;
  const id = pg?.tipo === 'editorial' ? pg?.fondo?.imagen : pg?.imagen;
  caja.innerHTML = id ? '<img alt="Foto de fondo de la página">' : '';
  if (id) $('img', caja).src = urlDe(id, { variante: 'tela' });
}

function guardarPagina () {
  const pg = estado.paginaActual;
  if (!pg) return;

  pg.seccion = $('#pgSeccion').value.trim();
  pg.titulo = $('#pgTitulo').value.trim();
  pg.subtitulo = $('#pgSubtitulo').value.trim();
  pg.visible = $('#pgVisible').checked;
  // Las editoriales compuestas guardan fondo + bloques; los campos viejos sobran.
  if (pg.tipo === 'editorial' && pg.bloques) {
    delete pg.cita; delete pg.texto; delete pg.firma; delete pg.imagen;
  }
  if (pg.tipo === 'producto') pg.producto = $('#pgProducto').value;
  if (pg.tipo === 'doble') {
    pg.productos = $$('#pgProductos input:checked').map(i => i.value).slice(0, 4);
  }

  const i = estado.paginas.findIndex(p => p.id === pg.id);
  if (i >= 0) estado.paginas[i] = pg;
  Datos.guardarPaginas(estado.paginas);
  cargarTodo().then(() => avisar('Página guardada', true));
}

/* ═══════════════════════════════════════════════════════════════
   AJUSTES
   ═══════════════════════════════════════════════════════════════ */
function conectarAjustes () {
  $('#formAjustes').addEventListener('submit', guardarAjustes);
}

function pintarAjustes () {
  const c = estado.config;
  $('#cMarca').value = c.marca || '';
  $('#cTemporada').value = c.temporada || '';
  $('#cLema').value = c.lema || '';
  $('#cWhatsapp').value = c.whatsapp || '';
  $('#cCorreo').value = c.correo || '';
  $('#cMensaje').value = c.mensajeWhatsapp || '';
  $('#cInstagram').value = c.instagram || '';
  $('#cTiktok').value = c.tiktok || '';
  $('#cCiudad').value = c.ciudad || '';
  $('#cHorarios').value = c.horarios || '';
  $('#cMoneda').value = c.moneda || 'COP';
}

function guardarAjustes (e) {
  e.preventDefault();
  const clave1 = $('#cClave1').value;
  const clave2 = $('#cClave2').value;
  if (clave1 && clave1 !== clave2) return avisar('Las dos contraseñas no coinciden');

  const parcial = {
    marca: $('#cMarca').value.trim(),
    temporada: $('#cTemporada').value.trim(),
    lema: $('#cLema').value.trim(),
    whatsapp: $('#cWhatsapp').value.replace(/\D/g, ''),
    correo: $('#cCorreo').value.trim(),
    mensajeWhatsapp: $('#cMensaje').value.trim(),
    instagram: $('#cInstagram').value.trim(),
    tiktok: $('#cTiktok').value.trim(),
    ciudad: $('#cCiudad').value.trim(),
    horarios: $('#cHorarios').value.trim(),
    moneda: $('#cMoneda').value
  };
  if (clave1) parcial.claveAdmin = clave1;

  Datos.guardarConfig(parcial);
  $('#cClave1').value = '';
  $('#cClave2').value = '';
  cargarTodo().then(() => avisar(clave1 ? 'Ajustes y contraseña guardados' : 'Ajustes guardados', true));
}

/* ═══════════════════════════════════════════════════════════════
   RESPALDO
   ═══════════════════════════════════════════════════════════════ */
function conectarRespaldo () {
  $('#btnPublicar').addEventListener('click', publicar);
  $('#btnExportar').addEventListener('click', exportar);
  $('#btnImportar').addEventListener('click', () => $('#archivoImportar').click());
  $('#archivoImportar').addEventListener('change', importar);
  $('#btnRestablecer').addEventListener('click', () => {
    confirmar('Se borrarán tus productos y páginas y volverá el contenido de ejemplo.', async () => {
      Datos.restablecer();
      await cargarTodo();
      avisar('Revista restablecida', true);
    });
  });
}

/** Descarga el archivo que hay que subir con la revista para publicarla. */
async function publicar () {
  const paquete = await Datos.exportar();
  const texto = JSON.stringify(paquete);
  descargarJSON(texto, 'datos.json');

  const megas = (new Blob([texto]).size / 1024 / 1024).toFixed(1);
  $('#pesoPublicar').textContent =
    `Listo: datos.json pesa ${megas} MB (las fotos van adentro). ` +
    'Ponlo junto a index.html y vuelve a subir la carpeta.' +
    (megas > 8 ? ' Va pesadito: si tarda en abrir, sube menos fotos por prenda.' : '');
  avisar('datos.json descargado', true);
}

async function exportar () {
  const paquete = await Datos.exportar();
  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `revista-${estado.config.marca.toLowerCase().replace(/\s+/g, '-')}-${fecha}.json`;
  descargarJSON(JSON.stringify(paquete, null, 2), nombre);
  avisar('Respaldo descargado', true);
}

function descargarJSON (texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

async function importar (e) {
  const archivo = e.target.files?.[0];
  e.target.value = '';
  if (!archivo) return;

  try {
    const paquete = JSON.parse(await archivo.text());
    confirmar('El contenido actual será reemplazado por el del respaldo.', async () => {
      await Datos.importar(paquete);
      await cargarTodo();
      avisar('Respaldo importado', true);
    });
  } catch (err) {
    console.error(err);
    avisar('No pude leer el archivo. ¿Es un respaldo de la revista?');
  }
}

/* ═══════════════════════════════════════════════════════════════
   MODALES Y AVISOS
   ═══════════════════════════════════════════════════════════════ */
let alConfirmar = null;

function confirmar (texto, accion) {
  $('#textoConfirmar').textContent = texto;
  $('#modalConfirmar').hidden = false;
  alConfirmar = accion;
  $('#btnSi').focus();
}

$('#btnSi').addEventListener('click', () => {
  $('#modalConfirmar').hidden = true;
  alConfirmar?.();
  alConfirmar = null;
});
$('#btnNo').addEventListener('click', () => {
  $('#modalConfirmar').hidden = true;
  alConfirmar = null;
});

function avisar (mensaje, exito = false) {
  const tostada = document.createElement('div');
  tostada.className = `tostada ${exito ? 'tostada--ok' : ''}`.trim();
  tostada.textContent = mensaje;
  $('#tostadas').append(tostada);
  setTimeout(() => tostada.remove(), 2600);
}

function escapar (texto) {
  return String(texto ?? '').replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── ¡Arranca! ── */
arrancar().catch(err => {
  console.error(err);
  avisar('Algo salió mal al abrir el panel');
});
