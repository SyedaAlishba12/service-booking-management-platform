"""Compatibility shim.

The temporary auth stub was replaced by the real auth (JWT). Booking, payment and calendar
modules still import from here, so this file forwards to common/auth.py.
New code should import from common.auth directly.
"""
from common.auth import CurrentUser, get_current_user, require_roles

__all__ = ["CurrentUser", "get_current_user", "require_roles"]