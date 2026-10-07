from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from database.base import Base
from common.config import settings

# Import every model so SQLAlchemy registers all tables
# in Base.metadata before Alembic autogenerate runs.
from models import availability  # noqa: F401
from models import booking  # noqa: F401
from models import category  # noqa: F401
from models import complaint  # noqa: F401
from models import customer  # noqa: F401
from models import notification  # noqa: F401
from models import password_reset_token  # noqa: F401
from models import platform_setting  # noqa: F401
from models import provider  # noqa: F401
from models import refresh_token  # noqa: F401
from models import review  # noqa: F401
from models import service  # noqa: F401
from models import user  # noqa: F401


config = context.config

# Configure Alembic's logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# SQLAlchemy metadata containing all 15 project tables.
target_metadata = Base.metadata


def get_database_url() -> str:
    """
    Get the database URL from the same Pydantic settings
    used by the FastAPI application.
    """
    return settings.database_url


def run_migrations_offline() -> None:
    """Run migrations without creating a database connection."""

    url = get_database_url()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a live database connection."""

    # Alembic's migration engine is synchronous.
    #
    # The application itself uses an async SQLAlchemy engine,
    # but Alembic should use a synchronous PostgreSQL driver
    # for migrations.
    database_url = get_database_url()

    # Convert asyncpg URL to psycopg2 URL for Alembic.
    if database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace(
            "postgresql+asyncpg://",
            "postgresql://",
            1,
        )

    configuration = config.get_section(
        config.config_ini_section,
        {},
    )

    configuration["sqlalchemy.url"] = database_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()