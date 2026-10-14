"""Compatibility imports for routes not yet updated to ``common.auth``."""

from common.auth import CurrentUser, get_current_user, require_role, require_roles

__all__ = ["CurrentUser", "get_current_user", "require_role", "require_roles"]
