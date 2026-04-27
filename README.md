# Gyminfinity

Plataforma web para Gyminfinity con sitio público, área privada de cliente y dashboard administrativo.

## Qué cambió

- Autenticación administrativa por sesión, sin claves en la URL.
- Área de cliente protegida con login usando correo y teléfono.
- Control real de membresía con vencimiento y renovación.
- Formularios con validación backend y protección CSRF.
- Gestión administrativa de productos, planes, rutinas, dietas, usuarios y pedidos.
- Interfaz reorganizada y CSS consolidado para una base más profesional.

## Requisitos

- Node.js 18 o superior.

## Instalación

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env`.
3. Ajusta al menos `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
4. Inicia el proyecto con `npm start`.
5. Abre `http://localhost:3000`.

## Scripts

- `npm start`: inicia la aplicación.
- `npm run dev`: inicia el servidor en modo watch.
- `npm run check`: verifica sintaxis de los archivos JavaScript principales.

## Variables de entorno

- `PORT`: puerto del servidor.
- `NODE_ENV`: usa `production` en despliegue.
- `ADMIN_USERNAME`: usuario del panel administrativo.
- `ADMIN_PASSWORD`: contraseña del panel administrativo.
- `ADMIN_PASSWORD_HASH`: alternativa opcional para definir la contraseña ya hasheada en hexadecimal.

## Estructura principal

- `server.js`: servidor Express, autenticación, sesiones, validación y rutas.
- `db.js`: inicialización y acceso a SQLite.
- `views/`: plantillas EJS públicas, cliente y administración.
- `public/css/style.css`: sistema visual consolidado.
- `public/js/main.js`: navegación, carrusel y tabs de interfaz.

## Nota de seguridad

En desarrollo, si no defines `ADMIN_PASSWORD`, la app usa una credencial temporal local y avisa por consola. En producción debes configurar credenciales por entorno antes de desplegar.
