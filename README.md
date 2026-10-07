# Service Booking and Management Platform

## Local setup

The backend reads `DATABASE_URL`, `SECRET_KEY`, and optional `ENVIRONMENT` from the environment or a root `.env` file. Use a PostgreSQL database with the asyncpg URL format. Create the combined Alembic migration before starting the API; the model snapshots alone do not create database tables.

From the repository root in PowerShell:

```powershell
py -m venv backend\venv
backend\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn main:app --app-dir backend --reload
```

Install and run the frontend in a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

For local API-backed frontend pages, create `frontend/.env.local` with:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_DEBUG_USER_ID=<local-user-uuid>
NEXT_PUBLIC_DEBUG_ROLE=CUSTOMER
```

Use `PROVIDER` for provider pages. The debug headers only work with the development auth stub; replace them with the real authentication flow before deployment. A single browser environment uses one debug role at a time.

## Booking background worker

Run one scheduler process per database, after migrations are applied. From the repository root in a separate terminal:

```powershell
$env:PYTHONPATH = (Join-Path (Get-Location) "backend")
python -m services.booking_scheduler
```

The worker expires unpaid holds and creates appointment reminders about 24 hours before appointments. Configure `BOOKING_SCHEDULER_INTERVAL_SECONDS` and `BOOKING_REMINDER_LEAD_HOURS` if needed. The defaults are 60 seconds and 24 hours.
