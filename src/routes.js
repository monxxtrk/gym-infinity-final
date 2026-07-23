const express = require("express");
const bcrypt = require("bcryptjs");
const { all, get, run, upsertAdminUser } = require("./database");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function routes(db) {
  const router = express.Router();

  router.use("/admin", (req, res, next) => {
    if (req.method === "GET") return next();
    res.on("finish", () => {
      run(db, "INSERT INTO audit_logs (user_id, action, path, ip_address, status_code) VALUES (?, ?, ?, ?, ?)", [
        req.session?.user?.id || null, req.method, req.originalUrl, req.ip, res.statusCode
      ]).catch(() => {});
    });
    next();
  });

  router.get("/privacidad", (req, res) => res.render("legal", { title: "Política de privacidad", document: "privacy" }));
  router.get("/terminos", (req, res) => res.render("legal", { title: "Términos y condiciones", document: "terms" }));
  router.get("/salud", (req, res) => res.render("legal", { title: "Aviso de salud y nutrición", document: "health" }));

  router.get("/", async (req, res, next) => {
    try {
      const [routines, plans, testimonials, products, nutritionPlans] = await Promise.all([
        all(db, "SELECT * FROM routines ORDER BY id LIMIT 6"),
        all(db, "SELECT * FROM memberships ORDER BY price"),
        all(db, "SELECT * FROM testimonials WHERE approved = 1 ORDER BY created_at DESC LIMIT 6"),
        all(db, "SELECT * FROM products ORDER BY id LIMIT 3"),
        all(db, "SELECT * FROM nutrition_plans ORDER BY id LIMIT 3")
      ]);
      res.render("home", { title: "Gym Infinity", routines, plans, testimonials, products, nutritionPlans });
    } catch (err) {
      next(err);
    }
  });

  router.get("/rutinas/:id", async (req, res, next) => {
    try {
      const routine = await get(db, "SELECT * FROM routines WHERE id = ?", [Number(req.params.id)]);
      if (!routine) return res.status(404).render("404", { title: "Rutina no encontrada" });
      const related = await all(db, "SELECT * FROM routines WHERE id != ? AND level = ? ORDER BY id LIMIT 3", [routine.id, routine.level]);
      res.render("routine-detail", { title: routine.title, routine, related });
    } catch (err) {
      next(err);
    }
  });

  router.get("/rutinas", async (req, res, next) => {
    try {
      const level = clean(req.query.level || "");
      const focus = clean(req.query.focus || "");
      const params = [];
      const where = [];
      if (level) {
        where.push("level = ?");
        params.push(level);
      }
      if (focus) {
        where.push("focus LIKE ?");
        params.push(`%${focus}%`);
      }
      const routines = await all(db, `SELECT * FROM routines ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id`, params);
      res.render("routines", { title: "Rutinas", routines, filters: { level, focus } });
    } catch (err) {
      next(err);
    }
  });

  router.get("/planes", async (req, res, next) => {
    try {
      const plans = await all(db, "SELECT * FROM memberships ORDER BY price");
      res.render("plans", { title: "Planes", plans });
    } catch (err) {
      next(err);
    }
  });

  router.get("/alimentacion", requireLogin, async (req, res, next) => {
    try {
      const nutritionPlans = await all(db, "SELECT * FROM nutrition_plans ORDER BY id");
      res.render("nutrition", { title: "Alimentación", nutritionPlans });
    } catch (err) {
      next(err);
    }
  });

  router.get("/tienda", requireLogin, async (req, res, next) => {
    try {
      const category = clean(req.query.category || "");
      const products = category
        ? await all(db, "SELECT * FROM products WHERE category = ? ORDER BY id", [category])
        : await all(db, "SELECT * FROM products ORDER BY id");
      const categories = await all(db, "SELECT DISTINCT category FROM products ORDER BY category");
      res.render("store", { title: "Tienda", products, categories, filters: { category } });
    } catch (err) {
      next(err);
    }
  });

  router.get("/tienda/:id", requireLogin, async (req, res, next) => {
    try {
      const product = await get(db, "SELECT * FROM products WHERE id = ?", [Number(req.params.id)]);
      if (!product) return res.status(404).render("404", { title: "Producto no encontrado" });
      res.render("product-detail", { title: product.name, product });
    } catch (err) {
      next(err);
    }
  });

  router.post("/contacto", async (req, res, next) => {
    try {
      const input = {
        name: clean(req.body.name),
        email: clean(req.body.email).toLowerCase(),
        phone: clean(req.body.phone),
        goal: clean(req.body.goal),
        message: clean(req.body.message || "")
      };
      if (!input.name || !emailRegex.test(input.email) || input.phone.length < 7 || !input.goal) {
        req.session.flash = { type: "error", text: "Revisa tus datos: nombre, correo, teléfono y objetivo son obligatorios." };
        return res.redirect("/#contacto");
      }
      await run(db, "INSERT INTO leads (name, email, phone, goal, message) VALUES (?, ?, ?, ?, ?)", [
        input.name,
        input.email,
        input.phone,
        input.goal,
        input.message
      ]);
      req.session.flash = { type: "success", text: "Solicitud recibida. Te contactaremos para agendar tu valoración." };
      res.redirect("/#contacto");
    } catch (err) {
      next(err);
    }
  });

  router.post("/comentarios", async (req, res, next) => {
    try {
      const input = {
        author: clean(req.body.author),
        goal: clean(req.body.goal),
        comment: clean(req.body.comment),
        rating: Math.min(Math.max(Number(req.body.rating) || 5, 1), 5)
      };
      if (!input.author || !input.goal || input.comment.length < 10) {
        req.session.flash = { type: "error", text: "Escribe tu nombre, objetivo y un comentario de minimo 10 caracteres." };
        return res.redirect("/#comentarios");
      }
      await run(db, "INSERT INTO testimonials (author, goal, comment, rating, approved) VALUES (?, ?, ?, ?, 0)", [
        input.author,
        input.goal,
        input.comment,
        input.rating
      ]);
      req.session.flash = { type: "success", text: "Gracias. Tu comentario será visible cuando administración lo apruebe." };
      res.redirect("/#comentarios");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ya existe un comentario con ese nombre." };
        return res.redirect("/#comentarios");
      }
      next(err);
    }
  });

  router.get("/login", (req, res) => {
    res.render("login", { title: "Iniciar sesión", mode: "client" });
  });

  router.get("/admin-login", (req, res) => {
    res.render("login", { title: "Acceso administrativo", mode: "admin" });
  });

  router.post("/login", async (req, res, next) => {
    try {
      const email = clean(req.body.email).toLowerCase();
      const password = req.body.password || "";
      const user = await get(db, "SELECT * FROM users WHERE email = ?", [email]);
      if (!user || !(await bcrypt.compare(password, user.password_hash || ""))) {
        req.session.flash = { type: "error", text: "Credenciales incorrectas." };
        return res.redirect("/login");
      }
      if (user.role !== "admin" && !user.access_granted) {
        req.session.flash = { type: "error", text: "Tu solicitud está pendiente de aprobación por administración." };
        return res.redirect("/login");
      }
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.redirect(user.role === "admin" ? "/admin" : "/mi-cuenta");
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/admin-login", async (req, res, next) => {
    try {
      const email = clean(req.body.email).toLowerCase();
      const password = req.body.password || "";
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@gyminfinity.test").toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || "Admin12345";
      const passwordMatchesConfiguredAdmin = password.trim() === adminPassword;
      let user = await get(db, "SELECT * FROM users WHERE email = ?", [email]);

      if (email === adminEmail && passwordMatchesConfiguredAdmin) {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await upsertAdminUser(db, adminEmail, passwordHash);
        user = await get(db, "SELECT * FROM users WHERE email = ?", [adminEmail]);
      }

      if (!user || user.role !== "admin" || !(await bcrypt.compare(password, user.password_hash || ""))) {
        req.session.flash = { type: "error", text: "Credenciales incorrectas." };
        return res.redirect("/admin-login");
      }
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.redirect("/admin");
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/registro", (req, res) => {
    res.render("register", { title: "Crear cuenta" });
  });

  router.post("/registro", async (req, res, next) => {
    try {
      const input = {
        name: clean(req.body.name),
        email: clean(req.body.email).toLowerCase(),
        phone: clean(req.body.phone),
        goal: clean(req.body.goal),
        password: req.body.password || ""
      };
      if (!input.name || !emailRegex.test(input.email) || input.phone.length < 7 || !input.goal || input.password.length < 8) {
        req.session.flash = { type: "error", text: "Completa todos los datos. La clave debe tener minimo 8 caracteres." };
        return res.redirect("/registro");
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      await run(db, "INSERT INTO users (name, email, phone, goal, password_hash, role, access_granted) VALUES (?, ?, ?, ?, ?, 'client', 0)", [
        input.name,
        input.email,
        input.phone,
        input.goal,
        passwordHash
      ]);
      await run(db, "INSERT INTO leads (name, email, phone, goal, message, status) VALUES (?, ?, ?, ?, ?, 'pendiente')", [
        input.name, input.email, input.phone, input.goal, "Solicitud creada desde registro web"
      ]);
      req.session.flash = { type: "success", text: "Cuenta creada. El administrador revisara tu solicitud y habilitara el acceso." };
      res.redirect("/login");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ese correo ya tiene una cuenta." };
        return res.redirect("/registro");
      }
      next(err);
    }
  });

  router.get("/mi-cuenta", requireLogin, async (req, res, next) => {
    try {
      const [routines, products, nutritionPlans] = await Promise.all([
        all(db, "SELECT * FROM routines ORDER BY id LIMIT 4"),
        all(db, "SELECT * FROM products ORDER BY id LIMIT 4"),
        all(db, "SELECT * FROM nutrition_plans ORDER BY id LIMIT 4")
      ]);
      res.render("account", { title: "Mi cuenta", routines, products, nutritionPlans });
    } catch (err) {
      next(err);
    }
  });

  router.post("/mi-cuenta/password", requireLogin, async (req, res, next) => {
    try {
      const current = req.body.current_password || "";
      const replacement = req.body.new_password || "";
      const user = await get(db, "SELECT * FROM users WHERE id = ?", [req.session.user.id]);
      if (!user || !(await bcrypt.compare(current, user.password_hash || "")) || replacement.length < 10) {
        req.session.flash = { type: "error", text: "La clave actual no coincide o la nueva tiene menos de 10 caracteres." };
        return res.redirect("/mi-cuenta#seguridad");
      }
      await run(db, "UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(replacement, 12), user.id]);
      req.session.flash = { type: "success", text: "Contraseña actualizada correctamente." };
      res.redirect("/mi-cuenta#seguridad");
    } catch (err) { next(err); }
  });

  router.get("/recuperar-acceso", (req, res) => res.render("password-request", { title: "Recuperar acceso" }));
  router.post("/recuperar-acceso", async (req, res, next) => {
    try {
      const email = clean(req.body.email).toLowerCase();
      const user = await get(db, "SELECT id FROM users WHERE email = ? AND role = 'client'", [email]);
      if (user) await run(db, `INSERT INTO password_reset_requests (user_id)
        SELECT ? WHERE NOT EXISTS (SELECT 1 FROM password_reset_requests WHERE user_id = ? AND status = 'pendiente')`, [user.id, user.id]);
      req.session.flash = { type: "success", text: "Si el correo existe, administración recibió la solicitud de recuperación." };
      res.redirect("/login");
    } catch (err) { next(err); }
  });

  router.post("/logout", (req, res, next) => {
    req.session.destroy((err) => (err ? next(err) : res.redirect("/")));
  });

  router.get("/admin", requireAuth, async (req, res, next) => {
    try {
      const [members, leads, attendance, stats, plans, routines, products, nutritionPlans, testimonials, payments, userAccounts, passwordRequests, auditLogs] = await Promise.all([
        all(db, `SELECT members.*, memberships.name AS plan_name, memberships.price AS plan_price,
          memberships.duration_days,
          CAST(julianday(COALESCE(members.membership_end, date(members.membership_start, '+' || memberships.duration_days || ' days'))) - julianday('now') AS INTEGER) AS days_left
          FROM members JOIN memberships ON memberships.id = members.membership_id ORDER BY members.joined_at DESC`),
        all(db, "SELECT * FROM leads ORDER BY CASE status WHEN 'pendiente' THEN 0 ELSE 1 END, created_at DESC"),
        all(db, "SELECT attendance.*, members.name AS member_name FROM attendance JOIN members ON members.id = attendance.member_id ORDER BY attendance.check_in DESC LIMIT 10"),
        get(db, `SELECT
          (SELECT COUNT(*) FROM members WHERE status = 'activo' AND date(COALESCE(membership_end, '1900-01-01')) >= date('now')) AS active_members,
          (SELECT COUNT(*) FROM members WHERE date(COALESCE(membership_end, '1900-01-01')) < date('now')) AS expired_members,
          (SELECT COUNT(*) FROM members WHERE date(COALESCE(membership_end, '1900-01-01')) BETWEEN date('now') AND date('now', '+7 days')) AS expiring_members,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'pagado' AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')) AS monthly_revenue,
          (SELECT COUNT(*) FROM leads) AS total_leads,
          (SELECT COUNT(*) FROM attendance WHERE date(check_in) = date('now')) AS today_attendance`),
        all(db, "SELECT * FROM memberships ORDER BY price"),
        all(db, "SELECT * FROM routines ORDER BY id DESC"),
        all(db, "SELECT * FROM products ORDER BY id DESC"),
        all(db, "SELECT * FROM nutrition_plans ORDER BY id DESC"),
        all(db, "SELECT * FROM testimonials ORDER BY created_at DESC"),
        all(db, `SELECT payments.*, members.name AS member_name, memberships.name AS plan_name, invoices.invoice_number, invoices.id AS invoice_id
          FROM payments JOIN members ON members.id = payments.member_id
          JOIN memberships ON memberships.id = payments.membership_id
          LEFT JOIN invoices ON invoices.payment_id = payments.id
          ORDER BY payments.paid_at DESC LIMIT 20`),
        all(db, "SELECT id, name, email, phone, goal, access_granted, created_at FROM users WHERE role = 'client' ORDER BY created_at DESC"),
        all(db, `SELECT password_reset_requests.*, users.name, users.email FROM password_reset_requests
          JOIN users ON users.id = password_reset_requests.user_id WHERE password_reset_requests.status = 'pendiente' ORDER BY created_at DESC`),
        all(db, "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 30")
      ]);
      res.render("admin", { title: "Panel administrativo", members, leads, attendance, stats, plans, routines, products, nutritionPlans, testimonials, payments, userAccounts, passwordRequests, auditLogs });
    } catch (err) {
      next(err);
    }
  });

  router.post("/admin/testimonials/:id/approve", requireAuth, async (req, res, next) => {
    try {
      await run(db, "UPDATE testimonials SET approved = 1 WHERE id = ?", [Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Comentario aprobado y publicado." };
      res.redirect("/admin#contenido");
    } catch (err) { next(err); }
  });

  router.post("/admin/password-requests/:id/resolve", requireAuth, async (req, res, next) => {
    try {
      const temporaryPassword = String(req.body.temporary_password || "");
      const request = await get(db, `SELECT password_reset_requests.id, password_reset_requests.user_id, users.email
        FROM password_reset_requests JOIN users ON users.id = password_reset_requests.user_id
        WHERE password_reset_requests.id = ? AND password_reset_requests.status = 'pendiente'`, [Number(req.params.id)]);
      if (!request || temporaryPassword.length < 10) {
        req.session.flash = { type: "error", text: "La contraseña temporal debe tener al menos 10 caracteres." };
        return res.redirect("/admin#solicitudes");
      }
      await run(db, "UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(temporaryPassword, 12), request.user_id]);
      await run(db, "UPDATE password_reset_requests SET status = 'resuelta', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [request.id]);
      req.session.flash = { type: "success", text: `Acceso recuperado para ${request.email}. Comparte la contraseña temporal por un canal seguro.` };
      res.redirect("/admin#solicitudes");
    } catch (err) { next(err); }
  });

  router.get("/admin/export/members.csv", requireAuth, async (req, res, next) => {
    try {
      const rows = await all(db, `SELECT members.name, members.email, members.phone, memberships.name AS plan,
        members.status, members.goal, members.membership_start, members.membership_end
        FROM members JOIN memberships ON memberships.id = members.membership_id ORDER BY members.name`);
      sendCsv(res, "clientes-gym-infinity.csv", rows);
    } catch (err) { next(err); }
  });

  router.get("/admin/export/payments.csv", requireAuth, async (req, res, next) => {
    try {
      const rows = await all(db, `SELECT invoices.invoice_number AS comprobante, members.name AS cliente,
        payments.amount, payments.payment_method, payments.reference, payments.period_start, payments.period_end, payments.paid_at
        FROM payments JOIN members ON members.id = payments.member_id LEFT JOIN invoices ON invoices.payment_id = payments.id
        ORDER BY payments.paid_at DESC`);
      sendCsv(res, "pagos-gym-infinity.csv", rows);
    } catch (err) { next(err); }
  });

  router.get("/admin/invoices/:id", requireAuth, async (req, res, next) => {
    try {
      const invoice = await get(db, `SELECT invoices.*, payments.*, members.name AS member_name, members.email,
        memberships.name AS plan_name FROM invoices JOIN payments ON payments.id = invoices.payment_id
        JOIN members ON members.id = payments.member_id JOIN memberships ON memberships.id = payments.membership_id
        WHERE invoices.id = ?`, [Number(req.params.id)]);
      if (!invoice) return res.status(404).render("404", { title: "Comprobante no encontrado" });
      res.render("invoice", { title: invoice.invoice_number, invoice });
    } catch (err) { next(err); }
  });

  router.post("/admin/users/:id/access", requireAuth, async (req, res, next) => {
    try {
      const granted = req.body.access_granted === "1" ? 1 : 0;
      await run(db, "UPDATE users SET access_granted = ? WHERE id = ? AND role = 'client'", [granted, Number(req.params.id)]);
      req.session.flash = { type: "success", text: granted ? "Acceso habilitado correctamente." : "Acceso suspendido correctamente." };
      res.redirect("/admin#solicitudes");
    } catch (err) { next(err); }
  });

  router.post("/admin/leads/:id/status", requireAuth, async (req, res, next) => {
    try {
      const allowed = new Set(["pendiente", "contactado", "aprobado", "descartado"]);
      const status = allowed.has(clean(req.body.status)) ? clean(req.body.status) : "pendiente";
      await run(db, "UPDATE leads SET status = ? WHERE id = ?", [status, Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Solicitud actualizada." };
      res.redirect("/admin#solicitudes");
    } catch (err) { next(err); }
  });

  router.post("/admin/memberships/:id", requireAuth, async (req, res, next) => {
    try {
      const price = Number(req.body.price);
      const duration = Number(req.body.duration_days);
      const name = clean(req.body.name);
      const benefits = clean(req.body.benefits);
      if (!name || price < 1 || duration < 1 || !benefits) {
        req.session.flash = { type: "error", text: "Revisa nombre, precio, duración y beneficios del plan." };
        return res.redirect("/admin#planes");
      }
      await run(db, "UPDATE memberships SET name = ?, price = ?, duration_days = ?, benefits = ?, featured = ? WHERE id = ?", [
        name, price, duration, benefits, req.body.featured === "1" ? 1 : 0, Number(req.params.id)
      ]);
      req.session.flash = { type: "success", text: "Plan y precio actualizados." };
      res.redirect("/admin#planes");
    } catch (err) { next(err); }
  });

  router.post("/admin/members", requireAuth, async (req, res, next) => {
    try {
      const input = {
        name: clean(req.body.name),
        email: clean(req.body.email).toLowerCase(),
        phone: clean(req.body.phone),
        membershipId: Number(req.body.membership_id),
        goal: clean(req.body.goal)
      };
      if (!input.name || !emailRegex.test(input.email) || !input.phone || !input.membershipId || !input.goal) {
        req.session.flash = { type: "error", text: "No se pudo crear el cliente. Revisa todos los campos." };
        return res.redirect("/admin");
      }
      const plan = await get(db, "SELECT * FROM memberships WHERE id = ?", [input.membershipId]);
      const start = clean(req.body.membership_start) || new Date().toISOString().slice(0, 10);
      const end = addDays(start, plan.duration_days);
      await run(db, "INSERT INTO members (name, email, phone, membership_id, goal, membership_start, membership_end, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        input.name,
        input.email,
        input.phone,
        input.membershipId,
        input.goal,
        start,
        end,
        clean(req.body.notes || "")
      ]);
      req.session.flash = { type: "success", text: "Cliente registrado correctamente." };
      res.redirect("/admin");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ese correo ya está registrado." };
        return res.redirect("/admin");
      }
      next(err);
    }
  });

  router.post("/admin/payments", requireAuth, async (req, res, next) => {
    try {
      const memberId = Number(req.body.member_id);
      const member = await get(db, `SELECT members.*, memberships.duration_days, memberships.price
        FROM members JOIN memberships ON memberships.id = members.membership_id WHERE members.id = ?`, [memberId]);
      if (!member) {
        req.session.flash = { type: "error", text: "Selecciona un cliente valido." };
        return res.redirect("/admin#facturacion");
      }
      const amount = Number(req.body.amount);
      const start = clean(req.body.period_start) || new Date().toISOString().slice(0, 10);
      const end = addDays(start, member.duration_days);
      if (!amount || amount < 1) {
        req.session.flash = { type: "error", text: "Ingresa un valor de pago valido." };
        return res.redirect("/admin#facturacion");
      }
      const payment = await run(db, `INSERT INTO payments
        (member_id, membership_id, amount, payment_method, reference, period_start, period_end, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pagado', ?)`, [
        memberId, member.membership_id, amount, clean(req.body.payment_method),
        clean(req.body.reference || ""), start, end, clean(req.body.notes || "")
      ]);
      const invoiceNumber = `GI-${new Date().getFullYear()}-${String(payment.id).padStart(5, "0")}`;
      await run(db, "INSERT INTO invoices (payment_id, invoice_number) VALUES (?, ?)", [payment.id, invoiceNumber]);
      await run(db, "UPDATE members SET membership_start = ?, membership_end = ?, status = 'activo' WHERE id = ?", [start, end, memberId]);
      req.session.flash = { type: "success", text: `Pago registrado. Comprobante ${invoiceNumber} generado.` };
      res.redirect("/admin#facturacion");
    } catch (err) {
      next(err);
    }
  });

  router.post("/admin/members/:id/status", requireAuth, async (req, res, next) => {
    try {
      const status = clean(req.body.status) === "inactivo" ? "inactivo" : "activo";
      await run(db, "UPDATE members SET status = ? WHERE id = ?", [status, Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Estado del cliente actualizado." };
      res.redirect("/admin#clientes");
    } catch (err) {
      next(err);
    }
  });

  router.post("/admin/attendance", requireAuth, async (req, res, next) => {
    try {
      const memberId = Number(req.body.member_id);
      const note = clean(req.body.note || "");
      if (!memberId) {
        req.session.flash = { type: "error", text: "Selecciona un cliente para registrar asistencia." };
        return res.redirect("/admin");
      }
      await run(db, "INSERT INTO attendance (member_id, note) VALUES (?, ?)", [memberId, note]);
      req.session.flash = { type: "success", text: "Asistencia registrada." };
      res.redirect("/admin");
    } catch (err) {
      next(err);
    }
  });

  router.post("/admin/routines", requireAuth, async (req, res, next) => {
    try {
      const input = {
        title: clean(req.body.title),
        level: clean(req.body.level),
        focus: clean(req.body.focus),
        duration: clean(req.body.duration),
        frequency: clean(req.body.frequency),
        description: clean(req.body.description),
        exercises: clean(req.body.exercises),
        imageUrl: clean(req.body.image_url) || defaultRoutineImage(),
        accessLevel: clean(req.body.access_level) === "premium" ? "premium" : "gratis"
      };
      if (!input.title || !input.level || !input.focus || !input.duration || !input.frequency || !input.description || !input.exercises) {
        req.session.flash = { type: "error", text: "Completa todos los campos de la rutina." };
        return res.redirect("/admin#contenido");
      }
      await run(db, "INSERT INTO routines (title, level, focus, duration, frequency, description, exercises, image_url, access_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        input.title,
        input.level,
        input.focus,
        input.duration,
        input.frequency,
        input.description,
        input.exercises,
        input.imageUrl,
        input.accessLevel
      ]);
      req.session.flash = { type: "success", text: "Rutina agregada correctamente." };
      res.redirect("/admin#contenido");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ya existe una rutina con ese título." };
        return res.redirect("/admin#contenido");
      }
      next(err);
    }
  });

  router.post("/admin/products", requireAuth, async (req, res, next) => {
    try {
      const input = {
        name: clean(req.body.name),
        price: Number(req.body.price),
        category: clean(req.body.category),
        stock: Number(req.body.stock),
        description: clean(req.body.description),
        imageUrl: clean(req.body.image_url) || defaultProductImage()
      };
      if (!input.name || !input.price || !input.category || input.stock < 0 || !input.description) {
        req.session.flash = { type: "error", text: "Completa todos los campos del producto." };
        return res.redirect("/admin#contenido");
      }
      await run(db, "INSERT INTO products (name, price, description, image_url, category, stock) VALUES (?, ?, ?, ?, ?, ?)", [
        input.name,
        input.price,
        input.description,
        input.imageUrl,
        input.category,
        input.stock
      ]);
      req.session.flash = { type: "success", text: "Producto agregado a la tienda." };
      res.redirect("/admin#contenido");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ya existe un producto con ese nombre." };
        return res.redirect("/admin#contenido");
      }
      next(err);
    }
  });

  router.post("/admin/nutrition", requireAuth, async (req, res, next) => {
    try {
      const input = {
        title: clean(req.body.title),
        goal: clean(req.body.goal),
        calories: clean(req.body.calories),
        description: clean(req.body.description),
        meals: clean(req.body.meals),
        imageUrl: clean(req.body.image_url) || defaultNutritionImage(),
        accessLevel: clean(req.body.access_level) === "premium" ? "premium" : "gratis"
      };
      if (!input.title || !input.goal || !input.calories || !input.description || !input.meals) {
        req.session.flash = { type: "error", text: "Completa todos los campos de alimentación." };
        return res.redirect("/admin#contenido");
      }
      await run(db, "INSERT INTO nutrition_plans (title, goal, calories, description, meals, image_url, access_level) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        input.title,
        input.goal,
        input.calories,
        input.description,
        input.meals,
        input.imageUrl,
        input.accessLevel
      ]);
      req.session.flash = { type: "success", text: "Plan de alimentación agregado." };
      res.redirect("/admin#contenido");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ya existe un plan de alimentación con ese título." };
        return res.redirect("/admin#contenido");
      }
      next(err);
    }
  });

  router.post("/admin/routines/:id/update", requireAuth, async (req, res, next) => {
    try {
      const values = [
        clean(req.body.title), clean(req.body.level), clean(req.body.focus),
        clean(req.body.duration), clean(req.body.frequency), clean(req.body.description),
        clean(req.body.exercises), clean(req.body.image_url) || defaultRoutineImage(),
        clean(req.body.access_level) === "premium" ? "premium" : "gratis"
      ];
      if (values.slice(0, 7).some((value) => !value)) throw new Error("Completa todos los campos de la rutina.");
      await run(db, `UPDATE routines SET title=?, level=?, focus=?, duration=?, frequency=?,
        description=?, exercises=?, image_url=?, access_level=? WHERE id=?`, [...values, Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Rutina actualizada correctamente." };
      res.redirect("/admin#contenido");
    } catch (err) {
      req.session.flash = { type: "error", text: err.message.includes("UNIQUE") ? "Ya existe otra rutina con ese título." : err.message };
      res.redirect("/admin#contenido");
    }
  });

  router.post("/admin/routines/:id/delete", requireAuth, async (req, res, next) => {
    try {
      await run(db, "DELETE FROM routines WHERE id = ?", [Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Rutina eliminada." };
      res.redirect("/admin#contenido");
    } catch (err) { next(err); }
  });

  router.post("/admin/products/:id/update", requireAuth, async (req, res, next) => {
    try {
      const name = clean(req.body.name);
      const price = Number(req.body.price);
      const stock = Number(req.body.stock);
      const category = clean(req.body.category);
      const description = clean(req.body.description);
      const imageUrl = clean(req.body.image_url) || defaultProductImage();
      if (!name || price < 1 || stock < 0 || !category || !description) throw new Error("Completa correctamente los datos del producto.");
      await run(db, "UPDATE products SET name=?, price=?, stock=?, category=?, description=?, image_url=? WHERE id=?",
        [name, price, stock, category, description, imageUrl, Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Producto actualizado correctamente." };
      res.redirect("/admin#contenido");
    } catch (err) {
      req.session.flash = { type: "error", text: err.message.includes("UNIQUE") ? "Ya existe otro producto con ese nombre." : err.message };
      res.redirect("/admin#contenido");
    }
  });

  router.post("/admin/products/:id/delete", requireAuth, async (req, res, next) => {
    try {
      await run(db, "DELETE FROM products WHERE id = ?", [Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Producto eliminado." };
      res.redirect("/admin#contenido");
    } catch (err) { next(err); }
  });

  router.post("/admin/nutrition/:id/update", requireAuth, async (req, res, next) => {
    try {
      const values = [
        clean(req.body.title), clean(req.body.goal), clean(req.body.calories),
        clean(req.body.description), clean(req.body.meals),
        clean(req.body.image_url) || defaultNutritionImage(),
        clean(req.body.access_level) === "premium" ? "premium" : "gratis"
      ];
      if (values.slice(0, 5).some((value) => !value)) throw new Error("Completa todos los campos del plan.");
      await run(db, `UPDATE nutrition_plans SET title=?, goal=?, calories=?, description=?,
        meals=?, image_url=?, access_level=? WHERE id=?`, [...values, Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Plan de alimentación actualizado." };
      res.redirect("/admin#contenido");
    } catch (err) {
      req.session.flash = { type: "error", text: err.message.includes("UNIQUE") ? "Ya existe otro plan con ese título." : err.message };
      res.redirect("/admin#contenido");
    }
  });

  router.post("/admin/nutrition/:id/delete", requireAuth, async (req, res, next) => {
    try {
      await run(db, "DELETE FROM nutrition_plans WHERE id = ?", [Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Plan de alimentación eliminado." };
      res.redirect("/admin#contenido");
    } catch (err) { next(err); }
  });

  router.post("/admin/testimonials/:id/delete", requireAuth, async (req, res, next) => {
    try {
      await run(db, "DELETE FROM testimonials WHERE id = ?", [Number(req.params.id)]);
      req.session.flash = { type: "success", text: "Comentario eliminado." };
      res.redirect("/admin#contenido");
    } catch (err) { next(err); }
  });

  router.post("/admin/testimonials", requireAuth, async (req, res, next) => {
    try {
      const input = {
        author: clean(req.body.author),
        goal: clean(req.body.goal),
        comment: clean(req.body.comment),
        rating: Math.min(Math.max(Number(req.body.rating) || 5, 1), 5)
      };
      if (!input.author || !input.goal || input.comment.length < 10) {
        req.session.flash = { type: "error", text: "Completa el comentario con nombre, objetivo y texto." };
        return res.redirect("/admin#contenido");
      }
      await run(db, "INSERT INTO testimonials (author, goal, comment, rating, approved) VALUES (?, ?, ?, ?, 1)", [
        input.author,
        input.goal,
        input.comment,
        input.rating
      ]);
      req.session.flash = { type: "success", text: "Comentario agregado." };
      res.redirect("/admin#contenido");
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        req.session.flash = { type: "error", text: "Ya existe un comentario con ese nombre." };
        return res.redirect("/admin#contenido");
      }
      next(err);
    }
  });

  return router;
}

function requireAuth(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") return next();
  req.session.flash = { type: "error", text: "Inicia sesión como administradora para entrar al panel." };
  res.redirect("/admin-login");
}

function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.flash = { type: "error", text: "Crea una cuenta o inicia sesión para ver este módulo." };
  res.redirect("/login");
}

function clean(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 500);
}

function addDays(date, days) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + Number(days || 30));
  return result.toISOString().slice(0, 10);
}

function sendCsv(res, filename, rows) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}

function defaultRoutineImage() {
  return "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80";
}

function defaultProductImage() {
  return "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=80";
}

function defaultNutritionImage() {
  return "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80";
}

module.exports = routes;
