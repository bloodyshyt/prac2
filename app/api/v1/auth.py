import hashlib
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db, engine, Base
from app.models.user import UserModel

# Автоматически создаем таблицу пользователей в базе teas.db, если её ещё нет
Base.metadata.create_all(bind=engine)

router = APIRouter()

# Схемы валидации данных через Pydantic для запросов
class UserAuthSchema(BaseModel):
    username: str
    password: str

# Безопасное хэширование пароля (SHA-256 + секретная соль)
def hash_password(password: str) -> str:
    salt = "cyber_botany_secret_salt_2026"
    return hashlib.sha256((password + salt).encode()).hexdigest()


# 1. ЭНДПОИНТ РЕГИСТРАЦИИ
@router.post("/register", summary="Регистрация нового аккаунта")
async def register_user(user_data: UserAuthSchema, db: Session = Depends(get_db)):
    # Проверяем, существует ли пользователь с таким логином
    existing_user = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="⚠️ Данный био-код (логин) уже зафиксирован в системе!"
        )
    
    # Хэшируем пароль и сохраняем в SQLite
    hashed = hash_password(user_data.password)
    new_user = UserModel(username=user_data.username, hashed_password=hashed)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "status": "success", 
        "message": f"Пользователь '{new_user.username}' успешно внесен в реестр Лавки!"
    }


# 2. ЭНДПОИНТ ВХОДА (LOGIN)
@router.post("/login", summary="Авторизация в личный кабинет")
async def login_user(user_data: UserAuthSchema, db: Session = Depends(get_db)):
    # Ищем пользователя по логину
    user = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Доступ отклонен: неверный логин или пароль."
        )
    
    # Сверяем хэши паролей
    if user.hashed_password != hash_password(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Доступ отклонен: неверный логин или пароль."
        )
    
    # Возвращаем успешный статус и ID пользователя (на фронтенде мы сохраним его как простую сессию)
    return {
        "status": "success",
        "message": "Авторизация успешно пройдена!",
        "user_id": user.id,
        "username": user.username
    }
