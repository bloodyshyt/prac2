const API_BASE = "/api/v1";

const AUTH_ENDPOINTS = {
    register: `${API_BASE}/register`,
    login: `${API_BASE}/login`
};


/* ==========================================================================
   ГЛОБАЛЬНЫЕ ДАННЫЕ
   ========================================================================== */

let cart = [];
let allTeas = [];
let activePromo = "";

let authMode = "login";

let currentUserId =
    localStorage.getItem("herbal_shop_user_id") || "";

let currentUsername =
    localStorage.getItem("herbal_shop_username") || "";


/* ==========================================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ========================================================================== */

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatMoney(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("ru-RU", {
        minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
        maximumFractionDigits: 2
    });
}


function calculateCartTotal() {
    const baseTotal = cart.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0
    );

    if (
        activePromo === "tsaritsino" ||
        activePromo === "царицыно"
    ) {
        return Math.round(baseTotal * 0.7 * 100) / 100;
    }

    return Math.round(baseTotal * 100) / 100;
}


async function readApiError(response) {
    try {
        const data = await response.json();

        if (typeof data.detail === "string") {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {
            return data.detail
                .map(item => item.msg || "Ошибка валидации")
                .join("; ");
        }

        if (typeof data.message === "string") {
            return data.message;
        }
    } catch (error) {
        console.error("Ошибка чтения ответа сервера:", error);
    }

    return `Ошибка сервера: ${response.status}`;
}


function setModalState(modalId, open) {
    const modal = document.getElementById(modalId);

    if (!modal) {
        return;
    }

    if (open) {
        modal.classList.add("is-open");
    } else {
        modal.classList.remove("is-open");
    }

    const openModal =
        document.querySelector(".modal.is-open");

    document.body.classList.toggle(
        "modal-open",
        Boolean(openModal)
    );
}


/* ==========================================================================
   LOCAL STORAGE КОРЗИНЫ
   ========================================================================== */

function loadCartFromStorage() {
    const savedCart =
        localStorage.getItem("herbal_shop_cart");

    if (!savedCart) {
        cart = [];
        return;
    }

    try {
        const parsed = JSON.parse(savedCart);

        cart = Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {
        console.error(
            "Не удалось загрузить корзину:",
            error
        );

        cart = [];
    }
}


function saveCartToStorage() {
    localStorage.setItem(
        "herbal_shop_cart",
        JSON.stringify(cart)
    );
}


/* ==========================================================================
   ЗАГРУЗКА ТОВАРОВ
   ========================================================================== */

async function loadTeas() {
    const container =
        document.getElementById("tea-container");

    try {
        const response = await fetch(
            `${API_BASE}/teas`
        );

        if (!response.ok) {
            throw new Error(
                await readApiError(response)
            );
        }

        const data = await response.json();

        allTeas = Array.isArray(data)
            ? data
            : [];

        renderTeas(allTeas);

        updateCartUI();

    } catch (error) {
        console.error(
            "Ошибка загрузки чаёв:",
            error
        );

        container.innerHTML = `
            <p
                class="loading"
                style="color: #ff5252;"
            >
                Не удалось подключиться к серверу.
                Проверьте FastAPI и маршрут /api/v1/teas.
            </p>
        `;
    }
}


/* ==========================================================================
   ОТРИСОВКА ТОВАРОВ
   ========================================================================== */

function renderTeas(teasArray) {
    const container =
        document.getElementById("tea-container");

    if (
        !Array.isArray(teasArray) ||
        teasArray.length === 0
    ) {
        container.innerHTML = `
            <p class="loading">
                В выбранной категории пока нет доступных сборов...
            </p>
        `;

        return;
    }

    container.innerHTML = teasArray
        .map(tea => {

            const safeName =
                escapeHtml(tea.name);

            const safeIngredients =
                escapeHtml(tea.ingredients);

            const safeEffect =
                escapeHtml(tea.effect);

            const safeImage =
                escapeHtml(tea.image_url);

            const teaId =
                Number(tea.id);

            return `
                <article class="tea-card">

                    <div class="tea-image-wrapper">

                        <img
                            src="${safeImage}"
                            alt="${safeName}"
                            class="tea-image"
                            loading="lazy"
                        >

                    </div>

                    <div class="tea-content">

                        <h3 class="tea-name">
                            ${safeName}
                        </h3>

                        <div class="tea-ingredients">
                            🌱 Состав:
                            ${safeIngredients}
                        </div>

                        <p class="tea-effect">
                            ${safeEffect}
                        </p>

                        <div class="tea-footer">

                            <span class="tea-price">
                                ${formatMoney(tea.price)} ₽
                            </span>

                            <button
                                class="buy-btn"
                                type="button"
                                onclick="addToCart(${teaId})"
                            >
                                В корзину
                            </button>

                        </div>

                    </div>

                </article>
            `;
        })
        .join("");

    revealCards();
}


/* ==========================================================================
   АНИМАЦИЯ КАРТОЧЕК
   ========================================================================== */

function revealCards() {
    const cards =
        document.querySelectorAll(".tea-card");

    if (!("IntersectionObserver" in window)) {
        cards.forEach(card => {
            card.classList.add("revealed");
        });

        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target
                            .classList
                            .add("revealed");

                        observer.unobserve(
                            entry.target
                        );
                    }

                });

            },
            {
                threshold: 0.1
            }
        );

    cards.forEach(card => {
        observer.observe(card);
    });
}


/* ==========================================================================
   ФИЛЬТРАЦИЯ
   ========================================================================== */

function filterCategory(
    categoryName,
    buttonElement
) {
    document
        .querySelectorAll(".filter-btn")
        .forEach(button => {
            button.classList.remove("active");
        });

    buttonElement.classList.add("active");

    if (categoryName === "all") {
        renderTeas(allTeas);
        return;
    }

    const filtered =
        allTeas.filter(
            tea =>
                tea.category === categoryName
        );

    renderTeas(filtered);
}


/* ==========================================================================
   КОРЗИНА
   ========================================================================== */

function addToCart(teaId) {
    const tea =
        allTeas.find(
            item =>
                Number(item.id) ===
                Number(teaId)
        );

    if (!tea) {
        console.error(
            "Товар не найден:",
            teaId
        );

        return;
    }

    cart.push(tea);

    saveCartToStorage();
    updateCartUI();
}


function removeFromCart(index) {
    if (
        index < 0 ||
        index >= cart.length
    ) {
        return;
    }

    cart.splice(index, 1);

    saveCartToStorage();
    updateCartUI();
}


/* ==========================================================================
   ПРОМОКОД
   ========================================================================== */

function applyPromoCode() {
    const inputField =
        document.getElementById(
            "promo-input"
        );

    const message =
        document.getElementById(
            "promo-message"
        );

    const input =
        inputField
            .value
            .trim()
            .toLowerCase();

    message.classList.add("visible");

    if (!input) {

        activePromo = "";

        message.style.color =
            "#ff5252";

        message.textContent =
            "⚠️ Введите промокод.";

        inputField.style.borderColor =
            "#ff5252";

        updateCartUI();

        return;
    }

    if (
        input === "tsaritsino" ||
        input === "царицыно"
    ) {

        activePromo = input;

        message.style.color =
            "#00ff66";

        message.textContent =
            "👑 Промокод Царицыно активирован. Скидка 30% применена.";

        inputField.style.borderColor =
            "#00ff66";

    } else {

        activePromo = "";

        message.style.color =
            "#ff5252";

        message.textContent =
            "❌ Неверный промокод.";

        inputField.style.borderColor =
            "#ff5252";
    }

    updateCartUI();
}


/* ==========================================================================
   ОБНОВЛЕНИЕ КОРЗИНЫ
   ========================================================================== */

function updateCartUI() {
    const count =
        document.getElementById(
            "cart-count"
        );

    const widgetTotal =
        document.getElementById(
            "cart-total"
        );

    const modalTotal =
        document.getElementById(
            "modal-total"
        );

    const checkoutTotal =
        document.getElementById(
            "checkout-total"
        );

    const itemsContainer =
        document.getElementById(
            "cart-items"
        );

    if (
        !count ||
        !widgetTotal ||
        !modalTotal ||
        !checkoutTotal ||
        !itemsContainer
    ) {
        return;
    }

    const total =
        calculateCartTotal();

    count.textContent =
        String(cart.length);

    widgetTotal.textContent =
        formatMoney(total);

    modalTotal.textContent =
        formatMoney(total);

    checkoutTotal.textContent =
        formatMoney(total);


    if (cart.length === 0) {

        itemsContainer.innerHTML = `
            <p class="history-empty">
                Ваш инвентарь пуст.
                Добавьте сборы из каталога.
            </p>
        `;

        return;
    }


    itemsContainer.innerHTML =
        cart
            .map((item, index) => {

                return `
                    <div class="cart-item">

                        <div class="cart-item-info">

                            <img
                                src="${escapeHtml(item.image_url)}"
                                alt="${escapeHtml(item.name)}"
                                class="cart-item-img"
                            >

                            <span class="cart-item-name">
                                ${escapeHtml(item.name)}
                            </span>

                        </div>

                        <div class="cart-item-price-block">

                            <strong>
                                ${formatMoney(item.price)} ₽
                            </strong>

                            <button
                                class="remove-btn"
                                type="button"
                                onclick="removeFromCart(${index})"
                                title="Удалить товар"
                            >
                                ✕
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");
}


/* ==========================================================================
   МОДАЛЬНОЕ ОКНО КОРЗИНЫ
   ========================================================================== */

function toggleCartModal(show) {
    if (show) {
        updateCartUI();
    } else {
        backToCartStep();
    }

    setModalState(
        "cart-modal",
        show
    );
}


function goToCheckoutStep() {
    if (cart.length === 0) {

        alert(
            "Корзина пуста. Сначала добавьте товары."
        );

        return;
    }

    document.getElementById(
        "modal-title"
    ).textContent =
        "Данные доставки";

    document.getElementById(
        "cart-step-1"
    ).classList.add("hidden");

    document.getElementById(
        "cart-step-2"
    ).classList.remove("hidden");

    updateCartUI();
}


function backToCartStep() {
    document.getElementById(
        "modal-title"
    ).textContent =
        "Ваш целебный заказ";

    document.getElementById(
        "cart-step-1"
    ).classList.remove("hidden");

    document.getElementById(
        "cart-step-2"
    ).classList.add("hidden");
}


/* ==========================================================================
   ОФОРМЛЕНИЕ ЗАКАЗА
   ========================================================================== */

async function processPayment() {
    const name =
        document.getElementById(
            "customer-name"
        ).value.trim();

    const phone =
        document.getElementById(
            "customer-phone"
        ).value.trim();

    const address =
        document.getElementById(
            "customer-address"
        ).value.trim();

    const paymentMethod =
        document.getElementById(
            "payment-method"
        ).value;

    const submitButton =
        document.getElementById(
            "payment-submit-btn"
        );


    if (cart.length === 0) {

        alert(
            "Корзина пуста."
        );

        return;
    }


    if (
        !name ||
        !phone ||
        !address
    ) {

        alert(
            "Заполните имя, телефон и адрес доставки."
        );

        return;
    }


    const baseTotal =
        cart.reduce(
            (sum, item) =>
                sum +
                Number(item.price || 0),
            0
        );


    submitButton.disabled =
        true;

    submitButton.textContent =
        "Отправка...";


    try {

        const response =
            await fetch(
                `${API_BASE}/orders`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        user_id: currentUserId
                        ? Number(currentUserId)
                        : null,

                        total_price:
                            Math.round(
                                baseTotal * 100
                            ) / 100,

                        items_count:
                            cart.length,

                        promo_code:
                            activePromo || null,

                        customer_name:
                            name,

                        customer_phone:
                            phone,

                        customer_address:
                            address,

                        payment_method:
                            paymentMethod
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                await readApiError(
                    response
                )
            );
        }


        const result =
            await response.json();


        const detailsContainer =
            document.getElementById(
                "success-details"
            );


        const paymentLabel =
            paymentMethod === "card"
                ? "Карта — демонстрационный режим"
                : "При получении курьеру";


        detailsContainer.innerHTML = `
            <p
                style="
                    font-weight: 700;
                    font-size: 1.05rem;
                    color: #00ff66;
                    text-align: center;
                "
            >
                ЗАКАЗ #${escapeHtml(result.order_id)}
                ПРИНЯТ
            </p>


            <p
                style="
                    margin-top: 12px;
                    color: #ccc;
                "
            >
                ${escapeHtml(
                    result.message ||
                    "Заказ успешно создан."
                )}
            </p>


            <hr
                style="
                    border: 0;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    margin: 14px 0;
                "
            >


            <p>
                <span style="color: #798778;">
                    Клиент:
                </span>

                ${escapeHtml(name)}
            </p>


            <p>
                <span style="color: #798778;">
                    Телефон:
                </span>

                ${escapeHtml(phone)}
            </p>


            <p>
                <span style="color: #798778;">
                    Доставка:
                </span>

                ${escapeHtml(address)}
            </p>


            <p>
                <span style="color: #798778;">
                    Оплата:
                </span>

                ${escapeHtml(paymentLabel)}
            </p>


            <p
                style="
                    margin-top: 14px;
                    font-size: 1.15rem;
                    font-weight: 700;
                "
            >
                💰 Итог:

                <span style="color: #00ff66;">
                    ${formatMoney(
                        result.final_sum
                    )} ₽
                </span>
            </p>
        `;


        cart = [];
        activePromo = "";

        saveCartToStorage();
        updateCartUI();


        document.getElementById(
            "promo-input"
        ).value = "";


        document.getElementById(
            "promo-message"
        ).classList.remove(
            "visible"
        );


        document.getElementById(
            "customer-name"
        ).value = "";


        document.getElementById(
            "customer-phone"
        ).value = "";


        document.getElementById(
            "customer-address"
        ).value = "";


        toggleCartModal(false);


        setModalState(
            "success-modal",
            true
        );


    } catch (error) {

        console.error(
            "Ошибка создания заказа:",
            error
        );

        alert(
            `Не удалось оформить заказ: ${error.message}`
        );

    } finally {

        submitButton.disabled =
            false;

        submitButton.textContent =
            "Подтвердить заказ";
    }
}


function closeSuccessModal() {
    setModalState(
        "success-modal",
        false
    );
}


/* ==========================================================================
   АВТОРИЗАЦИЯ
   ========================================================================== */

function isAuthenticated() {
    return Boolean(
        currentUserId &&
        currentUsername
    );
}


function updateAuthWidget() {
    const widget =
        document.getElementById(
            "auth-widget"
        );

    if (!widget) {
        return;
    }

    if (isAuthenticated()) {

        widget.textContent =
            `👤 ${currentUsername}`;

    } else {

        widget.textContent =
            "👤 Войти в систему";
    }
}


function openAuthModal() {
    setModalState(
        "auth-modal",
        true
    );

    if (isAuthenticated()) {
        showProfile();
    } else {
        showAuthForm();
    }
}


function closeAuthModal() {
    setModalState(
        "auth-modal",
        false
    );

    clearAuthMessage();
}


function showAuthForm() {
    document.getElementById(
        "auth-form-content"
    ).classList.remove(
        "hidden"
    );

    document.getElementById(
        "profile-content"
    ).classList.add(
        "hidden"
    );
}


async function showProfile() {
    document.getElementById(
        "auth-form-content"
    ).classList.add("hidden");

    document.getElementById(
        "profile-content"
    ).classList.remove("hidden");

    document.getElementById(
        "profile-username"
    ).textContent =
        currentUsername || "пользователь";

    const historyContainer =
        document.getElementById(
            "orders-history-container"
        );

    historyContainer.innerHTML = `
        <p class="history-empty">
            Загрузка истории...
        </p>
    `;

    if (!currentUserId) {
        historyContainer.innerHTML = `
            <p class="history-empty">
                Не удалось определить пользователя.
            </p>
        `;
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/orders/user/${currentUserId}`
        );

        if (!response.ok) {
            throw new Error(
                await readApiError(response)
            );
        }

        const orders = await response.json();

        if (!orders.length) {
            historyContainer.innerHTML = `
                <p class="history-empty">
                    У вас пока нет заказов.
                </p>
            `;
            return;
        }

        historyContainer.innerHTML =
            orders.map(order => {
                const date = order.created_at
                    ? new Date(
                        order.created_at
                    ).toLocaleString("ru-RU")
                    : "Дата неизвестна";

                return `
                    <div class="history-order-card">

                        <div class="history-order-main">

                            <div class="history-order-title">
                                Заказ #${escapeHtml(order.id)}
                            </div>

                            <div class="history-order-meta">
                                ${escapeHtml(date)}
                                •
                                ${escapeHtml(order.items_count)}
                                товар(ов)
                            </div>

                        </div>

                        <div class="history-order-sum">
                            ${formatMoney(order.total_price)} ₽
                        </div>

                    </div>
                `;
            }).join("");

    } catch (error) {
        console.error(
            "Ошибка загрузки истории:",
            error
        );

        historyContainer.innerHTML = `
            <p
                class="history-empty"
                style="color: #ff5252;"
            >
                Не удалось загрузить историю заказов.
            </p>
        `;
    }
}

/* ==========================================================================
   ПЕРЕКЛЮЧЕНИЕ ВХОД / РЕГИСТРАЦИЯ
   ========================================================================== */

function switchAuthMode(event) {
    event.preventDefault();

    authMode =
        authMode === "login"
            ? "register"
            : "login";


    const title =
        document.getElementById(
            "auth-modal-title"
        );

    const button =
        document.getElementById(
            "auth-primary-btn"
        );

    const switchText =
        document.getElementById(
            "auth-switch-text"
        );

    const switchLink =
        document.getElementById(
            "auth-switch-link"
        );

    const passwordInput =
        document.getElementById(
            "auth-password"
        );


    if (authMode === "register") {

        title.textContent =
            "Создание профиля";

        button.textContent =
            "Создать профиль";

        switchText.textContent =
            "Уже есть профиль?";

        switchLink.textContent =
            "Войти";

        passwordInput.autocomplete =
            "new-password";

    } else {

        title.textContent =
            "Вход в систему";

        button.textContent =
            "Авторизоваться";

        switchText.textContent =
            "Впервые у нас?";

        switchLink.textContent =
            "Создать профиль";

        passwordInput.autocomplete =
            "current-password";
    }

    clearAuthMessage();
}


/* ==========================================================================
   СООБЩЕНИЯ АВТОРИЗАЦИИ
   ========================================================================== */

function clearAuthMessage() {
    const message =
        document.getElementById(
            "auth-error-message"
        );

    if (!message) {
        return;
    }

    message.textContent = "";

    message.classList.remove(
        "visible"
    );
}


function showAuthMessage(
    text,
    isError = true
) {
    const message =
        document.getElementById(
            "auth-error-message"
        );

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.style.color =
        isError
            ? "#ff5252"
            : "#00ff66";

    message.classList.add(
        "visible"
    );
}


/* ==========================================================================
   РЕГИСТРАЦИЯ / ВХОД
   ========================================================================== */

async function submitAuthForm() {
    const username =
        document.getElementById(
            "auth-username"
        ).value.trim();

    const password =
        document.getElementById(
            "auth-password"
        ).value;

    const button =
        document.getElementById(
            "auth-primary-btn"
        );


    if (
        !username ||
        !password
    ) {

        showAuthMessage(
            "Введите логин и пароль."
        );

        return;
    }


    button.disabled =
        true;


    try {

        /*
            =================================
            РЕГИСТРАЦИЯ
            =================================
        */

        if (
            authMode ===
            "register"
        ) {

            button.textContent =
                "Создание...";


            const response =
                await fetch(
                    AUTH_ENDPOINTS.register,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                username:
                                    username,

                                password:
                                    password
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Ошибка регистрации"
                );
            }


            showAuthMessage(
                data.message ||
                "Профиль успешно создан.",
                false
            );


            /*
                После регистрации
                переключаемся на вход
            */

            authMode =
                "login";


            document.getElementById(
                "auth-modal-title"
            ).textContent =
                "Вход в систему";


            document.getElementById(
                "auth-switch-text"
            ).textContent =
                "Впервые у нас?";


            document.getElementById(
                "auth-switch-link"
            ).textContent =
                "Создать профиль";


            document.getElementById(
                "auth-password"
            ).value =
                "";


            button.textContent =
                "Авторизоваться";


            return;
        }


        /*
            =================================
            ВХОД
            =================================
        */

        button.textContent =
            "Авторизация...";


        const response =
            await fetch(
                AUTH_ENDPOINTS.login,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            username:
                                username,

                            password:
                                password
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Неверный логин или пароль"
            );
        }


        /*
            Твой auth.py возвращает:

            {
                status: "success",
                message: "...",
                user_id: 1,
                username: "..."
            }
        */

        saveUserSession(
            data.user_id,
            data.username
        );


        document.getElementById(
            "auth-password"
        ).value =
            "";


        clearAuthMessage();

        showProfile();


    } catch (error) {

        console.error(
            "Ошибка авторизации:",
            error
        );


        showAuthMessage(
            error.message
        );


    } finally {

        button.disabled =
            false;


        button.textContent =
            authMode === "register"
                ? "Создать профиль"
                : "Авторизоваться";
    }
}


/* ==========================================================================
   СОХРАНЕНИЕ СЕССИИ
   ========================================================================== */

function saveUserSession(
    userId,
    username
) {
    currentUserId =
        String(userId);

    currentUsername =
        username;


    localStorage.setItem(
        "herbal_shop_user_id",
        currentUserId
    );


    localStorage.setItem(
        "herbal_shop_username",
        currentUsername
    );


    updateAuthWidget();
}


/* ==========================================================================
   ВЫХОД
   ========================================================================== */

function logoutUser() {
    currentUserId = "";
    currentUsername = "";


    localStorage.removeItem(
        "herbal_shop_user_id"
    );


    localStorage.removeItem(
        "herbal_shop_username"
    );


    updateAuthWidget();


    document.getElementById(
        "auth-username"
    ).value =
        "";


    document.getElementById(
        "auth-password"
    ).value =
        "";


    showAuthForm();

    closeAuthModal();
}


/* ==========================================================================
   ESC И КЛИК ПО ФОНУ
   ========================================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        [
            "cart-modal",
            "auth-modal",
            "success-modal"
        ].forEach(id => {

            setModalState(
                id,
                false
            );

        });
    }
);


document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    setModalState(
                        modal.id,
                        false
                    );
                }
            }
        );

    });


/* ==========================================================================
   ЗАПУСК
   ========================================================================== */

loadCartFromStorage();

updateAuthWidget();


window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadTeas();

        updateCartUI();

    }
);