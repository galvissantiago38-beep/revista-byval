/* ═══════════════════════════════════════════════════════════════
   FLIPBOOK — motor de paso de páginas escrito a mano (sin librerías)
   ───────────────────────────────────────────────────────────────
   Modelo: la revista son HOJAS. Cada hoja tiene dos caras.
     · Escritorio (modo "doble"): hoja k = página 2k (frente) + 2k+1 (reverso).
       Se ven dos páginas a la vez, como una revista abierta.
     · Móvil (modo "simple"): hoja k = página k. Se ve una sola página.
   El giro es rotateY sobre el borde izquierdo de la hoja, con una
   sombra dinámica impulsada por la variable animable --p (0 → 1).
   ═══════════════════════════════════════════════════════════════ */

/* ── Sonido de hoja generado con WebAudio (ruido filtrado) ───────── */
export class SonidoPapel {
  constructor () {
    this.silenciado = localStorage.getItem('revista.mudo') === '1';
    this.ctx = null;
    this.ruido = null;
  }

  /** El contexto de audio solo puede crearse tras un gesto del usuario. */
  despertar () {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.ruido = this.#crearRuido();
  }

  #crearRuido () {
    const segundos = 0.5;
    const largo = Math.floor(this.ctx.sampleRate * segundos);
    const buffer = this.ctx.createBuffer(1, largo, this.ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    // Ruido rosado aproximado: suena a papel, no a estática de radio.
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < largo; i++) {
      const blanco = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + blanco * 0.0990460;
      b1 = 0.96300 * b1 + blanco * 0.2965164;
      b2 = 0.57000 * b2 + blanco * 1.0526913;
      datos[i] = (b0 + b1 + b2 + blanco * 0.1848) * 0.22;
    }
    return buffer;
  }

  alternarSilencio () {
    this.silenciado = !this.silenciado;
    localStorage.setItem('revista.mudo', this.silenciado ? '1' : '0');
    return this.silenciado;
  }

  /** Un roce corto de papel: barrido de filtro + envolvente rápida. */
  pasar () {
    if (this.silenciado) return;
    this.despertar();
    if (!this.ctx || !this.ruido) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = this.ruido;
    fuente.playbackRate.value = 0.9 + Math.random() * 0.3;

    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 0.8;
    filtro.frequency.setValueAtTime(900, t);
    filtro.frequency.exponentialRampToValueAtTime(3400, t + 0.18);
    filtro.frequency.exponentialRampToValueAtTime(1200, t + 0.42);

    const volumen = this.ctx.createGain();
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.24, t + 0.045);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    fuente.connect(filtro).connect(volumen).connect(this.ctx.destination);
    fuente.start(t);
    fuente.stop(t + 0.45);
  }
}

/* ── El motor ───────────────────────────────────────────────────── */
export class Flipbook {
  /**
   * @param {HTMLElement} contenedor  el div .libro
   * @param {Object} opciones  { onCambio, sonido, marco }
   */
  constructor (contenedor, opciones = {}) {
    this.libro = contenedor;
    this.marco = opciones.marco || contenedor.parentElement;
    this.onCambio = opciones.onCambio || (() => {});
    this.sonido = opciones.sonido || null;

    this.paginas = [];      // elementos .pagina en orden
    this.hojas = [];        // elementos .hoja construidos
    this.hoja = 0;          // cuántas hojas están pasadas
    this.animando = false;
    this.arrastre = null;
    this.escala = 1;

    this.reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducido) document.documentElement.classList.add('sin-movimiento');

    this.mqMovil = window.matchMedia('(max-width: 820px)');
    this.modo = this.#calcularModo();

    this.#conectarEventos();
  }

  /* ── Estado público ─────────────────────────────────────────── */
  get totalPaginas () { return this.paginas.length; }
  get totalHojas ()   { return this.hojas.length; }

  /**
   * Cuántas hojas se pueden llegar a pasar.
   * En doble se pasan todas (queda la contraportada abierta a la izquierda);
   * en una sola página la última no se pasa, porque detrás no hay nada.
   */
  get hojaMaxima () {
    return this.modo === 'simple' ? Math.max(0, this.hojas.length - 1) : this.hojas.length;
  }

  /** Índice (0-based) de la página que se está viendo (la izquierda del pliego). */
  get paginaActual () {
    if (this.modo === 'simple') return Math.min(this.hoja, this.totalPaginas - 1);
    if (this.hoja === 0) return 0;
    return Math.min(this.hoja * 2 - 1, this.totalPaginas - 1);
  }

  /** Las páginas visibles ahora mismo (una o dos). */
  get paginasVisibles () {
    if (this.modo === 'simple') return [this.hoja];
    if (this.hoja === 0) return [0];
    if (this.hoja >= this.totalHojas) return [this.totalPaginas - 1];
    return [this.hoja * 2 - 1, this.hoja * 2];
  }

  #calcularModo () {
    // Con movimiento reducido usamos una sola página: el desvanecido se ve mejor.
    return (this.mqMovil.matches || this.reducido) ? 'simple' : 'doble';
  }

  /* ── Construcción ───────────────────────────────────────────── */

  /** Recibe los elementos .pagina ya renderizados y arma las hojas. */
  cargar (paginas) {
    this.paginas = paginas;
    this.#construir();
    this.irAPagina(0, { instantaneo: true });
  }

  #construir () {
    this.libro.textContent = '';
    this.hojas = [];
    this.libro.classList.toggle('simple', this.modo === 'simple');

    const total = this.paginas.length;
    const cantidadHojas = this.modo === 'simple' ? total : Math.ceil(total / 2);

    for (let k = 0; k < cantidadHojas; k++) {
      const hoja = document.createElement('div');
      hoja.className = 'hoja';
      hoja.dataset.hoja = String(k);

      const iFrente = this.modo === 'simple' ? k : k * 2;
      const iReverso = this.modo === 'simple' ? -1 : k * 2 + 1;

      hoja.append(
        this.#crearCara('frente', this.paginas[iFrente]),
        this.#crearCara('reverso', iReverso >= 0 ? this.paginas[iReverso] : null)
      );
      this.libro.append(hoja);
      this.hojas.push(hoja);
    }
    this.#ordenarCapas();
  }

  #crearCara (lado, pagina) {
    const cara = document.createElement('div');
    cara.className = `cara cara--${lado}`;
    if (pagina) {
      cara.append(pagina);
    } else {
      const vacia = document.createElement('div');
      vacia.className = 'pagina pagina--vacia';
      cara.append(vacia);
    }
    const brillo = document.createElement('div');
    brillo.className = 'hoja__brillo';
    cara.append(brillo);
    return cara;
  }

  /** Rehace la maquetación si cambia el modo (rotar el móvil, redimensionar). */
  reconstruirSiCambiaModo () {
    const nuevo = this.#calcularModo();
    if (nuevo === this.modo) return false;
    const paginaVisible = this.paginaActual;
    this.modo = nuevo;
    this.#construir();
    this.irAPagina(paginaVisible, { instantaneo: true });
    return true;
  }

  /* ── Capas, visibilidad y accesibilidad ─────────────────────── */
  #ordenarCapas () {
    const n = this.hojas.length;
    this.hojas.forEach((hoja, i) => {
      // Una hoja en pleno giro conserva su altura de pila: si la bajáramos
      // ahora, se metería por detrás de las que todavía no se han pasado.
      if (hoja.classList.contains('animando') || hoja.classList.contains('arrastrando')) return;

      const pasada = i < this.hoja;
      hoja.classList.toggle('pasada', pasada);
      // Las pasadas se apilan a la izquierda; las pendientes, a la derecha.
      hoja.style.zIndex = String(pasada ? i + 1 : n - i);

      // En una sola página no hay "lado izquierdo" donde apoyar las hojas ya
      // pasadas: las retiramos justo al terminar el giro.
      hoja.style.visibility = (this.modo === 'simple' && pasada) ? 'hidden' : 'visible';
    });
    this.#marcarVisibles();
    this.libro.classList.toggle('cerrado', this.modo === 'doble' && this.hoja === 0);
    this.libro.classList.toggle('terminado', this.modo === 'doble' && this.hoja >= n);
  }

  #marcarVisibles () {
    const visibles = new Set(this.paginasVisibles);
    this.paginas.forEach((pagina, i) => {
      const oculta = !visibles.has(i);
      pagina.toggleAttribute('inert', oculta);
      pagina.setAttribute('aria-hidden', oculta ? 'true' : 'false');
    });
  }

  /* ── Navegación ─────────────────────────────────────────────── */

  siguiente () { return this.#girar(1); }
  anterior ()  { return this.#girar(-1); }

  #girar (direccion) {
    if (this.animando) return false;
    if (direccion > 0 && this.hoja >= this.hojaMaxima) return false;
    const indice = direccion > 0 ? this.hoja : this.hoja - 1;
    const hoja = this.hojas[indice];
    if (!hoja) return false;

    this.animando = true;
    hoja.classList.add('animando');
    hoja.style.zIndex = String(this.hojas.length + 2);
    hoja.style.visibility = 'visible';
    this.hoja += direccion;
    if (this.sonido) this.sonido.pasar();

    hoja.classList.toggle('pasada', direccion > 0);
    this.libro.classList.toggle('cerrado', this.modo === 'doble' && this.hoja === 0);
    this.libro.classList.toggle('terminado', this.modo === 'doble' && this.hoja >= this.hojas.length);

    this.#alTerminarGiro(hoja, () => {
      hoja.classList.remove('animando');
      this.animando = false;
      this.#ordenarCapas();
      this.#avisar();
      this.#precargarVecinos();
    });
    return true;
  }

  /** Espera el fin de la transición con red de seguridad por si no dispara. */
  #alTerminarGiro (hoja, hecho) {
    let listo = false;
    const fin = (ev) => {
      if (ev && ev.target !== hoja) return;
      if (listo) return;
      listo = true;
      hoja.removeEventListener('transitionend', fin);
      hecho();
    };
    hoja.addEventListener('transitionend', fin);
    setTimeout(fin, this.#duracion() + 120);
  }

  #duracion () {
    const v = getComputedStyle(this.libro).getPropertyValue('--dur-hoja').trim();
    return this.reducido ? 60 : (parseFloat(v) || 800);
  }

  /**
   * Salta a una página. Por defecto pasa las hojas intermedias en cadena,
   * que es lo que hace que un clic en el índice se sienta a revista de verdad.
   */
  irAPagina (numero, opciones = {}) {
    const destino = this.#hojaDePagina(numero);
    return this.irAHoja(destino, opciones);
  }

  #hojaDePagina (numero) {
    const n = Math.max(0, Math.min(numero, this.totalPaginas - 1));
    if (this.modo === 'simple') return n;
    return n === 0 ? 0 : Math.ceil(n / 2);
  }

  irAHoja (destino, { instantaneo = false } = {}) {
    destino = Math.max(0, Math.min(destino, this.hojaMaxima));
    if (destino === this.hoja && !instantaneo) { this.#avisar(); return; }

    if (instantaneo || this.reducido) {
      this.hoja = destino;
      this.animando = false;
      this.arrastre = null;
      const antes = this.libro.style.transition;
      this.libro.style.transition = 'none';
      this.hojas.forEach(h => {
        h.classList.remove('animando', 'arrastrando');
        h.style.transform = '';
        h.style.removeProperty('--p');
        h.style.transition = 'none';
      });
      this.#ordenarCapas();
      // Forzamos un reflow para que el "sin transición" se aplique de verdad.
      void this.libro.offsetWidth;
      this.libro.style.transition = antes;
      this.hojas.forEach(h => { h.style.transition = ''; });
      this.#avisar();
      this.#precargarVecinos();
      return;
    }

    // Cadena de hojas: cada una arranca antes de que termine la anterior.
    const direccion = destino > this.hoja ? 1 : -1;
    const saltos = Math.abs(destino - this.hoja);
    const rapido = saltos > 1;
    if (rapido) this.libro.style.setProperty('--dur-hoja', '520ms');

    let hechos = 0;
    const paso = () => {
      if (hechos >= saltos) {
        // Esperamos a que la última hoja termine antes de devolver la duración
        // normal; si no, el giro en curso pegaría un salto.
        if (rapido) setTimeout(() => this.libro.style.removeProperty('--dur-hoja'), 620);
        return;
      }
      this.animando = false;           // permitimos encadenar sin esperar el final
      this.#girar(direccion);
      hechos++;
      setTimeout(paso, rapido ? 150 : this.#duracion());
    };
    paso();
  }

  /* ── Precarga: nunca mostrar una hoja en blanco ─────────────── */
  #precargarVecinos () {
    const objetivo = [];
    const base = this.modo === 'simple' ? this.hoja : this.hoja * 2;
    for (let i = base; i <= base + 4; i++) if (this.paginas[i]) objetivo.push(this.paginas[i]);
    for (let i = base - 2; i < base; i++) if (this.paginas[i]) objetivo.push(this.paginas[i]);

    objetivo.forEach(pagina => {
      pagina.querySelectorAll('img').forEach(img => {
        img.loading = 'eager';
        if (img.decode) img.decode().catch(() => {});
      });
    });
  }

  #avisar () {
    this.onCambio({
      pagina: this.paginaActual,
      visibles: this.paginasVisibles,
      total: this.totalPaginas,
      alInicio: this.hoja === 0,
      alFinal: this.hoja >= this.hojaMaxima
    });
  }

  /* ── Arrastrar para pasar ───────────────────────────────────── */
  #conectarEventos () {
    this.libro.addEventListener('pointerdown', e => this.#alPresionar(e));
    window.addEventListener('pointermove', e => this.#alMover(e));
    window.addEventListener('pointerup', e => this.#alSoltar(e));
    window.addEventListener('pointercancel', e => this.#alSoltar(e));

    // Rueda del mouse, con freno para no pasar 10 hojas de un tirón.
    let ultimaRueda = 0;
    this.marco.addEventListener('wheel', e => {
      if (this.escala > 1) return;          // con zoom la rueda no pasa páginas
      const ahora = performance.now();
      if (ahora - ultimaRueda < 700) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 12) return;
      ultimaRueda = ahora;
      delta > 0 ? this.siguiente() : this.anterior();
    }, { passive: true });

    this.mqMovil.addEventListener('change', () => this.reconstruirSiCambiaModo());
  }

  #anchoPagina () {
    const ancho = this.libro.getBoundingClientRect().width;
    return this.modo === 'doble' ? ancho / 2 : ancho;
  }

  #alPresionar (e) {
    if (this.animando || this.escala > 1) return;
    if (e.target.closest('button, a, input, .producto__corazon')) return;
    if (this.reducido) return;

    const caja = this.libro.getBoundingClientRect();
    const relativo = e.clientX - caja.left;
    const mitad = caja.width / 2;

    // En doble: mitad derecha avanza, mitad izquierda retrocede.
    // En simple: los últimos/primeros 45% del ancho deciden la dirección.
    const haciaAdelante = this.modo === 'doble'
      ? relativo > mitad
      : relativo > caja.width * 0.35;

    if (haciaAdelante && this.hoja >= this.hojaMaxima) return;
    const indice = haciaAdelante ? this.hoja : this.hoja - 1;
    const hoja = this.hojas[indice];
    if (!hoja) return;

    this.arrastre = {
      hoja, indice, haciaAdelante,
      inicioX: e.clientX,
      inicioY: e.clientY,
      ancho: this.#anchoPagina(),
      activo: false,
      punteroId: e.pointerId
    };
  }

  #alMover (e) {
    const a = this.arrastre;
    if (!a || e.pointerId !== a.punteroId) return;

    const dx = e.clientX - a.inicioX;
    const dy = e.clientY - a.inicioY;

    // Solo tomamos el control si el gesto es claramente horizontal.
    if (!a.activo) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      a.activo = true;
      a.hoja.classList.add('arrastrando', 'animando');
      a.hoja.style.zIndex = String(this.hojas.length + 2);
      a.hoja.style.visibility = 'visible';
      this.libro.setPointerCapture?.(e.pointerId);
    }

    const avance = a.haciaAdelante ? -dx / a.ancho : 1 - (dx / a.ancho);
    a.progreso = Math.max(0, Math.min(1, avance));
    a.hoja.style.transform = `rotateY(${-180 * a.progreso}deg)`;
    a.hoja.style.setProperty('--p', String(a.progreso));
  }

  #alSoltar (e) {
    const a = this.arrastre;
    if (!a) return;
    this.arrastre = null;
    if (!a.activo) return;
    if (e && e.pointerId !== a.punteroId) return;

    const progreso = a.progreso ?? (a.haciaAdelante ? 0 : 1);
    const completa = a.haciaAdelante ? progreso > 0.5 : progreso < 0.5;
    const destino = completa ? (a.haciaAdelante ? 1 : 0) : (a.haciaAdelante ? 0 : 1);

    // Reactivamos la transición y recién en el siguiente cuadro fijamos el ángulo final.
    a.hoja.classList.remove('arrastrando');
    this.animando = true;

    requestAnimationFrame(() => {
      a.hoja.style.transform = `rotateY(${-180 * destino}deg)`;
      a.hoja.style.setProperty('--p', String(destino));

      if (completa) {
        this.hoja += a.haciaAdelante ? 1 : -1;
        if (this.sonido) this.sonido.pasar();
      }

      this.#alTerminarGiro(a.hoja, () => {
        a.hoja.style.transform = '';
        a.hoja.style.removeProperty('--p');
        a.hoja.classList.remove('animando');
        this.animando = false;
        this.#ordenarCapas();
        this.#avisar();
        this.#precargarVecinos();
      });
    });
  }

  /* ── Zoom ───────────────────────────────────────────────────── */

  /** Acerca la revista. origen = {x,y} en porcentaje dentro del marco. */
  aplicarZoom (escala, origen) {
    this.escala = Math.max(1, Math.min(escala, 3));
    if (origen) this.marco.style.transformOrigin = `${origen.x}% ${origen.y}%`;
    this.marco.style.transform = this.escala === 1 ? '' : `scale(${this.escala})`;
    this.marco.classList.toggle('zoom', this.escala > 1);
  }

  alternarZoom (evento) {
    if (this.escala > 1) return this.aplicarZoom(1);
    const caja = this.marco.getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * 100;
    const y = ((evento.clientY - caja.top) / caja.height) * 100;
    this.aplicarZoom(2, { x, y });
  }
}
