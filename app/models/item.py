from sqlalchemy import Column, Integer, String, Float
from app.database.session import Base


class TeaModel(Base):                        # ← переименуй на TeaModel
    __tablename__ = "teas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ingredients = Column(String, nullable=False)
    effect = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    image_url = Column(String, nullable=False)
    category = Column(String, nullable=False)