import ssl

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from common.config import settings


ssl_context = ssl.create_default_context()


engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    connect_args={
        "ssl": ssl_context,
    },
)