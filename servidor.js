/* Servidor local mínimo, sin instalar nada.
   Sirve la carpeta del proyecto para poder ver la revista en el navegador.
   Los navegadores bloquean los módulos de JavaScript cuando el archivo se
   abre con doble clic (file://), por eso hace falta esto.

   Uso:  node servidor.js      → luego abre http://localhost:5173  */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PUERTO = Number(process.argv[2]) || 5173;
const RAIZ = __dirname;

/** Direcciones de tu computador dentro del wifi, para abrir desde el celular. */
function direccionesDeRed () {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const servidor = http.createServer((peticion, respuesta) => {
  let ruta = decodeURIComponent(peticion.url.split('?')[0]);
  if (ruta === '/') ruta = '/index.html';

  const archivo = path.join(RAIZ, path.normalize(ruta));
  // Nadie sale de la carpeta del proyecto.
  if (!archivo.startsWith(RAIZ)) {
    respuesta.writeHead(403).end('Prohibido');
    return;
  }

  fs.readFile(archivo, (error, contenido) => {
    if (error) {
      respuesta.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      respuesta.end('<h1>404</h1><p>No encontré ese archivo.</p>');
      return;
    }
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    respuesta.end(contenido);
  });
});

// 0.0.0.0 = también acepta visitas del celular conectado al mismo wifi.
servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log('');
  console.log('  ✦ Tu revista está lista');
  console.log('');
  console.log('  En este computador:');
  console.log('    Revista:  http://localhost:' + PUERTO + '/index.html');
  console.log('    Panel:    http://localhost:' + PUERTO + '/admin.html');

  const red = direccionesDeRed();
  if (red.length) {
    console.log('');
    console.log('  Desde tu celular (mismo wifi), escribe esta direccion:');
    red.forEach(ip => console.log('    http://' + ip + ':' + PUERTO + '/index.html'));
    console.log('');
    console.log('  Ojo: esto solo funciona mientras esta ventana este abierta y');
    console.log('  el celular este en el mismo wifi. Para mandarle el link a una');
    console.log('  clienta, publica la carpeta (mira el README, paso 5).');
  }
  console.log('');
  console.log('  Para cerrar: Ctrl + C, o cierra esta ventana negra.');
  console.log('');
});
