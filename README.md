# Gym Infinity Final

Gym Infinity es un proyecto académico que desarrollé para aplicar conocimientos de programación web en una situación cercana a un negocio real. La idea fue crear una página para un gimnasio que no se quedara solamente en la parte visual, sino que también permitiera organizar clientes, membresías, pagos, rutinas, alimentación y tareas administrativas.

Aunque nació como un proyecto de estudiante, intenté mantener una estructura ordenada, una presentación profesional y funciones que podrían servir como base para una aplicación real.

## Objetivo del proyecto

El objetivo principal fue aprender a conectar una interfaz responsive con un servidor, una base de datos y diferentes tipos de usuarios. Durante el desarrollo trabajé especialmente en:

- diseño adaptable para computadores y dispositivos móviles;
- formularios y validación de información;
- autenticación y permisos;
- operaciones CRUD;
- manejo de membresías y pagos;
- generación de documentos PDF;
- seguridad básica para una aplicación web;
- pruebas automáticas y despliegue.

## Aplicación en línea

**[Abrir Gym Infinity](https://gym-infinity.onrender.com)**

El servicio utiliza el plan gratuito de Render, por lo que el primer acceso después de un periodo de inactividad puede tardar aproximadamente 50 segundos.

## Funciones que desarrollé

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

## Tecnologías utilizadas

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

## Posibles mejoras futuras

La plataforma funciona como demostración académica y sistema administrativo inicial. Si en el futuro se quisiera utilizar en un gimnasio real, todavía sería importante integrar:

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

## Lo que aprendí

Este proyecto me permitió practicar el recorrido completo de una aplicación: organizar la interfaz, conectar formularios con el servidor, diseñar tablas en SQLite, manejar sesiones, crear roles, validar pagos, producir un PDF y publicar los cambios con GitHub y Render.

También aprendí que una aplicación no termina cuando “se ve bien”. Es necesario pensar en seguridad, datos, mensajes de error, experiencia móvil, pruebas y mantenimiento.

## Estado actual

La versión actual incluye una identidad visual completa, experiencia responsive, administración de clientes y contenido, roles internos, seguridad, pagos, facturación PDF y pruebas automatizadas. La considero una versión sólida para presentar como proyecto estudiantil, explicar el proceso de desarrollo y continuar agregando integraciones en el futuro.
