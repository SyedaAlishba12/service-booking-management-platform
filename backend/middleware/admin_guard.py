"""Admin authorization and authenticated user ID middleware.

Composes the authentication dependency and role guard from
`middleware.auth_middleware` without duplicating JWT validation or DB lookups.
"""

from uuid import UUID

from fastapi import Depends

from middleware.auth_middleware import get_current_user, require_roles
from models.user import User, UserRole

# Guard requiring the authenticated caller to have the ADMIN role.
# Composes Zainab's `require_roles` dependency.
require_admin = require_roles(UserRole.ADMIN)


async def get_current_user_id(
    current_user: User = Depends(get_current_user),
) -> UUID:
    """Return the authenticated caller's UUID.

    Composes Zainab's `get_current_user` dependency and extracts the user ID.
    """
    return current_user.id
