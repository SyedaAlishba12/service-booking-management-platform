"""providers.user_id foreign key: ON DELETE CASCADE -> RESTRICT

Audit change agreed with Alishba: providers are never hard-deleted (users are deactivated),
so deleting a user that still has a provider profile must be blocked, like
services.provider_id and bookings.provider_id already are.

The initial migration created this foreign key without a name, so PostgreSQL named it
providers_user_id_fkey (<table>_<column>_fkey).

Revision ID: a3f1c9d2b7e4
Revises: 57ec0184dfe9
Create Date: 2026-10-11 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a3f1c9d2b7e4'
down_revision: Union[str, Sequence[str], None] = '57ec0184dfe9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = 'providers_user_id_fkey'


def upgrade() -> None:
    op.drop_constraint(FK_NAME, 'providers', type_='foreignkey')
    op.create_foreign_key(
        FK_NAME,
        'providers',
        'users',
        ['user_id'],
        ['id'],
        ondelete='RESTRICT',
    )


def downgrade() -> None:
    op.drop_constraint(FK_NAME, 'providers', type_='foreignkey')
    op.create_foreign_key(
        FK_NAME,
        'providers',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )
