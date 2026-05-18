# Gyminfinity

Proyecto desarrollado como entrega academica para la gestion de un gimnasio. La plataforma permite administrar clientes, planes, productos, rutinas, dietas, pedidos y facturacion desde una aplicacion web, ademas de incluir una version Android creada en Android Studio.

## Enlace del proyecto desplegado

El proyecto se puede revisar directamente desde la siguiente direccion:

[https://gym-infinity.onrender.com](https://gym-infinity.onrender.com)

Nota: el servicio esta desplegado en el plan gratuito de Render. Si la pagina no abre de inmediato, puede tardar unos segundos en iniciar porque el servidor entra en reposo cuando no recibe visitas.

## Estado del proyecto

- Backend desarrollado con Node.js y Express.
- Vistas dinamicas con EJS.
- Base de datos SQLite.
- Panel administrativo con autenticacion por sesiones.
- Area privada para clientes.
- Gestion de productos, planes, rutinas, dietas, usuarios, pedidos y facturacion.
- Aplicacion Android Studio ubicada en la carpeta `android-app/`.
- Pruebas automatizadas con Jest y Supertest.

## Guia para el instructor

Estimado instructor, este repositorio contiene la version web y la version Android del proyecto Gyminfinity. La forma mas rapida de revisar el sistema es ingresar al despliegue publico:

[https://gym-infinity.onrender.com](https://gym-infinity.onrender.com)

Tambien puede ejecutar el proyecto localmente siguiendo los pasos descritos a continuacion.

### 1. Preparar el servidor web

Desde la raiz del proyecto:

```powershell
npm install
```

Cree un archivo `.env` tomando como base `.env.example`:

```powershell
Copy-Item .env.example .env
```

Configure las credenciales administrativas dentro de `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CAMBIA_ESTA_CLAVE
```

Inicie el servidor:

```powershell
npm start
```

Luego abra el navegador en:

```text
http://localhost:3000
```

### 2. Revisar la aplicacion Android

La aplicacion Android se encuentra en la carpeta:

```text
android-app/
```

Pasos recomendados:

1. Abra la carpeta `android-app/` en Android Studio.
2. Espere a que finalice la sincronizacion de Gradle.
3. Seleccione un emulador Android, por ejemplo Pixel 7.
4. Ejecute la configuracion `app`.

La aplicacion Android esta configurada para cargar el servidor desplegado en Render:

```text
https://gym-infinity.onrender.com
```

Por este motivo, no es obligatorio tener el servidor local encendido para revisar la aplicacion Android.

## Requisitos para ejecucion local

- Node.js 18 o superior.
- npm.
- Android Studio, si se desea probar o compilar la aplicacion Android.

## Scripts disponibles

- `npm start`: inicia la aplicacion web.
- `npm run dev`: inicia el servidor en modo desarrollo con recarga.
- `npm run check`: revisa la sintaxis de los archivos JavaScript principales.
- `npm test`: ejecuta las pruebas automatizadas.
- `npm run test:watch`: ejecuta las pruebas en modo observacion.

## Despliegue en Render

El sitio se encuentra desplegado en Render con la siguiente URL publica:

[https://gym-infinity.onrender.com](https://gym-infinity.onrender.com)

Configuracion usada para el despliegue:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Branch: main
```

Variables de entorno recomendadas:

```env
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=clave_segura
```

## Base de datos

El proyecto usa SQLite. En desarrollo local, la base de datos se genera en el archivo `gyminfinity.db`, el cual no se sube a GitHub para evitar publicar datos locales o privados.

Tablas principales:

- `users`: informacion de clientes, planes y vencimiento de membresia.
- `products`: productos disponibles y precios.
- `orders`: pedidos, facturas, metodo de pago, estado y monto.

## Estructura del proyecto

- `server.js`: servidor Express, rutas, sesiones, validaciones y controladores principales.
- `db.js`: inicializacion y acceso a la base de datos SQLite.
- `views/`: plantillas EJS de la web.
- `public/css/style.css`: estilos principales del sitio.
- `public/js/main.js`: funciones de interfaz del lado del cliente.
- `android-app/`: proyecto Android Studio.
- `__tests__/`: pruebas automatizadas.

## Verificacion antes de entrega

Antes de subir cambios al repositorio, se recomienda ejecutar:

```powershell
npm run check
npm test
```

Estado de verificacion realizado:

- Revision de sintaxis: correcta.
- Pruebas automatizadas: correctas.
- Compilacion Android debug: correcta.
