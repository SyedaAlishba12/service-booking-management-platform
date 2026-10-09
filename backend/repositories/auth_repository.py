from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.password_reset_token import PasswordResetToken
from models.refresh_token import RefreshToken


class AuthRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------
    # Refresh Tokens
    # -------------------------

    async def create_refresh_token(
        self,
        refresh_token: RefreshToken,
    ) -> RefreshToken:
        self.db.add(refresh_token)

        await self.db.flush()
        await self.db.refresh(refresh_token)

        return refresh_token

    async def get_refresh_token(
        self,
        token_hash: str,
    ) -> RefreshToken | None:
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash
            )
        )

        return result.scalar_one_or_none()

    async def revoke_refresh_token(
        self,
        refresh_token: RefreshToken,
    ) -> None:
        refresh_token.revoked_at = datetime.now(timezone.utc)

        await self.db.flush()

    async def revoke_all_user_refresh_tokens(
        self,
        user_id: UUID,
    ) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(
                revoked_at=datetime.now(timezone.utc)
            )
        )

    # -------------------------
    # Password Reset Tokens
    # -------------------------

    async def create_password_reset_token(
        self,
        reset_token: PasswordResetToken,
    ) -> PasswordResetToken:
        self.db.add(reset_token)

        await self.db.flush()
        await self.db.refresh(reset_token)

        return reset_token

    async def get_password_reset_token(
        self,
        token_hash: str,
    ) -> PasswordResetToken | None:
        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash
            )
        )

        return result.scalar_one_or_none()

    # -------------------------
    # Transaction
    # -------------------------

    async def commit(self) -> None:
        await self.db.commit()

    async def rollback(self) -> None:
        await self.db.rollback()