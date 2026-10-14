"""Admin service layer for user management.

Business rules:
- Listing and detail views are read-only (no commits).
- Status changes are delegated entirely to UserService.update_account_status,
  which already enforces the "no self-deactivation" guard and commits.
- An additional "last active admin" guard is applied HERE before calling
  UserService so we can return a clear 400 before any mutation.
"""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from repositories.admin_user_repository import AdminUserRepository
from schemas.admin import AdminUserDetailResponse, AdminUserResponse
from services.user_service import UserService


async def list_users_admin(
    db: AsyncSession,
    page: int,
    page_size: int,
    q: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
) -> tuple[list[AdminUserResponse], int]:
    """Paginated user list for the admin panel (read-only)."""
    from models.user import UserRole

    role_enum = None
    if role is not None:
        try:
            role_enum = UserRole(role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role: {role}",
            )

    repo = AdminUserRepository(db)
    users, total = await repo.list_users(
        page=page,
        page_size=page_size,
        q=q,
        role=role_enum,
        is_active=is_active,
    )

    items = [
        AdminUserResponse(
            id=str(u.id),
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            role=u.role.value,
            profile_image_url=u.profile_image_url,
            is_active=u.is_active,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in users
    ]
    return items, total


async def get_user_detail_admin(
    db: AsyncSession,
    user_id: UUID,
) -> AdminUserDetailResponse:
    """Fetch a single user with activity counts (read-only)."""
    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    booking_count = await repo.count_bookings(user_id)
    review_count = await repo.count_reviews(user_id)
    complaint_count = await repo.count_complaints(user_id)

    return AdminUserDetailResponse(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role.value,
        profile_image_url=user.profile_image_url,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        booking_count=booking_count,
        review_count=review_count,
        complaint_count=complaint_count,
    )


async def update_user_status_admin(
    db: AsyncSession,
    user_id: UUID,
    is_active: bool,
    requesting_admin: User,
) -> AdminUserResponse:
    """Change a user's active status.

    Guards applied in this layer:
    - **Last-active-admin guard**: prevent deactivating the very last
      active ADMIN account (ensures at least one admin always remains).

    All other guards (role check, self-deactivation) are handled by
    UserService.update_account_status, which also does the commit.
    """
    repo = AdminUserRepository(db)

    # Last-active-admin guard: only relevant when deactivating.
    if not is_active:
        target = await repo.get_by_id(user_id)
        if target is not None and target.role.value == "ADMIN":
            active_admin_count = await repo.count_active_admins()
            if active_admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last active administrator account",
                )

    # Delegate mutation (including commit) to UserService.
    svc = UserService(db)
    user_response = await svc.update_account_status(
        user_id=user_id,
        is_active=is_active,
        requesting_user=requesting_admin,
    )

    # UserService returns UserResponse; re-wrap to AdminUserResponse by
    # re-fetching the now-updated record (it was refreshed inside the service).
    updated_user = await repo.get_by_id(user_id)
    if updated_user is None:
        # Extremely unlikely, but be safe.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found after update",
        )

    return AdminUserResponse(
        id=str(updated_user.id),
        full_name=updated_user.full_name,
        email=updated_user.email,
        phone=updated_user.phone,
        role=updated_user.role.value,
        profile_image_url=updated_user.profile_image_url,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at,
    )
