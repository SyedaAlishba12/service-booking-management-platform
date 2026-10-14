"""Public authentication dependency adapter used by application routes."""

from middleware.auth_middleware import get_current_user, require_role, require_roles
from models.user import User

CurrentUser = User

__all__ = ["CurrentUser", "get_current_user", "require_role", "require_roles"]
