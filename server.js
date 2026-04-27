const crypto = require('crypto');
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const port = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const SESSION_COOKIE_NAME = 'gyminfinity_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;
const SESSION_CLEANUP_MS = 1000 * 60 * 15;
const DEFAULT_MEMBERSHIP_DAYS = 30;
const ORDER_STATUSES = ['Pendiente', 'Confirmado', 'Entregado', 'Cancelado'];
const PAYMENT_STATUSES = ['Pendiente', 'Pagado', 'Anulado'];
const PAYMENT_METHODS = ['card', 'cash'];
const PAYMENT_METHOD_LABELS = {
  card: 'Tarjeta de credito',
  cash: 'Efectivo'
};
const GOALS = [
  'Perder peso',
  'Ganar músculo',
  'Mejorar condición',
  'Tonificar'
];

const sessions = new Map();

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();

const hashSecret = (value) => crypto.scryptSync(value, 'gyminfinity-admin-auth', 64);

const getAdminPasswordHash = () => {
  if (process.env.ADMIN_PASSWORD_HASH) {
    return Buffer.from(process.env.ADMIN_PASSWORD_HASH.trim(), 'hex');
  }

  if (process.env.ADMIN_PASSWORD) {
    return hashSecret(process.env.ADMIN_PASSWORD.trim());
  }

  if (isProduction) {
    throw new Error('Debes definir ADMIN_PASSWORD o ADMIN_PASSWORD_HASH en producción.');
  }

  console.warn(
    '[Gyminfinity] Usando credenciales administrativas de desarrollo. Configura ADMIN_PASSWORD antes de desplegar.'
  );

  return hashSecret('GYMADMIN2026');
};

const ADMIN_PASSWORD_HASH = getAdminPasswordHash();

const compareSecret = (candidate, hash) => {
  const candidateHash = hashSecret(candidate);
  return candidateHash.length === hash.length && crypto.timingSafeEqual(candidateHash, hash);
};

const generateToken = () => crypto.randomBytes(32).toString('hex');

const parseCookies = (cookieHeader = '') => cookieHeader
  .split(';')
  .map((chunk) => chunk.trim())
  .filter(Boolean)
  .reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      return cookies;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});

const serializeCookie = (name, value, expiresAt) => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Expires=${new Date(expiresAt).toUTCString()}`,
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

const clearCookie = (name) => {
  const parts = [
    `${name}=`,
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

const createSession = () => ({
  id: generateToken(),
  csrfToken: generateToken(),
  auth: { role: 'guest' },
  flash: null,
  expiresAt: Date.now() + SESSION_DURATION_MS
});

const getSession = (sessionId) => {
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
};

const persistSession = (session) => {
  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  sessions.set(session.id, session);
  return session;
};

const setFlash = (session, type, text) => {
  if (!session) {
    return;
  }

  session.flash = { type, text };
};

const consumeFlash = (session) => {
  if (!session || !session.flash) {
    return null;
  }

  const flash = session.flash;
  session.flash = null;
  return flash;
};

const destroySession = (req, res) => {
  if (req.session?.id) {
    sessions.delete(req.session.id);
  }

  req.session = null;
  res.append('Set-Cookie', clearCookie(SESSION_COOKIE_NAME));
};

const cleanupSessions = () => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
};

setInterval(cleanupSessions, SESSION_CLEANUP_MS).unref();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const trimText = (value, maxLength = 300) => String(value || '').trim().slice(0, maxLength);

const normalizeEmail = (value) => trimText(value, 120).toLowerCase();

const normalizePhone = (value) => {
  const trimmed = trimText(value, 30);
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return trimmed.startsWith('+') ? `+${digits}` : digits;
};

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePositiveFloat = (value) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^\+?\d{7,15}$/.test(phone);
const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const getCardBrand = (cardNumber) => {
  if (/^4/.test(cardNumber)) {
    return 'Visa';
  }

  if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(cardNumber)) {
    return 'American Express';
  }

  return 'Tarjeta';
};

const createInvoiceNumber = (orderId) => {
  const year = new Date().getFullYear();
  return `GYM-${year}-${String(orderId).padStart(6, '0')}`;
};

const createPaymentReference = (prefix = 'PAY') => `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const isValidImageUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
};

const addDays = (baseDate, days) => {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateTime = (value) => {
  if (!value) {
    return 'No disponible';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const formatDate = (value) => {
  if (!value) {
    return 'No disponible';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
};

const calculateMembership = (createdAt, membershipExpiry) => {
  const fallbackExpiry = addDays(createdAt || new Date(), DEFAULT_MEMBERSHIP_DAYS);
  const expiryDate = membershipExpiry ? new Date(membershipExpiry) : fallbackExpiry;
  const now = new Date();
  const millisecondsRemaining = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(millisecondsRemaining / (1000 * 60 * 60 * 24)));
  const isExpired = daysRemaining <= 0;

  return {
    daysRemaining,
    expiryDate,
    expiryLabel: formatDate(expiryDate),
    isExpired,
    membershipTone: isExpired ? 'expired' : daysRemaining <= 5 ? 'warning' : 'active',
    membershipLabel: isExpired ? 'Vencida' : 'Activa'
  };
};

const decorateUser = (user) => {
  const membership = calculateMembership(user.created_at, user.membership_expiry);

  return {
    ...user,
    ...membership,
    createdAtLabel: formatDateTime(user.created_at)
  };
};

const decorateOrder = (order, products) => {
  const product = products.find((item) => item.id === order.product_id);
  const statusTone = order.status === 'Cancelado'
    ? 'danger'
    : order.status === 'Entregado'
      ? 'success'
      : order.status === 'Confirmado'
        ? 'info'
        : 'warning';
  const paymentStatusTone = order.payment_status === 'Pagado'
    ? 'success'
    : order.payment_status === 'Anulado'
      ? 'danger'
      : 'warning';

  return {
    ...order,
    createdAtLabel: formatDateTime(order.created_at),
    invoiceNumber: order.invoice_number || `Pendiente #${order.id}`,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[order.payment_method] || 'Sin metodo',
    paymentStatusTone,
    productName: product ? product.name : 'Producto no disponible',
    statusTone
  };
};

const sortByIdAscending = (items) => [...items].sort((left, right) => left.id - right.id);

const redirectWithFlash = (req, res, target, type, text) => {
  setFlash(req.session, type, text);
  res.redirect(target);
};

const renderPage = (req, res, view, locals = {}) => {
  res.render(view, {
    csrfToken: res.locals.csrfToken,
    currentYear: res.locals.currentYear,
    flash: res.locals.flash,
    viewer: res.locals.viewer,
    ...locals
  });
};

const getViewer = async (req) => {
  if (req.session?.auth?.role === 'admin') {
    return {
      isAdmin: true,
      isClient: false,
      displayName: 'Equipo Gyminfinity'
    };
  }

  if (req.session?.auth?.role === 'client' && req.session.auth.userId) {
    const user = await db.getById('users', req.session.auth.userId);
    if (!user) {
      req.session.auth = { role: 'guest' };
      return {
        isAdmin: false,
        isClient: false
      };
    }

    const decoratedUser = decorateUser(user);

    return {
      isAdmin: false,
      isClient: true,
      displayName: decoratedUser.name,
      user: decoratedUser
    };
  }

  return {
    isAdmin: false,
    isClient: false
  };
};

const findUserByEmailAndPhone = async (email, phone) => {
  const users = await db.queryAll('SELECT * FROM users WHERE lower(email) = ?', [email]);
  return users.find((user) => normalizePhone(user.phone) === phone) || null;
};

const requireCsrf = (req, res, next) => {
  const token = trimText(req.body?.csrfToken, 80);
  if (token && req.session && token === req.session.csrfToken) {
    next();
    return;
  }

  const fallbackTarget = req.session?.auth?.role === 'admin'
    ? '/admin'
    : req.session?.auth?.role === 'client'
      ? '/client'
      : '/';

  redirectWithFlash(req, res, fallbackTarget, 'danger', 'La sesión del formulario expiró. Intenta nuevamente.');
};

const requireAdmin = (req, res, next) => {
  if (req.session?.auth?.role === 'admin') {
    next();
    return;
  }

  redirectWithFlash(req, res, '/admin-login', 'warning', 'Inicia sesión como administrador para continuar.');
};

const requireClient = asyncHandler(async (req, res, next) => {
  if (req.session?.auth?.role !== 'client' || !req.session.auth.userId) {
    redirectWithFlash(req, res, '/client-login', 'warning', 'Inicia sesión para entrar a tu área de cliente.');
    return;
  }

  const user = await db.getById('users', req.session.auth.userId);
  if (!user) {
    req.session.auth = { role: 'guest' };
    redirectWithFlash(req, res, '/client-login', 'danger', 'No encontramos tu sesión. Ingresa nuevamente.');
    return;
  }

  const decoratedUser = decorateUser(user);
  res.locals.viewer = {
    isAdmin: false,
    isClient: true,
    displayName: decoratedUser.name,
    user: decoratedUser
  };
  req.currentUser = decoratedUser;

  if (decoratedUser.isExpired) {
    redirectWithFlash(
      req,
      res,
      '/client/renew',
      'warning',
      'Tu membresía está vencida. Renueva para recuperar el acceso completo.'
    );
    return;
  }

  next();
});

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https://images.unsplash.com; connect-src 'self'"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const existingSession = getSession(cookies[SESSION_COOKIE_NAME]);
  const session = persistSession(existingSession || createSession());

  req.session = session;
  res.locals.csrfToken = session.csrfToken;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.flash = consumeFlash(session);
  res.locals.viewer = {
    isAdmin: false,
    isClient: false
  };

  res.append('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, session.id, session.expiresAt));
  next();
});

app.get('/', asyncHandler(async (req, res) => {
  const [workouts, diets, products, plans, viewer] = await Promise.all([
    db.getAll('workouts'),
    db.getAll('diets'),
    db.getAll('products'),
    db.getAll('plans'),
    getViewer(req)
  ]);

  res.locals.viewer = viewer;

  renderPage(req, res, 'index', {
    diets: sortByIdAscending(diets),
    plans: sortByIdAscending(plans),
    products: sortByIdAscending(products),
    viewer,
    workouts: sortByIdAscending(workouts)
  });
}));

app.post('/signup', requireCsrf, asyncHandler(async (req, res) => {
  const name = trimText(req.body.name, 80);
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const plan = trimText(req.body.plan, 80);
  const goal = trimText(req.body.goal, 50);
  const age = parsePositiveInteger(req.body.age);
  const weight = parsePositiveFloat(req.body.weight);
  const height = parsePositiveFloat(req.body.height);

  if (!name || name.length < 3) {
    redirectWithFlash(req, res, '/', 'danger', 'Escribe un nombre completo válido.');
    return;
  }

  if (!isValidEmail(email)) {
    redirectWithFlash(req, res, '/', 'danger', 'Ingresa un correo electrónico válido.');
    return;
  }

  if (!isValidPhone(phone)) {
    redirectWithFlash(req, res, '/', 'danger', 'Ingresa un teléfono válido con al menos 7 dígitos.');
    return;
  }

  if (!GOALS.includes(goal)) {
    redirectWithFlash(req, res, '/', 'danger', 'Selecciona un objetivo válido.');
    return;
  }

  if (!age || age < 12 || age > 90) {
    redirectWithFlash(req, res, '/', 'danger', 'La edad debe estar entre 12 y 90 años.');
    return;
  }

  if (!weight || weight < 20 || weight > 300) {
    redirectWithFlash(req, res, '/', 'danger', 'El peso debe estar entre 20 kg y 300 kg.');
    return;
  }

  if (!height || height < 100 || height > 250) {
    redirectWithFlash(req, res, '/', 'danger', 'La estatura debe estar entre 100 cm y 250 cm.');
    return;
  }

  const [selectedPlan, existingUser] = await Promise.all([
    db.queryOne('SELECT * FROM plans WHERE name = ?', [plan]),
    db.queryOne('SELECT * FROM users WHERE lower(email) = ?', [email])
  ]);

  if (!selectedPlan) {
    redirectWithFlash(req, res, '/', 'danger', 'El plan seleccionado no existe o ya no está disponible.');
    return;
  }

  if (existingUser) {
    redirectWithFlash(
      req,
      res,
      '/client-login',
      'warning',
      'Ya existe una cuenta con ese correo. Inicia sesión con tu correo y teléfono.'
    );
    return;
  }

  const createdAt = new Date();
  const membershipExpiry = addDays(createdAt, DEFAULT_MEMBERSHIP_DAYS);
  const result = await db.insert('users', {
    age,
    created_at: createdAt.toISOString(),
    email,
    goal,
    height,
    membership_expiry: membershipExpiry.toISOString(),
    membership_status: 'Activo',
    name,
    phone,
    plan: selectedPlan.name,
    role: 'Cliente',
    weight
  });

  req.session.auth = {
    role: 'client',
    userId: result.lastID
  };

  redirectWithFlash(
    req,
    res,
    '/client',
    'success',
    'Registro completado. Tu acceso de cliente ya está activo.'
  );
}));

app.get('/client-login', asyncHandler(async (req, res) => {
  if (req.session?.auth?.role === 'client' && req.session?.auth?.userId) {
    res.redirect('/client');
    return;
  }

  const viewer = await getViewer(req);
  res.locals.viewer = viewer;

  renderPage(req, res, 'client-login', { viewer });
}));

app.post('/client-login', requireCsrf, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);

  if (!isValidEmail(email) || !isValidPhone(phone)) {
    redirectWithFlash(
      req,
      res,
      '/client-login',
      'danger',
      'Usa el mismo correo y teléfono con el que te registraste.'
    );
    return;
  }

  const user = await findUserByEmailAndPhone(email, phone);
  if (!user) {
    redirectWithFlash(
      req,
      res,
      '/client-login',
      'danger',
      'No encontramos una cuenta con esos datos.'
    );
    return;
  }

  req.session.auth = {
    role: 'client',
    userId: user.id
  };

  const decoratedUser = decorateUser(user);
  if (decoratedUser.isExpired) {
    redirectWithFlash(
      req,
      res,
      '/client/renew',
      'warning',
      'Tu membresía está vencida. Renueva para volver a entrar al área completa.'
    );
    return;
  }

  redirectWithFlash(req, res, '/client', 'success', 'Bienvenido de nuevo a tu área de cliente.');
}));

app.get('/admin-login', asyncHandler(async (req, res) => {
  if (req.session?.auth?.role === 'admin') {
    res.redirect('/admin');
    return;
  }

  const viewer = await getViewer(req);
  res.locals.viewer = viewer;

  renderPage(req, res, 'admin-login', { viewer });
}));

app.post('/admin-login', requireCsrf, asyncHandler(async (req, res) => {
  const username = trimText(req.body.username, 60).toLowerCase();
  const password = trimText(req.body.password, 128);

  if (username !== ADMIN_USERNAME.toLowerCase() || !compareSecret(password, ADMIN_PASSWORD_HASH)) {
    redirectWithFlash(req, res, '/admin-login', 'danger', 'Credenciales inválidas. Intenta nuevamente.');
    return;
  }

  req.session.auth = { role: 'admin' };
  redirectWithFlash(req, res, '/admin', 'success', 'Sesión administrativa iniciada correctamente.');
}));

app.post('/logout', requireCsrf, (req, res) => {
  destroySession(req, res);
  res.redirect('/');
});

app.get('/admin', requireAdmin, asyncHandler(async (req, res) => {
  const [users, orders, products, plans, workouts, diets] = await Promise.all([
    db.getAll('users'),
    db.getAll('orders'),
    db.getAll('products'),
    db.getAll('plans'),
    db.getAll('workouts'),
    db.getAll('diets')
  ]);

  const decoratedUsers = users.map(decorateUser);
  const decoratedOrders = orders.map((order) => decorateOrder(order, products));
  const metrics = {
    activeUsers: decoratedUsers.filter((user) => !user.isExpired).length,
    expiredUsers: decoratedUsers.filter((user) => user.isExpired).length,
    paidInvoices: decoratedOrders.filter((order) => order.payment_status === 'Pagado').length,
    pendingOrders: decoratedOrders.filter((order) => order.status === 'Pendiente').length,
    totalOrders: decoratedOrders.length,
    totalProducts: products.length,
    totalUsers: decoratedUsers.length
  };

  res.locals.viewer = {
    isAdmin: true,
    isClient: false,
    displayName: 'Equipo Gyminfinity'
  };

  renderPage(req, res, 'admin', {
    diets: sortByIdAscending(diets),
    metrics,
    orderStatuses: ORDER_STATUSES,
    orders: decoratedOrders,
    paymentStatuses: PAYMENT_STATUSES,
    plans: sortByIdAscending(plans),
    products: sortByIdAscending(products),
    users: decoratedUsers,
    workouts: sortByIdAscending(workouts)
  });
}));

app.post('/admin/products/add', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const name = trimText(req.body.name, 80);
  const price = trimText(req.body.price, 40);
  const imageUrl = trimText(req.body.imageUrl, 300);
  const description = trimText(req.body.description, 400);

  if (!name || !price || !description) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Completa todos los datos del producto.');
    return;
  }

  if (!isValidImageUrl(imageUrl)) {
    redirectWithFlash(req, res, '/admin', 'danger', 'La imagen del producto debe ser una URL válida.');
    return;
  }

  await db.insert('products', {
    description,
    image_url: imageUrl,
    name,
    price
  });

  redirectWithFlash(req, res, '/admin', 'success', 'Producto agregado correctamente.');
}));

app.post('/admin/products/update', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  const name = trimText(req.body.name, 80);
  const price = trimText(req.body.price, 40);
  const imageUrl = trimText(req.body.imageUrl, 300);
  const description = trimText(req.body.description, 400);

  if (!id || !name || !price || !description) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Verifica la información del producto a actualizar.');
    return;
  }

  if (!isValidImageUrl(imageUrl)) {
    redirectWithFlash(req, res, '/admin', 'danger', 'La imagen del producto debe ser una URL válida.');
    return;
  }

  const product = await db.getById('products', id);
  if (!product) {
    redirectWithFlash(req, res, '/admin', 'warning', 'El producto que intentas editar ya no existe.');
    return;
  }

  await db.update('products', {
    description,
    image_url: imageUrl,
    name,
    price
  }, 'id = ?', [id]);

  redirectWithFlash(req, res, '/admin', 'success', 'Producto actualizado correctamente.');
}));

app.post('/admin/products/delete', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  if (!id) {
    redirectWithFlash(req, res, '/admin', 'danger', 'No pudimos identificar el producto a eliminar.');
    return;
  }

  const product = await db.getById('products', id);
  if (!product) {
    redirectWithFlash(req, res, '/admin', 'warning', 'El producto ya no existe.');
    return;
  }

  await db.remove('products', id);
  redirectWithFlash(req, res, '/admin', 'success', 'Producto eliminado correctamente.');
}));

app.post('/admin/plans/add', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const name = trimText(req.body.name, 80);
  const price = trimText(req.body.price, 40);
  const features = trimText(req.body.features, 400);

  if (!name || !price || !features) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Completa todos los datos del plan.');
    return;
  }

  await db.insert('plans', {
    features,
    name,
    price
  });

  redirectWithFlash(req, res, '/admin', 'success', 'Plan agregado correctamente.');
}));

app.post('/admin/plans/update', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  const name = trimText(req.body.name, 80);
  const price = trimText(req.body.price, 40);
  const features = trimText(req.body.features, 400);

  if (!id || !name || !price || !features) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Verifica la información del plan a actualizar.');
    return;
  }

  const plan = await db.getById('plans', id);
  if (!plan) {
    redirectWithFlash(req, res, '/admin', 'warning', 'El plan que intentas editar ya no existe.');
    return;
  }

  await db.update('plans', {
    features,
    name,
    price
  }, 'id = ?', [id]);

  redirectWithFlash(req, res, '/admin', 'success', 'Plan actualizado correctamente.');
}));

app.post('/admin/plans/delete', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  if (!id) {
    redirectWithFlash(req, res, '/admin', 'danger', 'No pudimos identificar el plan a eliminar.');
    return;
  }

  const plan = await db.getById('plans', id);
  if (!plan) {
    redirectWithFlash(req, res, '/admin', 'warning', 'El plan ya no existe.');
    return;
  }

  await db.remove('plans', id);
  redirectWithFlash(req, res, '/admin', 'success', 'Plan eliminado correctamente.');
}));

app.post('/admin/workouts/add', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const title = trimText(req.body.title, 80);
  const duration = trimText(req.body.duration, 40);
  const difficulty = trimText(req.body.difficulty, 40);
  const description = trimText(req.body.description, 400);

  if (!title || !duration || !difficulty || !description) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Completa todos los datos de la rutina.');
    return;
  }

  await db.insert('workouts', {
    description,
    difficulty,
    duration,
    title
  });

  redirectWithFlash(req, res, '/admin', 'success', 'Rutina agregada correctamente.');
}));

app.post('/admin/workouts/update', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  const title = trimText(req.body.title, 80);
  const duration = trimText(req.body.duration, 40);
  const difficulty = trimText(req.body.difficulty, 40);
  const description = trimText(req.body.description, 400);

  if (!id || !title || !duration || !difficulty || !description) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Verifica la información de la rutina a actualizar.');
    return;
  }

  const workout = await db.getById('workouts', id);
  if (!workout) {
    redirectWithFlash(req, res, '/admin', 'warning', 'La rutina que intentas editar ya no existe.');
    return;
  }

  await db.update('workouts', {
    description,
    difficulty,
    duration,
    title
  }, 'id = ?', [id]);

  redirectWithFlash(req, res, '/admin', 'success', 'Rutina actualizada correctamente.');
}));

app.post('/admin/workouts/delete', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  if (!id) {
    redirectWithFlash(req, res, '/admin', 'danger', 'No pudimos identificar la rutina a eliminar.');
    return;
  }

  const workout = await db.getById('workouts', id);
  if (!workout) {
    redirectWithFlash(req, res, '/admin', 'warning', 'La rutina ya no existe.');
    return;
  }

  await db.remove('workouts', id);
  redirectWithFlash(req, res, '/admin', 'success', 'Rutina eliminada correctamente.');
}));

app.post('/admin/diets/add', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const title = trimText(req.body.title, 80);
  const calories = trimText(req.body.calories, 40);
  const description = trimText(req.body.description, 400);

  if (!title || !calories || !description) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Completa todos los datos de la dieta.');
    return;
  }

  await db.insert('diets', {
    calories,
    description,
    title
  });

  redirectWithFlash(req, res, '/admin', 'success', 'Plan alimenticio agregado correctamente.');
}));

app.post('/admin/diets/update', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  const title = trimText(req.body.title, 80);
  const calories = trimText(req.body.calories, 40);
  const description = trimText(req.body.description, 400);

  if (!id || !title || !calories || !description) {
    redirectWithFlash(req, res, '/admin', 'danger', 'Verifica la información de la dieta a actualizar.');
    return;
  }

  const diet = await db.getById('diets', id);
  if (!diet) {
    redirectWithFlash(req, res, '/admin', 'warning', 'La dieta que intentas editar ya no existe.');
    return;
  }

  await db.update('diets', {
    calories,
    description,
    title
  }, 'id = ?', [id]);

  redirectWithFlash(req, res, '/admin', 'success', 'Plan alimenticio actualizado correctamente.');
}));

app.post('/admin/diets/delete', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const id = parsePositiveInteger(req.body.id);
  if (!id) {
    redirectWithFlash(req, res, '/admin', 'danger', 'No pudimos identificar la dieta a eliminar.');
    return;
  }

  const diet = await db.getById('diets', id);
  if (!diet) {
    redirectWithFlash(req, res, '/admin', 'warning', 'La dieta ya no existe.');
    return;
  }

  await db.remove('diets', id);
  redirectWithFlash(req, res, '/admin', 'success', 'Plan alimenticio eliminado correctamente.');
}));

app.post('/admin/user/renew', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const userId = parsePositiveInteger(req.body.userId);
  const days = parsePositiveInteger(req.body.days);

  if (!userId || !days || days > 365) {
    redirectWithFlash(
      req,
      res,
      '/admin#users',
      'danger',
      'La renovación debe ser entre 1 y 365 días.'
    );
    return;
  }

  const user = await db.getById('users', userId);
  if (!user) {
    redirectWithFlash(req, res, '/admin#users', 'warning', 'El usuario ya no existe.');
    return;
  }

  const decoratedUser = decorateUser(user);
  const renewalBase = decoratedUser.isExpired
    ? new Date()
    : decoratedUser.expiryDate;
  const newExpiry = addDays(renewalBase, days);

  await db.update('users', {
    membership_expiry: newExpiry.toISOString(),
    membership_status: 'Activo'
  }, 'id = ?', [userId]);

  redirectWithFlash(req, res, '/admin#users', 'success', 'Membresía renovada correctamente.');
}));

app.post('/admin/orders/status', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parsePositiveInteger(req.body.orderId);
  const status = trimText(req.body.status, 20);

  if (!orderId || !ORDER_STATUSES.includes(status)) {
    redirectWithFlash(req, res, '/admin#orders', 'danger', 'Selecciona un estado válido para el pedido.');
    return;
  }

  const order = await db.getById('orders', orderId);
  if (!order) {
    redirectWithFlash(req, res, '/admin#orders', 'warning', 'El pedido ya no existe.');
    return;
  }

  await db.update('orders', { status }, 'id = ?', [orderId]);
  redirectWithFlash(req, res, '/admin#orders', 'success', 'Estado del pedido actualizado.');
}));

app.post('/admin/billing/status', requireCsrf, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parsePositiveInteger(req.body.orderId);
  const paymentStatus = trimText(req.body.paymentStatus, 20);

  if (!orderId || !PAYMENT_STATUSES.includes(paymentStatus)) {
    redirectWithFlash(req, res, '/admin#billing', 'danger', 'Selecciona un estado de pago valido.');
    return;
  }

  const order = await db.getById('orders', orderId);
  if (!order) {
    redirectWithFlash(req, res, '/admin#billing', 'warning', 'La factura ya no existe.');
    return;
  }

  await db.update('orders', { payment_status: paymentStatus }, 'id = ?', [orderId]);
  redirectWithFlash(req, res, '/admin#billing', 'success', 'Estado de pago actualizado.');
}));

app.get('/client', requireClient, asyncHandler(async (req, res) => {
  const [workouts, diets, products, plans] = await Promise.all([
    db.getAll('workouts'),
    db.getAll('diets'),
    db.getAll('products'),
    db.getAll('plans')
  ]);

  renderPage(req, res, 'client', {
    currentUser: req.currentUser,
    diets: sortByIdAscending(diets),
    plans: sortByIdAscending(plans),
    products: sortByIdAscending(products),
    workouts: sortByIdAscending(workouts)
  });
}));

app.post('/order', requireCsrf, requireClient, asyncHandler(async (req, res) => {
  const productId = parsePositiveInteger(req.body.productId);
  const address = trimText(req.body.address, 180);
  const paymentMethod = trimText(req.body.paymentMethod, 20);
  const billingName = trimText(req.body.billingName, 100) || req.currentUser.name;
  const billingDocument = trimText(req.body.billingDocument, 30);
  const billingPhone = normalizePhone(req.body.billingPhone || req.currentUser.phone);
  const billingEmail = normalizeEmail(req.body.billingEmail || req.currentUser.email);
  const billingAddress = trimText(req.body.billingAddress || address, 180);

  if (!billingName || !billingDocument || !billingPhone || !billingEmail || !billingAddress) {
    redirectWithFlash(req, res, '/client#catalogo', 'danger', 'Completa los datos de entrega y facturacion para solicitar tu compra.');
    return;
  }

  if (!isValidEmail(billingEmail) || !isValidPhone(billingPhone)) {
    redirectWithFlash(req, res, '/client#catalogo', 'danger', 'Verifica el correo y telefono de facturacion.');
    return;
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    redirectWithFlash(req, res, '/client#catalogo', 'danger', 'Selecciona un metodo de pago valido.');
    return;
  }

  if (!productId || !address) {
    redirectWithFlash(req, res, '/client', 'danger', 'Completa la dirección de entrega para solicitar tu compra.');
    return;
  }

  const product = await db.getById('products', productId);
  if (!product) {
    redirectWithFlash(req, res, '/client', 'danger', 'El producto seleccionado ya no está disponible.');
    return;
  }

  const paymentData = {
    card_brand: null,
    card_holder: null,
    card_installments: null,
    card_last4: null,
    cash_notes: null,
    cash_receiver: null,
    payment_reference: null,
    payment_status: 'Pendiente'
  };

  if (paymentMethod === 'card') {
    const cardNumber = onlyDigits(req.body.cardNumber);
    const cardHolder = trimText(req.body.cardHolder, 100);
    const cardExpiry = trimText(req.body.cardExpiry, 7);
    const cardCvv = onlyDigits(req.body.cardCvv);
    const cardInstallments = parsePositiveInteger(req.body.cardInstallments) || 1;

    if (cardNumber.length < 13 || cardNumber.length > 19 || !cardHolder || !/^\d{2}\/\d{2}$/.test(cardExpiry) || cardCvv.length < 3 || cardCvv.length > 4 || cardInstallments > 12) {
      redirectWithFlash(req, res, '/client#catalogo', 'danger', 'Verifica los datos de la tarjeta para emitir la factura.');
      return;
    }

    paymentData.card_brand = getCardBrand(cardNumber);
    paymentData.card_holder = cardHolder;
    paymentData.card_installments = cardInstallments;
    paymentData.card_last4 = cardNumber.slice(-4);
    paymentData.payment_reference = createPaymentReference('CARD');
    paymentData.payment_status = 'Pagado';
  }

  if (paymentMethod === 'cash') {
    paymentData.cash_receiver = trimText(req.body.cashReceiver, 100) || billingName;
    paymentData.cash_notes = trimText(req.body.cashNotes, 220);
    paymentData.payment_reference = createPaymentReference('CASH');
    paymentData.payment_status = 'Pendiente';
  }

  const result = await db.insert('orders', {
    address,
    billing_address: billingAddress,
    billing_document: billingDocument,
    billing_email: billingEmail,
    billing_name: billingName,
    billing_phone: billingPhone,
    created_at: new Date().toISOString(),
    email: req.currentUser.email,
    full_name: req.currentUser.name,
    invoice_status: 'Emitida',
    payment_method: paymentMethod,
    product_id: productId,
    status: 'Pendiente',
    user_id: req.currentUser.id,
    ...paymentData
  });

  const invoiceNumber = createInvoiceNumber(result.lastID);
  await db.update('orders', { invoice_number: invoiceNumber }, 'id = ?', [result.lastID]);

  redirectWithFlash(
    req,
    res,
    '/client#catalogo',
    'success',
    `Factura ${invoiceNumber} emitida para ${product.name}. Metodo: ${PAYMENT_METHOD_LABELS[paymentMethod]}.`
  );
}));

app.get('/client/renew', asyncHandler(async (req, res) => {
  const viewer = await getViewer(req);
  res.locals.viewer = viewer;

  if (viewer.user && !viewer.user.isExpired) {
    res.redirect('/client');
    return;
  }

  renderPage(req, res, 'renew-membership', {
    currentUser: viewer.user || null,
    viewer
  });
}));

app.get('/about', (req, res) => {
  res.redirect('/#contact');
});

app.use((req, res) => {
  res.status(404);
  renderPage(req, res, '404');
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    next(error);
    return;
  }

  const target = req.session?.auth?.role === 'admin'
    ? '/admin'
    : req.session?.auth?.role === 'client'
      ? '/client'
      : '/';

  setFlash(req.session, 'danger', 'Ocurrió un error inesperado. Intenta nuevamente.');
  res.redirect(target);
});

db.ready
  .then(() => {
    app.listen(port, () => {
      console.log(`Gyminfinity funcionando en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo iniciar Gyminfinity.', error);
    process.exit(1);
  });
