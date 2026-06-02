const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function main() {
  console.log("Generating Ethereal test account...");
  let testAccount = await nodemailer.createTestAccount();
  console.log("Test account generated:", testAccount.user);

  const dbPath = path.join(__dirname, 'database.sqlite');
  const db = new sqlite3.Database(dbPath);

  db.run(`
    UPDATE company_settings 
    SET smtp_host = ?, smtp_port = ?, smtp_encryption = ?, smtp_user = ?, smtp_pass = ?, smtp_from = ?, smtp_from_name = ?
  `, [testAccount.smtp.host, testAccount.smtp.port, 'STARTTLS', testAccount.user, testAccount.pass, testAccount.user, 'Lumor Pay Test'], function(err) {
    if (err) {
      console.error("Error updating database:", err.message);
    } else {
      console.log(`\n==========================================`);
      console.log(`✅ Success! Database updated.`);
      console.log(`Port used: ${testAccount.smtp.port}`);
      console.log(`Host: ${testAccount.smtp.host}`);
      console.log(`\nYou can view all emails sent by the app here:`);
      console.log(`🔗 https://ethereal.email/login`);
      console.log(`👤 User: ${testAccount.user}`);
      console.log(`🔑 Pass: ${testAccount.pass}`);
      console.log(`==========================================\n`);
    }
    db.close();
  });
}

main().catch(console.error);
