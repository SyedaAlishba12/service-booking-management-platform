"""JWT authentication and role checks backed by the shared users table."""

from collections.abc import Callable, Iterable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from common.security import decode_access_token
from database.session import get_db
from models.user import User
from repositories.user_repository import UserRepository

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(credentials.credentials)
        subject = payload.get("sub")
        if not subject:
            raise ValueError("Missing token subject")
        user_id = UUID(str(subject))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await UserRepository(db).get_by_id(user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User account is inactive")
    return user


def require_roles(*roles: str | Iterable[str]) -> Callable:
    """Accept either require_roles("ADMIN", "PROVIDER") or require_roles([..])."""
    if len(roles) == 1 and not isinstance(roles[0], str):
        role_values = roles[0]
    else:
        role_values = roles
    allowed = {str(role).upper() for role in role_values}

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        current_role = str(getattr(user.role, "value", user.role)).upper()
        if current_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return user

    return role_checker


def require_role(role_name: str) -> Callable:
    """Singular role-guard spelling used by the auth module."""
    return require_roles(role_name)
