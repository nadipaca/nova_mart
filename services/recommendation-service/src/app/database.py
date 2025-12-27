import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base


def _resolve_default_database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit

    repo_root = Path(__file__).resolve().parents[4]
    root_db = repo_root / "recommendations.db"
    if root_db.exists():
        return f"sqlite:///{root_db.as_posix()}"

    return "sqlite:///./recommendations.db"


DATABASE_URL = _resolve_default_database_url()

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_sqlite_schema() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        result = conn.execute(text("PRAGMA table_info(user_events)")).fetchall()
        if not result:
            return
        existing = {row[1] for row in result}
        migrations = {
            "event_id": "TEXT",
            "session_id": "TEXT",
            "source": "TEXT",
            "event_value": "REAL DEFAULT 1.0",
        }
        for column, ddl in migrations.items():
            if column not in existing:
                conn.execute(text(f"ALTER TABLE user_events ADD COLUMN {column} {ddl}"))

