# Sastha Infinite Enterprise — Website & Customer Portal

## Included
- Responsive black-and-gold company website using your supplied logo
- Service catalogue and product catalogue
- Customer quotation/enquiry form with unique reference numbers
- JSON-file persistence in `data/db.json`

## Requirements
- Node.js 20 or newer
- No third-party npm packages are required

## Run locally
1. Extract this ZIP into a folder.
2. Install Node.js 20+ if needed.
3. Open Terminal/Command Prompt in the extracted folder.
4. Run `node server.js`
5. Open `http://localhost:3000`

## Administrator login
Default first-run login:
- Username: `admin`
- Password: `ChangeMe-Immediately-2026!`

Change this before any public deployment. On Linux/macOS:
```bash
ADMIN_USER='your-admin-name' ADMIN_PASSWORD='use-a-long-unique-password' SESSION_SECRET='use-a-long-random-secret' node server.js
```
On Windows PowerShell:
```powershell
$env:ADMIN_USER='your-admin-name'
$env:ADMIN_PASSWORD='use-a-long-unique-password'
$env:SESSION_SECRET='use-a-long-random-secret'
node server.js
```

## Important production checklist
This is a functional starter portal, not yet hardened for public production. Before publishing it on a public domain:
- Change default admin credentials and set a long random `SESSION_SECRET`.
- Use HTTPS behind a properly configured reverse proxy.
- Add persistent database backups, rate limiting, CSRF protection and stronger authentication (preferably MFA).
- Configure business email and WhatsApp provider/API if automatic notifications are required. This version records submissions but does not send outbound email/WhatsApp notifications.
- Add privacy notice and terms; define retention and consent practices for customer data.
- Use a managed database for multiple users/instances. JSON storage is intended for a small starter deployment, not concurrent/high-volume production.
- Configure monitoring, firewall, updates and restore testing.
- Confirm all SSM details and contact information before launch.

## Routes
- `GET /api/health`
- `GET /api/products`
- `POST /api/enquiries`
- `POST /api/tickets`
- `GET /api/tickets/status?ref=SUP-...`
- Admin API: `/api/admin/*` (requires sign-in)

## Business details prefilled
SASTHA INFINITE ENTERPRISE
SSM Registration No.: 202403261467 (NS0301441-U)
Established: 2019
Address: No. 36, 1A, Jalan Resak 1/KS7, Bandar Botanic, 41200 Klang, Selangor, Malaysia
Tagline: Excellence • Innovation
