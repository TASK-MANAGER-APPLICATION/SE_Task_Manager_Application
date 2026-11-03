# Task Manager Mobile

React Native and Expo Router client for the Task Manager application.

## Requirements

- Node.js and npm
- PostgreSQL for the backend
- A reachable backend URL for the device or browser running the app

## Clone and install

```powershell
git clone <repository-url>
cd SE_Task_Manager_Application
cd mobile
npm install
```

Install backend dependencies separately from the repository root:

```powershell
cd backend
npm install
```

## Start the backend

Start PostgreSQL and configure `backend/.env` with either `DATABASE_URL` or the
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values. `PORT` is
optional and defaults to `3000`.

From `backend/`, initialize the database and start the API:

```powershell
npm run migrate
npm start
```

The mobile client calls the backend at `http://localhost:3000` by default. Set
`EXPO_PUBLIC_API_BASE_URL` to an address reachable from the app device when
`localhost` does not refer to the backend host. For example, set it in
PowerShell before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://<host-reachable-from-device>:3000"
```

## Start the mobile app

From `mobile/`:

```powershell
npx expo start
```

Expo Router provides the app screens. Use the terminal prompts to open a
supported simulator/device or the web client.

## Quality checks

Run these commands from `mobile/`:

```powershell
npx tsc --noEmit
npx eslint src
npm test -- --runInBand
```

## Current backend limitations

The mobile client uses the available authentication and task endpoints. The
current backend does not provide forgot/reset-password endpoints, category
management endpoints, profile GET/PUT endpoints, FCM device-token registration,
or reminder notification delivery. Profile edits are stored locally in the
mobile session; category assignment accepts an existing category ID. Task
details are loaded by finding the task in `GET /tasks`, because there is no
`GET /tasks/:id` endpoint.

An Android SDK, native Android project directory, and EAS build configuration
are not included in this checkout. An installable APK has not been built.
