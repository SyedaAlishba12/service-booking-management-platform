"""
Shared response envelope helpers.

Every API response in this project uses the shape:
    {"success": bool, "message": str, "data": <payload or null>}

These helpers produce that shape. Keep this module tiny - no imports
beyond the stdlib, no FastAPI dependency.
"""

from typing import Any


def success_response(data: Any, message: str = "OK") -> dict:
    """Return a success envelope with the given payload."""
    return {"success": True, "message": message, "data": data}


def error_response(message: str) -> dict:
    """Return an error envelope with null data."""
    return {"success": False, "message": message, "data": None}
