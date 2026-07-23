const { createApp } = require("./src/app");

const port = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`Gym Infinity listo en http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    app.locals.db?.close(() => {});
    app.locals.sessionDb?.close(() => {});
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
