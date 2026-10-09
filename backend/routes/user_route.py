
from uuid import UUID
from pathlib import Path

from fastapi import File, HTTPException, UploadFile, status
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.user_controller import UserController
from database.session import get_db
from middleware.auth_middleware import get_current_user
from models.user import User, UserRole
from schemas.user_schema import (
    UserStatusUpdateRequest,
    UserUpdateRequest,
)

router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
)


@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await UserController.get_current_user(
        current_user,
        db,
    )

    return {
        "success": True,
        "message": "Current user retrieved successfully",
        "data": result.model_dump(),
    }


@router.put("/me")
async def update_current_user_profile(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await UserController.update_current_user(
        current_user,
        data,
        db,
    )

    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": result.model_dump(),
    }


@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: UUID,
    data: UserStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await UserController.update_account_status(
        user_id=user_id,
        is_active=data.is_active,
        requesting_user=current_user,
        db=db,
    )

    return {
        "success": True,
        "message": "Account status updated successfully",
        "data": result.model_dump(),
    }

@router.post("/me/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    allowed_images = {
        b"\xff\xd8\xff": ".jpg",
        b"\x89PNG\r\n\x1a\n": ".png",
        b"RIFF": ".webp",
    }

    max_size = 5 * 1024 * 1024
    content = await file.read(max_size + 1)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select an image file.",
        )

    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 5 MB or smaller.",
        )

    extension = None

    if content.startswith(b"\xff\xd8\xff"):
        extension = ".jpg"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = ".png"
    elif (
        content.startswith(b"RIFF")
        and content[8:12] == b"WEBP"
    ):
        extension = ".webp"

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, and WebP images are supported.",
        )

    upload_dir = (
        Path(__file__).resolve().parents[1]
        / "uploads"
        / "profile-images"
    )
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{UUID().hex}{extension}"
    destination = upload_dir / filename

    try:
        destination.write_bytes(content)

        current_user.profile_image_url = (
            f"/uploads/profile-images/{filename}"
        )

        await db.commit()
        await db.refresh(current_user)

    except Exception:
        await db.rollback()

        if destination.exists():
            destination.unlink()

        raise

    finally:
        await file.close()

    return {
        "success": True,
        "message": "Profile image uploaded successfully.",
        "data": {
            "profile_image_url": current_user.profile_image_url,
        },
    }

@router.get("/{user_id}")
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if (
        user_id != current_user.id
        and current_user.role != UserRole.ADMIN
    ):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this user",
        )

    result = await UserController.get_user_by_id(
        user_id,
        db,
    )

    return {
        "success": True,
        "message": "User retrieved successfully",
        "data": result.model_dump(),
    }