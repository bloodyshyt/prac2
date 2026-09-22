from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database.session import Base

class OrderModel(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # Поле для связи с аккаунтом юзера
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=False)
    customer_address = Column(String, nullable=False)
    payment_method = Column(String, nullable=False)
    items_count = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    promo_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
