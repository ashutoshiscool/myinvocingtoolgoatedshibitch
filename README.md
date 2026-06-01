# Lumor Pay - Personal Invoice Management App

A modern, responsive, and secure personal invoice management system optimized for a single business owner (no signup routes or multi-tenant SaaS overhead).

## Technologies
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons, PayPal JS SDK
- **Backend**: Node.js, Express, SQLite (Promise Wrapper), PDFKit (PDF compilation), Nodemailer (SMTP dispatch)
- **Deployment**: Docker, Docker Compose

---

## Core Features
1. **Admin Security**: Single admin credentials stored securely using bcrypt password hashes in SQLite.
2. **Interactive Dashboard**: Track total invoices, paid versus pending counts, and monthly revenue trends.
3. **Company Settings**: Update default tax rates, active currencies (USD, EUR, GBP, AUD, CAD), invoice headers, and SMTP configurations directly in the UI.
4. **Customer Records**: Store customer profiles (Company name, email, contact, phone, address).
5. **Invoice Editor**: Dynamic line items creator that computes subtotals, tax fractions, and grand totals automatically.
6. **Actions Drawer**:
   - **Download PDF**: Stream custom-rendered PDF receipts instantly.
   - **Email Invoice**: Automates pdf-attached email delivery directly to the client's inbox.
   - **Duplicate Invoice**: Clone any invoice with a single click, assigning a fresh INV sequence number.
   - **Mark Paid**: Manually record payments if settled via bank transfer/cash.
7. **Public Checkout Page**: Clients can access a public URL (e.g. `/invoice/secure_hash`) to view their invoice, download their PDF, and check out instantly using PayPal.

---

## Setup & Local Installation

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation Steps

1. **Clone and Configure Env**:
   In the root directory, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in any customized values. If PayPal credentials are left empty, the application will activate a simulated sandbox payment flow, allowing full test checkout scenarios without keys.

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run Development Servers**:
   - **Backend**: Run `npm run dev` inside the `backend` folder. Runs on `http://localhost:5000`.
   - **Frontend**: Run `npm run dev` inside the `frontend` folder. Runs on `http://localhost:5173`.

---

## Docker Deployment (Production)

To spin up the entire application inside Docker containers (API + React served via Nginx):

1. Make sure Docker and Docker Compose are installed.
2. Run the following command in the root directory:
   ```bash
   docker-compose up --build -d
   ```
3. Access the admin dashboard at `http://localhost:5173`. The backend services run on `http://localhost:5000`.
4. Database data is persisted on your local disk inside Docker volumes.

---

## Default Login Credentials
- **Username**: `admin`
- **Password**: `admin123`
*(Note: You can change the username and password in the Settings tab of the application at any time.)*

---

## Testing PayPal Sandbox Payments
When testing the PayPal checkout flow on the public invoice page (`http://localhost:5173/invoice/:secure_hash`):
1. Configure your `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` inside the `.env` configuration file.
2. Open any active invoice's public page and click the PayPal payment button.
3. In the pop-up transaction window, log in using these sandbox buyer credentials to complete a test purchase:
   - **Email / Username**: `sb-bqhcf51434680@business.example.com`
   - **Password**: `h_VT6*=w`
