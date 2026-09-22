let cart = []; 
let allTeas = []; 
let activePromo = ""; 

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('herbal_shop_cart');
    if (savedCart) {
        try { cart = JSON.parse(savedCart); } catch (e) { cart = []; }
    }
}

function saveCartToStorage() {
    localStorage.setItem('herbal_shop_cart', JSON.stringify(cart));
}

// 1. Загрузка чаев с бэкенда FastAPI
async function loadTeas() {
    const container = document.getElementById('tea-container');
    try {
        const response = await fetch('/api/v1/teas');
        if (!response.ok) throw new Error('Ошибка сети');
        
        allTeas = await response.json();
        
        // Рендерим изначально ВСЕ чаи
        renderTeas(allTeas);
        updateCartUI();
        
    } catch (error) {
        console.error(error);
        container.innerHTML = `<p class="loading" style="color: red;">Не удалось загрузить чаи.</p>`;
    }
}

// Вспомогательная функция для отрисовки массива карточек на экране
function renderTeas(teasArray) {
    const container = document.getElementById('tea-container');
    if (teasArray.length === 0) {
        container.innerHTML = `<p class="loading">В этой категории пока нет сборов...</p>`;
        return;
    }
    
    container.innerHTML = '';
    teasArray.forEach(tea => {
        const cardHTML = `
            <div class="tea-card">
                <img src="${tea.image_url}" alt="${tea.name}" class="tea-image">
                <div class="tea-content">
                    <h3 class="tea-name">${tea.name}</h3>
                    <div class="tea-ingredients">🌱 Состав: ${tea.ingredients}</div>
                    <p class="tea-effect">${tea.effect}</p>
                    <div class="tea-footer">
                        <span class="tea-price">${tea.price} ₽</span>
                        <button class="buy-btn" onclick="addToCart(${tea.id})">В корзину</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// [НОВАЯ ФУНКЦИЯ] Логика мгновенной фильтрации на клиенте
function filterCategory(categoryName, buttonElement) {
    // 1. Переключаем подсветку кнопок фильтров
    const allButtons = document.querySelectorAll('.filter-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    // 2. Фильтруем массив данных
    if (categoryName === 'all') {
        renderTeas(allTeas); // Показываем всё
    } else {
        const filtered = allTeas.filter(tea => tea.category === categoryName);
        renderTeas(filtered); // Показываем только совпавшие
    }
}

function addToCart(teaId) {
    const tea = allTeas.find(t => t.id === teaId);
    if (tea) {
        cart.push(tea);
        saveCartToStorage();
        updateCartUI();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCartToStorage();
    updateCartUI();
}

function applyPromoCode() {
    const inputField = document.getElementById('promo-input');
    const input = inputField.value.trim().toLowerCase();
    const msgBlock = document.getElementById('promo-message');
    
    if (input === "") {
        activePromo = "";
        msgBlock.style.display = "block";
        msgBlock.style.color = "#e74c3c";
        msgBlock.innerHTML = "⚠️ Поле промокода не может быть пустым. Введите код!";
        inputField.style.borderColor = "#e74c3c";
        updateCartUI();
        return;
    }
    
    if (input === "tsaritsino" || input === "царицыно") {
        activePromo = input;
        msgBlock.style.display = "block";
        msgBlock.style.color = "#2d4a22";
        msgBlock.innerHTML = "👑 Промокод принят! Царская скидка 30% активирована.";
        inputField.style.borderColor = "#2d4a22";
        updateCartUI();
    } else {
        activePromo = "";
        msgBlock.style.display = "block";
        msgBlock.style.color = "#e74c3c";
        msgBlock.innerHTML = "❌ Такого промокода не существует. Попробуйте еще раз!";
        inputField.style.borderColor = "#e74c3c";
        updateCartUI();
    }
}

function updateCartUI() {
    if (!document.getElementById('cart-count')) return;
    document.getElementById('cart-count').innerText = cart.length;
    
    let total = cart.reduce((sum, item) => sum + item.price, 0);
    if (activePromo === "tsaritsino" || activePromo === "царицыно") {
        total = Math.round(total * 0.7);
    }

    document.getElementById('cart-total').innerText = total;
    document.getElementById('modal-total').innerText = total;
    document.getElementById('checkout-total').innerText = total;

    const itemsContainer = document.getElementById('cart-items');
    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px 0;">Корзина пуста.</p>';
        return;
    }

    itemsContainer.innerHTML = '';
    cart.forEach((item, index) => {
        itemsContainer.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info"><span>🌿</span><span>${item.name}</span></div>
                <div class="cart-item-price-block">
                    <strong>${item.price} ₽</strong>
                    <button class="remove-btn" onclick="removeFromCart(${index})">✕</button>
                </div>
            </div>
        `;
    });
}

function goToCheckoutStep() {
    if (cart.length === 0) {
        alert('Ваша корзина пуста! Добавьте товары перед оформлением.');
        return;
    }
    document.getElementById('modal-title').innerText = "Оформление доставки";
    document.getElementById('cart-step-1').style.display = "none";
    document.getElementById('cart-step-2').style.display = "block";
}

function backToCartStep() {
    document.getElementById('modal-title').innerText = "Ваш целебный заказ";
    document.getElementById('cart-step-1').style.display = "block";
    document.getElementById('cart-step-2').style.display = "none";
}

function toggleCartModal(show) {
    const modal = document.getElementById('cart-modal');
    modal.style.display = show ? 'flex' : 'none';
    
    if (!show) {
        activePromo = ""; 
        backToCartStep();
        const inputField = document.getElementById('promo-input');
        if (inputField) {
            inputField.value = "";
            inputField.style.borderColor = "#ccc";
        }
        const msgBlock = document.getElementById('promo-message');
        if (msgBlock) msgBlock.style.display = "none";
        
        document.getElementById('customer-name').value = "";
        document.getElementById('customer-phone').value = "";
        document.getElementById('customer-address').value = "";
        updateCartUI();
    }
}

async function processPayment() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const paymentMethod = document.getElementById('payment-method').value;

    if (!name || !phone || !address) {
        alert('⚠️ Пожалуйста, заполните все обязательные поля со звездочкой (*)!');
        return;
    }

    const baseTotal = cart.reduce((sum, item) => sum + item.price, 0);

    try {
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                total_price: baseTotal,
                items_count: cart.length,
                promo_code: activePromo,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                payment_method: paymentMethod
            })
        });

        if (!response.ok) throw new Error('Ошибка сервера');
        
        const result = await response.json();
        
        const detailsContainer = document.getElementById('success-details');
        detailsContainer.innerHTML = `
            <p style="margin-bottom: 10px; font-weight: 600; font-size: 1.1rem; text-align: center;">👑 Чек заказа #${result.order_id}</p>
            <p style="margin-bottom: 12px; line-height: 1.4;">${result.message}</p>
            <hr style="border: 0; border-top: 1px solid #ccc; margin: 10px 0;">
            <p>👤 <strong>Получатель:</strong> ${name}</p>
            <p>📞 <strong>Телефон:</strong> ${phone}</p>
            <p>📍 <strong>Адрес доставки:</strong> ${address}</p>
            <p>💳 <strong>Способ оплаты:</strong> ${paymentMethod === 'card' ? 'Онлайн-карта' : 'При получении курьеру'}</p>
            <p style="margin-top: 10px; font-size: 1.1rem;">💰 <strong>Итоговая сумма:</strong> <span style="color: #2d4a22; font-weight: 700;">${result.final_sum} ₽</span></p>
        `;
        
        toggleCartModal(false);
        document.getElementById('success-modal').style.display = 'flex';
        
        cart = [];
        activePromo = "";
        saveCartToStorage(); 
        updateCartUI();

    } catch (error) {
        console.error(error);
        alert('Не удалось обработать платеж.');
    }
}

function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
}

loadCartFromStorage();
window.addEventListener('DOMContentLoaded', loadTeas);
