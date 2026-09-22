from pydantic import BaseModel

# Схема для отображения травяного сбора
class HerbalTea(BaseModel):
    id: int
    name: str          # Название (например, "Вечерний покой")
    ingredients: str   # Состав (например, "Ромашка, мята, лаванда")
    effect: str        # Лечебное действие (например, "Успокаивает, улучшает сон")
    price: float       # Цена
    image_url: str     # Ссылка на картинку для фронтенда
