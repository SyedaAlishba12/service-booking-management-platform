"""Turns every error into {"success": false, "message": "...", "data": null}.

Without this, FastAPI answers {"detail": ...}, which the frontend api_client cannot read.
Register once in main.py:   register_error_handlers(app)

NOTE: if Alishba already has a global error handler, use hers and skip this file.
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _body(message: str, data=None) -> dict:
    return {"success": False, "message": message, "data": data}


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content=_body(message),
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path"))
        msg = str(err["msg"]).removeprefix("Value error, ")
        errors.append({"field": field, "message": msg})
    first = errors[0] if errors else {"field": "", "message": "Invalid request"}
    message = f"{first['field']}: {first['message']}" if first["field"] else first["message"]
    return JSONResponse(status_code=422, content=_body(message, {"errors": errors}))


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
