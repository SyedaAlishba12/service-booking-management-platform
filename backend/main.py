
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from common.error_handlers import register_error_handlers
from common.rate_limiter import limiter

from pathlib import Path
from fastapi.staticfiles import StaticFiles

from models import (
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
)  # noqa: F401

from routes.auth_route import router as auth_router
from routes.user_route import router as user_router
from routes import (
    availability_routes,
    booking_routes,
    calendar_routes,
    payment_routes,
    provider_routes,
    service_routes,
)
from routes.category_routes import admin_router as category_admin_router
from routes.category_routes import public_router as category_public_router
from routes.complaint_routes import admin_router as complaint_admin_router
from routes.complaint_routes import complaints_router as complaint_user_router
from routes.platform_setting_routes import admin_router as setting_admin_router
from routes.platform_setting_routes import public_router as setting_public_router
from routes.review_routes import admin_router as review_admin_router
from routes.review_routes import provider_reviews_router as review_provider_router
from routes.review_routes import reviews_router as review_user_router

from services.booking_eligibility import set_eligibility_provider
from services.booking_service import get_review_eligibility


app = FastAPI(
    title="Service Booking & Management Platform",
    version="1.0.0",
)

# Rate limiting
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

BACKEND_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads",
)
# Frontend CORS configuration
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

# Provider / Service / Availability
for module in (
    provider_routes,
    service_routes,
    availability_routes,
):
    app.include_router(module.router)

# Booking / Payment / Calendar
for module in (
    booking_routes,
    payment_routes,
    calendar_routes,
):
    app.include_router(module.router)

# Category / Settings / Reviews / Complaints
for module in (
    category_public_router,
    category_admin_router,
    setting_public_router,
    setting_admin_router,
    review_user_router,
    review_provider_router,
    review_admin_router,
    complaint_user_router,
    complaint_admin_router,
):
    app.include_router(module)

# Connect booking eligibility service with review system
set_eligibility_provider(get_review_eligibility)

# Authentication and user routes
app.include_router(auth_router)
app.include_router(user_router)


@app.get("/")
async def root():
    return {
        "message": "Service Booking & Management Platform API is running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy"
    }