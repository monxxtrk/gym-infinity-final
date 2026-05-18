# Gyminfinity

Plataforma web para Gyminfinity con sitio publico, area privada de cliente, dashboard administrativo y una app Android que abre la web en un WebView.

## Estado del proyecto

- Backend Node.js + Express.
- Vistas EJS.
- Base de datos SQLite.
- Panel administrativo con sesiones.
- Area de cliente protegida.
- Gestion de productos, planes, rutinas, dietas, usuarios, pedidos y facturacion.
- App Android Studio en `android-app/`.
- Pruebas automatizadas con Jest + Supertest.

## 👨‍🏫 Guía para el Evaluador (Instrucciones Rápidas)

Si eres el instructor y deseas revisar este proyecto localmente, sigue estos pasos:

### 1. Preparar el Servidor Web (Backend)
Desde la raíz del proyecto (`gyminfinity-site`):
1. Ejecuta `npm install`.
2. Crea un archivo `.env` basado en `.env.example`.
3. Ejecuta `npm start`.
4. Verifica que el sitio cargue en `http://localhost:3000`.

### 2. Ejecutar la App Android
1. Abre la carpeta `android-app/` en **Android Studio**.
2. Espera a que termine la sincronización de Gradle (elefante azul).
3. Lanza el emulador (Pixel 7 o similar).
4. La app se conectará automáticamente al servidor desplegado en **Render** (`https://gym-infinity.onrender.com`), por lo que NO es estrictamente necesario tener el servidor local encendido para que la app funcione.

---

## 🚀 Despliegue en Render
El sitio web ya se encuentra desplegado en: [https://gym-infinity.onrender.com](https://gym-infinity.onrender.com)

---

## Requisitos

- Node.js 18 o superior.
- npm.
- Android Studio, solo si vas a probar o compilar la app Android.

## Instalacion local

1. Instala dependencias:

```powershell
npm install
```

2. Crea tu archivo `.env` a partir del ejemplo:

```powershell
Copy-Item .env.example .env
```

3. Edita `.env` y cambia al menos:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CAMBIA_ESTA_CLAVE
```

4. Inicia el servidor:

```powershell
npm start
```

5. Abre la web:

```text
http://localhost:3000
```

## Scripts

- `npm start`: inicia la aplicacion.
- `npm run dev`: inicia el servidor en modo watch.
- `npm run check`: revisa sintaxis de los JavaScript principales.
- `npm test`: ejecuta pruebas automatizadas.
- `npm run test:watch`: ejecuta pruebas en modo observacion.

## App Android

La carpeta `android-app/` contiene un proyecto Android Studio separado.

Para probar en emulador:

1. Inicia el servidor web con `npm start`.
2. Abre `android-app/` desde Android Studio.
3. Espera la sincronizacion de Gradle.
4. Ejecuta la configuracion `app` en un emulador.

En debug, Android carga:

```text
http://10.0.2.2:3000
```

Esa direccion permite que el emulador acceda al `localhost` del PC.

Para publicar una APK/AAB real, cambia la URL `release` en `android-app/app/build.gradle` por el dominio HTTPS de produccion.

## Despliegue web con Render

1. Sube este repositorio a GitHub.
2. Entra a [Render](https://render.com) y conecta tu cuenta de GitHub.
3. Crea un **New Web Service** desde este repositorio.
4. Usa estos comandos:

```text
Build Command: npm install
Start Command: npm start
```

5. Agrega variables de entorno en Render:

```env
NODE_ENV=production
ADMIN_USERNAME=tu_usuario
ADMIN_PASSWORD=tu_clave_segura
```

6. Cuando Render entregue la URL publica, usala como dominio de produccion.

Nota: SQLite funciona para demo/proyecto academico. En un despliegue real con datos importantes conviene usar una base persistente externa o configurar almacenamiento persistente, porque algunos servicios pueden reiniciar archivos locales.

## Variables de entorno

- `PORT`: puerto del servidor. Render lo define automaticamente.
- `NODE_ENV`: usa `production` en despliegue.
- `DB_FILE`: ruta opcional de la base SQLite.
- `ADMIN_USERNAME`: usuario del panel administrativo.
- `ADMIN_PASSWORD`: contrasena del panel administrativo.
- `ADMIN_PASSWORD_HASH`: alternativa opcional para guardar la contrasena ya hasheada en hexadecimal.

## Base de datos

La base local por defecto es `gyminfinity.db`, en la raiz del proyecto. Ese archivo no se sube a GitHub porque puede contener datos privados o temporales.

Tablas importantes:

- `users`: clientes, planes y vencimiento de membresia.
- `products`: productos y precios visibles.
- `orders`: pedidos, facturas, metodo de pago, estado, monto y destino del dinero.

## Estructura principal

- `server.js`: servidor Express, autenticacion, sesiones, validacion y rutas.
- `db.js`: inicializacion y acceso a SQLite.
- `views/`: plantillas EJS.
- `public/css/style.css`: estilos principales.
- `public/js/main.js`: navegacion, carrusel y tabs.
- `android-app/`: proyecto Android Studio.
- `__tests__/`: pruebas automatizadas.

## Antes de subir a GitHub

Ejecuta:

```powershell
npm run check
npm test
git status --short
```

No subas `.env`, `node_modules/`, `gyminfinity.db`, carpetas `build/`, `.gradle/`, `.idea/` ni `local.properties`.
