# Lumor Pay

Lumor Pay is a comprehensive, self-hosted invoice and payment management system. It allows you to easily generate, send, and collect payments on professional invoices directly from your clients using integrated payment gateways like PayPal and Stripe.

## 🚀 Quick Start

Lumor Pay is designed to be extremely simple to run. The setup scripts will automatically install Node.js dependencies and launch the servers for you.

### On Linux / macOS
Open your terminal and run:
```bash
bash start.sh
```

### On Windows
Open PowerShell and run:
```powershell
.\start.ps1
```

> [!NOTE]
> The scripts will automatically detect if the required ports (5000 and 5173) are currently stuck or in-use by another crashed process and terminate them to ensure a clean startup.

Once the script finishes, you can access the application at:
**Frontend Dashboard:** `http://localhost:5173`
**Backend API:** `http://localhost:5000`

---

## ⚙️ Configuration & Features

All configuration for Lumor Pay is done directly through the beautifully designed **Settings Dashboard** inside the application. No need to touch configuration files manually!

### 📧 SMTP Email Configuration
To send invoices and receipts to your clients, you must configure an SMTP provider in the `Settings > SMTP Email Config` tab. 

Because many cloud hosting providers block external SMTP traffic on standard ports (25, 465, 587) to prevent spam, we highly recommend using a transactional email service like **SendGrid** or **Brevo** using an alternative port.

**Example SendGrid Setup:**
- **Host:** `smtp.sendgrid.net`
- **Port:** `2525` *(Bypasses standard VPS firewalls)*
- **Encryption:** `STARTTLS`
- **Username:** `apikey`
- **Password:** `<Your SendGrid API Key>`

### 💳 PayPal Integration
Lumor Pay supports full PayPal checkout integration out of the box. 
1. Go to your PayPal Developer Dashboard and create a new App to get your Client ID and Secret.
2. Enter them into the `Settings > PayPal API Config` tab in Lumor Pay.
3. Once configured, your clients will see a "Pay with PayPal" button directly on their public invoice page.

> [!TIP]
> When a client pays via PayPal, the transaction description on your PayPal Merchant Dashboard will explicitly state **"Invoice No. INV-XXXX Paid"**. This makes accounting incredibly easy, allowing you to ignore the payer's display name and match payments directly to your invoices!

### 🏦 Stripe Integration
*(Coming Soon)* You can add your Stripe Publishable and Secret keys in the Settings dashboard to allow customers to pay invoices seamlessly using their credit/debit cards.

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite (Zero-configuration local database)
- **Email:** Nodemailer

## 📝 License
Proprietary / Closed Source. All rights reserved.
