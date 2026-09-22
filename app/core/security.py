from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.user import UserModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, settings.APP_SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token, settings.APP_SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserModel:
    creds_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="❌ Требуется авторизация.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise creds_error
    payload = decode_token(token)
    if not payload:
        raise creds_error
    user_id = payload.get("sub")
    if not user_id:
        raise creds_error
    user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()
    if not user:
        raise creds_error
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[UserModel]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user = db.query(UserModel).filter(
        UserModel.id == int(payload.get("sub", 0))
    ).first()
    return user