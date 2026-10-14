"""TEMPORARY authentication stand-in until Zainab's auth is merged.

All my routes import get_current_user / require_roles ONLY from this file. When the
real auth dependencies exist, replace the body of this file with re-exports, e.g.

    from <zainab's module> import get_current_user, require_roles, CurrentUser

and nothing else changes. The real user object needs `.id` (UUID) and `.role`.

The stub trusts two request headers (X-Debug-User-Id, X-Debug-Role), so it refuses to
work unless ENVIRONMENT=development. Never deploy with this stub.
"""
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status


@dataclass
class CurrentUser:
    id: UUID
    role: str


async def get_current_user(
    x_debug_user_id: str | None = Header(default=None),
    x_debug_role: str | None = Header(default=None),
) -> CurrentUser:
    from common.config import settings

    if settings.environment != "development":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    if not x_debug_user_id or not x_debug_role:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    try:
        user_id = UUID(x_debug_user_id)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    return CurrentUser(id=user_id, role=x_debug_role.upper())


def require_roles(*roles: str):
    allowed = {r.upper() for r in roles}

    async def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission")
        return user

    return checker
