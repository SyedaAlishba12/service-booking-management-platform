"""Compatibility shim replacing the old header-based admin auth stub."""

from middleware.admin_guard import get_current_user_id, require_admin

__all__ = ["get_current_user_id", "require_admin"]
