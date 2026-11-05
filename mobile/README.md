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

Set `EXPO_PUBLIC_API_BASE_URL` to the backend origin before starting Expo. The
older `EXPO_PUBLIC_API_URL` name is also supported as a fallback. If neither
variable is set, the client uses `http://localhost:3000`.

The correct address depends on where the app runs:

- Expo Web and the iOS simulator can usually use `http://localhost:3000`.
- The Android emulator should use `http://10.0.2.2:3000`.
- A physical device should use the computer's LAN IP address, with the device
  and computer connected to the same network.

For example, set the value in PowerShell before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:3000"
```

For Expo Web, the backend allows the default local Expo origins
(`localhost`/`127.0.0.1` on ports 8081 and 19006). To use another web origin,
configure the backend's `CORS_ORIGINS` environment variable as a comma-separated
list of exact origins, for example
`CORS_ORIGINS=http://192.168.1.20:8081,http://localhost:8081`. The client sends
Bearer tokens in the `Authorization` header and does not use cross-origin
cookies.

### Production CORS

In production, set `CORS_ORIGINS` in the backend deployment environment to the
exact public web origins that are allowed to call the API, then redeploy or
restart the backend. Include the scheme and any non-default port, but not a
path, for example:

```text
CORS_ORIGINS=https://tasks.example.com,https://admin.example.com
```

Separate multiple origins with commas; surrounding whitespace is trimmed. When
`CORS_ORIGINS` is set, it replaces the local development origin defaults.
Specify explicit origins rather than `*`. The API does not enable credentialed
CORS or cross-origin cookies; the mobile client sends its bearer token in the
`Authorization` header. Keep the allowed-origin list limited to trusted
production web clients.

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
