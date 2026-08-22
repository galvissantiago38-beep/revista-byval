/* ═══════════════════════════════════════════════════════════════
   NUBE — conexión con Supabase
   ───────────────────────────────────────────────────────────────
   Hablamos con Supabase por su API REST usando fetch a secas, sin
   la librería supabase-js. Motivo: el proyecto no tiene instalador
   ni compilación, y una librería traída de un CDN sería una pieza
   externa que puede caerse o cambiar sin aviso.

   La clave de aquí abajo es PÚBLICA por diseño: viaja dentro de la
   página y cualquiera puede leerla. Lo que protege el catálogo son
   las reglas de la base de datos (sql/supabase.sql), que solo dejan
   editar a los correos autorizados.
   ═══════════════════════════════════════════════════════════════ */

export const NUBE = {
  url:   'https://fpvkwtgcbdiqqrwnsfip.supabase.co',
  clave: 'sb_publishable_H5ocd7Z2ow2WuM10qcDBNQ_Oj5gAyYu',
  bucket: 'revista-fotos'
};

const CLAVE_SESION = 'revista.sesionNube';
const FILA = 'principal';

/* ═══════════ SESIÓN ═══════════ */

function leerSesion () {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null; }
  catch { return null; }
}

function guardarSesion (s) {
  if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
  else localStorage.removeItem(CLAVE_SESION);
}

export function haySesion () {
  const s = leerSesion();
  return !!(s && s.refresh_token);
}

export function correoDeSesion () {
  return leerSesion()?.email || null;
}

/** Devuelve un token válido, renovándolo si ya venció. */
async function token () {
  const s = leerSesion();
  if (!s) return null;

  const margen = 60_000;   // renovamos un minuto antes de que caduque
  if (s.expira && Date.now() < s.expira - margen) return s.access_token;

  const r = await fetch(`${NUBE.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: NUBE.clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token })
  });
  if (!r.ok) { guardarSesion(null); return null; }

  const datos = await r.json();
  guardarSesion({
    access_token: datos.access_token,
    refresh_token: datos.refresh_token,
    email: datos.user?.email || s.email,
    expira: Date.now() + (datos.expires_in || 3600) * 1000
  });
  return datos.access_token;
}

/** Entra con correo y contraseña reales. */
export async function entrar (correo, contrasena) {
  const r = await fetch(`${NUBE.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: NUBE.clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo.trim(), password: contrasena })
  });
  const datos = await r.json();

  if (!r.ok) {
    const motivo = datos.error_description || datos.msg || datos.message || '';
    throw new Error(/invalid/i.test(motivo)
      ? 'Correo o contraseña incorrectos.'
      : (motivo || 'No pude entrar. Revisa tu conexión.'));
  }

  guardarSesion({
    access_token: datos.access_token,
    refresh_token: datos.refresh_token,
    email: datos.user?.email || correo.trim(),
    expira: Date.now() + (datos.expires_in || 3600) * 1000
  });
  return datos.user;
}

/**
 * Crea la cuenta la primera vez. Solo sirve de algo si el correo está en la
 * lista de autorizados del SQL: cualquier otro podrá registrarse pero la base
 * no le dejará tocar el catálogo.
 */
export async function registrar (correo, contrasena) {
  const r = await fetch(`${NUBE.url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: NUBE.clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo.trim(), password: contrasena })
  });
  const datos = await r.json();

  if (!r.ok) {
    const motivo = datos.msg || datos.error_description || datos.message || '';
    if (/already registered|already been registered/i.test(motivo)) {
      throw new Error('Ese correo ya tiene contraseña. Entra con ella, o pide una nueva desde Supabase.');
    }
    throw new Error(motivo || 'No pude crear la cuenta.');
  }
  return datos.user;
}

/** Cambia la contraseña de la sesión abierta. */
export async function cambiarClave (nueva) {
  const t = await token();
  if (!t) throw new Error('Tu sesión venció. Vuelve a entrar.');

  const r = await fetch(`${NUBE.url}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: NUBE.clave, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: nueva })
  });
  const datos = await r.json();
  if (!r.ok) throw new Error(datos.msg || datos.message || 'No pude cambiar la contraseña.');
  return true;
}

export async function salir () {
  const t = await token();
  if (t) {
    await fetch(`${NUBE.url}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: NUBE.clave, Authorization: `Bearer ${t}` }
    }).catch(() => {});
  }
  guardarSesion(null);
}

/* ═══════════ CABECERAS ═══════════ */

async function cabeceras (conSesion) {
  const t = conSesion ? await token() : null;
  return {
    apikey: NUBE.clave,
    Authorization: `Bearer ${t || NUBE.clave}`,
    'Content-Type': 'application/json'
  };
}

/* ═══════════ EL CATÁLOGO ═══════════ */

/** Lee la revista completa. Lo puede hacer cualquiera, sin sesión. */
export async function leerRevista () {
  const r = await fetch(
    `${NUBE.url}/rest/v1/revista?id=eq.${FILA}&select=config,productos,paginas,actualizado`,
    { headers: await cabeceras(false), cache: 'no-store' }
  );
  if (!r.ok) throw new Error(`No pude leer el catálogo (${r.status}).`);
  const filas = await r.json();
  if (!filas.length) throw new Error('La revista no existe en la base todavía.');
  return filas[0];
}

/** Guarda la revista. Requiere sesión y estar en la lista de correos. */
export async function guardarRevista ({ config, productos, paginas }) {
  const r = await fetch(`${NUBE.url}/rest/v1/revista?id=eq.${FILA}`, {
    method: 'PATCH',
    headers: { ...(await cabeceras(true)), Prefer: 'return=representation' },
    body: JSON.stringify({ config, productos, paginas, actualizado: new Date().toISOString() })
  });

  if (r.status === 401 || r.status === 403) {
    throw new Error('Tu sesión no tiene permiso para editar. Vuelve a entrar.');
  }
  if (!r.ok) throw new Error(`No pude guardar (${r.status}).`);

  const filas = await r.json();
  if (!filas.length) {
    // PATCH devuelve vacío cuando la regla de permisos bloquea la fila.
    throw new Error('Ese correo no está autorizado para editar la revista.');
  }
  return filas[0];
}

/* ═══════════ FOTOS ═══════════ */

function dataUrlABlob (dataUrl) {
  const [encabezado, base64] = dataUrl.split(',');
  const tipo = /:(.*?);/.exec(encabezado)?.[1] || 'image/jpeg';
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/** Sube una foto y devuelve su nombre dentro del bucket. */
export async function subirFoto (dataUrl, nombre) {
  const t = await token();
  if (!t) throw new Error('Entra al panel antes de subir fotos.');

  const blob = dataUrlABlob(dataUrl);
  const r = await fetch(`${NUBE.url}/storage/v1/object/${NUBE.bucket}/${nombre}`, {
    method: 'POST',
    headers: { apikey: NUBE.clave, Authorization: `Bearer ${t}`, 'Content-Type': blob.type },
    body: blob
  });
  if (!r.ok) throw new Error(`No pude subir la foto (${r.status}).`);
  return nombre;
}

export async function borrarFoto (nombre) {
  const t = await token();
  if (!t) return;
  await fetch(`${NUBE.url}/storage/v1/object/${NUBE.bucket}/${nombre}`, {
    method: 'DELETE',
    headers: { apikey: NUBE.clave, Authorization: `Bearer ${t}` }
  }).catch(() => {});
}

/** Dirección pública de una foto, lista para un <img>. */
export function urlDeFoto (nombre) {
  return `${NUBE.url}/storage/v1/object/public/${NUBE.bucket}/${nombre}`;
}

/* ═══════════ CONTADOR DE VISTAS ═══════════ */

export async function sumarVista (clave) {
  await fetch(`${NUBE.url}/rest/v1/rpc/sumar_vista`, {
    method: 'POST',
    headers: await cabeceras(false),
    body: JSON.stringify({ p_clave: clave })
  }).catch(() => {});   // que nunca rompa la lectura de la revista
}

export async function leerVistas () {
  try {
    const r = await fetch(`${NUBE.url}/rest/v1/revista_vistas?select=clave,cuenta`, {
      headers: await cabeceras(false)
    });
    if (!r.ok) return {};
    const filas = await r.json();
    return Object.fromEntries(filas.map(f => [f.clave, f.cuenta]));
  } catch {
    return {};
  }
}

/* ═══════════ DIAGNÓSTICO ═══════════ */

/** ¿Está la base montada y accesible? Se usa para avisar con claridad. */
export async function comprobar () {
  try {
    const r = await fetch(`${NUBE.url}/rest/v1/revista?select=id&limit=1`, {
      headers: await cabeceras(false)
    });
    if (r.ok) return { ok: true };
    const cuerpo = await r.json().catch(() => ({}));
    return { ok: false, motivo: cuerpo.message || `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, motivo: 'Sin conexión' };
  }
}
