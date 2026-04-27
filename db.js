const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'gyminfinity.db');
const db = new sqlite3.Database(dbFile);

const allowedTables = new Set(['users', 'workouts', 'diets', 'products', 'plans', 'orders']);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve(this);
  });
});

const queryAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows);
  });
});

const queryOne = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(row || null);
  });
});

const assertAllowedTable = (table) => {
  if (!allowedTables.has(table)) {
    throw new Error(`Tabla no permitida: ${table}`);
  }

  return table;
};

const tableHasColumn = async (table, column) => {
  const safeTable = assertAllowedTable(table);
  const columns = await queryAll(`PRAGMA table_info(${safeTable})`);
  return columns.some((col) => col.name === column);
};

const ensureColumn = async (table, column, definition) => {
  if (!(await tableHasColumn(table, column))) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const createTables = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      plan TEXT NOT NULL,
      goal TEXT NOT NULL,
      age INTEGER NOT NULL,
      weight REAL NOT NULL,
      height REAL NOT NULL,
      role TEXT DEFAULT 'Cliente',
      created_at TEXT NOT NULL,
      membership_expiry TEXT,
      membership_status TEXT DEFAULT 'Activo'
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS diets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      calories TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      features TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT DEFAULT 'Pendiente',
      created_at TEXT NOT NULL
    )
  `);

  await ensureColumn('users', 'role', "TEXT DEFAULT 'Cliente'");
  await ensureColumn('users', 'goal', 'TEXT');
  await ensureColumn('users', 'age', 'INTEGER');
  await ensureColumn('users', 'weight', 'REAL');
  await ensureColumn('users', 'height', 'REAL');
  await ensureColumn('users', 'membership_expiry', 'TEXT');
  await ensureColumn('users', 'membership_status', "TEXT DEFAULT 'Activo'");
  await ensureColumn('products', 'image_url', 'TEXT');
  await ensureColumn('orders', 'status', "TEXT DEFAULT 'Pendiente'");
  await ensureColumn('orders', 'user_id', 'INTEGER');
  await ensureColumn('orders', 'created_at', 'TEXT');
  await ensureColumn('orders', 'invoice_number', 'TEXT');
  await ensureColumn('orders', 'invoice_status', "TEXT DEFAULT 'Emitida'");
  await ensureColumn('orders', 'payment_method', 'TEXT');
  await ensureColumn('orders', 'payment_status', "TEXT DEFAULT 'Pendiente'");
  await ensureColumn('orders', 'billing_name', 'TEXT');
  await ensureColumn('orders', 'billing_document', 'TEXT');
  await ensureColumn('orders', 'billing_phone', 'TEXT');
  await ensureColumn('orders', 'billing_email', 'TEXT');
  await ensureColumn('orders', 'billing_address', 'TEXT');
  await ensureColumn('orders', 'payment_reference', 'TEXT');
  await ensureColumn('orders', 'card_brand', 'TEXT');
  await ensureColumn('orders', 'card_last4', 'TEXT');
  await ensureColumn('orders', 'card_holder', 'TEXT');
  await ensureColumn('orders', 'card_installments', 'INTEGER');
  await ensureColumn('orders', 'cash_receiver', 'TEXT');
  await ensureColumn('orders', 'cash_notes', 'TEXT');

  await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await run('CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number)');

  const workoutCount = await queryOne('SELECT COUNT(*) AS count FROM workouts');
  if (workoutCount.count === 0) {
    const workouts = [
      ['Full Body Power', '45 min', 'Avanzado', 'Circuito de fuerza y resistencia para todo el cuerpo.'],
      ['Cardio Intenso', '30 min', 'Intermedio', 'Entrenamiento aeróbico con intervalos de alta intensidad.'],
      ['Tonificación Core', '40 min', 'Principiante', 'Ejercicios para abdomen, espalda y postura.']
    ];

    for (const workout of workouts) {
      await run(
        'INSERT INTO workouts (title, duration, difficulty, description) VALUES (?, ?, ?, ?)',
        workout
      );
    }
  }

  const dietCount = await queryOne('SELECT COUNT(*) AS count FROM diets');
  if (dietCount.count === 0) {
    const diets = [
      ['Plan Verde', '1,500 kcal', 'Menú diario equilibrado con vegetales, proteínas y grasas saludables.'],
      ['Energía Total', '1,800 kcal', 'Alto en proteínas para apoyar el entrenamiento de fuerza.'],
      ['Definición Lean', '1,400 kcal', 'Control de carbohidratos y enfoque en alimentos magros.']
    ];

    for (const diet of diets) {
      await run('INSERT INTO diets (title, calories, description) VALUES (?, ?, ?)', diet);
    }
  }

  const productCount = await queryOne('SELECT COUNT(*) AS count FROM products');
  if (productCount.count === 0) {
    const products = [
      [
        'Gym Pack Infinity',
        'COP $190.000',
        'Set completo con botella, banda de resistencia y planificador de entreno.',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
      ],
      [
        'Botella Smart',
        'COP $89.000',
        'Botella deportiva con indicador de temperatura y diseño premium.',
        'https://images.unsplash.com/photo-1510626176961-4b42d7ffe4dc?auto=format&fit=crop&w=900&q=80'
      ],
      [
        'Guantes Pro',
        'COP $129.000',
        'Guantes de entrenamiento con soporte ergonómico y material antideslizante.',
        'https://images.unsplash.com/photo-1599058917219-408b1758a5e9?auto=format&fit=crop&w=900&q=80'
      ]
    ];

    for (const product of products) {
      await run(
        'INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)',
        product
      );
    }
  } else {
    const productImages = [
      {
        name: 'Gym Pack Infinity',
        url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Botella Smart',
        url: 'https://images.unsplash.com/photo-1510626176961-4b42d7ffe4dc?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Guantes Pro',
        url: 'https://images.unsplash.com/photo-1599058917219-408b1758a5e9?auto=format&fit=crop&w=900&q=80'
      }
    ];

    for (const item of productImages) {
      await run(
        'UPDATE products SET image_url = ? WHERE name = ? AND (image_url IS NULL OR image_url = "")',
        [item.url, item.name]
      );
    }
  }

  const planCount = await queryOne('SELECT COUNT(*) AS count FROM plans');
  if (planCount.count === 0) {
    const plans = [
      ['Inicio', 'COP $79.000/mes', 'Acceso a clases básicas, seguimiento de progreso y comunidad en línea.'],
      ['Fitness Pro', 'COP $149.000/mes', 'Clases premium, asesoría de nutrición y planes personalizados.'],
      ['Infinity Elite', 'COP $219.000/mes', 'Entrenamiento VIP, soporte 1 a 1 y descuentos en productos.']
    ];

    for (const plan of plans) {
      await run('INSERT INTO plans (name, price, features) VALUES (?, ?, ?)', plan);
    }
  }
};

const getAll = async (table) => {
  const safeTable = assertAllowedTable(table);
  return queryAll(`SELECT * FROM ${safeTable} ORDER BY id DESC`);
};

const getById = async (table, id) => {
  const safeTable = assertAllowedTable(table);
  return queryOne(`SELECT * FROM ${safeTable} WHERE id = ?`, [id]);
};

const insert = async (table, data) => {
  const safeTable = assertAllowedTable(table);
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((column) => data[column]);

  return run(
    `INSERT INTO ${safeTable} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
};

const update = async (table, data, whereClause, whereParams = []) => {
  const safeTable = assertAllowedTable(table);
  const columns = Object.keys(data);
  const assignments = columns.map((column) => `${column} = ?`).join(', ');
  const values = [...columns.map((column) => data[column]), ...whereParams];

  return run(`UPDATE ${safeTable} SET ${assignments} WHERE ${whereClause}`, values);
};

const remove = async (table, id) => {
  const safeTable = assertAllowedTable(table);
  return run(`DELETE FROM ${safeTable} WHERE id = ?`, [id]);
};

const ready = createTables();

module.exports = {
  getAll,
  getById,
  insert,
  queryAll,
  queryOne,
  ready,
  remove,
  update
};
