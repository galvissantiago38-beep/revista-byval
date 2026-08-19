# Tu revista digital

Un catálogo de ropa que se lee como una revista: se abre, las hojas se pasan con
sonido de papel y cada prenda tiene su página. Tus clientas entran por un link,
miran, marcan lo que les gusta y te escriben por WhatsApp.

No necesitas instalar nada ni saber programar.

---

## 1. Cómo abrir el proyecto en tu computador

Haz doble clic en **`ABRIR REVISTA.bat`**.

Se abre una ventana negra (déjala abierta, es el motor) y enseguida tu navegador
con la revista. Ahí mismo tienes las dos direcciones:

- Revista: `http://localhost:5173/index.html`
- Panel: `http://localhost:5173/admin.html`

Para cerrar todo, cierra la ventana negra.

> **¿Por qué no basta con doble clic en `index.html`?**
> Porque los navegadores, por seguridad, **bloquean** el JavaScript moderno
> cuando el archivo se abre directo del disco. Verías la pantalla de carga
> pegada y nada más. El `.bat` levanta un servidor local diminuto (30 líneas,
> el archivo `servidor.js`) que resuelve exactamente eso.
>
> Esto solo aplica mientras trabajas en tu computador. Cuando lo publiques en
> internet (paso 5), el link funciona normal para todo el mundo.

**¿La ventana negra dice que no encuentra Node.js?** Descárgalo gratis en
[nodejs.org](https://nodejs.org) (botón grande que dice **LTS**), instálalo con
"Siguiente, siguiente" y vuelve a hacer doble clic en el `.bat`.

---

## 2. Cómo entrar al panel de administración

1. Con la revista abierta (paso 1), ve a `http://localhost:5173/admin.html`
2. Escribe la contraseña. La primera vez es: **`admin123`**
3. Listo, ya puedes agregar prendas y armar tus páginas.

Cuando ya esté publicado, la dirección es la tuya + `/admin.html`
(por ejemplo `https://marena-revista.netlify.app/admin.html`).

Dentro del panel encuentras cinco secciones:

| Sección | Para qué sirve |
|---|---|
| **Resumen** | Cuántas prendas tienes, el valor del inventario y qué es lo más mirado |
| **Productos** | Crear, editar, duplicar y eliminar prendas, con sus fotos |
| **Revista** | Ordenar las páginas arrastrándolas, agregar y quitar páginas |
| **Ajustes** | Nombre de tu marca, WhatsApp, redes, moneda y contraseña |
| **Respaldo** | Descargar una copia de todo o volver al ejemplo inicial |

---

## 3. Cómo cambiar la contraseña

1. Entra al panel.
2. Ve a **Ajustes**.
3. Abajo del todo, en *Contraseña del panel*, escribe la nueva dos veces.
4. Toca **Guardar ajustes**.

> ⚠️ **Importante:** esta contraseña es una protección básica de fachada. Sirve
> para que nadie toque tu catálogo por curiosidad, pero alguien con conocimientos
> técnicos podría saltarla. No pongas ahí información delicada. Para seguridad de
> verdad haría falta un servidor con usuarios, y eso es otro proyecto.

---

## 4. Cómo poner tu número de WhatsApp

1. Panel → **Ajustes**.
2. En el campo **WhatsApp** escribe tu número con el indicativo del país,
   **sin el signo +, sin espacios y sin guiones**.
   - Colombia: `573001234567`
   - México: `5215512345678`
   - Argentina: `5491112345678`
   - España: `34612345678`
3. En **Mensaje de WhatsApp** puedes cambiar el texto que le llega ya escrito a
   la clienta. Puedes usar estas tres piezas y se rellenan solas:
   - `{marca}` → el nombre de tu marca
   - `{producto}` → el nombre de la prenda
   - `{precio}` → el precio con formato
4. **Guardar ajustes**.

Ejemplo: `Hola {marca}, me encantó {producto} ({precio}). ¿Está disponible?`

---

## 4b. Cómo diseñar una página editorial

Las páginas de tipo **Editorial** son lienzos libres: tú decides dónde va cada
foto y cada texto, como en una revista de verdad.

1. Panel → **Revista** → toca una página editorial (o crea una nueva).
2. Abajo aparece el **lienzo**: es la página real, no un dibujo aproximado.
3. **Empezar desde una plantilla** te deja una composición ya armada. Hay cuatro:
   foto a sangre con titular, cita sobre bloque de color, foto al lado con texto,
   y collage de dos fotos. Después mueves lo que quieras.
4. **Arrastra** cualquier texto o foto para moverlo. El puntito verde de la
   esquina cambia el tamaño.
5. Toca un bloque para seleccionarlo. Abajo salen sus controles:
   - **Tipografía**: Titular gigante, Titular de revista, **Caligrafía**,
     Cita con comillas, Párrafo, Etiqueta pequeña.
   - **Color de letra**, **tamaño**, **alineación** e **inclinación**.
6. En una foto ya seleccionada, tócala otra vez para fijar **qué parte se ve**.
7. **+ Texto** y **+ Foto** agregan bloques nuevos. La papelera borra el elegido.
8. **Guardar página** cuando termines.

> Las posiciones se guardan en porcentaje, no en píxeles. Por eso la página se ve
> igual en tu computador, en la vista previa y en el celular de tu clienta.

---

## 5. Cómo publicarlo gratis en Netlify (arrastrando la carpeta)

> **Antes de subir, un paso obligatorio.** Tus prendas viven en el navegador de
> **tu** computador. Si subes la carpeta sin más, tus clientas verán el catálogo
> de ejemplo, no el tuyo.
>
> Ve a Panel → **Respaldo** → **Generar datos.json**. Se descarga un archivo;
> mételo en la carpeta del proyecto, al lado de `index.html`. Ese archivo lleva
> tus prendas, tus páginas y tus fotos. Repite este paso cada vez que cambies
> algo y quieras que se vea publicado.

1. Entra a **https://app.netlify.com/drop**
2. Arrastra **toda la carpeta del proyecto** (la que tiene `index.html` y
   `datos.json` adentro) y suéltala en el recuadro de la página.
3. Espera unos segundos. Netlify te da un link como
   `https://algo-random-123.netlify.app`
4. Ese link ya es tu revista. Compártelo por WhatsApp, Instagram o donde quieras.
5. Si quieres un nombre más bonito, crea una cuenta gratis en Netlify y en
   *Site settings → Change site name* pones, por ejemplo, `marena-revista`.

**Para actualizar la revista después:** vuelve a arrastrar la carpeta al mismo
sitio (en *Deploys → Drag and drop*).

También funciona igual en **Vercel** (vercel.com) o **GitHub Pages**.

### Probarlo en tu celular antes de publicar

Cuando abres `ABRIR REVISTA.bat`, la ventana negra te muestra una segunda
dirección parecida a `http://192.168.1.15:5173/index.html`. Escríbela en el
navegador de tu celular **conectado al mismo wifi** y verás la revista tal como
te quedó.

Eso sirve solo para probar: funciona mientras la ventana negra esté abierta y
solo dentro de tu casa. Para mandarle el link a una clienta hay que publicarlo.

---

## 6. Cosas que conviene saber

### Tus datos viven en tu navegador
Todo lo que cargas en el panel se guarda en el navegador **de ese computador**.
Si abres el panel en otro equipo, verás el catálogo de ejemplo otra vez.

**Por eso:** cada vez que hagas cambios importantes, ve a **Respaldo → Descargar
respaldo**. Te baja un archivo `.json` con todo (incluidas las fotos). En el otro
computador lo cargas con **Importar** y queda idéntico.

Guarda ese archivo como guardas cualquier cosa importante. Es tu copia de seguridad.

### Las fotos
- Se ajustan solas a un máximo de 1600 píxeles, así que no tienes que
  redimensionarlas antes: sube la foto tal como salió del celular.
- Al soltar una foto se abre un recuadro para **encuadrarla en formato revista
  (3:4)**. Arrastra la imagen para elegir qué parte se ve y usa el deslizador
  para acercar.
- Puedes poner varias fotos por prenda, reordenarlas arrastrándolas y marcar cuál
  es la **Principal** (la que sale en la revista).
- Tocando sobre una miniatura fijas el **punto focal**: el puntito naranja marca
  qué parte de la foto nunca se debe cortar. Útil para caras y detalles.

### Qué ve tu clienta
- Pasa las hojas arrastrando, con las flechas, con las teclas ← →, con la rueda
  del mouse o deslizando el dedo en el celular.
- Doble clic sobre una página la acerca. En el celular, pellizcar.
- El **corazón** guarda favoritos; el botón de favoritos arma un mensaje de
  WhatsApp con toda su lista.
- **Arma tu look** deja que elija varias prendas y le genera una página extra con
  el conjunto y el total.
- La **lupa** aparece al pasar el mouse sobre las fotos de producto.
- El botón de **imprimir** genera una versión "Guardar como PDF" para enviar por
  correo.
- Si toca 5 veces el nombre de tu marca en la portada, caen pétalos. 🌸

### Links directos
Puedes mandar a alguien a una página concreta:

- `tusitio.com/index.html?pagina=7` → abre directo en la página 7
- `tusitio.com/index.html?producto=amapola` → abre en la página de esa prenda

El identificador de la prenda lo ves en la barra de direcciones cuando la revista
llega a esa página.

---

## 7. ¿Qué archivo es cada cosa?

```
ABRIR REVISTA.bat   Doble clic aquí para ver la revista en tu computador
servidor.js         El servidor local que usa el .bat (no lo toques)
index.html          La revista que ve tu clienta
admin.html          Tu panel de administración
css/magazine.css    Cómo se ve la revista y la animación de las hojas
css/admin.css       Cómo se ve el panel
js/flipbook.js      El motor que pasa las páginas
js/data.js          Los productos, las páginas y dónde se guarda todo
js/app.js           Arma la revista y conecta los botones
js/admin.js         La lógica del panel
assets/             Íconos e imagen de vista previa
manifest.json       Para que se pueda instalar en el celular
sw.js               Hace que abra rápido y funcione sin internet
```

---

## 8. Problemas frecuentes

**"Se queda en 'Preparando la revista…' y no pasa nada"**
Casi seguro abriste `index.html` con doble clic. Cierra esa pestaña y usa
**`ABRIR REVISTA.bat`** (paso 1). Si ya lo estás usando y sigue pegado, espera
unos segundos más: está bajando las tipografías de Google.

**"La ventana negra se cierra sola"**
Es que falta Node.js. Instálalo desde [nodejs.org](https://nodejs.org) (botón LTS).

**"Dice que el puerto 5173 está ocupado"**
Tienes otra ventana negra abierta de antes. Ciérrala y vuelve a intentar.

**"Cargué fotos y desaparecieron"**
Si usaste el modo incógnito o limpiaste los datos del navegador, se borran.
Trabaja siempre en una ventana normal y descarga respaldos.

**"Olvidé la contraseña"**
Abre `js/data.js`, busca la línea `claveAdmin: 'admin123'` y borra los datos del
navegador para ese sitio; volverá a quedar la clave de ese archivo.

**"El WhatsApp no abre"**
Revisa que el número no tenga espacios, guiones ni el signo +.
