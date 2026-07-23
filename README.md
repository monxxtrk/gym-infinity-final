# Gym Infinity

Aplicación profesional para la operación de un gimnasio: clientes, accesos, membresías, pagos, comprobantes, asistencia, rutinas, alimentación, productos, solicitudes y moderación de comentarios.

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
