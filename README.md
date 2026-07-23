# Gym Infinity Final

Plataforma web profesional para presentar y administrar un gimnasio desde una sola aplicación. Gym Infinity integra el sitio comercial, cuentas de clientes, catálogo fitness, membresías, caja, facturación, asistencia y un panel administrativo con identidad visual morada, rosada, blanca y negra.

## Aplicación en línea

**[Abrir Gym Infinity](https://gym-infinity.onrender.com)**

El servicio utiliza el plan gratuito de Render, por lo que el primer acceso después de un periodo de inactividad puede tardar aproximadamente 50 segundos.

## Qué contiene la plataforma

### Sitio público

- Página principal responsive con identidad visual Gym Infinity.
- Presentación de servicios, beneficios, métricas y llamados a la acción.
- Catálogo de rutinas gratuitas y premium.
- Planes de alimentación según objetivo.
- Tienda de productos fitness con precios y disponibilidad.
- Membresías configurables con precio, duración y beneficios.
- Testimonios moderados antes de aparecer públicamente.
- Formulario de valoración inicial.
- Registro, inicio de sesión y recuperación de acceso.
- Política de privacidad, términos y condiciones, y aviso de salud.
- Navegación optimizada para escritorio, tabletas y teléfonos.

### Cuenta del cliente

- Solicitud de cuenta sujeta a aprobación administrativa.
- Acceso independiente del estado del pago.
- Consulta de membresía y vigencia.
- Visualización de contenido gratuito y premium.
- Acceso a rutinas, alimentación y tienda.
- Cambio seguro de contraseña.
- Seguimiento de su proceso dentro de la plataforma.

### Panel administrativo

- Resumen de ingresos, membresías activas, próximas a vencer y vencidas.
- Aprobación o suspensión de accesos de clientes.
- Registro de clientes y datos de contacto.
- Control de objetivos, notas, teléfonos y correos.
- Gestión de vigencia y estado de membresías.
- Registro de asistencia.
- Administración de solicitudes de valoración.
- Modificación de planes, precios, duración y beneficios.
- CRUD completo de rutinas.
- CRUD completo de planes de alimentación.
- CRUD completo de productos, precios y existencias.
- Moderación y eliminación de comentarios.
- Exportación de clientes y pagos en CSV.
- Registro legible de actividad administrativa.

### Administradores y trabajadores

- Cuenta administradora principal configurada mediante variables seguras.
- Creación de credenciales individuales para trabajadores.
- Creación de administradores adicionales.
- Suspensión y reactivación de accesos internos.
- Cambio de contraseñas temporales.
- Contraseñas almacenadas mediante hash con bcrypt.
- Los trabajadores pueden operar el panel, pero no gestionar credenciales.
- Protección de la cuenta administradora principal.

### Pagos y facturación

- Registro de pagos en efectivo.
- Transferencias bancarias.
- Tarjeta o datáfono.
- Nequi y Daviplata.
- Referencia obligatoria para pagos digitales.
- Concepto detallado de lo adquirido.
- Registro del responsable que recibió el pago.
- Renovación automática de la vigencia.
- Numeración consecutiva de comprobantes.
- Historial de pagos con estado, método, referencia y total.
- Factura o recibo descargable como PDF real.
- PDF de una sola página A4 con cliente, plan, beneficios, periodo, método, referencia, responsable, observaciones y total.
- Vista web imprimible de cada comprobante.

> El PDF certifica el pago y describe el servicio adquirido. No sustituye una factura electrónica oficial cuando sea exigible por la normativa tributaria.

## Seguridad implementada

- Protección CSRF para formularios.
- Encabezados HTTP seguros mediante Helmet.
- Límite de solicitudes generales y de autenticación.
- Sesiones HTTP-only almacenadas en SQLite.
- Cookies seguras en producción.
- Contraseñas cifradas con bcrypt.
- Regeneración de sesión al iniciar sesión.
- Separación entre clientes, trabajadores y administradores.
- Variables sensibles fuera del repositorio.
- Registro de acciones administrativas.
- Validación de datos y métodos de pago.
- Confirmación antes de eliminaciones.

## Tecnologías

| Tecnología | Uso dentro del proyecto |
|---|---|
| HTML generado con EJS | Construcción de páginas dinámicas y componentes reutilizables. |
| CSS3 | Diseño responsive, identidad visual, tarjetas, formularios y animaciones. |
| JavaScript | Menú móvil, confirmaciones, formularios y protección CSRF en el navegador. |
| Node.js | Entorno de ejecución del servidor. |
| Express | Rutas, formularios, sesiones, autenticación y respuestas HTTP. |
| SQLite | Usuarios, clientes, membresías, pagos, facturas, contenido y auditoría. |
| PDFKit | Generación de facturas PDF desde el servidor. |
| bcrypt | Protección de contraseñas mediante hash. |
| Helmet | Encabezados de seguridad para Express. |
| Jest y Supertest | Pruebas automáticas de rutas y flujos principales. |
| JSON | Dependencias, scripts y versiones mediante `package.json` y `package-lock.json`. |
| Render YAML | Configuración base para desplegar la aplicación en Render. |

## Estructura del repositorio

```text
gym-infinity-final/
├── __tests__/             Pruebas automatizadas
├── public/
│   ├── css/               Línea visual y diseño responsive
│   ├── images/            Logo e imágenes de marca
│   └── js/                Interacciones del navegador
├── src/
│   ├── app.js             Configuración, seguridad y sesiones
│   ├── database.js        Esquema, migraciones y datos iniciales
│   └── routes.js          Rutas públicas, de clientes y administrativas
├── tools/
│   └── backup.js          Copias de seguridad de SQLite
├── views/
│   ├── partials/          Cabecera y pie de página
│   └── *.ejs              Páginas dinámicas
├── .env.example           Variables requeridas sin secretos
├── render.yaml            Configuración de despliegue
├── server.js              Inicio y cierre seguro del servidor
├── package.json           Dependencias y comandos
└── README.md              Documentación del proyecto
```

## Instalación local

Requisitos:

- Node.js 20 o superior.
- npm.

```bash
git clone https://github.com/monxxtrk/gym-infinity-final.git
cd gym-infinity-final
npm ci
copy .env.example .env
npm start
```

Abrir [http://localhost:3000](http://localhost:3000).

## Comandos disponibles

```bash
npm start
```

Inicia la aplicación.

```bash
npm run check
```

Comprueba sintaxis y ejecuta todas las pruebas.

```bash
npm test
```

Ejecuta las pruebas con Jest.

```bash
npm run backup
```

Genera una copia de seguridad de SQLite.

## Variables de entorno

Variables mínimas para producción:

```env
NODE_ENV=production
SESSION_SECRET=secreto-aleatorio-de-32-caracteres-o-mas
ADMIN_EMAIL=administracion@tu-dominio.com
ADMIN_PASSWORD=contraseña-unica-y-segura
APP_URL=https://tu-dominio.com
```

Datos utilizados en las facturas:

```env
BUSINESS_NAME=Gym Infinity
BUSINESS_NIT=
BUSINESS_ADDRESS=
BUSINESS_EMAIL=
BUSINESS_PHONE=
```

Almacenamiento:

```env
DATABASE_FILE=gyminfinity.db
SESSION_DATABASE_FILE=sessions.sqlite
```

Las variables opcionales para SMTP, proveedor de pagos y WhatsApp están documentadas en `.env.example`.

## Despliegue en Render

Configuración recomendada:

```text
Branch: main
Build Command: npm ci
Start Command: npm start
Health Check: /health
```

Después de actualizar GitHub, Render puede desplegar el último commit desde:

```text
Manual Deploy → Deploy latest commit
```

El plan gratuito utiliza almacenamiento efímero. Para conservar clientes, cuentas, pagos y facturas después de reinicios o despliegues se necesita:

- un disco persistente de Render, o
- una base de datos externa administrada.

## Verificación

La suite actual cubre:

- carga del sitio público;
- protección del panel;
- acceso administrativo;
- solicitudes de valoración;
- registro de clientes;
- pagos y creación de facturas;
- generación real de PDF;
- aprobación de cuentas;
- modificación de membresías;
- CRUD de productos;
- moderación de comentarios;
- credenciales para trabajadores.

## Integraciones pendientes para operación comercial

La plataforma ya funciona como aplicación demostrable y sistema administrativo. Para una operación empresarial completa se recomienda integrar:

- pasarela de pagos en línea;
- facturación electrónica mediante proveedor autorizado;
- envío de correos y facturas;
- recordatorios automáticos de vencimiento;
- dominio propio;
- almacenamiento persistente;
- revisión jurídica y tributaria definitiva.

## Privacidad y datos

Nunca deben publicarse:

- archivos `.env`;
- contraseñas o tokens;
- bases `.db`;
- archivos WAL;
- sesiones;
- copias de seguridad;
- credenciales de servicios externos.

## Estado del proyecto

Gym Infinity Final cuenta con una identidad visual completa, experiencia responsive, administración de clientes y contenido, roles internos, seguridad, pagos, facturación PDF y pruebas automatizadas. Está listo para demostración profesional y preparado para continuar con integraciones comerciales reales.
