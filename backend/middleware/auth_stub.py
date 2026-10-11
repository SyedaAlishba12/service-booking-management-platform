"""
Auth stub middleware.

TODO: Replace `require_admin` with Zainab's role-based dependency before
any deployment. The current stub does nothing and does NOT enforce auth.

TODO: Replace `get_current_user_id` with Zainab's authenticated-user
dependency before any deployment. The current stub reads the caller's
UUID from the X-User-Id header and is NOT SECURE.
"""

import uuid

from fastapi import Header, HTTPException, status


# ---------------------------------------------------------------------------
# TODO: replace with Zainab's role-based dependency before any deployment.
# This stub intentionally does nothing and does not enforce authentication.
# ---------------------------------------------------------------------------
async def require_admin() -> None:  # noqa: RUF029
    """Placeholder admin guard — NO auth enforced yet."""
    pass


# ---------------------------------------------------------------------------
# !! NOT SECURE — DEV ONLY !!
# TODO: replace with Zainab's authenticated-user dependency before any
# deployment. This stub reads the user's UUID from the X-User-Id HTTP
# header. It performs NO signature verification, NO token validation, and
# NO session lookup. Any caller can impersonate any user.
# ---------------------------------------------------------------------------
async def get_current_user_id(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> uuid.UUID:
    """Dev-only stub: parse the caller UUID from the X-User-Id header.

    Raises HTTP 401 if the header is missing or is not a valid UUID.

    NOT SECURE, DEV ONLY.
    TODO: replace with Zainab's authenticated-user dependency before any deployment.
    """
    if x_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Id header is required (dev stub — not for production).",
        )
    try:
        return uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Id header is not a valid UUID.",
        )
