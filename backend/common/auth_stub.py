"""Compatibility shim for booking routes that still import auth_stub."""

from common.auth import CurrentUser, get_current_user, require_roles

__all__ = ["CurrentUser", "get_current_user", "require_roles"]
