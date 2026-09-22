from typing import Optional
from fastapi import APIRouter, Depends 
from pydantic import BaseModel
from sqlalchemy.orm import Session # датабазы
from app.database.session import get_db #создание ордеров 
from app.models.order import OrderModel # отрисовка ордера (карточки)


router = APIRouter()


# Схема карточки травяного чая
class HerbalTea(BaseModel):
    id: int
    name: str
    ingredients: str
    effect: str
    price: float
    image_url: str
    category: str


# Временная база товаров
TEAS_DATABASE = [
    HerbalTea(
        id=1,
        name="Таёжный иммунитет",
        ingredients="Иван-чай, шиповник, листья брусники, кедровая хвоя",
        effect="Укрепляет защитные силы организма, тонизирует, богат витамином C",
        price=350.0,
        image_url="https://cdn2.botanichka.ru/wp-content/uploads/2021/12/shipovnik-vybiraem-samye-vitaminnye-i-urozhajnye-sorta-01-640x427.jpg",
        category="immune"
    ),
    HerbalTea(
        id=2,
        name="Вечерний баланс",
        ingredients="Цветки ромашки, листья мяты перечной, лаванда, пустырник",
        effect="Снимает стресс после рабочего дня, мягко расслабляет, улучшает сон",
        price=390.0,
        image_url="https://i0.wp.com/pinkbuket.ru/wp-content/uploads/2024/05/romashka.jpeg?resize=1000%2C545&ssl=1",
        category="relax"
    ),
    HerbalTea(
        id=3,
        name="Горный детокс",
        ingredients="Чабрец, репешок, листья березы, плоды фенхеля",
        effect="Очищает организм, улучшает пищеварение, выводит токсины",
        price=420.0,
        image_url="https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Agrimonia_eupatoria_001.JPG/330px-Agrimonia_eupatoria_001.JPG",
        category="detox"
    ),
    HerbalTea(
        id=4,
        name="Солнечный тонус",
        ingredients="Корневище левзеи, лимонник китайский, зверобой, ягоды облепихи",
        effect="Заряжает энергией, повышает работоспособность, улучшает настроение на весь день",
        price=380.0,
        image_url="https://cdn2.botanichka.ru/wp-content/uploads/2009/12/St-Johns-wort-06-520x490.jpg",
        category="immune"
    ),
    HerbalTea(
        id=5,
        name="Лесные ягоды & Витамины",
        ingredients="Плоды малины, земляники, сушеная черника, цветы календулы, каркаде",
        effect="Насыщает организм макроэлементами, улучшает зрение, обладает ярким фруктовым вкусом",
        price=450.0,
        image_url="https://cdn-irec.r-99.com/sites/default/files/imagecache/300o/product-images/10297/ZPc5yXkL1OdGnKSFdbfUoQ.jpeg",
        category="immune"
    ),
    HerbalTea(
        id=6,
        name="Чистая мята & Шалфей",
        ingredients="Мята луговая, шалфей лекарственный, мелисса, корень алтея",
        effect="Освежает дыхание, успокаивает воспаленное горло, снимает легкие спазмы желудка",
        price=320.0,
        image_url="https://народные-проекты.рф/wp-content/uploads/2019/12/%D0%9C%D0%AF%D0%A2%D0%90-%D0%9B%D0%A3%D0%93%D0%9E%D0%92%D0%90%D0%AF-251x300.jpg",
        category="relax"
    )
]


# Получение всех чаев
@router.get(
    "/teas",
    response_model=list[HerbalTea],
    summary="Получить список всех травяных сборов"
)
async def get_all_teas():
    return TEAS_DATABASE


# Получение одного чая по ID
@router.get(
    "/teas/{tea_id}",
    response_model=HerbalTea,
    summary="Получить чай по ID"
)
async def get_tea_by_id(tea_id: int):
    for tea in TEAS_DATABASE:
        if tea.id == tea_id:
            return tea

    from fastapi import HTTPException

    raise HTTPException(
        status_code=404,
        detail="Чай не найден"
    )


# Схема создания заказа
class OrderCreate(BaseModel):
    total_price: float
    items_count: int
    promo_code: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_address: str
    payment_method: str


# Создание заказа и сохранение в SQLite
@router.post(
    "/orders",
    summary="Создать и оплатить заказ"
)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db)
):
    final_sum = order.total_price

    message = (
        "Заказ успешно принят! "
        "Наш травник уже связывается с вами "
        "для подтверждения доставки."
    )

    # Проверяем промокод
    if order.promo_code:
        clean_promo = order.promo_code.strip().lower()

        if clean_promo in ["tsaritsino", "царицыно"]:
            discount = 0.30

            final_sum = round(
                order.total_price * (1 - discount),
                2
            )

            message = (
                "👑 Активирована царская привилегия! "
                "Скидка 30% в честь Царицыно применена. "
                "Ваш целебный сбор уже бережно собирается "
                "и упаковывается!"
            )

    # Создаём заказ в базе данных
    new_order = OrderModel(
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_address=order.customer_address,
        payment_method=order.payment_method,
        items_count=order.items_count,
        total_price=final_sum,
        promo_code=order.promo_code
    )

    # Сохраняем заказ
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return {
        "status": "success",
        "order_id": new_order.id,
        "final_sum": final_sum,
        "message": message
    }