"""JWT token validation shared by the authentication middleware."""

import jwt

from common.config import settings

ALGORITHM = "HS256"


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
