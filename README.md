# Gyminfinity

Gyminfinity es un proyecto academico pensado para organizar la informacion principal de un gimnasio. Como equipo buscamos que el sistema permita registrar clientes, revisar planes, manejar productos, consultar rutinas, administrar dietas y llevar un control basico de pedidos y facturacion.

El proyecto todavia se puede seguir mejorando, pero ya cuenta con una base funcional para mostrar la idea, probar el flujo completo y explicar como se podria usar en un gimnasio real.

## Proyecto en linea

La version publicada se puede revisar aqui:

[https://gym-infinity.onrender.com](https://gym-infinity.onrender.com)

Nota: Render esta usando el plan gratuito. Si la pagina tarda en abrir, es normal; el servicio puede tardar unos segundos en iniciar cuando lleva un rato sin visitas.

## Que incluye el proyecto

- Aplicacion web con Node.js y Express.
- Vistas con EJS.
- Base de datos SQLite.
- Panel administrativo con inicio de sesion.
- Area privada para clientes.
- Gestion de productos, planes, rutinas, dietas, usuarios, pedidos y facturas.
- Aplicacion Android Studio dentro de `android-app/`.
- Pruebas automatizadas con Jest y Supertest.

## Guia para revisar

Profesor, companeros o evaluadores pueden revisar primero la version publicada:

[https://gym-infinity.onrender.com](https://gym-infinity.onrender.com)

Tambien se puede ejecutar localmente siguiendo estos pasos.

### 1. Preparar el proyecto web

Desde la carpeta raiz del proyecto:

```powershell
npm install
```

Crear el archivo `.env` usando `.env.example` como base:

```powershell
Copy-Item .env.example .env
```

Credenciales de administrador usadas para la entrega:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=papitas12
```

Iniciar el servidor:

```powershell
npm start
```

Abrir en el navegador:

```text
http://localhost:3000
```

### 2. Revisar la app Android

La aplicacion Android esta en:

```text
android-app/
```

Pasos:

1. Abrir `android-app/` en Android Studio.
2. Esperar la sincronizacion de Gradle.
3. Seleccionar un emulador Android.
4. Ejecutar la configuracion `app`.

La app Android carga la pagina publicada:

```text
https://gym-infinity.onrender.com
```

Por eso no es obligatorio tener el servidor local encendido para probarla.

## Datos de acceso

Panel administrativo:

```text
Usuario: admin
Contrasena: papitas12
```

## Comandos utiles

- `npm start`: inicia la aplicacion.
- `npm run dev`: inicia el servidor en modo desarrollo.
- `npm run check`: revisa sintaxis de los archivos principales.
- `npm test`: ejecuta las pruebas automatizadas.
- `npm run test:watch`: ejecuta las pruebas mientras se trabaja.

## Despliegue

El proyecto esta desplegado en Render con esta configuracion:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Branch: main
```

Variables de entorno:

```env
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=papitas12
```

## Base de datos

El proyecto usa SQLite. En local se genera el archivo `gyminfinity.db`, pero no se sube a GitHub para evitar publicar datos de prueba.

Tablas principales:

- `users`: informacion de clientes y membresias.
- `products`: productos disponibles.
- `orders`: pedidos y facturas.

## Estructura

- `server.js`: servidor, rutas y control principal.
- `db.js`: conexion e inicializacion de SQLite.
- `views/`: pantallas EJS.
- `public/css/style.css`: estilos del sitio.
- `public/js/main.js`: funciones del lado del cliente.
- `android-app/`: proyecto Android Studio.
- `__tests__/`: pruebas automatizadas.

## Pendientes que se pueden mejorar

- Conectar una pasarela de pago real.
- Usar una base de datos externa para produccion.
- Agregar mas reportes para el administrador.
- Mejorar el seguimiento de clientes y membresias.
- Ampliar las pruebas automatizadas.

## Verificacion

Antes de entregar o subir cambios se recomienda ejecutar:

```powershell
npm run check
npm test
```

En la ultima revision ambos comandos se ejecutaron correctamente.
