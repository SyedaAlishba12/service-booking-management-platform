from fastapi import FastAPI

from routes.category_routes import admin_router as category_admin_router
from routes.category_routes import public_router as category_public_router
from routes.platform_setting_routes import admin_router as setting_admin_router
from routes.platform_setting_routes import public_router as setting_public_router
from routes.review_routes import admin_router as review_admin_router
from routes.review_routes import provider_reviews_router as review_provider_router
from routes.review_routes import reviews_router as review_user_router
from routes.complaint_routes import admin_router as complaint_admin_router
from routes.complaint_routes import complaints_router as complaint_user_router


app = FastAPI(
    title="Service Booking & Management Platform",
    version="1.0.0",
)


app.include_router(category_public_router)
app.include_router(category_admin_router)
app.include_router(setting_public_router)
app.include_router(setting_admin_router)
app.include_router(review_user_router)
app.include_router(review_provider_router)
app.include_router(review_admin_router)
app.include_router(complaint_user_router)
app.include_router(complaint_admin_router)


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