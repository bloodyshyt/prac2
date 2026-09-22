from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Указываем путь к файлу базы данных SQLite
DATABASE_URL = "sqlite:///./teas.db"

# Создаем движок базы данных
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Создаем фабрику сессий для выполнения запросов
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс, от которого будут исследоваться наши таблицы
Base = declarative_base()

# Зависимость (Dependency) для FastAPI, чтобы открывать/закрывать сессию БД при каждом запросе
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
