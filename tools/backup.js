const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const source = path.resolve(process.env.DATABASE_FILE || "gyminfinity.db");
const outputDirectory = path.resolve("backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = path.join(outputDirectory, `gyminfinity-${stamp}.db`);

fs.mkdirSync(outputDirectory, { recursive: true });
const db = new sqlite3.Database(source);
db.run("PRAGMA wal_checkpoint(FULL)", (checkpointError) => {
  if (checkpointError) throw checkpointError;
  fs.copyFileSync(source, destination);
  db.close();
  console.log(`Copia creada: ${destination}`);
});
