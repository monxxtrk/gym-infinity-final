# Gym Infinity Final

Plataforma web profesional para administrar y presentar Gym Infinity. Reúne el sitio comercial, las cuentas de clientes y un panel administrativo para controlar accesos, membresías, pagos, comprobantes, asistencia, rutinas, alimentación, productos, solicitudes y comentarios.

## Proyecto en línea

La aplicación está preparada para ejecutarse en Render:

**[Abrir Gym Infinity](https://gym-infinity.onrender.com)**

El primer acceso puede tardar unos segundos mientras el servicio alojado inicia.

## Funciones principales

- Sitio público responsive con identidad visual Gym Infinity.
- Cuentas de clientes sujetas a aprobación administrativa.
- Panel con vigencias, ingresos, pagos, facturación y asistencia.
- CRUD completo de rutinas, productos y alimentación.
- Contenido gratuito y premium.
- Moderación previa de comentarios.
- Cambio y solicitud de recuperación de contraseña.
- Exportaciones CSV de clientes y pagos.
- Comprobantes imprimibles o guardables como PDF.
- Auditoría de acciones administrativas.
- Protección CSRF, Helmet, rate limiting, sesiones HTTP-only y contraseñas con bcrypt.
- Política de privacidad, términos y aviso de salud.
- Copias de seguridad SQLite.
- Configuración de despliegue en Render con disco persistente.

## Desarrollo

```bash
npm ci
copy .env.example .env
npm start
```

Abrir `http://localhost:3000`.

## Tecnologías

| Tecnología | Función |
|---|---|
| HTML generado con EJS | Construye las páginas y reutiliza componentes como la cabecera y el pie de página. |
| CSS3 | Controla la identidad morada y rosada, las tarjetas, animaciones y adaptación móvil. |
| JavaScript | Maneja el menú móvil, confirmaciones, formularios y protección CSRF en el navegador. |
| Node.js | Ejecuta la aplicación en el servidor. |
| Express | Gestiona rutas, sesiones, formularios, seguridad y respuestas HTTP. |
| SQLite | Guarda usuarios, membresías, pagos, contenido, solicitudes y auditoría. |
| JSON | Define dependencias y comandos mediante `package.json` y `package-lock.json`. |
| EJS | Renderiza datos dinámicos del servidor dentro de las vistas HTML. |
| Jest y Supertest | Comprueban automáticamente los flujos principales. |
| Render YAML | Describe el servicio, las variables y el almacenamiento persistente para producción. |

## Estructura del repositorio

| Ruta | Responsabilidad |
|---|---|
| `server.js` | Inicia el servidor y realiza un cierre seguro. |
| `src/app.js` | Configura Express, sesiones, seguridad, CSRF y límites de solicitudes. |
| `src/routes.js` | Contiene las rutas públicas, de clientes y administrativas. |
| `src/database.js` | Crea, migra y consulta la base de datos SQLite. |
| `views/` | Contiene las páginas EJS que se convierten en HTML. |
| `views/partials/` | Guarda la cabecera y el pie reutilizables. |
| `public/css/styles.css` | Define toda la línea visual y el diseño responsive. |
| `public/js/main.js` | Añade interacción y comportamiento en el navegador. |
| `public/images/` | Guarda el logo y la imagen principal de la marca. |
| `__tests__/` | Valida automáticamente registro, acceso, administración y comentarios. |
| `tools/backup.js` | Genera copias de seguridad de SQLite. |
| `.env.example` | Documenta las variables necesarias sin publicar secretos. |
| `render.yaml` | Configura el despliegue alojado en Render. |

## Panel administrativo

El administrador puede aprobar cuentas aunque no exista un pago, modificar precios y planes, registrar clientes, controlar vigencias, facturar, imprimir comprobantes, exportar información, registrar asistencia y administrar rutinas, alimentación, productos y comentarios. También dispone de recuperación de acceso y registro de actividad.

## Verificación

```bash
npm run check
npm run backup
```

## Producción

Configura como mínimo:

- `NODE_ENV=production`
- `SESSION_SECRET` con 32 caracteres o más
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` única y segura
- `APP_URL`
- datos comerciales reales

Nunca publiques `.env`, bases `.db`, archivos WAL, sesiones o copias de seguridad. El archivo `render.yaml` monta `/var/data` como almacenamiento persistente.

## Integraciones externas

Las variables SMTP, proveedor de pagos y WhatsApp están documentadas en `.env.example`, pero permanecen desactivadas hasta proporcionar cuentas y credenciales reales. No se deben simular cobros ni mensajes.

## Revisión legal

Los documentos incluidos son una base operativa informativa para Colombia. Antes de cobrar públicamente deben completarse con razón social, NIT, dirección, contacto y políticas comerciales reales, y ser revisados por asesoría jurídica.
