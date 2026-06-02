const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);
db.run("UPDATE company_settings SET smtp_port = '2525'", function(err) {
  if (err) console.error(err);
  else console.log("Port successfully updated to 2525!");
  db.close();
});
