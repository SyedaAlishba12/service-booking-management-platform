from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from slowapi.middleware import SlowAPIMiddleware

from common.error_handlers import register_error_handlers
from common.rate_limiter import limiter

# Import all models so SQLAlchemy relationships and Alembic metadata are registered.
from models import (  # noqa: F401
    availability,
    booking,
    category,
    complaint,
    customer,
    notification,
    password_reset_token,
    platform_setting,
    provider,
    refresh_token,
    review,
    service,
    user,
)

from routes import (
    availability_routes,
    booking_routes,
    calendar_routes,
    payment_routes,
    provider_routes,
    service_routes,
)
from routes.admin_routes import admin_router as admin_management_router
from routes.auth_route import router as auth_router
from routes.category_routes import admin_router as category_admin_router
from routes.category_routes import public_router as category_public_router
from routes.complaint_routes import admin_router as complaint_admin_router
from routes.complaint_routes import complaints_router as complaint_user_router
from routes.notification_route import router as notification_router
from routes.platform_setting_routes import admin_router as setting_admin_router
from routes.platform_setting_routes import public_router as setting_public_router
from routes.report_routes import admin_router as report_admin_router
from routes.review_routes import admin_router as review_admin_router
from routes.review_routes import provider_reviews_router as review_provider_router
from routes.review_routes import reviews_router as review_user_router
from routes.user_route import router as user_router

from services.booking_eligibility import set_eligibility_provider
from services.booking_service import get_review_eligibility
from services.reminder_scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(
    title="Service Booking & Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

backend_dir = Path(__file__).resolve().parent
upload_dir = backend_dir / "uploads"
upload_dir.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=upload_dir),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

# Provider, service, availability, booking, payment, and calendar routes.
for module in (
    provider_routes,
    service_routes,
    availability_routes,
    booking_routes,
    payment_routes,
    calendar_routes,
):
    app.include_router(module.router)

# Authentication, user, notification, admin, and customer-facing module routes.
for router in (
    auth_router,
    user_router,
    notification_router,
    category_public_router,
    category_admin_router,
    setting_public_router,
    setting_admin_router,
    review_user_router,
    review_provider_router,
    review_admin_router,
    complaint_user_router,
    complaint_admin_router,
    report_admin_router,
    admin_management_router,
):
    app.include_router(router)

# Connect Sayeel's booking eligibility lookup to the review system.
set_eligibility_provider(get_review_eligibility)


@app.get("/")
async def root():
    return {
        "message": "Service Booking & Management Platform API is running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}