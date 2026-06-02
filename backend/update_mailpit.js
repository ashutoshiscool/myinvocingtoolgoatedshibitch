const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);
db.run("UPDATE company_settings SET smtp_host = '127.0.0.1', smtp_port = '1025', smtp_encryption = 'None', smtp_user = '', smtp_pass = ''", function(err) {
  if (err) console.error(err);
  else console.log("Database updated for Mailpit!");
  db.close();
});
