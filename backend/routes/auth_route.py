
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.config import settings
from common.rate_limiter import limiter
from controllers.auth_controller import AuthController
from database.session import get_db
from schemas.auth_schema import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7


def set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    environment = settings.environment.lower()
    is_production = environment not in {"development", "test"}

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=REFRESH_TOKEN_MAX_AGE,
        path="/api/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    environment = settings.environment.lower()
    is_production = environment not in {"development", "test"}

    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/auth",
        secure=is_production,
        httponly=True,
        samesite="lax",
    )


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await AuthController.register(data, db)

    return {
        "success": True,
        "message": "Account created successfully. Please sign in.",
        "data": result.model_dump(),
    }

@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result, refresh_token = await AuthController.login(data, db)

    set_refresh_cookie(response, refresh_token)

    return {
        "success": True,
        "message": "Login successful",
        "data": result.model_dump(),
    }


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing",
        )

    result, new_refresh_token = await AuthController.refresh(
        refresh_token,
        db,
    )

    set_refresh_cookie(response, new_refresh_token)

    return {
        "success": True,
        "message": "Token refreshed successfully",
        "data": result.model_dump(),
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if refresh_token:
        await AuthController.logout(refresh_token, db)

    clear_refresh_cookie(response)

    return {
        "success": True,
        "message": "Logout successful",
        "data": None,
    }


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    await AuthController.forgot_password(data, db)

    # The response deliberately does not reveal whether the
    # submitted email belongs to an account.
    return {
        "success": True,
        "message": (
            "If an account exists with this email, "
            "a password reset link has been sent."
        ),
        "data": None,
    }


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    await AuthController.reset_password(data, db)

    return {
        "success": True,
        "message": "Password reset successfully",
        "data": None,
    }