# Deployment preparation

The repository is prepared for a development service on Render, Neon PostgreSQL,
and an Expo EAS Android internal APK. No remote service, database, or EAS project
has been created or deployed from this checkout.

## Environment variables

| Variable | Where it belongs | Purpose |
|---|---|---|
| `DATABASE_URL` | Render; local `backend/.env` | PostgreSQL connection string. For Neon, copy the pooled connection string and keep `sslmode=require`. |
| `PORT` | Render assigns it; local `backend/.env` | HTTP listener port. |
| `CORS_ORIGINS` | Render; local `backend/.env` | Comma-separated exact browser origins. Do not use `*`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Render; local `backend/.env` | Real SMTP delivery configuration. |
| `PASSWORD_RESET_URL` | Render; local `backend/.env` | Reset deep link. The current Expo scheme is `mobile`, so use `mobile://reset-password` unless the scheme changes. |
| `EXPO_PUBLIC_API_BASE_URL` | EAS build environment; local `mobile/.env` | Public API base URL embedded in the app. Set it to the deployed Render URL for every build profile. It is not a secret. |
| `ANDROID_APPLICATION_ID` | EAS project configuration | Team-selected stable reverse-domain Android package identifier. It has intentionally not been invented in this repository. |

Copy the two `.env.example` files to local `.env` files and replace every
placeholder. `.env` files are ignored by Git. Do not put database or SMTP
credentials in Expo variables; Expo public variables are embedded in the app.

## Render and Neon development deployment

1. Create a Neon project and select its PostgreSQL version/region for the team.
2. Copy the Neon pooled connection string. Verify its hostname and database name before using it.
3. Create a Render web service from this repository using `render.yaml`, or set
   the same values manually: branch `develop`, root `backend`, build command
   `npm ci`, start command `npm start`, health check `/health`.
4. In Render, add the Neon `DATABASE_URL`, exact `CORS_ORIGINS`, and SMTP values.
   Render assigns `PORT`; do not set it to a local port.
5. Verify the Render service and Neon database identities before running a
   migration. Never run the command below until `DATABASE_URL` is confirmed to
   target the intended non-production database.
6. In a terminal with the approved Render `DATABASE_URL`, from the repository
   root run:

   ```powershell
   Set-Location backend
   npm ci
   npm run migrate
   ```

7. Verify the `schema_migrations` table lists migrations `001` through `004`,
   then check `GET /health` and exercise registration/login/task persistence.
8. Restart the Render service and verify the same data remains. Record the
   Neon backup and restore procedure and test restore into a separate database.

The migration runner applies migrations transactionally and does not seed data.
Migration `004_password_reset_security.sql` revokes any legacy outstanding
password reset rows before installing active-token indexes.

## Android internal build

1. Ask the project owner to select and reserve the permanent Android package ID.
2. Create or select the correct Expo project and authenticate with `npx eas-cli login`.
3. Set `EXPO_PUBLIC_API_BASE_URL` in the EAS environment used by `preview` to the
   verified Render service URL. Set `ANDROID_APPLICATION_ID` to the confirmed
   identifier; `mobile/app.config.js` validates it and applies it to the Expo config.
4. Run from `mobile`:

   ```powershell
   npx eas-cli build --platform android --profile preview
   ```

5. Confirm the EAS build output is an APK, install it on an Android device, and
   test login, task/category operations, dashboard refresh, and the reset email
   deep link. Reset email testing requires configured SMTP credentials and a
   controlled test account.

`eas.json` configures `preview` for internal distribution and `buildType: apk`.
The Expo project owner, project ID, Android package identifier, Render service
URL, Neon project, SMTP account, and release credentials are external choices
that must be supplied by the project owner.

## Production release controls

Keep production on `main` until the `develop` release is reviewed and internal
APK testing passes. Before production migrations, independently verify the
production Neon hostname/database and obtain approval. Run `npm run migrate`
from `backend` against that confirmed target, verify all four migration records,
deploy the approved `main` commit, and run production smoke checks. Keep a
verified backup and restore point before production migration or release.
