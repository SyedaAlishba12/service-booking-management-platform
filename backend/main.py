from fastapi import FastAPI

from common.error_handlers import register_error_handlers
from routes import availability_routes, booking_routes, calendar_routes, payment_routes, provider_routes, service_routes
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

# Import model modules so SQLAlchemy relationships and Alembic metadata are complete.
from models import availability, booking, category, complaint, customer, notification, platform_setting, provider, review, service, user  # noqa: F401

app = FastAPI(title="Service Booking & Management Platform", version="1.0.0")
register_error_handlers(app)

for module in (provider_routes, service_routes, availability_routes):
    app.include_router(module.router)

for module in (
    booking_routes.router,
    payment_routes.router,
    calendar_routes.router,
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

set_eligibility_provider(get_review_eligibility)


@app.get("/")
async def root():
    return {"message": "Service Booking & Management Platform API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
