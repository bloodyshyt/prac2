from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


DB_PATH = Path(__file__).resolve().parent / "teas.db"

DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

print(f"SQLite database: {DB_PATH}")


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()