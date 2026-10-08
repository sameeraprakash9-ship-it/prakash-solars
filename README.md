# Sunwise Solar Energy Trading Platform

A student project for peer-to-peer solar energy trading. The app includes an Express/Mongoose API and a React/Vite frontend with role-specific workspaces for prosumers, consumers, and administrators.

## Project layout

- `backend/` — CommonJS Express API, Mongoose models, JWT authentication, and scheduled pricing snapshots.
- `frontend/` — React, Vite, Tailwind CSS, React Router, Axios, and Recharts.

## Requirements

- Node.js 18 or newer
- MongoDB (local for development or MongoDB Atlas)

## Run the complete app locally

Requirements: Node.js 18 or newer, MongoDB Community Server, and npm dependencies installed in both `backend/` and `frontend/`.

1. Install dependencies once:

   ```powershell
   cd backend
   npm install
   cd ..\frontend
   npm install
   cd ..
   ```

2. In VS Code, open the project root folder, then select **Terminal → New Terminal** and run:

   ```powershell
   npm run dev
   ```

   This single command automatically creates a private, Git-ignored `backend/.env`, generates local-only secrets, starts a separate MongoDB replica set on port 27018, prepares demo platform settings, and runs both the API and browser client. MongoDB data is isolated in `backend/.local-mongodb-data`; any existing database on port 27017 is left untouched. MongoDB must be installed and is detected in the default Windows installation folder or on `PATH`. If installed elsewhere, set `MONGOD_PATH` to the full `mongod.exe` path before running the command.
3. Open **http://127.0.0.1:5173**. Register your own email at **Create an account**, select the consumer or prosumer role, and then sign in with that email and password. New accounts are created immediately; email verification is not required. Sign-in only works for an account already registered in this database.
4. To preview all three workspaces, use the local demo accounts `admin@sunwise.test`, `consumer@sunwise.test`, and `prosumer@sunwise.test`. All use the local-only password printed in the VS Code terminal when the app starts. These `.test` accounts and their sample wallet/solar data exist only in the isolated local demo database.

The API health check is `http://127.0.0.1:5000/api/health`. Stop all development servers with **Ctrl+C** in the VS Code terminal. The local MongoDB database remains in `backend/.local-mongodb-data`, ready for the next `npm run dev`.

### Buyer-facing solar offer details

Prosumer accounts can add a generation meter and provide the solar panel brand/model, panel count, installation year, a short description, and an optional solar panel photo. Existing generation meters have a **Solar details** action to add or update this information. Photos are resized by the browser and stored with the meter, limited to JPEG, PNG, or WebP images up to 700 KB. Buyers see the seller's name, system capacity, available kWh, asking price per kWh, estimated full-offer value, delivery window, and any panel details or photo the seller supplied. The marketplace labels missing information and explains that seller-provided panel details are not independently verified.

Password recovery is available from the sign-in page. Configure the backend SMTP variables below to send reset links; each link expires after one hour and can only be used once.

## Environment variables

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port. Render supplies this automatically. |
| `MONGO_URI` | Yes | MongoDB connection string, local or Atlas. |
| `JWT_SECRET` | Yes | Long, private signing secret. Never commit a real value. |
| `JWT_EXPIRES` | No | JWT lifetime, defaults to `7d`. |
| `CLIENT_URL` | Yes for production | Comma-separated, exact browser origins allowed by CORS, e.g. `https://sunwise.example,https://sunwise-git-main-team.vercel.app`. No trailing slash. |
| `SMTP_HOST` | For password recovery | Hostname of the SMTP server used to deliver reset emails. |
| `SMTP_PORT` | For password recovery | SMTP port, commonly `587` (STARTTLS) or `465` (implicit TLS). |
| `SMTP_SECURE` | No | Set to `true` to use implicit TLS. Port `465` enables it automatically. |
| `SMTP_USER` | For password recovery | SMTP username. |
| `SMTP_PASS` | For password recovery | SMTP password or provider-generated app password. Keep it private. |
| `SMTP_FROM` | No | Sender address shown on reset emails; defaults to `SMTP_USER`. |
| `ADMIN_EMAIL` | For initial seed | Email for the first administrator created by `npm run seed:admin`. |
| `ADMIN_PASSWORD` | For initial seed | Private initial administrator password (at least 6 characters). |
| `ADMIN_NAME` | No | Display name for the first administrator; defaults to `Grid Admin`. |
| `NODE_ENV` | Set by Render | Use `production` for the deployed service. |

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes for production | API base URL ending in `/api`, e.g. `https://sunwise-api.onrender.com/api`. |

Vite variables are included in the public browser bundle. Do not put secrets in frontend environment variables.

## Deploy

### 1. MongoDB Atlas

1. Create an Atlas cluster, database user, and database (for example `solar_trading`).
2. Add a strong password to the connection string and URL-encode any special characters in it.
3. Configure Atlas Network Access to permit the Render service’s outbound IP addresses. Render’s outbound addresses depend on the plan and may change; use Render static outbound IPs if available. `0.0.0.0/0` is convenient for a short-lived student demo but is less restrictive and should not be used when a tighter allowlist is possible.
4. Copy the driver connection string and set its database name, for example `mongodb+srv://<db-user>:<password>@<cluster-host>/solar_trading?retryWrites=true&w=majority`.

### 2. Backend on Render

Create a **Web Service** connected to this repository:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables in Render:

- `MONGO_URI` — Atlas connection string
- `JWT_SECRET` — generate a long random secret in Render; do not reuse the example
- `JWT_EXPIRES` — optional, e.g. `7d`
- `CLIENT_URL` — the deployed Vercel origin(s), comma-separated, with no path or trailing slash. Example: `https://sunwise.vercel.app`
- `NODE_ENV` — `production`

The API listens on Render’s injected `PORT`. Confirm the deployment at `https://<render-service>.onrender.com/api/health`.
To bootstrap the first administrator, temporarily add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME` in Render, then run `npm run seed:admin` from the service’s Shell. Remove `ADMIN_PASSWORD` from the service environment after the account is created.

### 3. Frontend on Vercel

Import the same repository as a Vercel project:

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://<render-service>.onrender.com/api`

The included `frontend/vercel.json` rewrites client-side routes (including public certificate verification links) to `index.html`. After deployment, add the final Vercel production origin to the Render `CLIENT_URL` value and redeploy/restart the API. For preview deployments, add the exact preview origins you intend to use as comma-separated values.

### Deployment checklist

- Atlas accepts connections from the deployed API.
- Render has the Atlas URI, a private JWT secret, and exact Vercel origins in `CLIENT_URL`.
- Vercel uses the Render API URL with `/api` at the end.
- `https://<render-service>.onrender.com/api/health` returns `{"ok":true}`.
- Sign-in, API requests, live grid EventSource, certificate downloads, and `/verify/<certificate-number>` work from the deployed Vercel domain.
- No `.env` file or secret is committed to source control.

## Important API paths

- Authentication: `/api/auth`
- Meters and readings: `/api/meters`
- Listings and bids: `/api/listings`, `/api/bids`
- Matching and settlement: `/api/matching`, `/api/transactions`
- Wallet and ledger: `/api/wallet`, `/api/ledger`
- Grid and pricing: `/api/grid`, `/api/pricing`
- Admin: `/api/admin`
- Disputes: `/api/disputes`
- Carbon certificates: `/api/carbon`; public verification API: `/api/carbon/verify/:certNo`

## Scripts

In `backend/`: `npm run dev`, `npm start`, `npm run seed:admin`.

In `frontend/`: `npm run dev`, `npm run build`, `npm run preview`.
