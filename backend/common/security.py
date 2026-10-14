import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from common.config import settings


password_hash = PasswordHash.recommended()

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    """Hash a plain-text password using Argon2."""
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its Argon2 hash."""
    return password_hash.verify(password, hashed_password)


def create_access_token(
    user_id: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a short-lived JWT access token."""

    if expires_delta is None:
        expires_delta = timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token."""

    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[ALGORITHM],
    )


def create_secure_token() -> str:
    """Create a cryptographically secure random token."""

    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    """Hash refresh/reset tokens before database storage."""

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def get_refresh_token_expiry() -> datetime:
    return (
        datetime.now(timezone.utc)
        + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )


def get_password_reset_token_expiry() -> datetime:
    return (
        datetime.now(timezone.utc)
        + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    )