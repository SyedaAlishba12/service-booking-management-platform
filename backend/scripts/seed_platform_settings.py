import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# Register all ORM models before SQLAlchemy configures relationships.
from models import (
    availability,
    booking,
    category,
    complaint,
    customer,
    notification,
    password_reset_token,
    platform_setting,
    provider,
    refresh_token,
    review,
    service,
    user,
)  # noqa: F401

from database.session import AsyncSessionLocal
from services.platform_setting_service import (
    seed_default_settings,
    list_settings,
)


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_default_settings(session)
        settings = await list_settings(session)

    print(f"Platform settings found: {len(settings)}")
    for setting in settings:
        print(f"  - {setting.key}")


if __name__ == "__main__":
    asyncio.run(main())
