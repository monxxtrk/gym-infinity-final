const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

function initializeDatabase(databaseFile = process.env.DATABASE_FILE || "gyminfinity.db") {
  const filename = databaseFile === ":memory:" ? databaseFile : path.isAbsolute(databaseFile) ? databaseFile : path.join(__dirname, "..", databaseFile);
  const db = new sqlite3.Database(filename);
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");
    db.run("PRAGMA journal_mode = WAL");
    createSchema(db);
    migrateSchema(db);
    seedDatabase(db);
  });
  return db;
}

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      goal TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      access_granted INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price INTEGER NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Fitness',
      stock INTEGER NOT NULL DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      benefits TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      level TEXT NOT NULL,
      focus TEXT NOT NULL,
      duration TEXT NOT NULL,
      frequency TEXT NOT NULL,
      description TEXT NOT NULL,
      exercises TEXT NOT NULL,
      image_url TEXT NOT NULL
      ,access_level TEXT NOT NULL DEFAULT 'gratis'
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL UNIQUE,
      goal TEXT NOT NULL,
      comment TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nutrition_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      goal TEXT NOT NULL,
      calories TEXT NOT NULL,
      description TEXT NOT NULL,
      meals TEXT NOT NULL,
      image_url TEXT NOT NULL
      ,access_level TEXT NOT NULL DEFAULT 'gratis'
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      goal TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      membership_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'activo',
      goal TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT CURRENT_DATE,
      membership_start TEXT NOT NULL DEFAULT CURRENT_DATE,
      membership_end TEXT,
      notes TEXT,
      FOREIGN KEY (membership_id) REFERENCES memberships(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      check_in TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      membership_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pagado',
      notes TEXT,
      concept TEXT,
      received_by TEXT,
      paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (membership_id) REFERENCES memberships(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL UNIQUE,
      invoice_number TEXT NOT NULL UNIQUE,
      issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      path TEXT NOT NULL,
      ip_address TEXT,
      status_code INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function migrateSchema(db) {
  db.run("ALTER TABLE users ADD COLUMN password_hash TEXT", () => {});
  db.run("ALTER TABLE payments ADD COLUMN concept TEXT", () => {});
  db.run("ALTER TABLE payments ADD COLUMN received_by TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN phone TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN goal TEXT", () => {});
  db.run("ALTER TABLE users ADD COLUMN access_granted INTEGER NOT NULL DEFAULT 1", () => {});
  db.run("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'Fitness'", () => {});
  db.run("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 10", () => {});
  db.run("ALTER TABLE members ADD COLUMN membership_start TEXT", () => {});
  db.run("ALTER TABLE members ADD COLUMN membership_end TEXT", () => {});
  db.run("ALTER TABLE members ADD COLUMN notes TEXT", () => {});
  db.run("ALTER TABLE routines ADD COLUMN access_level TEXT NOT NULL DEFAULT 'gratis'", () => {});
  db.run("ALTER TABLE nutrition_plans ADD COLUMN access_level TEXT NOT NULL DEFAULT 'gratis'", () => {});
  db.run("ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'pendiente'", () => {});
  db.run("UPDATE products SET price = 189000, image_url = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=82' WHERE name = 'Gym Pack Infinity'", () => {});
  db.run("UPDATE products SET price = 69000, image_url = 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1200&q=82' WHERE name = 'Botella Smart'", () => {});
  db.run("UPDATE products SET price = 59000, image_url = 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=82' WHERE name = 'Guantes Pro'", () => {});
  db.run("UPDATE products SET description = replace(description, 'asesoria', 'asesoría') WHERE description LIKE '%asesoria%'", () => {});
  db.run("UPDATE routines SET title = 'Glúteo y Pierna Pro' WHERE title = 'Gluteo y Pierna Pro'", () => {});
  db.run("UPDATE routines SET title = 'Glúteo Infinity 6S' WHERE title = 'Gluteo Infinity 6S'", () => {});
  db.run("UPDATE nutrition_plans SET title = 'Definición Inteligente' WHERE title = 'Definicion Inteligente'", () => {});
  db.run("UPDATE nutrition_plans SET title = 'Músculo Pro' WHERE title = 'Musculo Pro'", () => {});
  db.run("UPDATE nutrition_plans SET title = 'Energía Diaria' WHERE title = 'Energia Diaria'", () => {});
  db.run("UPDATE nutrition_plans SET title = 'Balance 21 Días' WHERE title = 'Balance 21 Dias'", () => {});
  db.run("UPDATE products SET name = 'Proteína Whey Infinity' WHERE name = 'Proteina Whey Infinity'", () => {});
  db.run(`UPDATE routines SET
    focus = replace(replace(focus, 'Gluteo', 'Glúteo'), 'Tecnica', 'Técnica'),
    frequency = replace(frequency, 'dias/semana', 'días/semana'),
    description = replace(replace(replace(replace(description, 'tecnica', 'técnica'), 'condicion', 'condición'), 'maquinas', 'máquinas'), 'energia', 'energía')`, () => {});
  db.run(`UPDATE nutrition_plans SET
    description = replace(replace(replace(description, 'proteina', 'proteína'), 'energia', 'energía'), 'faciles', 'fáciles'),
    meals = replace(replace(meals, 'proteina', 'proteína'), 'mani', 'maní')`, () => {});
  db.run(`UPDATE testimonials SET comment = replace(replace(replace(comment,
    'Me senti acompanada', 'Me sentí acompañada'), 'proposito', 'propósito'), 'medicion', 'medición')`, () => {});
  db.run("UPDATE testimonials SET comment = 'Por fin encontré un gimnasio donde el plan no es improvisado. Subí cargas y mejoré postura en pocas semanas.' WHERE author = 'Daniela Ruiz'", () => {});
  db.run("UPDATE testimonials SET goal = 'Volver al hábito' WHERE goal = 'Volver al habito'", () => {});
  db.run(`UPDATE members
    SET membership_start = COALESCE(NULLIF(membership_start, ''), joined_at, date('now')),
        membership_end = COALESCE(
          membership_end,
          date(COALESCE(NULLIF(membership_start, ''), joined_at, date('now')),
          '+' || COALESCE((SELECT duration_days FROM memberships WHERE memberships.id = members.membership_id), 30) || ' days')
        )`, () => {});
  db.run(
    `CREATE TABLE IF NOT EXISTS nutrition_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      goal TEXT NOT NULL,
      calories TEXT NOT NULL,
      description TEXT NOT NULL,
      meals TEXT NOT NULL,
      image_url TEXT NOT NULL
    )`
  );
}

function seedDatabase(db) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gyminfinity.test";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin12345";
  const passwordHash = bcrypt.hashSync(adminPassword, 12);

  seedAdminUser(db, adminEmail, passwordHash);

  [
    ["Essential", 79000, 30, "Acceso ilimitado a sala, valoración inicial, app de progreso", 0],
    ["Performance", 119000, 30, "Sala ilimitada, rutinas guiadas, 4 clases grupales, seguimiento semanal", 1],
    ["Elite Coach", 189000, 30, "Entrenador asignado, plan nutricional base, mediciones y prioridad en clases", 0]
  ].forEach((plan) => {
    db.run("INSERT OR IGNORE INTO memberships (name, price, duration_days, benefits, featured) VALUES (?, ?, ?, ?, ?)", plan);
  });

  [
    ["Fuerza Total 4D", "Intermedio", "Hipertrofia y fuerza", "55 min", "4 días/semana", "Bloque completo para ganar fuerza con técnica, progresion de cargas y descanso medido.", "Sentadilla 4x6 | Press banca 4x8 | Remo 4x10 | Peso muerto rumano 3x8 | Core antirotacion 3x30s", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80"],
    ["Glúteo y Pierna Pro", "Principiante", "Tren inferior", "45 min", "3 días/semana", "Rutina de base para construir piernas fuertes, postura estable y confianza en máquinas.", "Hip thrust 4x10 | Prensa 4x12 | Zancadas 3x12 | Curl femoral 3x12 | Abducciones 3x15", "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80"],
    ["Cardio Metabolico", "Todos", "Resistencia y quema calórica", "35 min", "2-3 días/semana", "Circuito funcional con estaciones cortas para mejorar condición sin perder masa muscular.", "Remo 8 min | Kettlebell swing 4x15 | Battle ropes 5x30s | Farmer walk 4x40m | Bicicleta 10 min", "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80"],
    ["Upper Definition", "Avanzado", "Espalda, pecho y hombro", "60 min", "2 días/semana", "Sesión intensa para definición del tren superior con superseries y control de tempo.", "Dominadas 4xAMRAP | Press inclinado 4x8 | Jalones 4x10 | Elevaciones laterales 4x12 | Face pull 3x15", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80"],
    ["Movilidad y Core", "Todos", "Prevencion y estabilidad", "30 min", "Diario opcional", "Trabajo inteligente para reducir molestias, mejorar rango articular y entrenar con más calidad.", "Dead bug 3x10 | Pallof press 3x12 | Plancha lateral 3x30s | Cadera 90/90 4 min | Respiracion diafragmatica", "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=1200&q=80"],
    ["Power Beginner", "Principiante", "Adaptación completa", "40 min", "3 días/semana", "Plan seguro para aprender patrones básicos, ganar energía y crear constancia desde cero.", "Goblet squat 3x10 | Press mancuerna 3x10 | Remo polea 3x12 | Peso muerto kettlebell 3x10 | Caminata 12 min", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80"]
  ].forEach((routine) => {
    db.run(
      "INSERT OR IGNORE INTO routines (title, level, focus, duration, frequency, description, exercises, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      routine
    );
  });

  [
    ["Glúteo Infinity 6S", "Intermedio", "Glúteo y fuerza", "52 min", "4 días/semana", "Programa progresivo de seis semanas con control de cargas, técnica y volumen efectivo.", "Hip thrust 5x8 | Sentadilla bulgara 4x10 | Peso muerto rumano 4x8 | Abduccion 4x15 | Step up 3x12", "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=1200&q=80"],
    ["Fuerza desde Cero", "Principiante", "Tecnica general", "38 min", "3 días/semana", "Base guiada para dominar los movimientos esenciales y ganar confianza progresivamente.", "Goblet squat 3x10 | Remo sentado 3x12 | Press maquina 3x10 | Puente de gluteo 3x15 | Caminata 10 min", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80"],
    ["HIIT Infinity", "Avanzado", "Potencia y cardio", "28 min", "2 días/semana", "Intervalos de alto rendimiento para mejorar potencia, capacidad aeróbica y recuperación.", "Air bike 8x30s | Trineo 6x20m | Burpee 4x10 | Battle rope 6x20s | Core 4x30s", "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=1200&q=80"],
    ["Movilidad Restore", "Todos", "Movilidad y recuperación", "25 min", "3-5 días/semana", "Sesión suave para recuperar articulaciones, respiracion y rango de movimiento.", "Movilidad torácica 5 min | Cadera 90/90 5 min | Tobillo 4 min | Stretch flow 8 min | Respiracion 3 min", "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1200&q=80"]
  ].forEach((routine, index) => {
    db.run(
      "INSERT OR IGNORE INTO routines (title, level, focus, duration, frequency, description, exercises, image_url, access_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [...routine, index % 2 ? "gratis" : "premium"]
    );
  });

  [
    ["Full Body Athletic", "Intermedio", "Cuerpo completo", "50 min", "3 días/semana", "Sesión balanceada para ganar fuerza general, resistencia y técnica con ejercicios compuestos.", "Sentadilla frontal 4x8 | Press militar 4x8 | Remo mancuerna 4x10 | Peso muerto 3x6 | Plancha 4x40s", "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1200&q=80"],
    ["Quema Express 30", "Todos", "Cardio y abdomen", "30 min", "3-4 días/semana", "Entrenamiento corto de alta energía para días con poco tiempo, combinando cardio y core.", "Caminadora inclinada 10 min | Burpees 4x10 | Mountain climbers 4x30s | Crunch cable 3x15 | Bicicleta 8 min", "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80"],
    ["Espalda Fuerte", "Avanzado", "Espalda y postura", "58 min", "2 días/semana", "Rutina enfocada en dorsales, romboides y control escapular para una espalda más sólida.", "Dominadas lastradas 5x5 | Remo barra 4x8 | Jalones 4x10 | Pullover polea 3x12 | Face pull 4x15", "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=1200&q=80"],
    ["Inicio Seguro Mujer", "Principiante", "Tecnica y confianza", "42 min", "3 días/semana", "Programa para aprender máquinas, pesos libres y movilidad sin sentirse perdida en sala.", "Prensa 3x12 | Remo polea 3x12 | Hip thrust 3x10 | Press pecho maquina 3x10 | Caminata 12 min", "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=1200&q=80"]
  ].forEach((routine) => {
    db.run(
      "INSERT OR IGNORE INTO routines (title, level, focus, duration, frequency, description, exercises, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      routine
    );
  });

  [
    ["Proteína Whey Infinity", 145000, "Proteína de rápida absorción para apoyar recuperación y masa muscular. Pago coordinado con administración.", "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80", "Suplementos", 18],
    ["Shaker Pro 700 ml", 32000, "Mezclador resistente con compartimento para polvo y capsulas.", "https://images.unsplash.com/photo-1622484211148-2ee8b0db5b8f?auto=format&fit=crop&w=1200&q=80", "Accesorios", 25],
    ["Guantes de Entrenamiento", 49000, "Guantes con agarre reforzado para pesas, poleas y máquinas.", "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80", "Accesorios", 15],
    ["Bandas de Resistencia", 39000, "Set de bandas para activacion, movilidad y entrenamiento en casa.", "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=1200&q=80", "Accesorios", 30],
    ["Creatina Monohidratada", 89000, "Suplemento para rendimiento en fuerza y potencia. Compra final con asesoría del administrador.", "https://images.unsplash.com/photo-1612531386530-97286d97c2d2?auto=format&fit=crop&w=1200&q=80", "Suplementos", 20],
    ["Toalla Infinity", 28000, "Toalla deportiva compacta, absorbente y facil de llevar.", "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80", "Indumentaria", 22]
  ].forEach((product) => {
    db.run(
      "INSERT INTO products (name, price, description, image_url, category, stock) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ?)",
      [...product, product[0]]
    );
  });

  [
    ["Definición Inteligente", "Bajar grasa", "1.650 - 1.850 kcal", "Plan alto en proteína, carbohidratos medidos y comidas fáciles de sostener para perder grasa sin bajar rendimiento.", "Desayuno: huevos, arepa integral y fruta | Almuerzo: pollo, arroz, ensalada y aguacate | Snack: yogur griego con frutos rojos | Cena: pescado, papa y vegetales", "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80"],
    ["Volumen Limpio", "Aumentar masa muscular", "2.300 - 2.700 kcal", "Estructura para subir masa muscular con energía estable, proteína suficiente y comidas completas alrededor del entrenamiento.", "Desayuno: avena, banano y proteína | Almuerzo: carne magra, pasta y ensalada | Pre-entreno: pan integral con mantequilla de maní | Cena: arroz, huevos y vegetales", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80"],
    ["Energía Diaria", "Mejorar condición", "1.900 - 2.200 kcal", "Guía balanceada para entrenar con energía, recuperarse mejor y ordenar horarios sin dietas extremas.", "Desayuno: tortilla con fruta | Almuerzo: bowl de pollo, quinoa y verduras | Snack: frutos secos y yogur | Cena: salmón, arroz y ensalada", "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80"]
  ].forEach((plan) => {
    db.run(
      "INSERT OR IGNORE INTO nutrition_plans (title, goal, calories, description, meals, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      plan
    );
  });

  [
    ["Balance 21 Días", "Crear hábitos", "1.800 - 2.100 kcal", "Menú flexible para ordenar horarios y mejorar calidad de alimentos sin restricciones extremas.", "Desayuno: avena y fruta | Almuerzo: bowl de pollo y arroz | Snack: yogur y nueces | Cena: tortilla y ensalada", "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80", "gratis"],
    ["Músculo Pro", "Hipertrofia", "2.500 - 2.900 kcal", "Plan premium con distribución de proteína y carbohidratos alrededor del entrenamiento.", "Desayuno: huevos y avena | Media mañana: sándwich de pavo | Almuerzo: carne y arroz | Preentreno: fruta y yogur | Cena: pollo y pasta", "https://images.unsplash.com/photo-1494390248081-4e521a5940db5b8f?auto=format&fit=crop&w=1200&q=80", "premium"],
    ["Veggie Performance", "Rendimiento vegetal", "2.000 - 2.300 kcal", "Opciones vegetales completas con fuentes variadas de proteína y energía.", "Desayuno: tofu y arepa | Almuerzo: lentejas y arroz | Snack: hummus | Cena: quinoa y garbanzos", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80", "premium"],
    ["Menú Express", "Poco tiempo", "1.750 - 2.050 kcal", "Preparaciones rápidas y repetibles para sostener el plan durante semanas ocupadas.", "Desayuno: yogur y granola | Almuerzo: wrap de pollo | Snack: fruta | Cena: bowl de atun", "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=1200&q=80", "gratis"]
  ].forEach((plan) => {
    db.run("INSERT OR IGNORE INTO nutrition_plans (title, goal, calories, description, meals, image_url, access_level) VALUES (?, ?, ?, ?, ?, ?, ?)", plan);
  });

  [
    ["Laura Mendoza", "Ganar fuerza", "Me sentí acompañada desde la primera valoración. Las rutinas son claras, exigentes y el seguimiento se nota.", 5],
    ["Daniela Ruiz", "Tonificar", "Por fin encontre un gimnasio donde el plan no es improvisado. Subi cargas y mejore postura en pocas semanas.", 5],
    ["Camila Torres", "Volver al habito", "El ambiente es limpio, serio y motivador. Me gusta que cada clase tiene propósito y medición.", 5],
    ["Valentina Gomez", "Bajar grasa", "El panel de progreso y las recomendaciones me ayudaron a ser constante sin sentirme perdida.", 5]
  ].forEach((item) => {
    db.run("INSERT OR IGNORE INTO testimonials (author, goal, comment, rating) VALUES (?, ?, ?, ?)", item);
  });
}

function seedAdminUser(db, adminEmail, passwordHash) {
  upsertAdminUser(db, adminEmail, passwordHash).catch((err) => {
    if (err.code === "SQLITE_MISUSE") return;
    console.error("No se pudo crear el usuario admin:", err.message);
  });
}

async function upsertAdminUser(db, adminEmail, passwordHash) {
  const columns = await all(db, "PRAGMA table_info(users)");
  const columnNames = new Set(columns.map((column) => column.name));
  const adminValues = {
    name: "Administradora Gym Infinity",
    email: adminEmail,
    phone: "3000000000",
    plan: "Administración",
    goal: "Administración",
    age: 30,
    weight: 0,
    height: 0,
    role: "admin",
    created_at: new Date().toISOString(),
    membership_status: "Activo",
    password_hash: passwordHash
  };
  const updateColumns = ["name", "password_hash", "role"].filter((column) => columnNames.has(column));

  if (updateColumns.length) {
    await run(
      db,
      `UPDATE users SET ${updateColumns.map((column) => `${column} = ?`).join(", ")} WHERE email = ?`,
      [...updateColumns.map((column) => adminValues[column]), adminEmail]
    );
  }

  const existingUser = await get(db, "SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail]);
  if (existingUser) return existingUser;

  const insertColumns = columns
    .filter((column) => column.name !== "id")
    .filter((column) => Object.prototype.hasOwnProperty.call(adminValues, column.name) || (column.notnull && column.dflt_value === null))
    .map((column) => column.name);
  const values = insertColumns.map((column) => adminValues[column] ?? "");
  const placeholders = insertColumns.map(() => "?").join(", ");

  return run(db, `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders})`, values);
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

module.exports = { initializeDatabase, all, get, run, upsertAdminUser };
