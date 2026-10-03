from fastapi import FastAPI


app = FastAPI(
    title="Service Booking & Management Platform",
    version="1.0.0",
)


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