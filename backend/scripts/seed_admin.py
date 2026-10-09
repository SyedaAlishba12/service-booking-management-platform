
import asyncio
import os
from sqlalchemy import select
import sys
from pathlib import Path

# Add the backend directory to Python's import path
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from common.security import hash_password
from database.session import AsyncSessionLocal
from models.user import User, UserRole
from dotenv import load_dotenv
from common.config import ENV_FILE
from models.customer import Customer
from models.provider import Provider
from models.service import Service
from models.availability import Availability
from models.booking import Booking
from models.category import Category
from models.complaint import Complaint
from models.notification import Notification
from models.password_reset_token import PasswordResetToken
from models.platform_setting import PlatformSetting
from models.refresh_token import RefreshToken
from models.review import Review


load_dotenv(ENV_FILE)

async def seed_admin() -> None:
    full_name = os.getenv("ADMIN_FULL_NAME", "ServiceHub Admin").strip()
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")

    if not email or not password:
        raise RuntimeError(
            "Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first."
        )

    if len(password) < 12:
        raise RuntimeError("ADMIN_PASSWORD must be at least 12 characters.")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            if existing_user.role != UserRole.ADMIN:
                raise RuntimeError(
                    "ADMIN_EMAIL already belongs to a non-admin account. "
                    "Choose a different email."
                )

            print(f"Admin account already exists: {email}")
            return

        admin = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )

        session.add(admin)

        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        print(f"Admin account created successfully: {email}")


if __name__ == "__main__":
    asyncio.run(seed_admin())