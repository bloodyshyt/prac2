from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database.session import Base

# Описываем таблицу пользователей в нашей SQLite
class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
