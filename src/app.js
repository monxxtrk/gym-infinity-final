require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const methodOverride = require("method-override");
const sqlite3 = require("sqlite3").verbose();
const { initializeDatabase } = require("./database");
const routes = require("./routes");

function createApp(options = {}) {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      throw new Error("SESSION_SECRET debe existir y tener al menos 32 caracteres en produccion.");
    }
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "Admin12345") {
      throw new Error("ADMIN_PASSWORD debe configurarse de forma segura en produccion.");
    }
  }
  const app = express();
  const db = options.db || initializeDatabase(options.databaseFile);
  const SQLiteStore = SQLiteStoreFactory(session);
  const sessionDb =
    options.sessionStore ? null : options.sessionDb || new sqlite3.Database(path.join(__dirname, "..", process.env.SESSION_DATABASE_FILE || "sessions.sqlite"));
  app.locals.db = db;
  app.locals.sessionDb = sessionDb;

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.disable("x-powered-by");
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
          connectSrc: ["'self'"]
        }
      }
    })
  );
  app.use(compression());
  app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: "1d" }));
  app.use(express.urlencoded({ extended: false, limit: "40kb" }));
  app.use(express.json({ limit: "40kb" }));
  app.use(methodOverride("_method"));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 220,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar."
  });
  app.post(["/login", "/admin-login", "/recuperar-acceso"], authLimiter);

  app.use(
    session({
      store: options.sessionStore || new SQLiteStore({ db: sessionDb, concurrentDb: true }),
      secret: process.env.SESSION_SECRET || "gym-infinity-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 6
      }
    })
  );

  app.use((req, res, next) => {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    res.locals.csrfToken = req.session.csrfToken;
    if (process.env.NODE_ENV === "test" || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const supplied = req.body?._csrf || req.get("x-csrf-token");
    const suppliedBuffer = Buffer.from(String(supplied || ""));
    const expectedBuffer = Buffer.from(req.session.csrfToken);
    if (suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return next();
    return res.status(403).render("500", { title: "Solicitud no autorizada" });
  });

  app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
  });

  app.get("/health", (req, res) => res.json({ status: "ok", service: "gym-infinity" }));
  app.use(routes(db));

  app.use((req, res) => {
    res.status(404).render("404", { title: "Página no encontrada" });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render("500", { title: "Error interno" });
  });

  return app;
}

module.exports = { createApp };
