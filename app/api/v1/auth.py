from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database.session import get_db
from app.models.user import UserModel
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ─── Схема валидации данных через Pydantic ───
class UserAuthSchema(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=32,
        pattern=r"^[A-Za-z0-9_\-]+$",
        description="Логин: только латиница, цифры, _ и -",
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="Пароль: минимум 6 символов",
    )


# ─── 1. ЭНДПОИНТ РЕГИСТРАЦИИ ───
@router.post("/register", summary="Регистрация нового аккаунта")
@limiter.limit("5/minute")
async def register_user(
    request: Request,
    user_data: UserAuthSchema,
    db: Session = Depends(get_db),
):
    # Проверяем, существует ли пользователь с таким логином
    existing_user = (
        db.query(UserModel)
        .filter(UserModel.username == user_data.username)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="⚠️ Данный био-код (логин) уже зафиксирован в системе!",
        )

    # Хэшируем пароль через bcrypt и сохраняем в SQLite
    hashed = hash_password(user_data.password)
    new_user = UserModel(username=user_data.username, hashed_password=hashed)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "status": "success",
        "message": f"Пользователь '{new_user.username}' успешно внесен в реестр Лавки!",
    }


# ─── 2. ЭНДПОИНТ ВХОДА (LOGIN) ───
@router.post("/login", summary="Авторизация в личный кабинет")
@limiter.limit("10/minute")
async def login_user(
    request: Request,
    user_data: UserAuthSchema,
    db: Session = Depends(get_db),
):
    # Ищем пользователя по логину
    user = (
        db.query(UserModel)
        .filter(UserModel.username == user_data.username)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Доступ отклонен: неверный логин или пароль.",
        )

    # Сверяем пароль с bcrypt-хэшем
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Доступ отклонен: неверный логин или пароль.",
        )

    # Генерируем JWT-токен доступа
    access_token = create_access_token(user.id, user.username)

    return {
        "status": "success",
        "message": "Авторизация успешно пройдена!",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
    }