from fastapi import FastAPI
from common.error_handlers import register_error_handlers
from routes import availability_routes, provider_routes, service_routes


app = FastAPI(
    title="Service Booking & Management Platform",
    version="1.0.0",
)

register_error_handlers(app)

for module in (provider_routes, service_routes, availability_routes):
    app.include_router(module.router)


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