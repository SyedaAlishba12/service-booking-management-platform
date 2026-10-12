"""Authentication dependencies for the provider / service / availability routes.

Thin adapter over the team's real auth (Zainab): JWT bearer token -> User row.
Routes keep calling require_roles("PROVIDER") with plain strings.
"""
from middleware.auth_middleware import get_current_user, require_roles as _require_roles
from models.user import User, UserRole

# The logged-in user is the User model itself (user.id, user.role, ...).
CurrentUser = User

__all__ = ["CurrentUser", "get_current_user", "require_roles"]


def require_roles(*roles: str):
    """Allow only users whose role is one of `roles` (e.g. "PROVIDER")."""
    return _require_roles(*(UserRole(role.upper()) for role in roles))
