# Smart QR Code-Based Staff Attendance Management System

**Department of Information Technology**

An enterprise-grade, web-based Smart QR Code and GPS Geofencing Staff Attendance Management System built with React (Vite), Firebase Authentication, the Firebase Realtime Database, and Vanilla CSS. Runs entirely on the Firebase free (Spark) plan - no billing account required.

---

## 🚀 Key Features

### 🔐 Authentication & Role Management
- **Separate Portals**: Completely decoupled routes for `/admin` and `/staff`.
- **Admin**: Sign Up, Login, Forgot Password, Logout.
- **Staff**: Sign Up, Login, Forgot Password, Logout.
- **Route Protection**: Automatic redirection for unauthenticated or unauthorized users.

### 📱 Smart QR Code Generation (Admin)
- **Dynamic Session Creation**: Configurable QR expiration (5, 10, 15, or 30 minutes).
- **Encrypted Token Payload**: Includes `sessionId`, `token`, `expiresAt`, geofence coordinates (`latitude`, `longitude`, `radiusMeters`).
- **Live Countdown Timer**: Real-time timer indicating QR token validity remaining.

### 📍 Geolocation & Geofencing Verification (Staff)
- **Haversine Formula**: Calculates exact device distance from the Department of Information Technology building center.
- **Admin-configured geofence**: the coordinates and radius saved in Admin Settings are the ones the
  scanner, the GPS banner and new QR sessions all use.
- **Automated Validation**: Rejects scans executed outside the session radius, and rejects a GPS fix
  whose accuracy is too coarse to verify proximity (±50m).
- **Location Simulation**: Development-only test simulator (`npm run dev`) for desktop environments
  or testing without device GPS. It is stripped from production builds.

### 📊 Real-Time Admin Dashboard
- **Statistics Cards**: Total Staff, Present Today, Absent Today, Attendance Percentage.
- **Interactive Charts**: Daily, Weekly, and Monthly trends powered by Chart.js, computed from the
  stored attendance records.
- **Live Activity Stream**: Real-time database listeners updating scans instantly.
- **Staff Management**: Create, edit, delete, suspend, activate staff accounts with passport photo uploads.
- **Audit Logs**: Comprehensive system audit trail logging session creations and scans.

### 📱 Staff Portal
- **One-Touch Scanner**: Live webcam scanner via `html5-qrcode` plus file upload (and a
  development-only paste-a-payload tester).
- **Session verification**: a scanned QR must reference a real, still-open session document, and
  the session document is authoritative for the geofence.
- **Attendance Streaks**: Daily punctuality streak tracker and on-time rate gauge.
- **Attendance Heatmap & Calendar**: Visual 30-day activity grid.
- **Scan History**: Detailed logs with GPS distance recorded.

### 📄 Official Reports & Exporting
- **PDF Report Generation**: Download official letterhead reports via `jspdf` and `jspdf-autotable`.
- **Excel & CSV Export**: Download raw data spreadsheets via `xlsx`.
- **Printable Layout**: Clean print CSS media styles formatted for paper printing.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite, TypeScript), React Router DOM, Vanilla CSS (Glassmorphism, Light & Dark mode).
- **Backend & Storage**: Firebase Authentication, Firebase Realtime Database, Firebase Storage. No paid services.
- **QR Engine**: `qrcode`, `html5-qrcode`.
- **Charts & Exports**: `chart.js`, `react-chartjs-2`, `jspdf`, `jspdf-autotable`, `xlsx`, `date-fns`, `lucide-react`.

---

## 📦 Local Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase**:
   Firebase credentials are initialised automatically from `firebase-applet-config.json` in the
   project root. To override them, copy `.env.example` to `.env` and fill in the `VITE_FIREBASE_*`
   values.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 🔥 Firebase Console Setup (required once)

Account creation will not work until these are configured in the Firebase console for
`smart-attendance-system-20764`:

1. **Enable Email/Password sign-in**
   Firebase Console > **Authentication** > **Sign-in method** > enable **Email/Password**.
   Without this, sign-up fails with `auth/operation-not-allowed`.

2. **Add your deployed domain to Authorized domains**
   Authentication > **Settings** > **Authorized domains** > add your Render URL, for example
   `futo-smart-qr-attendance.onrender.com`, plus any custom domain. Without this, sign-in fails
   with `auth/unauthorized-domain` on the deployed site.

3. **(Optional) Google sign-in**
   Authentication > **Sign-in method** > enable **Google**. If you use a custom OAuth client,
   set `VITE_FIREBASE_OAUTH_CLIENT_ID`.

4. **Create the Realtime Database**
   Realtime Database > **Create Database** > pick a region > start in **locked mode**. The
   database is included in the Firebase free (Spark) plan, so no billing account is needed. Start
   locked so the app cannot read or write anything until the rules in step 5 are published.

5. **Publish the database security rules**
   The app refuses to work with wide-open rules, which would let anyone write an administrator
   record. From the project root:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use smart-attendance-system-20764
   firebase deploy --only database
   ```
   No CLI? Open Realtime Database > **Rules** in the console, paste the contents of
   `database.rules.json`, and press **Publish**. The console validates the rules and reports any
   syntax error.

6. **Create an administrator**
   Visit `/admin/register` and enter the **administrator passcode** (issued separately - the hash
   lives in `database.rules.json`, never in the app) together with the HOD's name, email, department
   and password. There is no limit on how many administrators exist and no one-time slot: the
   passcode is the gate for every admin-account creation via this page. Once an administrator is
   signed in, further administrators can be added without the passcode from Admin > Staff Management
   (via **Make Admin**).

---

## 🚀 Deploying to Render

This is a static single-page app, so use a Render **Static Site**.

**Option A - Blueprint (recommended)**

1. Push this repository to GitHub or GitLab.
2. In Render: **New > Blueprint**, select the repository. `render.yaml` configures the build
   command, publish path, the SPA rewrite, and the environment variable placeholders.
3. Fill in the `VITE_FIREBASE_*` values under **Environment**.

**Option B - Manual**

1. Render: **New > Static Site**, connect the repository.
2. Build command: `npm ci && npm run build`
3. Publish path: `./dist`
4. Add a **Rewrite** rule: `/*` → `/index.html`

The rewrite rule is essential. Without it, refreshing a deep link returns a 404, which breaks the
password-reset link that Firebase emails to staff.

Then add the resulting Render URL to **Authentication > Settings > Authorized domains** in the
Firebase console (step 2 above).

---

## 🔐 Security Model

- **Role-based database rules** - `database.rules.json` grants admin-only access to staff records,
  attendance sessions, notifications, audit logs and settings. Staff can read and write only their
  own records.
- **Admin-account passcode** - creating an administrator from `/admin/register` requires a passcode
  whose SHA-256 hash is embedded in `database.rules.json`. The passcode itself is never part of the
  app or its bundle, so end users cannot read it from the site. The rules also demand the hash on
  the new admin record itself, so a staff account can never promote itself. A wrong passcode is
  checked in the database (before the sign-in account is created), so the site cannot reveal whether
  a guess was close. Keep the passcode long and share it only with trusted officers.
- **Revocation is enforced on sign-in** - a revoked account is signed out immediately and cannot
  re-provision itself a profile.
- **No client-side secrets** - there are no hardcoded admin passcodes or demo login shortcuts. All
  authorisation decisions happen in `database.rules.json`.
- **The QR token is never stored** - `sessionToken` is written as an empty string on the session
  document, so the only copy of the token exists inside the rendered QR image. A scanned payload must
  resolve to a real, active, unexpired session, and that session document supplies the geofence that
  is enforced.
- **Development-only test tooling** - the "Quick Test Scanner" paste box and the GPS simulation mode
  are behind `import.meta.env.DEV` and are not present in the deployed bundle.
- **Known limitation** - this is a client-only app, so a determined user with devtools can still
  manipulate what they submit. Cryptographic proof that a QR was physically displayed requires a
  trusted backend (a Cloud Function that verifies a signed token, ideally with App Check). The
  current rules, session verification and lack of a payload-injection UI raise the bar considerably
  but do not make it impossible.
- **Note** - the Firebase web `apiKey` is a public client identifier, not a secret. Security
  depends entirely on the database rules and Firebase Authentication, so do not weaken
  `database.rules.json`.
- **Free-tier limits** - the Spark plan Realtime Database allows 100k reads and 10k writes per
  month, 1 GB of storage, and 50 simultaneous connections. That is comfortable for a departmental
  deployment, but a university-wide rollout should watch the usage panel in the Firebase console
  and can move to the pay-as-you-go plan later without any code change.

---

## 📝 License
Apache-2.0 License - Department of Information Technology Staff Attendance System.
