const request = require("supertest");
const session = require("express-session");
const { createApp } = require("../src/app");

describe("Gym Infinity web app", () => {
  const databaseFile = ":memory:";
  let app;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_EMAIL = "admin@gyminfinity.test";
    process.env.ADMIN_PASSWORD = "Admin12345";
    app = createApp({ databaseFile, sessionStore: new session.MemoryStore() });
  });

  afterEach((done) => {
    app.locals.db.close(done);
  });

  test("renders the public home with gym content and women-only testimonials section", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Gym Infinity");
    expect(response.text).toContain("Historias Infinity");
    expect(response.text).toContain("Fuerza Total 4D");
  });

  test("protects the admin dashboard", async () => {
    const response = await request(app).get("/admin");
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/admin-login");
  });

  test("allows the configured admin account into the dashboard", async () => {
    const agent = request.agent(app);
    const response = await agent
      .post("/admin-login")
      .type("form")
      .send({ email: "admin@gyminfinity.test", password: "Admin12345" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/admin");

    const dashboard = await agent.get("/admin");
    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain("Gestión Gym Infinity");
  });

  test("accepts contact leads with valid data", async () => {
    const response = await request(app)
      .post("/contacto")
      .type("form")
      .send({ name: "Maria", email: "maria@example.com", phone: "3001234567", goal: "Ganar fuerza" });
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/#contacto");
  });

  test("lets the admin register a member payment and creates an invoice", async () => {
    const agent = request.agent(app);
    await agent.post("/admin-login").type("form").send({
      email: "admin@gyminfinity.test",
      password: "Admin12345"
    });
    await agent.post("/admin/members").type("form").send({
      name: "Cliente Demo",
      email: "cliente.demo@example.com",
      phone: "3001234567",
      membership_id: 2,
      goal: "Ganar fuerza",
      membership_start: "2026-07-22"
    });
    const member = await new Promise((resolve, reject) => {
      app.locals.db.get("SELECT id FROM members WHERE email = ?", ["cliente.demo@example.com"], (err, row) => err ? reject(err) : resolve(row));
    });
    const payment = await agent.post("/admin/payments").type("form").send({
      member_id: member.id,
      amount: 119000,
      period_start: "2026-07-22",
      payment_method: "Transferencia bancaria",
      reference: "TEST-001",
      concept: "Membresía Performance de prueba"
    });
    expect(payment.status).toBe(302);
    expect(payment.headers.location).toBe("/admin#facturacion");
    const dashboard = await agent.get("/admin");
    expect(dashboard.text).toContain("GI-2026-00001");
    expect(dashboard.text).toContain("$119.000");
    expect(dashboard.text).toContain("2026-08-21");
    const pdf = await agent.get("/admin/invoices/1/pdf").buffer(true).parse((res, callback) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.body.slice(0, 4).toString()).toBe("%PDF");
  });

  test("keeps new accounts pending until the admin grants access", async () => {
    const visitor = request.agent(app);
    const registration = await visitor.post("/registro").type("form").send({
      name: "Nueva Persona",
      email: "nueva@example.com",
      phone: "3015551212",
      goal: "Mejorar condicion",
      password: "ClaveSegura123"
    });
    expect(registration.headers.location).toBe("/login");
    const denied = await visitor.post("/login").type("form").send({ email: "nueva@example.com", password: "ClaveSegura123" });
    expect(denied.headers.location).toBe("/login");

    const admin = request.agent(app);
    await admin.post("/admin-login").type("form").send({ email: "admin@gyminfinity.test", password: "Admin12345" });
    const account = await new Promise((resolve, reject) => {
      app.locals.db.get("SELECT id FROM users WHERE email = ?", ["nueva@example.com"], (err, row) => err ? reject(err) : resolve(row));
    });
    await admin.post(`/admin/users/${account.id}/access`).type("form").send({ access_granted: "1" });
    const allowed = await visitor.post("/login").type("form").send({ email: "nueva@example.com", password: "ClaveSegura123" });
    expect(allowed.headers.location).toBe("/mi-cuenta");
  });

  test("lets the admin update membership pricing", async () => {
    const admin = request.agent(app);
    await admin.post("/admin-login").type("form").send({ email: "admin@gyminfinity.test", password: "Admin12345" });
    const response = await admin.post("/admin/memberships/1").type("form").send({
      name: "Essential",
      price: 85000,
      duration_days: 30,
      benefits: "Acceso a sala y seguimiento",
      featured: "1"
    });
    expect(response.headers.location).toBe("/admin#planes");
    const plans = await request(app).get("/planes");
    expect(plans.text).toContain("$85.000");
  });

  test("lets the admin create, edit and delete catalog content", async () => {
    const admin = request.agent(app);
    await admin.post("/admin-login").type("form").send({ email: "admin@gyminfinity.test", password: "Admin12345" });
    await admin.post("/admin/products").type("form").send({
      name: "Producto CRUD",
      price: 45000,
      stock: 8,
      category: "Prueba",
      description: "Producto temporal para verificar administracion."
    });
    const product = await new Promise((resolve, reject) => {
      app.locals.db.get("SELECT id FROM products WHERE name = ?", ["Producto CRUD"], (err, row) => err ? reject(err) : resolve(row));
    });
    await admin.post(`/admin/products/${product.id}/update`).type("form").send({
      name: "Producto CRUD Editado",
      price: 52000,
      stock: 5,
      category: "Prueba",
      description: "Producto actualizado correctamente."
    });
    const store = await admin.get("/tienda");
    expect(store.text).toContain("Producto CRUD Editado");
    expect(store.text).toContain("$52.000");
    await admin.post(`/admin/products/${product.id}/delete`);
    const deleted = await admin.get(`/tienda/${product.id}`);
    expect(deleted.status).toBe(404);
  });

  test("keeps new comments pending until an administrator approves them", async () => {
    const response = await request(app).post("/comentarios").type("form").send({
      author: "Comentario Pendiente",
      goal: "Mejorar condición",
      comment: "La experiencia ha sido organizada y muy profesional.",
      rating: 5
    });
    expect(response.status).toBe(302);
    const publicHome = await request(app).get("/");
    expect(publicHome.text).not.toContain("Comentario Pendiente");

    const admin = request.agent(app);
    await admin.post("/admin-login").type("form").send({ email: "admin@gyminfinity.test", password: "Admin12345" });
    const item = await new Promise((resolve, reject) => {
      app.locals.db.get("SELECT id FROM testimonials WHERE author = ?", ["Comentario Pendiente"], (err, row) => err ? reject(err) : resolve(row));
    });
    await admin.post(`/admin/testimonials/${item.id}/approve`);
    const approvedHome = await request(app).get("/");
    expect(approvedHome.text).toContain("Comentario Pendiente");
  });

  test("lets the primary administrator create worker credentials", async () => {
    const admin = request.agent(app);
    await admin.post("/admin-login").type("form").send({ email: "admin@gyminfinity.test", password: "Admin12345" });
    const created = await admin.post("/admin/team").type("form").send({
      name: "Entrenadora Demo",
      email: "equipo@example.com",
      phone: "3005550101",
      role: "staff",
      password: "TemporalSegura123"
    });
    expect(created.headers.location).toBe("/admin#equipo");

    const worker = request.agent(app);
    const login = await worker.post("/admin-login").type("form").send({
      email: "equipo@example.com",
      password: "TemporalSegura123"
    });
    expect(login.headers.location).toBe("/admin");
    const dashboard = await worker.get("/admin");
    expect(dashboard.status).toBe(200);
    expect(dashboard.text).not.toContain("Crear credenciales");
  });
});
