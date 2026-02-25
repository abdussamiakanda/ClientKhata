# ClientKhata

A single-page app for tracking client work and payments. Built with **React (Vite)**, **Firebase (Firestore + Authentication)**, and modular CSS.

## Features

- **Auth**: Sign in with Google only; protected dashboard route
- **Clients**: Add clients separately (name only; document id is the identifier); list, edit, delete (delete only when they have no jobs)
- **Jobs / Work**: Multiple jobs per client; job status flow: Pending → Ongoing → Delivered → Paid (each with timestamp); Paid is final and not draggable; payment recording will be on a separate payments page later
- **Table**: Grouped by client, search and filter by status/delivered
- **Payments**: Record payments per job (partial or full); multiple payment entries per job; Add payment via modal (select job, amount, note); remove payment entries; style aligned with other pages

## Firestore schema

### `clients` collection

| Field           | Type      | Description                              |
|-----------------|-----------|------------------------------------------|
| `clientName`    | string    | Display name (required)                  |
| `institution`   | string    | Optional                                 |
| `contactNumber` | string    | Optional                                 |
| `email`         | string    | Optional                                 |
| `website`       | string    | Optional                                 |
| `address`       | string    | Optional                                 |
| `notes`         | string    | Optional                                 |
| `imageBase64`   | string    | Optional; base64 data URL (compressed)   |
| `userId`        | string    | Optional, for audit (who created)        |
| `createdAt`     | Timestamp | When created                             |

Document ID is the client identifier (used as `clientId` in jobs).

### `payments` collection (jobs under a client)

| Field             | Type      | Description                                                |
|------------------|-----------|------------------------------------------------------------|
| `clientId`       | string    | Document ID of the client in `clients`                     |
| `clientName`     | string    | Denormalized client name for display                       |
| `workDescription`| string    | Project/task (e.g. Bridge Chemie)                          |
| `amount`         | number    | Payment amount (৳ on frontend)                             |
| `status`         | string    | Job status: `Pending` \| `Ongoing` \| `Delivered` \| `Paid`|
| `pendingAt`      | Timestamp | When set to Pending (created)                             |
| `ongoingAt`      | Timestamp | When set to Ongoing                                       |
| `deliveredAt`    | Timestamp | When set to Delivered                                     |
| `paidAt`         | Timestamp | When set to Paid                                          |
| `isDelivered`    | boolean   | True when status is Delivered or Paid (legacy)             |
| `timestamp`      | Timestamp | When the entry was created                                |
| `userId`         | string    | Owner                                                      |

### `payment_records` collection (money received per job)

| Field    | Type      | Description                    |
|----------|-----------|--------------------------------|
| `jobId`  | string    | Document ID of job in `payments` |
| `amount` | number    | Payment amount (৳)             |
| `paidAt` | Timestamp | When received                  |
| `note`   | string    | Optional note                  |
| `userId` | string    | Optional, who recorded         |

Multiple records per job are allowed (partial payments). When sum of amounts for a job ≥ job amount, the job is marked Paid.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** → Sign-in method → **Google** (enable and set support email).
3. Create a **Firestore** database.
4. In **Firestore** → **Rules**, allow read/write only for authenticated users on their own `clients` and `payments` (see `firestore.rules` in the repo).
5. Create a **Web app** in Project settings and copy the config.

### 3. Environment variables

Copy `.env.example` to `.env` and set your Firebase config:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Firestore indexes (if required)

If the app logs an error about a missing index, open the link in the error message to create it, or in Firestore go to **Indexes** and add:

- **payments**: `userId` (Ascending), `timestamp` (Descending)
- **payment_records**: `paidAt` (Descending)
- **clients**: `userId` (Ascending), `clientName` (Ascending)

### 5. Run the app

```bash
npm run dev
```

Open the URL shown (e.g. http://localhost:5173). Sign in with Google, add clients, then add jobs under each client.

## Deploy to Firebase Hosting

1. **Install Firebase CLI** (once):

   ```bash
   npm install -g firebase-tools
   ```

2. **Log in** (once):

   ```bash
   firebase login
   ```

3. **Link your Firebase project** (once, from the project root):

   ```bash
   firebase use --add
   ```

   Choose the project you use for Firestore/Auth (or create one in the [Firebase Console](https://console.firebase.google.com/)).

4. **Build and deploy**:

   ```bash
   npm run deploy
   ```

   Or step by step:

   ```bash
   npm run build
   firebase deploy
   ```

   Your app will be live at `https://<project-id>.web.app` (and `https://<project-id>.firebaseapp.com`).

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run deploy` – build and deploy to Firebase Hosting
