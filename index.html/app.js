(function() {
    const origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
        try {
            const url = typeof input === 'string' ? input : input.url;
            if (url && url.indexOf('placedgames.up.railway.app') !== -1) {
                const initData = window.Telegram?.WebApp?.initData || '';
                init = init || {};
                const headers = new Headers(init.headers || {});
                if (initData) headers.set('X-Tg-Init-Data', initData);
                init.headers = headers;
            }
        } catch (e) {}
        return origFetch(input, init);
    };
})();

window.__lastError = null;
window.addEventListener('error', (e) => {
    window.__lastError = e.message + ' | ' + (e.filename || '') + ':' + (e.lineno || '');
    showCrashRecoveryUI(e.message);
});
window.addEventListener('unhandledrejection', (e) => {
    window.__lastError = String(e.reason);
    showCrashRecoveryUI(String(e.reason));
});

function showCrashRecoveryUI(errText) {
    if (document.getElementById('crashRecoveryOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'crashRecoveryOverlay';
    overlay.style.cssText =
        'position:fixed;inset:0;background:var(--app-bg);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;color:white;font-family:system-ui;';
    overlay.innerHTML = `
        <div style="font-size:20px;font-weight:600;margin-bottom:10px;">Что-то пошло не так</div>
        <div style="font-size:14px;color:#9e9e9e;margin-bottom:20px;word-break:break-all;">${escapeHtml(errText || '')}</div>
        <button onclick="location.reload()" style="background:#4cb4e9;border:none;border-radius:34px;padding:14px 28px;color:white;font-size:16px;font-weight:600;cursor:pointer;">Перезагрузить</button>
    `;
    document.body.appendChild(overlay);
}

(async function() {
    if (!window.Telegram?.WebApp?.initData) {
        document.body.innerHTML = '';
        return;
    }
    try {
        const tg = window.Telegram?.WebApp;
        const photoUrl = tg?.initDataUnsafe?.user?.photo_url;
        if (photoUrl) {
            const img = new Image();
            img.src = photoUrl;
        }
    } catch (e) {}
})();

    window.__imgCache = window.__imgCache || {};

function getCachedAvatarDataUrl(userId) {
    if (!userId) return null;
    try { return localStorage.getItem('avatarCache_' + userId) || null; } catch (e) { return null; }
}

function cacheAvatarFromUrl(userId, url) {
    if (!userId || !url) return;
    fetch(url).then(r => r.blob()).then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
            try { localStorage.setItem('avatarCache_' + userId, reader.result); } catch (e) {}
        };
        reader.readAsDataURL(blob);
    }).catch(() => {});
}

function preloadImages(urls, concurrency = 6) {
const queue = urls.filter(src => src && !window.__imgCache[src]);
let index = 0;

function loadNext() {
    if (index >= queue.length) return;
    const src = queue[index++];
    window.__imgCache[src] = true;

    const img = new Image();
    img.onload = loadNext;
    img.onerror = () => {
        delete window.__imgCache[src];
        setTimeout(loadNext, 1000);
    };
    img.src = src;
}

for (let i = 0; i < concurrency; i++) loadNext();
}

function getAllProductImageUrls() {
    const fromGames = games.flatMap(g => g.getProducts().map(p => p.image));
    const staticUrls = [
        'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/BrawlStars.JPEG',
        'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/ClashRoyale.JPEG',
        'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/Roblox.JPEG',
        'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/Telegram.JPEG',
    ];
    return [...staticUrls, ...fromGames];
}

const IMG_RETRY_MAX = 4;
const IMG_RETRY_DELAY = 1200;

function attachImageAutoRetry(img) {
    if (img.dataset.retryAttached) return;
    img.dataset.retryAttached = 'true';
    img.dataset.retryCount = '0';

    img.addEventListener('error', function onImgError() {
        const attempts = parseInt(img.dataset.retryCount || '0', 10);
        if (attempts >= IMG_RETRY_MAX) return;

        img.dataset.retryCount = String(attempts + 1);
        const baseSrc = img.dataset.originalSrc || img.src.split('?__retry=')[0];
        img.dataset.originalSrc = baseSrc;

        setTimeout(() => {
            img.src = baseSrc + (baseSrc.includes('?') ? '&' : '?') + '__retry=' + Date.now();
        }, IMG_RETRY_DELAY * (attempts + 1));
    });
}

function setAvatarWithRetry(imgEl, url, attempt = 0) {
if (!imgEl || !url) return;
const MAX_ATTEMPTS = 8;
const DELAY = 2000;

const tryLoad = new Image();
tryLoad.onload = () => {
    imgEl.src = url;
};
tryLoad.onerror = () => {
    if (attempt >= MAX_ATTEMPTS) return;
    setTimeout(() => {
        setAvatarWithRetry(imgEl, url + (url.includes('?') ? '&' : '?') + '__retry=' + Date.now(), attempt + 1);
    }, DELAY);
};
tryLoad.src = url;
}

function scanAndAttachImages(root) {
    (root || document).querySelectorAll('img').forEach(attachImageAutoRetry);
}

scanAndAttachImages(document);

const imageObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'IMG') {
                attachImageAutoRetry(node);
            } else if (node.querySelectorAll) {
                scanAndAttachImages(node);
            }
        });
    });
});
imageObserver.observe(document.body, { childList: true, subtree: true });

const cardNumbers = {
    "Т-Банк": "2200 7019 3499 0208",
    "МТС Банк": "2200 2803 8708 1625",
    "ВТБ Банк": "2200 2418 6386 2268",
    "Сбер Банк": "2202 2084 4441 4743",
    "Ozon Банк": "2204 3203 9062 7166",
    "Альфа Банк": "2200 1529 6836 2817"
};
const paymentMethodsOptions = [
    { value: "wallet", label: "Кошелёк" },
    { value: "tbank", label: "Т-Банк" },
    { value: "mts", label: "МТС Банк" },
    { value: "vtb", label: "ВТБ Банк" },
    { value: "sber", label: "Сбер Банк" },
    { value: "ozon", label: "Ozon Банк" },
    { value: "alfa", label: "Альфа Банк" }
];

    function isTgFullscreen() {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.isFullscreen === 'boolean') return tg.isFullscreen;
    return (localStorage.getItem('appFormat') || 'fullscreen') === 'fullscreen';
}

function showTopLoader() {
    if (!isTgFullscreen()) return;
    document.getElementById('tgTopLoader')?.classList.add('visible');
}

function hideTopLoader() {
    document.getElementById('tgTopLoader')?.classList.remove('visible');
}

let topLoaderDepth = 0;
async function runWithLoader(taskFn, delayMs = 2000) {
    topLoaderDepth++;
    const timer = setTimeout(showTopLoader, delayMs);
    try {
        return await taskFn();
    } finally {
        clearTimeout(timer);
        topLoaderDepth--;
        if (topLoaderDepth <= 0) {
            topLoaderDepth = 0;
            hideTopLoader();
        }
    }
}

function formatPrice(p) {
    return Math.round(p).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "₽";
}

function getSatisfactionColors(rating) {
if (rating === 'good') return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.04)', icon: 'icon-review-happy' };
return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.04)', icon: 'icon-review-sad' };
}

        function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

    function cleanText(str) {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').trim();
}

function measureTextWidth(text, font) {
    const canvas = measureTextWidth._canvas || (measureTextWidth._canvas = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    return ctx.measureText(text).width;
}

function truncateTextToWidth(text, maxWidth, font) {
    if (measureTextWidth(text, font) <= maxWidth) return text;
    const ellipsis = '…';
    let lo = 0, hi = text.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const candidate = text.slice(0, mid).trimEnd() + ellipsis;
        if (measureTextWidth(candidate, font) <= maxWidth) lo = mid;
        else hi = mid - 1;
    }
    return text.slice(0, lo).trimEnd() + ellipsis;
}

function fitProductTitles(root) {
    (root || document).querySelectorAll('.product-title-row').forEach(row => {
        const span = row.querySelector('.product-title');
        const icon = row.querySelector('.product-info-icon');
        if (!span || !icon) return;
        if (!span.dataset.fullText) span.dataset.fullText = span.textContent;
        const fullText = span.dataset.fullText;
        const rowWidth = row.clientWidth;
        if (!rowWidth) return;
        const iconWidth = icon.getBoundingClientRect().width || 15;
        const gap = 5;
        const availableWidth = rowWidth - iconWidth - gap;
        if (availableWidth <= 0) return;
        const cs = getComputedStyle(span);
        const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        span.textContent = truncateTextToWidth(fullText, availableWidth, font);
    });
}

function pluralizeTovar(n) {
    const n100 = n % 100;
    const n10 = n % 10;
    if (n100 >= 11 && n100 <= 14) return 'товаров';
    if (n10 === 1) return 'товар';
    if (n10 >= 2 && n10 <= 4) return 'товара';
    return 'товаров';
}

function showProductInfoPopup(productId) {
    const prod = games.flatMap(g => g.getProducts()).find(p => p.id == productId);
    if (!prod) { showAppAlert('Информация недоступна'); return; }
    let msg = `Информация о товаре:\n\nТовар: ${prod.name}\n`;
    if (prod.bundleItems && prod.bundleItems.length > 0) {
        msg += `Содержимое набора:\n` + prod.bundleItems.map(i => `- ${i}`).join('\n') + `\n`;
    }
            msg += `Стоимость: ${formatPrice(prod.price)}\nКатегория: ${prod.label || prod.category}`;

    if (window.Telegram?.WebApp?.showPopup) {
        const inCart = !!cart[productId];
        window.Telegram.WebApp.showPopup({
            message: msg,
            buttons: [
                inCart
                    ? { id: 'remove', type: 'destructive', text: 'Удалить' }
                    : { id: 'add', type: 'default', text: 'В корзину' },
                { id: 'close', type: 'close' }
            ]
        }, (buttonId) => {
            if (buttonId === 'add') {
                hapticLight();
                handleCartAction(productId, true);
            } else if (buttonId === 'remove') {
                hapticMedium();
                delete cart[productId];
                saveCartToLocalStorage();
                updateSingleCard(productId);
            }
        });
    } else {
        showAppAlert(msg);
    }
}

function showServiceInfoPopup(gameId) {
    const g = games.find(g => g.id === gameId);
    if (!g) { showAppAlert('Информация недоступна'); return; }
    const count = g.getProducts().length;
    const msg = `Информация о сервисе:\n\nСервис: ${g.name}\nТоваров: ${count} ${pluralizeTovar(count)}`;

    if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
            message: msg,
            buttons: [
                { id: 'goto', type: 'default', text: 'К товарам' },
                { id: 'close', type: 'close' }
            ]
        }, (buttonId) => {
            if (buttonId === 'goto') {
                hapticLight();
                if (g.enabled === false) {
                    showAppAlert("Покупка товаров в данном сервисе временно недоступна, попробуйте позже");
                    return;
                }
                currentGame = g;
                savedGameScrollY = 0;
                gameCategoryFilter = "Все категории";
                gameSearchQuery = "";
                showPage("game");
            }
        });
    } else {
        showAppAlert(msg);
    }
}

function buildItemPriceHtml(price, originalPrice, priceClass) {
const hasDiscount = originalPrice && originalPrice !== price;
return `<span class="${priceClass}" style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
    ${hasDiscount ? `<span style="color:var(--text-price-old);text-decoration:line-through;font-size:14px;">${formatPrice(originalPrice)}</span>` : ''}
    ${formatPrice(price)}
</span>`;
}

function buildCollapsedItemsHtml(items, rowClass, nameClass, priceClass) {
if (!items || !items.length) return '';
const sorted = items.slice().sort((a, b) => (a.price * a.qty) - (b.price * b.qty));
if (sorted.length <= 2) {
    return sorted.map(i => `
        <div class="${rowClass}">
            <span class="${nameClass}">${escapeHtml(i.name)}${i.qty > 1 ? `, ${i.qty} шт.` : ''}</span>
            ${buildItemPriceHtml(i.price * i.qty, i.originalPrice ? i.originalPrice * i.qty : null, priceClass)}
        </div>`).join('');
}
const first = sorted[0];
const rest = sorted.slice(1);
const restSum = rest.reduce((s, i) => s + i.price * i.qty, 0);
const restOriginalSum = rest.reduce((s, i) => s + (i.originalPrice ? i.originalPrice * i.qty : i.price * i.qty), 0);
return `
    <div class="${rowClass}">
        <span class="${nameClass}">${escapeHtml(first.name)}${first.qty > 1 ? `, ${first.qty} шт.` : ''}</span>
        ${buildItemPriceHtml(first.price * first.qty, first.originalPrice ? first.originalPrice * first.qty : null, priceClass)}
    </div>
    <div class="${rowClass}">
        <span class="${nameClass}">Ещё ${rest.length} ${pluralizeTovar(rest.length)}</span>
        ${buildItemPriceHtml(restSum, restOriginalSum !== restSum ? restOriginalSum : null, priceClass)}
    </div>`;
}

    function isVibrationEnabled() {
    return localStorage.getItem('vibrationEnabled') !== 'false';
}

function hapticLight() {
    if (!isVibrationEnabled()) return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
        return;
    }
    if (navigator.vibrate) navigator.vibrate(30);
}

function hapticMedium() {
    if (!isVibrationEnabled()) return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
        return;
    }
    if (navigator.vibrate) navigator.vibrate(60);
}

    function showAppAlert(message) {
if (window.__alertOpen) return;
window.__alertOpen = true;
const release = () => { window.__alertOpen = false; };

if (window.Telegram?.WebApp?.showAlert) {
    try {
        window.Telegram.WebApp.showAlert(message, release);
    } catch (e) {
        release();
    }
} else {
    window.alert(message);
    release();
}
}

    async function isOrderLimitReached() {
        try {
            const r = await fetch('https://placedgames.up.railway.app/api/check-rate-limit');
            if (!r.ok) return false;
            const data = await r.json();
            return !!data.limited;
        } catch (e) { return false; }
    }

    function showOrderLimitAlert() {
        const msg = 'К сожалению, оформить заказ временно не получится, у вас более 2-х невыполненных заказов. Попробуйте позже.';
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                message: msg,
                buttons: [{ id: 'close', type: 'default', text: 'Закрыть' }]
            });
        } else {
            showAppAlert(msg);
        }
    }

const fieldInfoTexts = {
    email: 'Пожалуйста укажите почту от вашего аккаунта в игре, если ваш аккаунт не привязан к Supercell ID, то мы не сможем выполнить ваш заказ.',
    recipientTelegram: 'Пожалуйста укажите имя пользователя получателя, если у вас нету имени пользователя мы не сможем выполнить ваш заказ.',
    sender: 'Пожалуйста укажите имя отправителя перевода или если вы оплачиваете кошельком укажите ваше имя.',
    paymentAmount: 'Пожалуйста, отправьте перевод с указанной в графе суммой.',
    comment: 'Пожалуйста, укажите данный комментарий при переводе, чтобы мы смогли быстрее найти ваш платёж.',
    bank: 'Убедитесь что отправляете перевод именно на указанный в графе банк, в противном случае ваш заказ может быть отменён.'
};

    function showFieldInfoAlert(type) {
    hapticLight();
    const text = fieldInfoTexts[type];
    if (text) showAppAlert(text);
}

function showReferralCopiedAlert(link) {
    if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
            message: 'Реф. ссылка скопирована.\n\nПоделитесь ссылкой с друзьями или другими пользователями.',
            buttons: [
                { id: 'share', type: 'default', text: 'Поделиться ссылкой' }
            ]
        }, (buttonId) => {
            if (buttonId === 'share') {
                hapticLight();
                const shareText = 'Присоединяйся к Placed Games.';
                const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://' + link)}&text=${encodeURIComponent(shareText)}`;
                window.open(shareUrl, '_blank');
            }
        });
    }
}

function getPaymentMethodLabel(value) {
    const opt = paymentMethodsOptions.find(o => o.value === value);
    return opt ? opt.label : '';
}

function getBankFromValue(value) {
    const opt = paymentMethodsOptions.find(o => o.value === value);
    return opt ? opt.label : '';
}

function getCardNumberFromValue(value) {
    const bank = getBankFromValue(value);
    return cardNumbers[bank] || "";
}

    function renderPageHeader(title, currentPageId) {
const navPages = [
{ id: 'catalog', title: 'Каталог' },
{ id: 'cart', title: 'Корзина' },
{ id: 'orders', title: 'Заказы' },
{ id: 'profile', title: 'Профиль' },
{ id: 'reviews', title: 'Отзывы' },
{ id: 'wallet', title: 'Кошелёк' },
{ id: 'help', title: 'Справка' },
{ id: 'referrals', title: 'Рефералы' },
{ id: 'settings', title: 'Настройки' },
];

        const isKnownPage = navPages.some(p => p.id === currentPageId);
const navOptionsHtml =
    `<option value="" disabled ${!isKnownPage ? 'selected' : ''}>Выберите страницу</option>` +
    navPages.map(p =>
        `<option value="${p.id}" ${p.id === currentPageId ? 'selected' : ''}>${p.title}</option>`
    ).join('');

const headerThemeDeg = themeIconRotationDeg(localStorage.getItem('appTheme') || 'dark');

return `<div class="page-header-sticky">
<div class="page-header-inner">
    <div class="page-header-title-btn" style="cursor:pointer;position:relative;overflow:hidden;">
        <div class="page-header-icon-wrap">
            <svg class="icon icon-header-title icon--accent"><use href="#icon-logo"></use></svg>
        </div>
        <span>${title}</span>
        <select id="pageHeaderNavSelect" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:16px;">${navOptionsHtml}</select>
    </div>
    <button class="page-header-double-btn" id="headerDoubleBtn" style="height: 45px; background: var(--header-btn-bg); border: 1px solid var(--border-color); border-radius: 50px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 14px; cursor: pointer;">
        <svg id="headerRefreshIcon" class="icon icon-header-refresh icon--accent"><use href="#icon-refresh"></use></svg>
        <svg id="headerThemeIcon" class="icon icon-header-theme icon--accent theme-icon-rotatable" data-rotation="${headerThemeDeg}" style="transform:rotate(${headerThemeDeg}deg);"><use href="#icon-theme"></use></svg>
    </button>
</div>
</div>`;
}

    let uiActionLock = false;
function withLock(fn) {
    return function(...args) {
        if (uiActionLock) return;
        uiActionLock = true;
        fn.apply(this, args);
        setTimeout(() => { uiActionLock = false; }, 300);
    };
}
let profileLongPressFired = false;
let cart = {};
let currentOpenOrder = null;
let writeReviewEntryPage = 'reviews';
let appliedPromo = null;
let pendingOrderNumber = null;
let reviewsListCache = null;       // только в памяти, не в localStorage — сбрасывается при каждом новом открытии приложения
let reviewsFetchPromise = null;    // чтобы не запускать параллельно два одинаковых запроса
let isPromoMode = false;
let checkoutData = { paymentMethod: "", senderName: "", email: "", telegramUsername: "" };
let userWalletBalance = 0;
let isSubmitting = false;
let catalogServiceFilter = "Все сервисы";
let searchQuery = "";
let orders = [];
let orderStatusFilter = "Все заказы";
let navigationHistory = [];
let currentGame = null;
let savedGameScrollY = 0;
let savedReviewsScrollY = 0;
let savedOrdersScrollY = 0;  
 const bankLetters = { mts: 'M', tbank: 'T', vtb: 'W', sber: 'S', ozon: 'O', alfa: 'A' };

// Номер заказа вида Буква-Цифра-Буква-Цифра (G7V5, O1O2)
function generateOrderNumber() {
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', D = '0123456789';
const r = s => s[Math.floor(Math.random() * s.length)];
return r(L) + r(D) + r(L) + r(D);
}

function savePaymentSession() {
try {
    localStorage.setItem('paymentSession', JSON.stringify({ orderNumber: pendingOrderNumber, promo: appliedPromo }));
} catch (e) {}
}

function restorePaymentSession() {
if (localStorage.getItem('lastPage') !== 'payment') return;
try {
    const s = JSON.parse(localStorage.getItem('paymentSession') || 'null');
    if (s && s.orderNumber) {
        pendingOrderNumber = s.orderNumber;
        appliedPromo = s.promo || null;
    }
} catch (e) {}
}

// Список товаров корзины в сокращённом виде (для Оформления и Оплаты)
function buildCartItemsListHtml() {
const allProducts = games.flatMap(g => g.getProducts());
const items = Object.entries(cart).map(([id, qty]) => {
    const prod = allProducts.find(p => p.id == id);
    if (!prod) return null;
    const lineTotal = appliedPromo
        ? Math.round(prod.price * qty * (1 - appliedPromo.discountPercent / 100))
        : prod.price * qty;
    return { id, name: prod.name, qty, price: lineTotal / qty, originalPrice: prod.price };
}).filter(Boolean);
return buildCollapsedItemsHtml(items, 'order-item-row', 'order-item-name', 'order-item-price');
}

const games = [{
    id: 'brawlstars',
    name: 'Brawl Stars',
    developer: 'Supercell',
    image: 'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/BrawlStars.JPEG',
    minPrice: 85,
    oldMinPrice: 89,
    deliveryText: 'вход в аккаунт',
    warnText: 'Перед оформлением заказа, пожалуйста, проверьте наличие данной акции в вашем аккаунте\n\nВ противном случае срок возврата денежных средств составляет от 2 до 30 дней!',
    instructionText: 'Инструкция для Brawl Stars:\n1. ...\n2. ...',
    enabled: true,
    getProducts: () => window.brawlProducts || []
}, {
    id: 'clashroyale',
    name: 'Clash Royale',
    developer: 'Supercell',
    image: 'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/ClashRoyale.JPEG',
    minPrice: 85,
    oldMinPrice: 89,
    deliveryText: 'вход в аккаунт',
    warnText: 'Перед оформлением заказа проверьте наличие акции в аккаунте Clash Royale.',
    instructionText: 'Инструкция для Brawl Stars:\n1. ...\n2. ...',
    enabled: true,
    getProducts: () => window.crProducts || []
}, {
    id: 'roblox',
    name: 'Roblox',
    developer: 'Roblox Corporation',
    image: 'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/Roblox.JPEG',
    minPrice: 42,
    oldMinPrice: 44,
    deliveryText: 'вход в аккаунт',
    warnText: 'Для пополнения робуксов потребуется вход в ваш аккаунт Roblox.',
    instructionText: 'Инструкция для Brawl Stars:\n1. ...\n2. ...',
    enabled: false,
    getProducts: () => window.robloxProducts || []
}, {
    id: 'telegram',
    name: 'Telegram',
    developer: 'Telegram',
    image: 'https://cdn.jsdelivr.net/gh/melssed/PG@main/logos/Telegram.JPEG',
    minPrice: 22,
    oldMinPrice: 24,
    deliveryText: 'подарком',
    warnText: 'Для отправки подарка укажите ваш юзернейм в Telegram.',
    instructionText: 'Информация о товаре:\n\nПосле подтверждения оплаты товар будет отправлен на указанный вами «username».\n\nОжидание выполнения заказа занимает от 5 до 20 минут.',
    enabled: true,
    getProducts: () => window.tgProducts || []
}];

preloadImages(getAllProductImageUrls());
let afterPaymentBackPage = "cart";

function saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('cart');
    if (!savedCart) return;

    try {
        const parsed = JSON.parse(savedCart);
        const allProducts = games.flatMap(g => g.getProducts());
        const validIds = new Set(allProducts.map(p => p.id));

        cart = Object.fromEntries(
            Object.entries(parsed).filter(([id]) => validIds.has(id))
        );

        if (Object.keys(cart).length !== Object.keys(parsed).length) {
            saveCartToLocalStorage();
        }
    } catch (e) {
        cart = {};
        localStorage.removeItem('cart');
    }
}

    function canAddToCart(productId) {
    const newGame = games.find(g => g.getProducts().some(p => p.id === productId));
    const product = newGame?.getProducts().find(p => p.id == productId);
    if (!product) return { allowed: false, reason: "Товар не найден" };
    if (newGame && newGame.enabled === false) {
        return { allowed: false, reason: "Покупка товаров в данном сервисе временно недоступна, попробуйте позже" };
    }
    
    const cartItems = Object.keys(cart);
    if (cartItems.length > 0) {
        const firstId = cartItems[0];
        const cartGame = games.find(g => g.getProducts().some(p => p.id === firstId));
        if (cartGame && newGame && cartGame.id !== newGame.id) {
            return { allowed: false, mixConflict: true, reason: `Нельзя смешивать товары разных сервисов, чтобы добавить данный товар, пожалуйста очистите корзину.` };
        }
    }

    const uniqueCount = Object.keys(cart).length;
    if (!cart[productId] && uniqueCount >= 6) {
        return { allowed: false, reason: "В корзину можно добавить не более 6 различных товаров" };
    }
     
    const currentQty = cart[productId] || 0;
const maxAllowedQty = product.maxQty;
if (maxAllowedQty && currentQty >= maxAllowedQty) {
return { allowed: false, reason: `Максимум ${maxAllowedQty} шт.` };
}

    if (product.conflictGroup && product.conflictGroup.length > 0) {
        const conflicts = product.conflictGroup.filter(id => id !== productId && cart[id]);
        if (conflicts.length > 0) {
            const conflictId = conflicts[0];
            const conflictName = newGame.getProducts().find(p => p.id === conflictId)?.name || "";
            return {
                allowed: false,
                conflictSwap: true,
                conflictId: conflictId,
                reason: `Удалите товар «${conflictName}» из корзины, чтобы добавить товар «${product.name}» в корзину`
            };
        }
    }

    return { allowed: true };
}

function confirmClearAndAdd(productId) {
    cart = {};
    cart[productId] = 1;
    saveCartToLocalStorage();
    if (document.getElementById("game-page")?.classList.contains("active-page")) {
        renderGamePage();
    }
    if (document.getElementById("catalog-page")?.classList.contains("active-page")) {
        updateAllCards();
    }
    if (document.getElementById("cart-page")?.classList.contains("active-page")) {
        renderCartPage();
    } else if (document.getElementById("checkout-page")?.classList.contains("active-page")) {
        renderCheckoutForm();
    } else {
        document.getElementById("cartCheckoutFixed").style.display = "none";
    }
}

function confirmSwapConflict(newProductId, oldProductId) {
    delete cart[oldProductId];
    cart[newProductId] = 1;
    saveCartToLocalStorage();
    if (document.getElementById("game-page")?.classList.contains("active-page")) {
        renderGamePage();
    }
    if (document.getElementById("catalog-page")?.classList.contains("active-page")) {
        updateAllCards();
    }
    if (document.getElementById("cart-page")?.classList.contains("active-page")) {
        renderCartPage();
    } else if (document.getElementById("checkout-page")?.classList.contains("active-page")) {
        renderCheckoutForm();
    } else {
        document.getElementById("cartCheckoutFixed").style.display = "none";
    }
}

    function showConflictSwapConfirm(newProductId, oldProductId, message) {
    if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
            message: message,
            buttons: [
                { id: 'swap', type: 'destructive', text: 'Удалить' },
                { id: 'close', type: 'close' }
            ]
        }, (buttonId) => {
            if (buttonId === 'swap') {
                hapticMedium();
                confirmSwapConflict(newProductId, oldProductId);
            }
        });
    } else if (window.confirm(message)) {
        confirmSwapConflict(newProductId, oldProductId);
    }
}

function reloadProductsScript(onDone) {
    const oldScript = document.querySelector('script[data-products-script]');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.src = 'products.js?_cb=' + Date.now();
    script.setAttribute('data-products-script', 'true');
    script.onload = () => { if (onDone) onDone(true); };
    script.onerror = () => { if (onDone) onDone(false); };
    document.head.appendChild(script);
}

    function clearAppCache() {
window.__imgCache = {};
location.reload();
}

function applyAppFormat(format) {
localStorage.setItem('appFormat', format);
const tg = window.Telegram?.WebApp;
if (!tg) return;
try {
    if (format === 'fullscreen') {
        tg.requestFullscreen();
    } else {
        if (tg.exitFullscreen) tg.exitFullscreen();
    }
} catch (e) {}
}

function hasAnyProductsLoaded() {
    const arrays = [window.brawlProducts, window.crProducts, window.robloxProducts, window.tgProducts];
    return arrays.some(a => Array.isArray(a) && a.length > 0);
}

    function showMixCartConfirm(productId, message) {
    if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
            message: message,
            buttons: [
                { id: 'clear', type: 'destructive', text: 'Очистить' },
                { id: 'close', type: 'close' }
            ]
        }, (buttonId) => {
            if (buttonId === 'clear') {
                hapticMedium();
                confirmClearAndAdd(productId);
            }
        });
    } else if (window.confirm(message)) {
        confirmClearAndAdd(productId);
    }
}

function renderCartButtonHtml(productId) {
const qty = cart[productId] || 0;
if (qty > 0) {
    const prod = games.flatMap(g => g.getProducts()).find(p => p.id == productId);
    const maxQty = prod?.maxQty;
    const atLimit = maxQty && qty >= maxQty;
        const plusOpacity = atLimit ? 'opacity:0.4;pointer-events:none;' : '';
        return `<div class="card-action-btn counter-btn">
                <span class="counter-minus" data-id="${productId}"><svg class="icon icon-counter-minus icon--accent"><use href="#icon-minus"></use></svg></span>
                <span class="counter-value">${qty}</span>
                <span class="counter-plus" data-id="${productId}" style="${plusOpacity}"><svg class="icon icon-counter-plus icon--accent"><use href="#icon-plus"></use></svg></span>
            </div>`;
    }
    return `<div class="card-action-btn cart-add-btn" data-add="${productId}">В корзину</div>`;
}

function handleCartAction(pid, isIncrement) {
    if (isIncrement) {
        const check = canAddToCart(pid);
        if (!check.allowed) {
            if (check.mixConflict) { showMixCartConfirm(pid, check.reason); }
            else if (check.conflictSwap) { showConflictSwapConfirm(pid, check.conflictId, check.reason); }
            else { showAppAlert(check.reason); }
            return;
        }
        cart[pid] = (cart[pid] || 0) + 1;
    } else {
        if (cart[pid] === 1) delete cart[pid];
        else if (cart[pid] > 0) cart[pid]--;
    }
    if (document.getElementById("catalog-page").classList.contains("active-page")) { updateSingleCard(pid); }
    if (document.getElementById("game-page").classList.contains("active-page")) { updateSingleCard(pid); }
    if (document.getElementById("cart-page").classList.contains("active-page")) { renderCartPage(); } else if (document
            .getElementById("checkout-page").classList.contains("active-page")) { renderCheckoutForm(); } else {
        document.getElementById("cartCheckoutFixed").style.display = "none";
    }
    saveCartToLocalStorage();
}

function changeQty(pid, delta) {
    hapticLight();
    if (delta === 1) {
        const check = canAddToCart(pid);
        if (!check.allowed) {
            if (check.mixConflict) { showMixCartConfirm(pid, check.reason); }
            else if (check.conflictSwap) { showConflictSwapConfirm(pid, check.conflictId, check.reason); }
            else { showAppAlert(check.reason); }
            return;
        }
        cart[pid] = (cart[pid] || 0) + 1;
    } else if (delta === -1) {
        const cur = cart[pid] || 0;
        if (cur === 1) delete cart[pid];
        else if (cur > 1) cart[pid] = cur - 1;
    }
    updateSingleCard(pid);
    renderCartPage();
    saveCartToLocalStorage();
}

    // === Быстрое изменение количества при удержании (+/-) ===
let holdTimeout = null;
let holdInterval = null;

function stopHold() {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
}

    function holdIncrementCart(pid) {
const check = canAddToCart(pid);
if (!check.allowed) { stopHold(); return; }
cart[pid] = (cart[pid] || 0) + 1;
updateSingleCard(pid);
renderCartPage();
saveCartToLocalStorage();
}

function holdDecrementCart(pid) {
const qty = cart[pid] || 0;
if (qty <= 1) { stopHold(); return; }
cart[pid] = qty - 1;
updateSingleCard(pid);
renderCartPage();
saveCartToLocalStorage();
}

function holdIncrementCard(pid) {
const check = canAddToCart(pid);
if (!check.allowed) { stopHold(); return; }
handleCartAction(pid, true);
}

function holdIncrementCard(pid) {
    const qty = cart[pid] || 0;
    if (qty >= 9) { stopHold(); return; }
    const check = canAddToCart(pid);
    if (!check.allowed) { stopHold(); return; }
    handleCartAction(pid, true);
}

function holdDecrementCard(pid) {
    const qty = cart[pid] || 0;
    if (qty <= 1) { stopHold(); return; }
    handleCartAction(pid, false);
}

document.addEventListener('pointerdown', function(e) {
    const incCartBtn = e.target.closest('[data-inc]');
    const decCartBtn = e.target.closest('[data-dec]');
    const counterPlus = e.target.closest('.counter-plus');
    const counterMinus = e.target.closest('.counter-minus');

    let action = null;
    if (incCartBtn) action = () => holdIncrementCart(incCartBtn.dataset.inc);
    else if (decCartBtn) action = () => holdDecrementCart(decCartBtn.dataset.dec);
    else if (counterPlus) action = () => holdIncrementCard(counterPlus.dataset.id);
    else if (counterMinus) action = () => holdDecrementCard(counterMinus.dataset.id);

    if (!action) return;

    stopHold();
    holdTimeout = setTimeout(() => {
        holdInterval = setInterval(action, 120);
    }, 400);
});

['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
    document.addEventListener(evt, stopHold);
});

function renderCartPage() {
    const container = document.getElementById("cartItemsList");
    if (!container) return;
    const items = Object.entries(cart);
    if (!items.length) {
        container.innerHTML =
            `<div class="empty-state-icon"><svg class="icon icon-empty-cart icon--muted"><use href="#icon-cart"></use></svg><div class="empty-title">Корзина товаров пуста</div><button class="empty-catalog-btn" id="emptyCartToCatalog">Перейти в каталог</button></div>`;
        document.getElementById("cartCheckoutFixed").style.display = "none";
        isPromoMode = false;
        appliedPromo = null;
        localStorage.removeItem('cart');
        setTimeout(() => {
            const btn = document.getElementById("emptyCartToCatalog");
            if (btn) btn.addEventListener("click", () => showPage("catalog"));
        }, 0);
        return;
    }
    let html = '';
    for (let [id, qty] of items) {
                    const prod = games.flatMap(g => g.getProducts()).find(p => p.id == id);
        if (!prod) continue;
        html += `<div class="cart-item-wrapper"><div class="cart-item"><img class="cart-img" src="${prod.image}" alt="${escapeHtml(prod.name)}"><div class="cart-info"><div class="cart-product-name">${escapeHtml(prod.name)}</div><div class="cart-product-price">
            ${formatPrice(appliedPromo ? Math.round(prod.price * qty * (1 - appliedPromo.discountPercent / 100)) : prod.price * qty)}
            ${appliedPromo ? `<span style="color:var(--text-price-old);text-decoration:line-through;font-size:15px;margin-left:6px;">${formatPrice(prod.price * qty)}</span>` : ''}
        </div><div class="cart-product-category">${escapeHtml(games.find(g => g.getProducts().some(p => p.id == id))?.name || prod.category)}</div></div><div class="cart-actions" style="display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:24px;padding-right:0px;padding-top:0px;">
            <div class="cart-icon-row">
                ${prod.warn ? `<svg class="icon icon-cart-warn warn-icon icon--warning" data-id="${id}" data-type="warn"><use href="#icon-warning"></use></svg>` : ''}
                <svg class="icon icon-info-cart icon--accent instruction-icon" data-id="${id}" data-type="instruction"><use href="#icon-info"></use></svg>
            </div>
            <div class="cart-quantity"><button class="cart-qty-btn" data-dec="${id}"><svg class="icon icon-cart-qty-minus icon--accent"><use href="#icon-minus"></use></svg></button><span class="cart-qty-value">${qty}</span><button class="cart-qty-btn" data-inc="${id}" style="${prod?.maxQty && qty >= prod.maxQty ? 'opacity:0.4;pointer-events:none;' : ''}"><svg class="icon icon-cart-qty-plus icon--accent"><use href="#icon-plus"></use></svg></button></div>
        </div></div><div class="cart-item-delivery"><span class="cart-item-delivery-label">Способ получения</span><span class="cart-item-delivery-value">${games.find(g => g.getProducts().some(p => p.id == id))?.deliveryText || 'вход в аккаунт'}</span></div></div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll("[data-dec]").forEach(btn => {
        btn.addEventListener("click", () => changeQty(btn.dataset.dec, -1));
    });
    document.querySelectorAll("[data-inc]").forEach(btn => {
        btn.addEventListener("click", () => changeQty(btn.dataset.inc, 1));
    });
    if (document.getElementById("cart-page").classList.contains("active-page")) { renderCheckoutBlock(); }
            document.querySelectorAll(".instruction-icon, .warn-icon").forEach(icon => {
        icon.addEventListener("click", () => {
            hapticLight();
            const id = icon.dataset.id;
            const type = icon.dataset.type;
            const game = games.find(g => g.getProducts().some(p => p.id == id));
            if (type === "warn") {
                showAppAlert(game?.warnText || 'Внимание!');
            } else {
                const prod = games.flatMap(g => g.getProducts()).find(p => p.id == id);
                if (!prod) { showAppAlert('Информация недоступна'); return; }
                let msg = `Информация о товаре:\n\nТовар: ${prod.name}\n`;
                if (prod.bundleItems && prod.bundleItems.length > 0) {
                    msg += `Содержимое набора:\n` + prod.bundleItems.map(i => `- ${i}`).join('\n') + `\n`;
                }
                msg += `Стоимость: ${formatPrice(prod.price)}\nКатегория: ${prod.label || prod.category}`;

                if (window.Telegram?.WebApp?.showPopup) {
                    window.Telegram.WebApp.showPopup({
                        message: msg,
                        buttons: [
                            { id: 'delete', type: 'destructive', text: 'Удалить' },
                            { id: 'close', type: 'close' }
                        ]
                    }, (buttonId) => {
                        if (buttonId === 'delete') {
                            hapticMedium();
                            delete cart[id];
                            saveCartToLocalStorage();
                            renderCartPage();
                        }
                    });
                } else {
                    showAppAlert(msg);
                }
            }
        });
    });
}

function updateAllCards() {
    document.querySelectorAll('.product-card').forEach(card => {
        const cardId = card.dataset.id;
        const btnContainer = card.querySelector('.card-info > div:last-child');
        if (btnContainer) { btnContainer.outerHTML = renderCartButtonHtml(cardId); }
    });
    attachCardEvents();
}

function updateSingleCard(productId) {
    const card = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (!card) return;
    const btnContainer = card.querySelector('.card-info > div:last-child');
    if (btnContainer) { btnContainer.outerHTML = renderCartButtonHtml(productId);
        attachCardEvents(); }
}

    function renderCatalog() {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;
    grid.style.display = "";
    let filteredGames = games.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (catalogServiceFilter !== "Все сервисы") {
        filteredGames = filteredGames.filter(g => g.name === catalogServiceFilter);
    }
    const catalogSelect = document.getElementById("catalogServiceSelect");
    if (catalogSelect) {
        const options = ["Все сервисы", ...games.map(g => g.name)];
        catalogSelect.innerHTML = options.map(o =>
            `<option value="${escapeHtml(o)}" ${catalogServiceFilter === o ? 'selected' : ''}>${escapeHtml(o)}</option>`
        ).join("");
                    catalogSelect.onchange = function() {
            hapticLight();
            const selected = this.value;
            if (selected === "Все сервисы") {
                catalogServiceFilter = "Все сервисы";
                renderCatalog();
                return;
            }
            const g = games.find(g => g.name === selected);
            if (!g) return;
            if (g.enabled === false) {
                showAppAlert("Покупка товаров в данном сервисе временно недоступна, попробуйте позже");
                this.value = "Все сервисы";
                return;
            }
            catalogServiceFilter = "Все сервисы";
            currentGame = g;
            savedGameScrollY = 0;
            gameCategoryFilter = "Все категории";
            gameSearchQuery = "";
            showPage("game");
        };
    }
                                            grid.innerHTML = filteredGames.map(game => `
            <div class="product-card" data-game-id="${game.id}">
                <div class="card-img-carousel">
                    <div class="card-img-track">
                        <img class="card-img" src="${game.image}" alt="${escapeHtml(game.name)}">
                    </div>
                </div>
                <div class="card-info">
                                            <div class="product-title-row" data-info-service="${game.id}">
                        <span class="product-title">${escapeHtml(cleanText(game.name))}</span>
                        <svg class="icon product-info-icon"><use href="#icon-info"></use></svg>
                    </div>
                    <div class="price-row">
                        <span class="current-price" style="font-size:19px;color:var(--text-primary);font-weight:500;">от ${formatPrice(game.minPrice)}</span>
                        <span class="old-price">${formatPrice(game.oldMinPrice)}</span>
                    </div>
                    <div class="card-action-btn cart-add-btn" data-open-game="${game.id}">Смотреть</div>
                </div>
            </div>
                    `).join("");

            requestAnimationFrame(() => fitProductTitles(grid));

            document.querySelectorAll("[data-open-game]").forEach(btn => {
 btn.addEventListener("click", (e) => {
            e.stopPropagation();
            hapticLight();
            const gameId = btn.dataset.openGame;
            const g = games.find(g => g.id === gameId);
            if (g && g.enabled === false) {
                showAppAlert("Покупка товаров в данном сервисе временно недоступна, попробуйте позже");
                return;
            }
                            currentGame = g;
            savedGameScrollY = 0;
            gameCategoryFilter = "Все категории";
            gameSearchQuery = "";
            showPage("game");
        });
    });

    document.querySelectorAll("[data-info-service]").forEach(btn => {
        btn.addEventListener("pointerdown", (e) => e.stopPropagation());
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            hapticLight();
            showServiceInfoPopup(btn.dataset.infoService);
        });
    });
}

function attachCardEvents() {
    document.querySelectorAll('.product-card').forEach(card => {
        const cardId = card.dataset.id;
        const actionBtn = card.querySelector('.card-action-btn');
        if (!actionBtn) return;
        if (actionBtn.classList.contains('cart-add-btn')) {
            actionBtn.replaceWith(actionBtn.cloneNode(true));
            const newBtn = card.querySelector('.cart-add-btn');
            newBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCartAction(cardId, true);
                hapticLight();
            });
        } else if (actionBtn.classList.contains('counter-btn')) {
            const minus = actionBtn.querySelector('.counter-minus');
            const plus = actionBtn.querySelector('.counter-plus');
            minus?.replaceWith(minus.cloneNode(true));
            plus?.replaceWith(plus.cloneNode(true));
            const newMinus = actionBtn.querySelector('.counter-minus');
            const newPlus = actionBtn.querySelector('.counter-plus');
            newMinus?.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticLight();
                handleCartAction(cardId, false);
            });
            newPlus?.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticLight();
                handleCartAction(cardId, true);
            });
        }
    });
}

    function buildOrderObject(paymentMethodLabel) {
    let tgUser = null;
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    const cartItems = Object.entries(cart);
    const orderItems = cartItems.map(([id, qty]) => {
        const prod = games.flatMap(g => g.getProducts()).find(p => p.id == id);
        const lineTotal = appliedPromo
            ? Math.round(prod.price * qty * (1 - appliedPromo.discountPercent / 100))
            : prod.price * qty;
        return { id: id, name: prod.name, qty, price: lineTotal / qty, originalPrice: prod.price };
    });
    const total = orderItems.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
    const gameNameValue = (() => {
        const ids = Object.keys(cart);
        if (!ids.length) return '';
        const g = games.find(g => g.getProducts().some(p => p.id == ids[0]));
        return g?.name || '';
    })();
    const isTelegramOrderForBuild = gameNameValue.trim().toLowerCase() === 'telegram';
    return {
        orderNumber: (paymentMethodLabel !== "Кошелёк" && pendingOrderNumber) ? pendingOrderNumber : 0,
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        items: orderItems,
        total: total,
        status: paymentMethodLabel === "Кошелёк" ? "Ожидает выполнения" : "Ожидает проверки",
        status_code: paymentMethodLabel === "Кошелёк" ? "processing" : "pending",
        promo: appliedPromo ? appliedPromo.code : null,
        promo_discount: appliedPromo ? appliedPromo.discountPercent : 0,
        payment_method: paymentMethodLabel,
        sender_name: checkoutData.senderName,
        email: isTelegramOrderForBuild ? checkoutData.telegramUsername : checkoutData.email,
        user_id: tgUser?.id,
        user_name: tgUser?.first_name,
        user_username: tgUser?.username,
        game_name: gameNameValue,
    };
}

async function finalizeOrderAfterSuccess() {
    pendingOrderNumber = null;
    localStorage.removeItem('paymentSession');
    cart = {};
    appliedPromo = null;
    isPromoMode = false;
    updateAllCards();
    renderCartPage();
    navigationHistory = [afterPaymentBackPage];
    showPage("orders", true);
}

async function sendOrderToServer(order) {
    try {
        const response = await fetch('https://placedgames.up.railway.app/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        return response.ok;
    } catch (error) { return false; }
}

function renderCheckoutBlock() {
    const fixedBlock = document.getElementById("cartCheckoutFixed");
    const items = Object.entries(cart);
    const isCartPageActive = document.getElementById("cart-page").classList.contains("active-page");
    if (!items.length || !isCartPageActive) {
        if (fixedBlock) fixedBlock.style.display = "none";
        return;
    }
    fixedBlock.style.display = "block";
    const rawTotal = items.reduce((s, [id, qty]) => s + (games.flatMap(g => g.getProducts()).find(p => p.id == id)
        .price * qty), 0);
    const discountedTotal = appliedPromo
        ? items.reduce((s, [id, qty]) => s + Math.round(games.flatMap(g => g.getProducts()).find(p => p.id == id).price * qty * (1 - appliedPromo.discountPercent / 100)), 0)
        : rawTotal;
    if (isPromoMode) {
        fixedBlock.innerHTML =
            `<div class="checkout-card" style="width: 100%; box-sizing: border-box;"><div class="total-row"><span class="promo-label">Введите промокод на скидку</span></div><div class="promo-input-row" style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;"><input type="text" class="promo-input" id="promoInput" placeholder="Введите промокод" value="${appliedPromo ? appliedPromo.code : ''}" oninput="this.value=this.value.toUpperCase()" style="flex: 1; min-width: 0; box-sizing: border-box;"><button class="promo-action-btn back-btn" id="promoBackBtn" style="flex-shrink: 0;"><svg class="icon icon-promo-back icon--danger"><use href="#icon-cancel"></use></svg></button><button class="promo-action-btn apply-btn" id="promoApplyBtn" style="flex-shrink: 0;"><svg class="icon icon-promo-apply icon--accent"><use href="#icon-success"></use></svg></button></div></div>`;
        setTimeout(() => {
            const promoInput = document.getElementById("promoInput");
            const backBtn = document.getElementById("promoBackBtn");
            const applyBtn = document.getElementById("promoApplyBtn");
            if (promoInput) promoInput.focus();
            if (backBtn) backBtn.addEventListener("click", withLock(() => {
                hapticLight();
                if (appliedPromo) appliedPromo = null;
                isPromoMode = false;
                renderCheckoutBlock();
                renderCartPage();
            }));
            if (applyBtn) applyBtn.addEventListener("click", async () => {
                hapticLight();
                const code = promoInput?.value.trim().toUpperCase();
                if (!code) return;
                const tgU = window.Telegram?.WebApp?.initDataUnsafe?.user;
                try {
                    const r = await fetch('https://placedgames.up.railway.app/api/check-promo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, userId: String(tgU?.id || '') })
                    });
                    const data = await r.json();
                    if (data.valid) {
                        appliedPromo = { code, discountPercent: data.discount };
                        isPromoMode = false;
                        renderCheckoutBlock();
                        renderCartPage();
                    } else {
                        if (data.reason === 'not_found') {
                            showAppAlert('Промокод не найден');
                        } else if (data.reason === 'already_used') {
                            showAppAlert('Данный промокод уже был использован ранее');
                        } else if (data.reason === 'expired') {
                            showAppAlert('Срок действия промокода истёк');
                        } else if (data.reason === 'limit_reached') {
                            showAppAlert('Промокод больше не доступен — лимит активаций исчерпан');
                        } else if (data.reason === 'not_for_you') {
                            showAppAlert('Этот промокод предназначен для другого пользователя');
                        } else if (data.reason === 'first_order_only') {
                            showAppAlert('Данный промокод доступен только на первый заказ');
                        }
                        if (promoInput) {
                            promoInput.value = appliedPromo ? appliedPromo.code : '';
                        }
                    }
                } catch (e) {
                    showAppAlert('Ошибка проверки промокода');
                }
            });
            if (promoInput) promoInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") applyBtn?.click();
            });
        }, 0);
    } else {
        fixedBlock.innerHTML =
            `<div class="checkout-card checkout-card-outline"><div class="total-row"><span class="total-label">Общая стоимость:</span><span class="total-price-wrapper">${appliedPromo ? `<span class="total-old-price">${formatPrice(rawTotal)}</span>` : ''}<span class="total-price">${formatPrice(discountedTotal)}</span></span></div><div class="checkout-buttons-row"><button class="checkout-button" id="checkoutBtn">Перейти к оформлению</button><button class="promo-btn" id="openPromoBtn"><svg class="icon icon-promo-open icon--accent"><use href="#icon-promo"></use></svg></button></div></div>`;
        setTimeout(() => {
                            document.getElementById("checkoutBtn")?.addEventListener("click", async (e) => {
if (isSubmitting) return;
isSubmitting = true;
    const btn = e.currentTarget;
if (btn) {
            btn.style.pointerEvents = "none";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.innerHTML = '<span class="btn-dots"><span></span><span></span><span></span></span>';
       }
hapticMedium();
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
if (!tgUser || !tgUser.id) {
    showAppAlert(
        'Оформить заказ можно только через Telegram-бота\n\nПожалуйста, откройте приложение через @PlacedGamesBot'
    );
    isSubmitting = false;
    if (btn) {
                    btn.style.pointerEvents = "";
        btn.style.display = "";
        btn.style.alignItems = "";
        btn.style.justifyContent = "";
        btn.textContent = 'Перейти к оформлению';
 }
    return;
}
try {
    await runWithLoader(async () => {
        const r = await fetch('https://placedgames.up.railway.app/api/settings');
        const s = await r.json();
        const status = s.bot_status || 'open';
        if (status === 'closed') {
            showAppAlert('Оформить заказ временно не получится, попробуйте позже');
            throw new Error('blocked');
        }
        if (status === 'maintenance') {
            showAppAlert('Оформить заказ временно не получится, проводятся технические работы');
            throw new Error('blocked');
        }
        if (status === 'auto') {
            const mskHour = (new Date().getUTCHours() + 3) % 24;
            if (mskHour >= 0 && mskHour < 10) {
                showAppAlert(
                    'Оформить заказ временно не получится, возвращайтесь в 10:00 по московскому времени'
                );
                throw new Error('blocked');
            }
        }
    }, 350);
    showPage("checkout");
    } catch (e) {
} finally {
    isSubmitting = false;
    if (btn) {
                    btn.style.pointerEvents = "";
        btn.style.display = "";
        btn.style.alignItems = "";
        btn.style.justifyContent = "";
        btn.textContent = 'Перейти к оформлению';
    }
}
            });
            document.getElementById("openPromoBtn")?.addEventListener("click", () => {
                hapticLight();
                isPromoMode = true;
                renderCheckoutBlock();
            });
        }, 0);
    }
}

async function renderCheckoutForm() {
    const walletBalancePromise = fetchUserWalletBalance();
    const container = document.getElementById("checkoutFormContent");

    let rawTotal = 0;
    let discountedTotal = 0;

    const items = Object.entries(cart);
    if (!items.length) {
        container.innerHTML = '<div class="empty-state">Корзина пуста</div>';
        return;
    }
            rawTotal = items.reduce((s, [id, qty]) => s + (games.flatMap(g => g.getProducts()).find(p => p.id == id)
        .price * qty), 0);
    discountedTotal = appliedPromo
        ? items.reduce((s, [id, qty]) => s + Math.round(games.flatMap(g => g.getProducts()).find(p => p.id == id).price * qty * (1 - appliedPromo.discountPercent / 100)), 0)
        : rawTotal;

            const itemsListHtml = buildCartItemsListHtml();

    const cartGameId = (() => {
        const ids = Object.keys(cart);
        if (!ids.length) return null;
        const g = games.find(g => g.getProducts().some(p => p.id == ids[0]));
        return g?.id || null;
    })();
    const isTelegramOrder = cartGameId === 'telegram';

    container.innerHTML = `
            <div style="position:relative;margin-bottom:14px;">
                <div class="content-card" style="position:relative;z-index:2;margin-bottom:0;border-radius:34px;">
                                                                   <div class="form-section">
                        <div class="form-label">${isTelegramOrder ? 'Получатель' : 'Почта Supercell ID'}</div>
                        <div style="position:relative;">
                            <input type="${isTelegramOrder ? 'text' : 'email'}" class="form-input" id="emailInput" placeholder="${isTelegramOrder ? 'Укажите @username' : 'Укажите почту аккаунта'}" value="${escapeHtml(isTelegramOrder ? checkoutData.telegramUsername : checkoutData.email)}" style="padding-right:46px;">
                            <svg class="icon icon-info-field" id="emailFieldInfoBtn" style="position:absolute;right:18px;top:50%;transform:translateY(-50%);"><use href="#icon-info"></use></svg>
                        </div>
                    </div>
                    <div class="form-section">
                        <div class="form-label">Способ оплаты</div>
                        <select class="form-select-native" id="paymentMethodSelect">
                            <option value="" disabled ${!checkoutData.paymentMethod ? 'selected' : ''}>Нажмите для выбора</option>
                            ${paymentMethodsOptions.map(o => `<option value="${o.value}" ${checkoutData.paymentMethod === o.value ? 'selected' : ''}>${o.value === 'wallet' ? `Кошелёк (${formatPrice(userWalletBalance)})` : o.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-section" style="margin-bottom:0;">
                        <div class="form-label">Данные отправителя</div>
                        <div style="position:relative;">
                            <input type="text" class="form-input" id="senderNameInput" placeholder="Укажите имя отправителя" value="${escapeHtml(checkoutData.senderName)}" style="padding-right:46px;">
                            <svg class="icon icon-info-field" id="senderFieldInfoBtn" style="position:absolute;right:18px;top:50%;transform:translateY(-50%);"><use href="#icon-info"></use></svg>
                        </div>
                    </div>
                </div>
                <div style="background:var(--col-bg);border:1px solid var(--col-border-color);border-radius:0 0 28px 28px;padding:12px 18px;margin-top:-30px;padding-top:40px;position:relative;z-index:1;">
                    ${itemsListHtml}
                </div>
            </div>`;

            const fixedBlock = document.getElementById("cartCheckoutFixed");
    fixedBlock.style.display = "block";
    const initialPayBtnText = (checkoutData.paymentMethod === "wallet" && discountedTotal <= userWalletBalance) ?
        "Оформить заказ" :
        "Перейти к оплате";
    if (isPromoMode) {
        fixedBlock.innerHTML =
            `<div class="checkout-card" style="width: 100%; box-sizing: border-box;"><div class="total-row"><span class="promo-label">Введите промокод на скидку</span></div><div class="promo-input-row" style="display: flex; gap: 10px; width: 100%; box-sizing: border-box;"><input type="text" class="promo-input" id="checkoutPromoInput" placeholder="Введите промокод" value="${appliedPromo ? appliedPromo.code : ''}" oninput="this.value=this.value.toUpperCase()" style="flex: 1; min-width: 0; box-sizing: border-box;"><button class="promo-action-btn back-btn" id="checkoutPromoBackBtn" style="flex-shrink: 0;"><svg class="icon icon-promo-back icon--danger"><use href="#icon-cancel"></use></svg></button><button class="promo-action-btn apply-btn" id="checkoutPromoApplyBtn" style="flex-shrink: 0;"><svg class="icon icon-promo-apply icon--accent"><use href="#icon-success"></use></svg></button></div></div>`;
    } else {
        fixedBlock.innerHTML =
            `<div class="checkout-card checkout-card-outline"><div class="total-row"><span class="total-label">Общая стоимость:</span><span class="total-price-wrapper">${appliedPromo ? `<span class="total-old-price">${formatPrice(rawTotal)}</span>` : ''}<span class="total-price">${formatPrice(discountedTotal)}</span></span></div><div class="checkout-buttons-row"><button class="checkout-button" id="payBtn">${initialPayBtnText}</button><button class="promo-btn" id="openCheckoutPromoBtn"><svg class="icon icon-promo-open icon--accent"><use href="#icon-promo"></use></svg></button></div></div>`;
    }
    setTimeout(() => {
        const promoInput = document.getElementById("checkoutPromoInput");
        const promoBackBtn = document.getElementById("checkoutPromoBackBtn");
        const promoApplyBtn = document.getElementById("checkoutPromoApplyBtn");
        if (promoInput) promoInput.focus();
        promoBackBtn?.addEventListener("click", withLock(() => {
            hapticLight();
            isPromoMode = false;
            renderCheckoutForm();
        }));
        promoApplyBtn?.addEventListener("click", async () => {
            hapticLight();
            const code = promoInput?.value.trim().toUpperCase();
            if (!code) return;
            const tgU = window.Telegram?.WebApp?.initDataUnsafe?.user;
            try {
                const r = await fetch('https://placedgames.up.railway.app/api/check-promo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, userId: String(tgU?.id || '') })
                });
                const data = await r.json();
                if (data.valid) {
                    appliedPromo = { code, discountPercent: data.discount };
                    isPromoMode = false;
                    renderCheckoutForm();
                } else {
                    if (data.reason === 'not_found') showAppAlert('Промокод не найден');
                    else if (data.reason === 'already_used') showAppAlert('Данный промокод уже был использован ранее');
                    else if (data.reason === 'expired') showAppAlert('Срок действия промокода истёк');
                    else if (data.reason === 'limit_reached') showAppAlert('Промокод больше не доступен — лимит активаций исчерпан');
                    else if (data.reason === 'not_for_you') showAppAlert('Этот промокод предназначен для другого пользователя');
                    else if (data.reason === 'first_order_only') showAppAlert('Данный промокод доступен только на первый заказ');
                    if (promoInput) promoInput.value = appliedPromo ? appliedPromo.code : '';
                }
            } catch (e) {
                showAppAlert('Ошибка проверки промокода');
            }
        });
        promoInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") promoApplyBtn?.click();
        });

        const paymentSelect = document.getElementById("paymentMethodSelect");

        function updatePayBtnLabel() {
            const payBtn = document.getElementById("payBtn");
            if (!payBtn) return;
            payBtn.textContent = (checkoutData.paymentMethod === "wallet" && discountedTotal <=
                userWalletBalance) ? "Оформить заказ" : "Перейти к оплате";
        }
        paymentSelect?.addEventListener("change", function() {
            checkoutData.paymentMethod = this.value;
            this.classList.remove("error");
            localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
            updatePayBtnLabel();
        });
        document.getElementById("openCheckoutPromoBtn")?.addEventListener("click", () => {
            hapticLight();
            isPromoMode = true;
            renderCheckoutForm();
        });
        document.getElementById("emailFieldInfoBtn")?.addEventListener("click", () => {
            showFieldInfoAlert(isTelegramOrder ? "recipientTelegram" : "email");
        });
        document.getElementById("senderFieldInfoBtn")?.addEventListener("click", () => {
            showFieldInfoAlert("sender");
        });
        document.getElementById("payBtn")?.addEventListener("click", async () => {
            hapticMedium();
            let hasError = false;
            const senderInput = document.getElementById("senderNameInput");
            const emailInput = document.getElementById("emailInput");
            if (!checkoutData.paymentMethod) {
                paymentSelect.classList.add("error");
                hasError = true;
            }
            if (!senderInput.value.trim()) {
                senderInput.classList.add("error");
                hasError = true;
            } else {
                senderInput.classList.remove("error");
                checkoutData.senderName = senderInput.value.trim();
            }
            if (!emailInput.value.trim()) {
                emailInput.classList.add("error");
                hasError = true;
            } else {
                emailInput.classList.remove("error");
                if (isTelegramOrder) { checkoutData.telegramUsername = emailInput.value.trim(); }
                else { checkoutData.email = emailInput.value.trim(); }
            }
            if (hasError) return;

                            if (checkoutData.paymentMethod === "wallet") {
                    if (await isOrderLimitReached()) { showOrderLimitAlert(); return; }
                if (discountedTotal > userWalletBalance) {
                    if (window.Telegram?.WebApp?.showPopup) {
                        window.Telegram.WebApp.showPopup({
                            message: 'На вашем кошельке недостаточно средств, пожалуйста выберите другой способ оплаты',
                            buttons: [
                                { id: 'topup', type: 'default', text: 'Пополнить' },
                                 { id: 'close', type: 'close' }
                            ]
                        }, (buttonId) => {
                            if (buttonId === 'topup') {
                                hapticLight();
                                showAppAlert('В данный момент пополнить кошелёк нельзя, попробуйте позже');
                            }
                        });
                    } else {
                        showAppAlert('На вашем кошельке недостаточно средств, пожалуйста выберите другой способ оплаты');
                    }
                    return;
                }
                const confirmed = await new Promise(resolve => {
                    window.Telegram.WebApp.showPopup({
                        message: `С вашего кошелька будет списано ${formatPrice(discountedTotal)}, для оформления заказа нажмите кнопку ниже.`,
                        buttons: [
                            { id: 'ok', type: 'default', text: 'Оформить заказ' }
                        ]
                    }, (buttonId) => resolve(buttonId === 'ok'));
                });
                if (!confirmed) return;
                if (isSubmitting) return;
                isSubmitting = true;
                const btn = document.getElementById("payBtn");
                if (btn) { btn.disabled = true;
                    btn.textContent = "Обработка..."; }
                const order = buildOrderObject("Кошелёк");
                const success = await sendOrderToServer(order);
                if (success) {
                    await finalizeOrderAfterSuccess();
                } else {
                    showAppAlert('Ошибка оформления заказа');
                    if (btn) { btn.disabled = false;
                        btn.textContent = "Оформить заказ"; }
                }
                isSubmitting = false;
                return;
            }

                            const recipientLine = isTelegramOrder
                ? `Получатель: ${checkoutData.telegramUsername}`
                : `Почта: ${checkoutData.email}`;
            const confirmMsg =
                `Подтверждение данных:\n\n` +
                `${recipientLine}\n` +
                `Способ оплаты: ${getPaymentMethodLabel(checkoutData.paymentMethod)}\n` +
                `Данные: ${checkoutData.senderName}\n` +
                `Общая стоимость: ${formatPrice(discountedTotal)}`;
            const goToPay = await new Promise(resolve => {
                if (!window.Telegram?.WebApp?.showPopup) { resolve(true); return; }
                window.Telegram.WebApp.showPopup({
                    message: confirmMsg.slice(0, 256),
                                            buttons: [
                        { id: 'pay', type: 'default', text: 'К оплате' },
                        { id: 'close', type: 'close' }
                    ]
                }, (buttonId) => {
                    if (buttonId === 'pay') hapticMedium();
                    resolve(buttonId === 'pay');
                });
            });
            if (!goToPay) return;
                if (await isOrderLimitReached()) { showOrderLimitAlert(); return; }
            pendingOrderNumber = generateOrderNumber();
            savePaymentSession();
            showPage("payment");
        });
        document.getElementById("senderNameInput")?.addEventListener("input", function() {
            checkoutData.senderName = this.value;
            this.classList.remove("error");
            localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        });
        document.getElementById("emailInput")?.addEventListener("input", function() {
            if (isTelegramOrder) {
                checkoutData.telegramUsername = this.value;
            } else {
                checkoutData.email = this.value;
            }
            this.classList.remove("error");
            localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        });
    }, 0);

    await walletBalancePromise;
    const paymentSelectEl = document.getElementById("paymentMethodSelect");
    if (paymentSelectEl) {
        Array.from(paymentSelectEl.options).forEach(opt => {
            if (opt.value === "wallet") opt.textContent = `Кошелёк (${formatPrice(userWalletBalance)})`;
        });
    }
    const payBtnEl = document.getElementById("payBtn");
    if (payBtnEl) {
        payBtnEl.textContent = (checkoutData.paymentMethod === "wallet" && discountedTotal <= userWalletBalance) ? "Оформить заказ" : "Перейти к оплате";
    }
}

function renderPaymentPage() {
    const container = document.getElementById("paymentContent");
    const cardNum = getCardNumberFromValue(checkoutData.paymentMethod);
    const bank = getBankFromValue(checkoutData.paymentMethod);
    if (!pendingOrderNumber) { pendingOrderNumber = generateOrderNumber(); savePaymentSession(); }
    const paymentComment = `CTN${pendingOrderNumber}PM${bankLetters[checkoutData.paymentMethod] || ''}`;

    let discountedTotal = 0;
    let rawTotal = 0;

    const items = Object.entries(cart);
            rawTotal = items.reduce((s, [id, qty]) => s + (games.flatMap(g => g.getProducts()).find(p => p.id == id)
        .price * qty), 0);
    discountedTotal = appliedPromo
        ? items.reduce((s, [id, qty]) => s + Math.round(games.flatMap(g => g.getProducts()).find(p => p.id == id).price * qty * (1 - appliedPromo.discountPercent / 100)), 0)
        : rawTotal;

            const itemsListHtml = buildCartItemsListHtml();

    container.innerHTML = `
            <div style="position:relative;margin-bottom:14px;">
                <div class="content-card" style="position:relative;z-index:2;margin-bottom:0;border-radius:34px;">
                    <div class="form-section">
                        <div class="form-label">Номер карты</div>
                        <div class="form-select-readonly card-number-row">
                            <span class="card-number-text" style="font-size:19px;font-weight:500;">${cardNum}</span>
                            <svg class="icon icon-payment-copy copy-icon icon--muted" id="copyCardBtn"><use href="#icon-copy"></use></svg>
                        </div>
                    </div>
                        <div class="form-section">
<div class="form-label">Сумма перевода</div>
<div class="form-select-readonly card-number-row">
    <span class="card-number-text" style="font-size:19px;font-weight:500;">${formatPrice(discountedTotal)}</span>
    <svg class="icon icon-info-field" id="paymentAmountInfoBtn"><use href="#icon-info"></use></svg>
</div>
</div>
                    <div class="form-section" style="margin-bottom:0;">
                        <div class="form-label">Банк получателя</div>
                        <div class="form-select-readonly card-number-row">
                            <span class="card-number-text" style="font-size:19px;font-weight:500;">${escapeHtml(bank)}</span>
                            <svg class="icon icon-info-field" id="bankInfoBtn"><use href="#icon-info"></use></svg>
                        </div>
                    </div>
                </div>
                <div style="background:var(--col-bg);border:1px solid var(--col-border-color);border-radius:0 0 28px 28px;padding:12px 18px;margin-top:-30px;padding-top:40px;position:relative;z-index:1;">
                    ${itemsListHtml}
                </div>
            </div>`;

    const fixedBlock = document.getElementById("cartCheckoutFixed");
    fixedBlock.style.display = "block";
    fixedBlock.innerHTML =
        `<div class="checkout-card checkout-card-outline"><div class="total-row"><span class="total-label">Общая стоимость:</span><span class="total-price-wrapper">${appliedPromo ? `<span class="total-old-price">${formatPrice(rawTotal)}</span>` : ''}<span class="total-price">${formatPrice(discountedTotal)}</span></span></div><div class="checkout-buttons-row"><button class="checkout-button" id="paidBtn">Оформить заказ</button><button class="promo-btn" id="helpBtn2"><svg class="icon icon-payment-help icon--accent"><use href="#icon-support"></use></svg></button></div></div>`;
    setTimeout(() => {
        const copyBtn = document.getElementById("copyCardBtn");
        copyBtn?.addEventListener("click", async () => {
            if (navigator.clipboard) {
                copyBtn.style.transform = "scale(0.85)";
                await navigator.clipboard.writeText(cardNum.replace(/\s/g, ""));
                setTimeout(() => {
                    copyBtn.style.transform = "scale(1)";
                }, 150);
                hapticLight();
            }
        });
                    document.getElementById("helpBtn2")?.addEventListener("click", () => {
            hapticLight();
            window.open("https://t.me/PlacedSupport", "_blank");
        });
        document.getElementById("paymentAmountInfoBtn")?.addEventListener("click", () => {
showFieldInfoAlert("paymentAmount");
});
        document.getElementById("bankInfoBtn")?.addEventListener("click", () => {
            showFieldInfoAlert("bank");
        });
                    document.getElementById("paidBtn")?.addEventListener("click", async () => {
            hapticMedium();
            const confirmed = await new Promise(resolve => {
                window.Telegram.WebApp.showPopup({
                    message: 'Подтверждение оформления:\n\nЕсли вы отправили перевод, нажмите кнопку «Оформить».',
                    buttons: [
                        { id: 'ok', type: 'default', text: 'Оформить' },
                         { id: 'close', type: 'close' }
                    ]
                }, (buttonId) => {
                    resolve(buttonId === 'ok');
                });
            });
            if (!confirmed) return;
            if (isSubmitting) return;
            isSubmitting = true;
            const btn = document.getElementById("paidBtn");
            if (btn) { btn.disabled = true;
                btn.textContent = "Обработка..."; }
            hapticMedium();
            let tgUser = null;
            if (window.Telegram?.WebApp?.initDataUnsafe?.user) tgUser = window.Telegram.WebApp.initDataUnsafe
                .user;

            const order = buildOrderObject(getPaymentMethodLabel(checkoutData.paymentMethod));

            const success = await sendOrderToServer(order);
                            if (success) {
                await finalizeOrderAfterSuccess();
            } else {
                showAppAlert('Ошибка оформления заказа, проверьте данные и промокод');
            }
            if (btn) { btn.disabled = false;
                btn.textContent = "Оформить заказ"; }
            isSubmitting = false;
        });
    }, 0);
}

async function loadUserOrders() {
    try {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser?.id) return;
        const r = await fetch(
            `https://placedgames.up.railway.app/api/user-orders?userId=${tgUser.id}`);
        if (r.ok) orders = await r.json();
    } catch (e) { }
}

    async function showProfileInfoAlert() {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) { showAppAlert('Информация недоступна'); return; }

    let firstSeen = '—';
    let ordersCount = 0;
    let totalSpent = 0;
    let referralsCount = 0;

    try {
        const [infoRes, ordersRes, balanceRes, referralRes] = await Promise.all([
            fetch(`https://placedgames.up.railway.app/api/user-info?userId=${tgUser.id}`).then(r => r.ok ?
                r.json() : null),
            fetch(`https://placedgames.up.railway.app/api/user-orders?userId=${tgUser.id}`).then(r => r
                .json()),
            fetch(`https://placedgames.up.railway.app/api/user-balance?userId=${tgUser.id}`).then(r => r.json()).catch(() => ({ balance: 0 })),
            fetch(`https://placedgames.up.railway.app/api/referral-stats?userId=${tgUser.id}`).then(r => r.json()).catch(() => ({ invited: 0 }))
        ]);

        if (infoRes?.first_seen) {
            firstSeen = new Date(infoRes.first_seen).toLocaleDateString('ru-RU');
        }

        ordersCount = ordersRes.length;
        totalSpent = ordersRes
            .filter(o => o.status_code === 'completed' || o.status_code === 'done')
            .reduce((sum, o) => sum + (o.total || 0), 0);
        userWalletBalance = balanceRes?.balance || 0;
        referralsCount = referralRes?.invited || 0;
    } catch (e) {}

    const message =
        `Информация о пользователе:\n\n` +
        `Имя: ${tgUser.first_name || 'Пользователь'}\n` +
        `ID: ${tgUser.id}\n` +
        `Регистрация: ${firstSeen}\n` +
        `Баланс кошелька: ${formatPrice(userWalletBalance)}\n` +
        `Процент кэшбэка: 2%\n` +
        `Рефералов: ${referralsCount}\n` +
        `Всего заказов: ${ordersCount}\n` +
        `Объем покупок: ${formatPrice(totalSpent)}`;

            if (window.Telegram?.WebApp?.showPopup) {
                    window.Telegram.WebApp.showPopup({
            message: message,
            buttons: [
                { id: 'open_settings', type: 'default', text: 'Открыть настройки' }
            ]
        }, (buttonId) => {
            if (buttonId === 'open_settings') {
                hapticLight();
                showPage('settings');
            }
        });
    } else {
        showAppAlert(message);
    }
}

async function fetchUserWalletBalance() {
    try {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser?.id) { userWalletBalance = 0; return; }
        const r = await fetch(
            `https://placedgames.up.railway.app/api/user-balance?userId=${tgUser.id}`);
        const data = await r.json();
        userWalletBalance = data.balance || 0;
    } catch (e) { userWalletBalance = 0; }
}

function getStatusTextClass(statusCode) {
const map = {
    'pending': 'status-pending-text',
    'awaiting_code': 'status-awaiting_text',
    'cancelled': 'status-cancelled-text',
    'notfound': 'status-cancelled-text',
    'processing': 'status-processing-text',
    'in_progress': 'status-inprogress-text',
    'completed': 'status-completed-text',
    'done': 'status-completed-text',
};
return map[statusCode?.toLowerCase()] || '';
}

function getStatusBgClass(statusCode) {
const map = {
    'pending': 'status-pending-bg',
    'awaiting_code': 'status-awaiting-bg',
    'cancelled': 'status-cancelled-bg',
    'notfound': 'status-cancelled-bg',
    'processing': 'status-processing-bg',
    'in_progress': 'status-inprogress-bg',
    'completed': 'status-completed-bg',
    'done': 'status-completed-bg',
};
return map[statusCode?.toLowerCase()] || '';
}

function getStatusDisplayText(statusCode, originalStatus) {
const map = {
    'pending': 'Ожидает проверки',
    'awaiting_code': 'Ожидание кода',
    'cancelled': 'Отменен',
    'notfound': 'Заказ отменён',
    'processing': 'Ожидает выполнения',
    'in_progress': 'Выполняется',  
    'completed': 'Заказ выполнен',
    'done': 'Заказ выполнен',
};
return map[statusCode?.toLowerCase()] || originalStatus || 'Ожидает проверки';
}

function getOrderServiceName(order) {
if (order.game_name) return order.game_name;
if (order.order_game_name) return order.order_game_name;
let items = [];
try { items = JSON.parse(order.items || order.order_items || '[]'); } catch (e) {}
if (!items.length) return '—';
const game = games.find(g => g.getProducts().some(p => p.name === items[0].name));
return game?.name || '—';
}

function showOrderStatusInfo(order) {
if (!order) return;
const statusDisplay = getStatusDisplayText(order.status_code, order.status);
const serviceName = getOrderServiceName(order);
const message =
    `Информация о заказе:\n\n` +
    `Номер заказа: #${order.order_number}\n` +
    `Сервис: ${serviceName}\n` +
    `Дата: ${order.date} ${order.time || ''}\n` +
    `Статус: ${statusDisplay}\n` +
    `Сумма заказа: ${formatPrice(order.total)}`;

            if (window.Telegram?.WebApp?.showPopup) {
        window.Telegram.WebApp.showPopup({
            message: message,
            buttons: [
                { id: 'goto_order', type: 'default', text: 'К заказу' },
                { id: 'close', type: 'close' }
            ]
        }, (buttonId) => {
                            if (buttonId === 'goto_order') {
                hapticLight();
                savedOrdersScrollY = window.scrollY;
                navigationHistory.push('orders');
                showOrderDetail(order, true);
            }
        });
    } else {
        showAppAlert(message);
    }
}

const ORDER_STATUS_FILTERS = [
{ label: 'Выполненные', codes: ['completed', 'done'] },
{ label: 'Не выполненные', codes: ['pending', 'awaiting_code', 'processing', 'in_progress', 'cancelled', 'notfound'] },
];

    function renderOrdersPage() {
    const container = document.getElementById("ordersList");
    if (!container) return Promise.resolve();
    return loadUserOrders().then(() => {
        if (!orders.length) {
            container.innerHTML =
                `<div class="empty-state-icon"><svg class="icon icon-empty-orders icon--muted"><use href="#icon-orders"></use></svg><div class="empty-title">Заказов ещё нет</div><button class="empty-catalog-btn" id="emptyOrdersToCatalog">Перейти в каталог</button></div>`;
            setTimeout(() => {
                document.getElementById("emptyOrdersToCatalog")?.addEventListener("click", () =>
                    showPage("catalog"));
            }, 0);
            return;
        }

        const statusSelect = document.getElementById('orderStatusSelect');
        if (statusSelect) {
            const counts = {};
            ORDER_STATUS_FILTERS.forEach(f => {
                counts[f.label] = orders.filter(o => f.codes.includes(String(o.status_code).trim()
                    .toLowerCase())).length;
            });
            const optionLabels = ['Все заказы', ...ORDER_STATUS_FILTERS.map(f => f.label)];
            statusSelect.innerHTML = optionLabels.map(label => {
                const count = label === 'Все заказы' ? orders.length : counts[label];
                return `<option value="${escapeHtml(label)}" ${orderStatusFilter === label ? 'selected' : ''}>${escapeHtml(label)}${label === 'Все заказы' ? ` (${count})` : ''}</option>`;
             }).join('');
            statusSelect.onchange = () => {
                hapticLight();
                orderStatusFilter = statusSelect.value;
                applyOrdersFilters();
            };
        }

                    const searchInput = document.getElementById('orderSearchInput');
        if (searchInput) {
            searchInput.oninput = () => applyOrdersFilters();
        }

        setupSearchClear('orderSearchInput', 'orderSearchClearBtn');

        applyOrdersFilters();
    });
}

function applyOrdersFilters() {
    const container = document.getElementById("ordersList");
    if (!container) return;

    const searchVal = document.getElementById('orderSearchInput')?.value.trim().toLowerCase()
        .replace(/^#/, '') || '';

    let filtered = orders;

    if (orderStatusFilter !== 'Все заказы') {
        const statusFilter = ORDER_STATUS_FILTERS.find(f => f.label === orderStatusFilter);
        if (statusFilter) {
            filtered = filtered.filter(o => statusFilter.codes.includes(String(o.status_code).trim()
                .toLowerCase()));
        }
    }

    if (searchVal) {
        filtered = filtered.filter(o => String(o.order_number).toLowerCase().includes(searchVal));
    }

    renderOrdersList(filtered);
}

    function computeOrderRawTotal(items) {
    return items.reduce((s, i) => s + (i.originalPrice != null ? i.originalPrice : i.price) * i.qty, 0);
}

function renderOrdersList(list) {
    const container = document.getElementById("ordersList");
    if (!container) return;

    if (!list.length) {
        container.innerHTML = `<div class="empty-message"><div class="empty-title">Заказы не найдены</div></div>`;
        return;
    }

    container.innerHTML = list.map((o) => {
        let items = [];
        try { items = JSON.parse(o.items || '[]'); } catch (e) {}
        const statusDisplay = getStatusDisplayText(o.status_code, o.status);
        const status = String(o.status_code).trim().toLowerCase();
        const textClass = getStatusTextClass(status);
                    const bgClass = getStatusBgClass(status);

        const itemsHtml = buildCollapsedItemsHtml(items, 'order-item-row', 'order-item-name', 'order-item-price');

        const rawTotal = computeOrderRawTotal(items);
        const showOldTotal = o.promo_discount && rawTotal !== o.total;

        return `<div class="order-wrapper" data-order-id="${o.id}">
                    <div class="order-main-card">
                        <div class="order-header">
                            <span class="order-id">Заказ #${o.order_number}</span>
                            <div class="order-header-right">
                                <span class="order-card-status ${textClass} ${bgClass}">${statusDisplay}</span>
                            </div>
                        </div>
                        <div class="order-date">${o.date} ${o.time || ''}</div>
                           <div class="order-total" style="display:flex;align-items:baseline;gap:8px;">
                            ${formatPrice(o.total)}
                            ${showOldTotal ? `<span style="color:var(--text-price-old);text-decoration:line-through;font-size:15px;">${formatPrice(rawTotal)}</span>` : ''}
                        </div>
                       <svg class="icon icon-info-order-status icon--accent order-status-info-icon" data-status-info="${o.id}"><use href="#icon-info"></use></svg>
                    </div>
                    <div class="order-items-card">
                        ${itemsHtml}
                    </div>
                </div>`;
    }).join('');

            container.querySelectorAll(".order-wrapper").forEach(wrapper => {
        const order = orders.find(o => o.id == wrapper.dataset.orderId);
        wrapper.querySelector(".order-main-card")?.addEventListener("click", (e) => {
            if (e.target.closest('.order-refresh-btn')) return;
            if (order) {
                hapticLight();
                savedOrdersScrollY = window.scrollY;
                navigationHistory.push('orders');
                showOrderDetail(order, true);
            }
        });
    });

    container.querySelectorAll(".order-status-info-icon").forEach(icon => {
        icon.addEventListener("click", (e) => {
            e.stopPropagation();
            hapticLight();
            const orderId = icon.dataset.statusInfo;
            const order = orders.find(o => o.id == orderId);
            showOrderStatusInfo(order);
        });
    });
}

    function buildOrderReviewBlockHtml(order, review) {
    const avatar = review.photo_url ?
        `<img style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" src="${escapeHtml(review.photo_url)}" alt="avatar">` :
        `<div class="review-avatar">👤</div>`;
    const dt = review.created_at ? new Date(review.created_at) : null;
    const dateStr = dt ?
        `${dt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} ${dt.toLocaleDateString('ru-RU',{year:'2-digit',month:'2-digit',day:'2-digit'})}` :
        '';

    const reviewRating = review.rating || (review.satisfied ? 'good' : 'bad');
    const rc = getSatisfactionColors(reviewRating);
    const orderBadge = review.order_number ?
        `<div class="review-badge-stack">
            <span class="review-order-badge-wrap">
                <span class="review-order-badge-backdrop"></span>
                <span class="review-order-badge" data-order-num="${review.order_number}">#${review.order_number}</span>
            </span>
            <span class="review-rating-badge" style="background:${rc.bg};color:${rc.color};border-color:${rc.border};">
        <svg width="21" height="21" viewBox="0 0 512 512"><use href="#${rc.icon}"></use></svg>
    </span>
        </div>` :
        '';

            let orderItems = [];
    try { orderItems = JSON.parse(order.items || '[]'); } catch (e) {}
    const itemsHtml = buildCollapsedItemsHtml(orderItems, 'review-item-row', 'review-item-name', 'review-item-price');

    return `
                <div style="margin-top:14px;" class="review-card-wrapper">
                    <div class="review-card" style="margin-bottom:0;">
                                        <div class="review-header">
                ${avatar}
                <div class="review-header-info">
                    <div class="review-author-name">${escapeHtml(review.user_name || 'Пользователь')}</div>
                    <div class="review-date">${dateStr}</div>
                </div>
                ${orderBadge}
            </div>
                        <div class="review-text" style="-webkit-line-clamp:unset;">${escapeHtml(review.text)}</div>
                    </div>
                    ${itemsHtml ? `<div class="review-items-card">${itemsHtml}</div>` : ''}
                </div>
            `;
}

function showOrderDetail(order, isOwner = true) {
    if (!isOwner && order.status_code !== 'completed' && order.status_code !== 'done') {
        showAppAlert('Этот заказ недоступен для просмотра');
        return;
    }

    currentOpenOrder = order;
    const container = document.getElementById("orderDetailContent");
    let items = [];
    try { items = JSON.parse(order.items || '[]'); } catch (e) {}

    const paymentMethod = isOwner ? (order.payment_method || '—') : '***';
    const senderName = isOwner ? (order.sender_name || '—') : '***';
    const email = isOwner ? (order.email || '—') : '***';
    const verCode = isOwner ? order.verification_code : null;

            const itemsHtml = items.slice().sort((a, b) => (a.price * a.qty) - (b.price * b.qty)).map(i => {
        return `<div class="order-item-row">
                    <span class="order-item-name">${escapeHtml(i.name)}${i.qty > 1 ? `, ${i.qty} шт.` : ''}</span>
                    <span class="order-item-price" style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                        ${i.originalPrice && i.originalPrice !== i.price 
                            ? `<span style="color:var(--text-price-old);text-decoration:line-through;font-size:14px;">${formatPrice(i.originalPrice * i.qty)}</span>` 
                            : ''}
                        ${formatPrice(i.price * i.qty)}
                    </span>
                </div>`;
    }).join('');

    const orderGameFallback = order.game_name || (() => {
        let items = [];
        try { items = JSON.parse(order.items || '[]'); } catch (e) {}
        if (!items.length) return '';
        return games.find(g => g.getProducts().some(p => p.name === items[0].name))?.name || '';
    })();
    const isTelegramOrder = orderGameFallback.trim().toLowerCase() === 'telegram';
    const isAwaitingCode = order.status_code === 'awaiting_code';
    const statusDisplay = getStatusDisplayText(order.status_code, order.status);
    const statusColor = (() => {
switch (order.status_code) {
    case 'pending':
        return '#4cb4e9';
    case 'awaiting_code':
        return '#eab308';
    case 'cancelled':
        return '#ef4444';
    case 'notfound':
        return '#ef4444';
    case 'processing':
        return '#4cb4e9';
    case 'in_progress':
        return '#eab308';
    case 'completed':
        return '#22c55e';
    case 'done':
        return '#22c55e';
    default:
        return '#4cb4e9';
}
})();

            const reviewForOrder = reviewsListCache
        ? reviewsListCache.find(rv => String(rv.order_id) === String(order.id))
        : null;
    const orderReviewHtml = reviewForOrder ? buildOrderReviewBlockHtml(order, reviewForOrder) : '';

    container.innerHTML = `
            <div class="order-data-card">
                <div class="order-detail-row">
                    <span class="order-detail-label">Статус</span>
                    <span class="order-detail-value" style="color:${statusColor}">${statusDisplay}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Дата</span>
                    <span class="order-detail-value">${order.date} ${order.time || ''}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Сервис</span>
                    <span class="order-detail-value">${escapeHtml(order.game_name || (() => {
                        let items = [];
                        try { items = JSON.parse(order.items || '[]'); } catch(e) {}
                        if (!items.length) return '—';
                        const firstItem = items[0];
                        const game = games.find(g => g.getProducts().some(p => p.name === firstItem.name));
                        return game?.name || '—';
                    })())}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Способ оплаты</span>
                    <span class="order-detail-value">${paymentMethod}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Отправитель</span>
                    <span class="order-detail-value">${escapeHtml(senderName)}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">${isTelegramOrder ? 'Получатель' : 'Почта'}</span>
                    <span class="order-detail-value">${escapeHtml(email)}</span>
                </div>
                ${order.promo ? `<div class="order-detail-row">
                    <span class="order-detail-label">Промокод</span>
                    <span class="order-detail-value">${isOwner ? `${order.promo} (${order.promo_discount}%)` : `*** (${order.promo_discount}%)`}</span>
                </div>` : ''}
                ${verCode ? `<div class="order-detail-row">
                    <span class="order-detail-label">Код</span>
                    <span class="order-detail-value" style="color:var(--text-primary);">${escapeHtml(verCode)}</span>
                </div>` : ''}
                                    ${(isOwner && (order.status_code === 'completed' || order.status_code === 'done') && order.payment_method !== 'Кошелёк') ? `<div class="order-detail-row">
                    <span class="order-detail-label">Кэшбэк</span>
                    <span class="order-detail-value" style="color:#22c55e;">+${formatPrice(Math.round(order.total * 0.02))}</span>
                </div>` : ''}
                <div class="order-detail-row" style="padding-bottom:4px;">
                    <span class="order-detail-label" style="font-weight:400;">Сумма заказа</span>
                    <span class="order-detail-value" style="color:var(--text-primary); font-weight:500;">${formatPrice(order.total)}</span>
                </div>
            </div>
                            <div class="order-items-card" style="margin-top: -32px; padding-top: 40px;">
                ${itemsHtml}
            </div>
            <div id="orderReviewBlock">${orderReviewHtml}</div>
        `;
            showPage("order-detail", true);

    if (!reviewsListCache) {
        // данные ещё нигде не грузились — подгружаем и дорисовываем блок как только придёт ответ
        getReviewsData()
            .then(allReviews => {
                const review = allReviews.find(rv => String(rv.order_id) === String(order.id));
                const reviewBlock = document.getElementById('orderReviewBlock');
                if (!reviewBlock) return;
                reviewBlock.innerHTML = review ? buildOrderReviewBlockHtml(order, review) : '';
            })
            .catch(() => {});
    }
    const titleSpan = document.querySelector('#order-detail-page .page-header-title-btn span');
    if (titleSpan) titleSpan.textContent = `Заказ #${order.order_number}`;

    const fixedBlock = document.getElementById("cartCheckoutFixed");
    if (fixedBlock) {
        const tgUserForReview = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const isCompleted = order.status_code === 'done' || order.status_code === 'completed';

        if (!isOwner) {
            fixedBlock.style.display = "none";
        } else if (isAwaitingCode) {
            fixedBlock.style.display = "block";
            fixedBlock.innerHTML =
                `<div id="codeActionBlock" class="checkout-card"><div class="checkout-buttons-row"><button class="checkout-button" id="showCodeInputBtn">Указать код</button><button onclick="hapticLight();window.open('https://t.me/PlacedSupport','_blank')" class="promo-btn"><svg class="icon icon-order-code-help icon--accent"><use href="#icon-support"></use></svg></button></div></div>`;
                    } else if (!isCompleted) {
            fixedBlock.style.display = "none";
                    } else {
                            const isReviewed = (list) => list.some(rv =>
                String(rv.user_id) === String(tgUserForReview?.id) &&
                String(rv.order_id) === String(order.id)
            );
            const showReviewBtn = () => {
                if (currentOpenOrder !== order) return;
                if (!document.getElementById('order-detail-page')?.classList.contains('active-page')) return;
                fixedBlock.style.display = "block";
                fixedBlock.innerHTML =
                    `<div class="checkout-card"><div class="checkout-buttons-row"><button onclick="hapticMedium();writeReviewEntryPage='order';showPage('write-review')" class="checkout-button">Оставить отзыв</button><button onclick="hapticLight();window.open('https://t.me/PlacedSupport','_blank')" class="promo-btn"><svg class="icon icon-order-review-help icon--accent"><use href="#icon-support"></use></svg></button></div></div>`;
            };
            fixedBlock.style.display = "none";
            if (reviewsListCache) {
                if (!isReviewed(reviewsListCache)) showReviewBtn();
            } else {
                getReviewsData()
                    .then(list => { if (!isReviewed(list)) showReviewBtn(); })
                    .catch(() => showReviewBtn());
            }
        }

        setTimeout(() => {
            const showCodeInputBtn = document.getElementById("showCodeInputBtn");
            if (showCodeInputBtn) {
                showCodeInputBtn.addEventListener("click", () => {
                    hapticLight();
                    const fixedBlock = document.getElementById("cartCheckoutFixed");
                    if (fixedBlock) {
                        fixedBlock.innerHTML =
                       `<div id="codeActionBlock" class="checkout-card" style="width: 100%; box-sizing: border-box;"><div class="promo-input-row" style="display: flex; gap: 10px; width: 100%;"><input type="tel" id="verificationCodeInput" class="promo-input" placeholder="Введите код с почты" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" oninput="this.value=this.value.replace(/\D/g,'')" style="flex: 1; min-width: 0; box-sizing: border-box;"><button id="submitCodeBtn" class="promo-action-btn apply-btn" style="flex-shrink: 0;"><svg class="icon icon-order-code-submit icon--accent"><use href="#icon-success"></use></svg></button></div></div>`;
                        setTimeout(() => {
                            const inp = document.getElementById(
                                "verificationCodeInput");
                            if (inp) { inp.removeAttribute("readonly");
                                inp.focus(); }
                            document.getElementById("submitCodeBtn")?.addEventListener(
                                "click", async () => {
                                    const codeInput = document.getElementById(
                                        "verificationCodeInput");
                                    const code = codeInput?.value.trim();
                                    if (!code) { showAppAlert(
                                            "Пожалуйста введите код который был отправлен на указанную вами почту."); return; }
                                                                            hapticLight();
                                    const action = await new Promise(resolve => {
                                        window.Telegram.WebApp.showPopup({
                                            message: `Указанный вами код: ${code}\n\nПожалуйста, убедитесь, что код указан правильно, чтобы избежать возможной задержки в выполнении вашего заказа.`,
                                            buttons: [
                                                { id: 'send_code', type: 'default', text: 'Отправить' },
                                                { id: 'edit', type: 'default', text: 'Изменить' }
                                            ]
                                        }, (buttonId) => resolve(buttonId));
                                    });
                                    if (action === 'edit') {
                                        setTimeout(() => codeInput?.focus(), 100);
                                        return;
                                    }
                                    if (action !== 'send_code') return;
                                    hapticMedium();
                                    try {
                                        const response = await fetch(
                                            'https://placedgames.up.railway.app/api/submit-code', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ orderId: order
                                                        .id, code: code })
                                            });
                                        if (response.ok) {
                                            showAppAlert(
                                                "Код успешно отправлен!\n\nПосле изменения статуса заказа на «Выполняется», пожалуйста не заходите в аккаунт до успешного завершения заказа."
                                            );
                                            order.status_code = 'processing';
                                            order.status = 'Ожидает выполнения';
                                            order.verification_code = code;
                                            showOrderDetail(order, true);
                                            renderOrdersPage();
                                        } else showAppAlert(
                                            "Ошибка отправки кода");
                                    } catch (e) { showAppAlert(
                                            "Ошибка соединения"); }
                                });
                        }, 50);
                    }
                });
            }
        }, 100);
    }
}
    
    async function renderReviewsFixedAction() {
const oldFixed = document.getElementById("reviewsFixedAction");
if (oldFixed) oldFixed.remove();

const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
const userId = tgUser?.id;
let hasReviewableOrder = false;

if (userId) {
    try {
        const [ordersRes, reviewsRes] = await Promise.all([
            fetch(`https://placedgames.up.railway.app/api/user-orders?userId=${userId}`).then(r => r.json()),
            getReviewsData(true)
        ]);
        const completedOrders = ordersRes.filter(o => o.status_code === 'done' || o.status_code === 'completed');
        const reviewedOrderIds = reviewsRes
            .filter(r => String(r.user_id) === String(userId))
            .map(r => String(r.order_id));
        const unreviewedOrders = completedOrders.filter(o => !reviewedOrderIds.includes(String(o.id)));
        hasReviewableOrder = unreviewedOrders.length > 0;
    } catch (e) {}
}

if (hasReviewableOrder) {
    const fixedEl = document.createElement('div');
    fixedEl.id = 'reviewsFixedAction';
    fixedEl.className = 'reviews-fixed-action';
    fixedEl.innerHTML = `<div class="checkout-card">
            <div class="checkout-buttons-row">
                <button class="checkout-button" id="goWriteReviewBtn">Оставить отзыв</button>
                <button onclick="hapticLight();window.open('https://t.me/PlacedSupport','_blank')" class="promo-btn">
                    <svg class="icon icon-reviews-help icon--accent"><use href="#icon-support"></use></svg>
                </button>
            </div>
        </div>`;
    document.body.appendChild(fixedEl);
            document.getElementById('goWriteReviewBtn')?.addEventListener('click', () => {
        hapticLight();
        writeReviewEntryPage = 'reviews';
        showPage('write-review');
    });
}
}

                    async function renderReviewsPage() {
    const container = document.getElementById("reviewsContent");
    if (!container) return;

    const oldFixed = document.getElementById("reviewsFixedAction");
    if (oldFixed) oldFixed.remove();

    const initialReviews = await getReviewsData();
    window.__allReviews = initialReviews;

            container.innerHTML = `
            <div class="search-section" style="display:flex;gap:10px;margin-bottom:13px;align-items:center;">
                <div class="search-bar">
                    <img class="search-icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3C/svg%3E">
                    <input type="text" class="search-input" id="reviewSearchInput" placeholder="Найти отзыв по товарам">
                    <svg class="icon search-clear-btn icon--muted" id="reviewSearchClearBtn"><use href="#icon-refresh"></use></svg>
                </div>
                <div class="filter-btn" id="reviewFilterBtn" style="cursor:pointer;position:relative;overflow:hidden;">
                    <svg class="icon icon-filter-game icon--primary"><use href="#icon-filter"></use></svg>
                    <select id="reviewGameSelect" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:16px;"></select>
                </div>
            </div>
                            <div id="reviewsList" style="margin-top:13px;"></div>
        `;

            await renderReviewsFixedAction();
    setupReviewsListUI(initialReviews);
}

    function renderWriteReviewPage() {
    const container = document.getElementById("writeReviewContent");
    if (!container) return;
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const userId = tgUser?.id;
    const nickname = tgUser?.first_name || "Пользователь";
    const photoUrl = tgUser?.photo_url || "";

    const earlyFixedBlock = document.getElementById("cartCheckoutFixed");
    if (earlyFixedBlock && userId) {
        earlyFixedBlock.style.display = "block";
        earlyFixedBlock.innerHTML = `
            <div class="checkout-card">
                <div class="checkout-buttons-row">
                    <button class="checkout-button" id="reviewSubmitBtnFixed" disabled style="opacity:0.6;">Отправить отзыв</button>
                    <button class="promo-btn" onclick="hapticLight();window.open('https://t.me/PlacedSupport','_blank')">
                        <svg class="icon icon-writereview-help icon--accent"><use href="#icon-support"></use></svg>
                    </button>
                </div>
            </div>
        `;
    }

    let completedOrders = [];
    let reviewedOrderIds = [];

            function buildItemsHtml(itemsArr) {
return buildCollapsedItemsHtml(itemsArr, 'review-item-row', 'review-item-name', 'review-item-price');
}

    if (!userId) {
        container.innerHTML =
            `<div class="review-empty">Пожалуйста, авторизуйтесь через Telegram</div>`;
        const fixedBlock = document.getElementById("cartCheckoutFixed");
        if (fixedBlock) fixedBlock.style.display = "none";
        return;
    }

            try {
                    return Promise.all([
            fetch(`https://placedgames.up.railway.app/api/user-orders?userId=${userId}`).then(r => r.json()),
            getReviewsData()
        ]).then(([ordersRes, reviewsRes]) => {
            const allCompleted = ordersRes.filter(o =>
                o.status_code === 'done' || o.status_code === 'completed'
            );

            const reviewedOrderIds = reviewsRes
                .filter(r => String(r.user_id) === String(userId))
                .map(r => String(r.order_id));

            completedOrders = allCompleted.filter(o =>
                !reviewedOrderIds.includes(String(o.id))
            );

            const orderItemsMap = {};
            completedOrders.forEach(o => {
                let arr = [];
                try { arr = JSON.parse(o.items || '[]'); } catch (e) {}
                orderItemsMap[o.id] = arr;
            });

            if (!completedOrders.length) {
                container.innerHTML = `
                            <div class="review-empty">
                                <div style="font-size:48px;margin-bottom:16px;">📝</div>
                                <div style="font-size:18px;font-weight:500;color:white;margin-bottom:8px;">Нет заказов для отзыва</div>
                                <div style="color:var(--text-secondary);font-size:15px;">Вы уже оставили отзывы на все выполненные заказы</div>
                            </div>
                        `;
                const fixedBlock = document.getElementById("cartCheckoutFixed");
                if (fixedBlock) fixedBlock.style.display = "none";
                return;
            }

            const orderOptions = completedOrders.map(o => {
                const dateObj = o.date ? new Date(o.date) : null;
                let dateStr = '';
                if (dateObj && !isNaN(dateObj)) {
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const y = String(dateObj.getFullYear()).slice(2);
                    dateStr = ` (${d}.${m}.${y})`;
                }
                return `<option value="${o.id}" data-num="${o.order_number}">Заказ #${o.order_number}${dateStr}</option>`;
            }).join('');

            container.innerHTML = `
                        <div class="order-data-card" style="margin-bottom:0;position:relative;z-index:2;">
                          <div class="form-section">
<div class="form-label">Выберите заказ</div>
<select class="form-select-native" id="reviewOrderSelect">
    ${orderOptions}
</select>
</div>
<div class="form-section">
<div class="form-label">Довольны ли вы заказом?</div>
<select class="form-select-native" id="satisfactionSelect">
    <option value="good">Да</option>
    <option value="bad">Нет</option>
</select>
</div>
                            <div class="form-section" style="margin-bottom:0;">
                                <div class="form-label" style="font-size:20px;">
                                    Текст отзыва 
                                    <span id="reviewCharCount" style="color:var(--text-secondary);font-weight:400;font-size:14px;">0/70</span>
                                </div>
                                <textarea class="review-textarea" id="reviewTextarea" 
                                    placeholder="Напишите ваш отзыв..." maxlength="70" rows="3" 
                                    style="font-size:17px;"></textarea>
                            </div>
                        </div>
                        
                        <div style="position:relative;margin-top:-32px;z-index:1;background:var(--col-bg);border:1px solid var(--border-color);border-radius:0 0 28px 28px;padding:12px 18px;padding-top:40px;" id="previewItemsCard">
                            ${buildItemsHtml(orderItemsMap[completedOrders[0]?.id])}
                        </div>
                    `;

            const fixedBlock = document.getElementById("cartCheckoutFixed");
            fixedBlock.style.display = "block";
            fixedBlock.innerHTML =
                `
                        <div class="checkout-card">
                            <div class="checkout-buttons-row">
                                <button class="checkout-button" id="reviewSubmitBtnFixed">Отправить отзыв</button>
                                <button class="promo-btn" onclick="hapticLight();window.open('https://t.me/PlacedSupport','_blank')">
                                    <svg class="icon icon-writereview-help icon--accent"><use href="#icon-support"></use></svg>
                                </button>
                            </div>
                        </div>
                    `;

            setTimeout(() => {
                                                        const textarea = document.getElementById('reviewTextarea');
                const counter = document.getElementById('reviewCharCount');
                const previewItemsCard = document.getElementById('previewItemsCard');
                const orderSelect = document.getElementById('reviewOrderSelect');
                const submitBtn = document.getElementById('reviewSubmitBtnFixed');
                const satisfactionSelect = document.getElementById('satisfactionSelect');
                textarea?.addEventListener('input', function() {
                    let val = this.value.replace(/[\r\n]/g, '');
                    if (val !== this.value) this.value = val;
                    if (counter) counter.textContent = `${val.length}/70`;
                });

                textarea?.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') e.preventDefault();
                });

                orderSelect?.addEventListener('change', function() {
                    const orderId = this.value;
                    if (previewItemsCard) {
                        previewItemsCard.innerHTML = buildItemsHtml(
                            orderItemsMap[orderId]);
                    }
                });

                                    submitBtn?.addEventListener('click', async function() {
                    hapticLight();
                    const text = textarea?.value.trim();
                    const orderId = orderSelect?.value;
                    const selectedOption = orderSelect?.options[orderSelect
                        .selectedIndex];
                                                                    const orderNumber = selectedOption?.dataset.num || '';
                    const rating = satisfactionSelect.value;
                          if (!text) {
                        showAppAlert('Пожалуйста, напишите текст отзыва');
                        textarea?.focus();
                        return;
                    }

                    if (text.length < 3) {
                        showAppAlert('Отзыв должен содержать минимум 3 символа');
                        textarea?.focus();
                        return;
                    }

                    if (!orderId) {
                        showAppAlert('Пожалуйста, выберите заказ');
                        return;
                    }

                                            const ratingText = rating === 'good' ? 'Нравится' : 'Не нравится';
                    const confirmed = await new Promise(resolve => {
                        window.Telegram.WebApp.showPopup({
                        message: `Подтверждение отзыва:\n\nНомер заказа: #${orderNumber}\nОценка: ${ratingText}\nТекст вашего отзыва:\n${text}`,
                            buttons: [
                                { id: 'publish', type: 'default', text: 'Опубликовать отзыв' }
                            ]
                        }, (buttonId) => resolve(buttonId === 'publish'));
                    });
                    if (!confirmed) return;

                    hapticMedium();
                    this.disabled = true;
                    this.textContent = 'Отправка...';

                    try {
                        const response = await fetch(
                            'https://placedgames.up.railway.app/api/reviews', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
body: JSON.stringify({
userId: String(userId),
userName: nickname,
userUsername: tgUser?.username || null,
photoUrl: photoUrl || null,
text: text,
rating: rating,
orderId: parseInt(orderId),
orderNumber: orderNumber
})
                            });

                        const result = await response.json();

                                                     if (response.ok && result.success) {
                            reviewsListCache = null;
                            reviewsFetchPromise = null;
                            showPage('reviews');
                        } else {
                            showAppAlert('❌ ' + (result.error ||
                                'Ошибка при отправке отзыва'));
                        }
                    } catch (error) {
                        showAppAlert(
                            '❌ Ошибка соединения с сервером. Проверьте интернет и попробуйте снова.'
                        );
                    } finally {
                        this.disabled = false;
                        this.textContent = 'Отправить отзыв';
                    }
                });

            }, 100);
        });
    } catch (error) {
        container.innerHTML =
            `<div class="review-empty">Ошибка загрузки данных. Попробуйте позже.</div>`;
        const fixedBlock = document.getElementById("cartCheckoutFixed");
        if (fixedBlock) fixedBlock.style.display = "none";
    }
}

let gameSearchQuery = "";
let gameCategoryFilter = "Все категории";

function renderGamePage() {
    const grid = document.getElementById("gameProductsGrid");
    if (!grid || !currentGame) return;

    const titleSpan = document.querySelector('#game-page .page-header-title-btn span');
    if (titleSpan) titleSpan.textContent = currentGame.name;

    let prods = currentGame.getProducts();

    if (gameCategoryFilter !== "Все категории") {
        prods = prods.filter(p => p.category === gameCategoryFilter);
    }
    if (gameSearchQuery.trim()) {
        prods = prods.filter(p => p.name.toLowerCase().includes(gameSearchQuery.toLowerCase()));
    }

    if (!prods.length) {
        grid.style.display = "flex";
        const isRealFailure = !hasAnyProductsLoaded() && gameCategoryFilter === "Все категории" && !gameSearchQuery.trim();

        if (isRealFailure) {
            grid.innerHTML = `
                        <div class="empty-state-icon" style="width:100%;">
                            <svg class="icon icon-empty-game-reload icon--muted"><use href="#icon-catalog"></use></svg>
                            <div class="empty-title">Не удалось загрузить товары</div>
                            <button class="empty-catalog-btn" id="reloadProductsBtn">Обновить</button>
                        </div>`;
            setTimeout(() => {
                const btn = document.getElementById('reloadProductsBtn');
                if (!btn) return;
                btn.addEventListener('click', () => {
                    hapticLight();
                    btn.textContent = 'Обновление...';
                    btn.style.pointerEvents = 'none';
                    reloadProductsScript((success) => {
                        if (success && hasAnyProductsLoaded()) {
                            renderGamePage();
                        } else {
                            btn.textContent = 'Не удалось, ещё раз';
                            btn.style.pointerEvents = '';
                            reportClientError('Reload products.js failed', 'reload-button', null);
                        }
                    });
                });
            }, 0);
        } else {
            grid.innerHTML = `<div class="empty-state-icon" style="width:100%;"><svg class="icon icon-empty-game-notfound icon--muted"><use href="#icon-catalog"></use></svg><div class="empty-title">Товары не найдены</div></div>`;
        }
        return;
    }

    grid.style.display = "";
    grid.innerHTML = prods.map(p => {
        const imgs = p.images && p.images.length ? p.images : [p.image];
        const carouselHtml = `<div class="card-img-carousel" data-index="0">
                     <div class="card-img-track">
                         ${imgs.map(img => `<img class="card-img" src="${img}" alt="${escapeHtml(p.name)}">`).join('')}
                     </div>
                     ${imgs.length > 1 ? `<div class="card-img-dots">${imgs.map((_, i) => `<span class="card-img-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
                 </div>`;
                                            return `
                    <div class="product-card" data-id="${p.id}">
                        ${carouselHtml}
                        <div class="card-info">
                                                            <div class="product-title-row" data-info-product="${p.id}">
                                <span class="product-title">${escapeHtml(cleanText(p.name))}</span>
                                <svg class="icon product-info-icon"><use href="#icon-info"></use></svg>
                            </div>
                            <div class="price-row">
                                <span class="current-price">${formatPrice(p.price)}</span>
                                <span class="old-price">${formatPrice(p.oldPrice)}</span>
                            </div>
                            ${renderCartButtonHtml(p.id)}
                        </div>
                    </div>
                `;
            }).join("");

    requestAnimationFrame(() => fitProductTitles(grid));

    attachGameCardEvents();

            const gameSearchEl = document.getElementById("gameSearchInput");
    if (gameSearchEl) {
        gameSearchEl.value = gameSearchQuery;
        gameSearchEl.oninput = (e) => {
            gameSearchQuery = e.target.value;
            renderGamePage();
        };
    }

    setupSearchClear('gameSearchInput', 'gameSearchClearBtn');

    const filterBtn = document.getElementById("gameFilterBtn");
    const catSelect = document.getElementById("gameCategorySelect");
    if (filterBtn && catSelect) {
        const allProds = currentGame.getProducts();
        const cats = ["Все категории", ...new Set(allProds.map(p => p.category))];
        catSelect.innerHTML = cats.map(cat =>
            `<option value="${escapeHtml(cat)}" ${gameCategoryFilter === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`
        ).join("");

        catSelect.onchange = function() {
            hapticLight();
            gameCategoryFilter = this.value;
            renderGamePage();
        };
    }
}

    function setupSearchClear(inputId, clearBtnId, onClear) {
const input = document.getElementById(inputId);
const clearBtn = document.getElementById(clearBtnId);
if (!input || !clearBtn) return;
function toggle() {
    clearBtn.classList.toggle('visible', input.value.length > 0);
}
toggle();
if (clearBtn.dataset.clearBound === 'true') return;
clearBtn.dataset.clearBound = 'true';
input.addEventListener('input', toggle);
clearBtn.addEventListener('click', () => {
    hapticLight();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    toggle();
    if (onClear) onClear();
});
}

function setSlideWidths(carousel) {
    const track = carousel.querySelector('.card-img-track');
    const imgs = track.querySelectorAll('.card-img');
    const w = Math.round(carousel.clientWidth) - 14;
    imgs.forEach(img => {
        img.style.width = w + 'px';
        img.style.flexBasis = w + 'px';
    });
}

function refreshAllCarousels() {
    document.querySelectorAll('#game-page .card-img-carousel').forEach(carousel => {
        const track = carousel.querySelector('.card-img-track');
        const dots = carousel.querySelectorAll('.card-img-dot');
        if (!track) return;

        setSlideWidths(carousel);

        let activeIndex = 0;
        dots.forEach((d, i) => { if (d.classList.contains('active')) activeIndex = i; });

        const targetSlide = track.children[activeIndex];
        if (targetSlide) {
            track.style.transform = `translateX(-${targetSlide.offsetLeft}px)`;
        }
    });
}

    let resizeDebounceTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
        refreshAllCarousels();
        fitProductTitles(document);
    }, 150);
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        refreshAllCarousels();
        fitProductTitles(document);
    }, 300);
});

    function getCurrentActiveMenuPage() {
    const activeBtn = document.querySelector('.menu-item.active');
    if (activeBtn) return activeBtn.dataset.page;
    if (document.getElementById('profileMenuWrapper')?.classList.contains('active')) return 'profile';
    return null;
}

    function refreshMenuSliderOnResize() {
    const wrapper = document.getElementById("bottomMenuWrapper");
    if (!wrapper || wrapper.offsetParent === null) return; // меню скрыто клавиатурой — не пересчитываем
    const pageId = getCurrentActiveMenuPage();
    if (pageId) updateMenuSlider(pageId);
}

let menuResizeDebounceTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(menuResizeDebounceTimer);
    menuResizeDebounceTimer = setTimeout(refreshMenuSliderOnResize, 150);
});

window.addEventListener('orientationchange', () => {
    setTimeout(refreshMenuSliderOnResize, 300);
});

    document.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setTimeout(refreshMenuSliderOnResize, 150); // пересчитать позицию после закрытия клавиатуры
    }
});

    if (typeof ResizeObserver !== 'undefined') {
    let bodyRoDebounce = null;
    const bodyRo = new ResizeObserver(() => {
        clearTimeout(bodyRoDebounce);
        bodyRoDebounce = setTimeout(() => {
            refreshAllCarousels();
            refreshMenuSliderOnResize();
            fitProductTitles(document);
        }, 120);
    });
    bodyRo.observe(document.body);
}

function attachGameCardEvents() {
    document.querySelectorAll('#game-page .card-img-carousel').forEach(carousel => {
        const track = carousel.querySelector('.card-img-track');
        const dots = carousel.querySelectorAll('.card-img-dot');
        const count = dots.length;
        if (count < 2) return;

        setSlideWidths(carousel);

        let index = 0;
        let startX = 0;

        function goTo(i) {
            index = Math.max(0, Math.min(i, count - 1));
            const targetSlide = track.children[index];
            const offset = targetSlide.offsetLeft;
            track.style.transform = `translateX(-${offset}px)`;
            dots.forEach((d, di) => d.classList.toggle('active', di === index));
        }

        carousel.addEventListener('pointerdown', (e) => {
            startX = e.clientX;
        });
        carousel.addEventListener('pointerup', (e) => {
            const deltaX = e.clientX - startX;
            if (Math.abs(deltaX) > 30) {
                goTo(deltaX < 0 ? index + 1 : index - 1);
            } else if (Math.abs(deltaX) < 8) {
                const rect = carousel.getBoundingClientRect();
                const tapX = e.clientX - rect.left;
                goTo(tapX > rect.width / 2 ? index + 1 : index - 1);
            }
        });
    });

    document.querySelectorAll('#game-page .product-card').forEach(card => {
        const cardId = card.dataset.id;
        const actionBtn = card.querySelector('.card-action-btn');
        if (!actionBtn) return;
        if (actionBtn.classList.contains('cart-add-btn')) {
            actionBtn.replaceWith(actionBtn.cloneNode(true));
            const newBtn = card.querySelector('.cart-add-btn');
            newBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticLight();
                handleCartAction(cardId, true);
                const btn2 = card.querySelector('.card-action-btn, .card-info > div:last-child');
                if (btn2) btn2.outerHTML = renderCartButtonHtml(cardId);
                attachGameCardEvents();
            });
        } else if (actionBtn.classList.contains('counter-btn')) {
            const minus = actionBtn.querySelector('.counter-minus');
            const plus = actionBtn.querySelector('.counter-plus');
            minus?.replaceWith(minus.cloneNode(true));
            plus?.replaceWith(plus.cloneNode(true));
            card.querySelector('.counter-minus')?.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticLight();
                handleCartAction(cardId, false);
                const lastChild = card.querySelector('.card-info > div:last-child');
                if (lastChild) lastChild.outerHTML = renderCartButtonHtml(cardId);
                attachGameCardEvents();
            });
                            card.querySelector('.counter-plus')?.addEventListener('click', (e) => {
                e.stopPropagation();
                hapticLight();
                handleCartAction(cardId, true);
                const lastChild = card.querySelector('.card-info > div:last-child');
                if (lastChild) lastChild.outerHTML = renderCartButtonHtml(cardId);
                attachGameCardEvents();
            });
        }
    });

    document.querySelectorAll('#game-page [data-info-product]').forEach(btn => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            hapticLight();
            showProductInfoPopup(btn.dataset.infoProduct);
        });
    });
}

function buildReviewCardHtml(rv) {
    const avatar = rv.photo_url ?
        `<img style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" src="${escapeHtml(rv.photo_url)}" alt="avatar">` :
        `<div class="review-avatar">👤</div>`;
    const dt = rv.created_at ? new Date(rv.created_at) : null;
    const dateStr = dt ?
        `${dt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} ${dt.toLocaleDateString('ru-RU',{year:'2-digit',month:'2-digit',day:'2-digit'})}` :
        '';
    const rvRating = rv.rating || (rv.satisfied ? 'good' : 'bad');
    const rc = getSatisfactionColors(rvRating);
    const orderBadge = rv.order_number ?
        `<div class="review-badge-stack">
            <span class="review-order-badge-wrap">
                <span class="review-order-badge-backdrop"></span>
                <span class="review-order-badge">#${rv.order_number}</span>
            </span>
            <span class="review-rating-badge" style="background:${rc.bg};color:${rc.color};border-color:${rc.border};">
        <svg width="21" height="21" viewBox="0 0 512 512"><use href="#${rc.icon}"></use></svg>
    </span>
        </div>` :
        '';
            let items = [];
    try { items = JSON.parse(rv.order_items || '[]'); } catch (e) {}
    const itemsHtml = buildCollapsedItemsHtml(items, 'review-item-row', 'review-item-name', 'review-item-price');
    return `<div class="review-card-wrapper"><div class="review-card"><div class="review-header">${avatar}<div class="review-header-info"><div class="review-author-name">${escapeHtml(rv.user_name || 'Пользователь')}</div><div class="review-date">${dateStr}</div></div>${orderBadge}</div><div class="review-text">${escapeHtml(rv.text)}</div></div>${itemsHtml ? `<div class="review-items-card">${itemsHtml}</div>` : ''}</div>`;
}

function attachReviewOrderBadgeHandlers(scopeEl) {
    scopeEl.querySelectorAll('.review-order-badge:not([data-bound])').forEach(badge => {
        badge.setAttribute('data-bound', 'true');
        badge.addEventListener('click', async () => {
            hapticLight();
            savedReviewsScrollY = window.scrollY;
            const orderNum = badge.textContent.replace('#', '').trim();

            let found = orders.find(o => String(o.order_number) === orderNum);

            // сразу точечный запрос по номеру, без загрузки всего списка заказов — так быстрее
            if (!found) {
                try {
                    const r = await fetch('https://placedgames.up.railway.app/api/refresh-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderNumber: orderNum })
                    });
                    found = await r.json();
                } catch (e) {}
            }

            if (found && found.id) {
                const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
                const isOwner = String(found.user_id) === String(tgUserId);
                navigationHistory.push('reviews');
                showOrderDetail(found, isOwner);
            }
        });
    });
}

function renderReviewsList(list) {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    if (!list.length) {
        container.innerHTML = `<div class="review-empty">Пока нет отзывов</div>`;
        return;
    }

    const FIRST_CHUNK = 5;
    const firstChunk = list.slice(0, FIRST_CHUNK);
    const rest = list.slice(FIRST_CHUNK);

    container.innerHTML = firstChunk.map(buildReviewCardHtml).join('');
    attachReviewOrderBadgeHandlers(container);

    if (rest.length) {
        setTimeout(() => {
            const c = document.getElementById('reviewsList');
            if (!c) return;
            c.insertAdjacentHTML('beforeend', rest.map(buildReviewCardHtml).join(''));
            attachReviewOrderBadgeHandlers(c);
        }, 0);
    }
}

function applyReviewFilters(list) {
window.__allReviews = list;
const searchVal = document.getElementById('reviewSearchInput')?.value.toLowerCase() || '';
const gameVal = document.getElementById('reviewGameSelect')?.value || 'Все отзывы';

let filtered = list;

if (gameVal === 'Ваши отзывы') {
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    filtered = filtered.filter(rv => String(rv.user_id) === String(tgUserId));
} else if (gameVal === 'Нравится') {
    filtered = filtered.filter(rv => (rv.rating || (rv.satisfied ? 'good' : 'bad')) === 'good');
} else if (gameVal === 'Не нравится') {
    filtered = filtered.filter(rv => (rv.rating || (rv.satisfied ? 'good' : 'bad')) === 'bad');
} else if (gameVal !== 'Все отзывы') {
    filtered = filtered.filter(rv => {
        if (rv.order_game_name) {
            return rv.order_game_name === gameVal;
        }
        let items = [];
        try { items = JSON.parse(rv.order_items || '[]'); } catch (e) {}
        const game = games.find(g => g.name === gameVal);
        if (!game) return false;
        return items.some(i => game.getProducts().some(p => p.name === i.name));
    });
}

if (searchVal.trim()) {
    filtered = filtered.filter(rv => {
        let items = [];
        try { items = JSON.parse(rv.order_items || '[]'); } catch (e) {}
        return items.some(i => i.name.toLowerCase().includes(searchVal));
    });
}

renderReviewsList(filtered);
}

function countReviewsByGame(list) {
const counts = {};
games.forEach(g => { counts[g.name] = 0; });
list.forEach(rv => {
    let matchedGame = null;
    if (rv.order_game_name) {
        matchedGame = games.find(g => g.name === rv.order_game_name);
    } else {
        let items = [];
        try { items = JSON.parse(rv.order_items || '[]'); } catch (e) {}
        matchedGame = games.find(g => items.some(i => g.getProducts().some(p => p.name === i.name)));
    }
    if (matchedGame) counts[matchedGame.name] = (counts[matchedGame.name] || 0) + 1;
});
return counts;
}

function countReviewsByRating(list) {
let good = 0, bad = 0;
list.forEach(rv => {
    const rating = rv.rating || (rv.satisfied ? 'good' : 'bad');
    if (rating === 'good') good++; else bad++;
});
return { good, bad };
}

                async function getReviewsData(forceRefresh = false) {
    if (reviewsListCache && !forceRefresh) return reviewsListCache;
    if (reviewsFetchPromise && !forceRefresh) return reviewsFetchPromise;
    reviewsFetchPromise = fetch('https://placedgames.up.railway.app/api/reviews')
        .then(r => r.json())
        .then(list => {
            reviewsListCache = list;
            reviewsFetchPromise = null;
            return list;
        })
        .catch(e => {
            reviewsFetchPromise = null;
            throw e;
        });
    return reviewsFetchPromise;
}

            function setupReviewsListUI(list) {
const gameSelect = document.getElementById('reviewGameSelect');
if (gameSelect) {
    const counts = countReviewsByGame(list);
    const ratingCounts = countReviewsByRating(list);
    const totalCount = list.length;
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const mineCount = list.filter(rv => String(rv.user_id) === String(tgUserId)).length;

    const options = [
        { value: 'Все отзывы', count: totalCount },
        { value: 'Нравится', count: ratingCounts.good },
        { value: 'Не нравится', count: ratingCounts.bad },
        { value: 'Ваши отзывы', count: mineCount },
        ...games.map(g => ({ value: g.name, count: counts[g.name] || 0 }))
    ];

    gameSelect.innerHTML = options.map(o =>
        `<option value="${escapeHtml(o.value)}">${escapeHtml(o.value)} (${o.count})</option>`
    ).join('');

    gameSelect.onchange = () => {
        hapticLight();
        applyReviewFilters(list);
    };
}
const searchInput = document.getElementById('reviewSearchInput');
if (searchInput) {
    searchInput.oninput = () => applyReviewFilters(list);
}
setupSearchClear('reviewSearchInput', 'reviewSearchClearBtn');

applyReviewFilters(list);
if (!list.length) {
    const container = document.getElementById('reviewsList');
    if (container) container.innerHTML = `<div class="review-empty">Пока нет отзывов</div>`;
}
}

async function loadReviewsList(forceRefresh = false) {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    try {
        const list = await getReviewsData(forceRefresh);
        setupReviewsListUI(list);
    } catch (e) {
        container.innerHTML = `<div class="review-empty">Ошибка загрузки отзывов</div>`;
    }
}

    async function renderProfilePage() {
    const container = document.getElementById("profileContent");
    if (!container) return;
    let tgUser = null;
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) { tgUser = window.Telegram.WebApp.initDataUnsafe.user; }
    const nickname = tgUser?.first_name || "Пользователь";
    const username = tgUser?.username ? "@" + tgUser.username : "@username";
    const photoUrl = tgUser?.photo_url || "";

            let referralStats = { invited: 0, invited24h: 0, earned: 0, earned24h: 0 };
    const walletPromise = fetchUserWalletBalance();
    const referralPromise = tgUser?.id
        ? fetch(`https://placedgames.up.railway.app/api/referral-stats?userId=${tgUser.id}`)
              .then(r => r.json())
              .catch(() => referralStats)
        : Promise.resolve(referralStats);

    const [, referralResult] = await Promise.all([walletPromise, referralPromise]);
    referralStats = referralResult;

   const referralLink = tgUser?.id ? `t.me/PlacedGamesBot?startapp=ref${tgUser.id}` :
        't.me/PlacedGamesBot';

    container.innerHTML = `
            <div class="profile-wrapper">
                <div class="profile-main-card">
                    ${photoUrl ? `<img class="profile-avatar" src="${getCachedAvatarDataUrl(tgUser?.id) || photoUrl}" alt="avatar">` : '<div class="profile-avatar" style="background:var(--input-bg-dark);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--text-secondary);">👤</div>'}
                    <div class="profile-info" style="display: flex; align-items: flex-end; justify-content: space-between;">
                        <div>
                            <div class="profile-nickname">${escapeHtml(nickname)}</div>
                            <div style="margin-top:4px;">
                                <div class="profile-username">${escapeHtml(username)}</div>
                            </div>
                        </div>
                                                    <div id="profileInfoBtn" title="Информация" style="cursor:pointer;flex-shrink:0;align-self:flex-end;display:flex;align-items:center;justify-content:center;margin-bottom:3px;margin-right:4px;opacity:0.95;">
                            <svg class="icon icon-info-profile icon--accent"><use href="#icon-info"></use></svg>
                        </div>
                    </div>
                </div>
                <div class="profile-bottom-card">
                    <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;">
                        <div style="padding-left:2px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                            <span id="profileWalletBalanceValue" style="font-size:20px;font-weight:550;color:var(--text-primary);">${formatPrice(userWalletBalance)}</span>
                                <span id="cashbackInfoBtn" style="font-size:15px;font-weight:550;color:#4cb4e9;background:var(--accent-blue-bg);border-radius:20px;padding:2px 8px;cursor:pointer;">2%</span>
                            </div>
                            <div style="font-size:15px;color:var(--text-secondary);margin-top:4px;">Баланс кошелька</div>
                        </div>
                        <div style="display:flex;gap:10px;flex-shrink:0;">
                            <button id="walletDepositBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                            <button id="walletGoBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
                            <div class="quick-links-row">
                <div class="quick-link-card" id="sectionSubscribeBtn">
                    <div class="quick-link-text">
                        <div class="quick-link-title">Подпишитесь на новости</div>
                        <div class="quick-link-subtitle">Подпишитесь на новостной канал</div>
                    </div>
                    <div class="quick-link-arrow-btn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                </div>
                <div class="quick-link-card" id="sectionReviewsBtn">
                    <div class="quick-link-text">
                        <div class="quick-link-title">Отзывы по всем заказам</div>
                        <div class="quick-link-subtitle">Смотрите или оставляйте отзывы</div>
                    </div>
                    <div class="quick-link-arrow-btn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                </div>
                <div class="quick-link-card" id="sectionHelpBtn">
                    <div class="quick-link-text">
                        <div class="quick-link-title">Справочная информация</div>
                        <div class="quick-link-subtitle">Ответы на ваши вопросы и другое</div>
                    </div>
                    <div class="quick-link-arrow-btn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                </div>
            </div>
            <div class="referral-wrapper" id="referralCardGoBtn" style="margin-top:13px;cursor:pointer;">
                <div class="referral-main-card">
                    <div class="referral-title">Реферальная программа</div>
                    <div class="referral-link-row">
                        <span class="referral-link-text">${referralLink}</span>
                        <svg class="icon icon-profile-referral-copy referral-copy-icon icon--muted" id="referralCopyBtn"><use href="#icon-copy"></use></svg>
                    </div>
                </div>
                <div class="referral-bottom-card">
                    <div class="referral-stats-inner">
                        <div class="referral-stat-item left">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span class="referral-stat-value" id="referralInvitedValue">${referralStats.invited}</span>
                                <span class="referral-badge" id="referralInvited24h" style="cursor:pointer;">+${referralStats.invited24h}</span>
                            </div>
                            <div class="referral-stat-label">Приглашено</div>
                        </div>
                                                    <div class="referral-stat-divider"></div>
                        <div class="referral-stat-item right">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span class="referral-stat-value" id="referralEarnedValue">${formatPrice(referralStats.earned)}</span>
                                <span class="referral-badge" id="referralEarned24h" style="cursor:pointer;">2%</span>
                               </div>
                            <div class="referral-stat-label">Заработано</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="referral-wrapper" style="margin-top:13px;">
<div class="referral-main-card">
    <div class="referral-title">Связаться с поддержкой</div>
    <div style="font-size:17px;color:var(--text-secondary);font-weight:500;">Связаться с командой поддержки</div>
</div>
<div class="referral-bottom-card">
    <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;">
            <div style="padding-left:2px;min-width:0;">
                <div style="font-size:19px;font-weight:550;color:var(--text-primary);">Email</div>
                <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">placedsupport@gmail.com</div>
            </div>
            <button id="supportEmailBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
        </div>
        <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;">
            <div style="padding-left:2px;min-width:0;">
                <div style="font-size:19px;font-weight:550;color:var(--text-primary);">Telegram</div>
                <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">https://t.me/placedsupport</div>
            </div>
            <button id="supportTgBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
        </div>
    </div>
</div>
</div>
        `;

    setTimeout(() => {
        document.getElementById('referralInvited24h')?.addEventListener('click', (e) => {
            e.stopPropagation();
            hapticLight();
            const val = document.getElementById('referralInvited24h')?.textContent.replace('+',
                '') || '0';
            showAppAlert(
                `+${val} – это количество пользователей, которых вы пригласили за последние 24 часа`
            );
        });
        document.getElementById('referralEarned24h')?.addEventListener('click', (e) => {
            e.stopPropagation();
            hapticLight();
            showAppAlert('Получайте 2% с покупок рефералов, заработанные средства начисляются на баланс кошелька');
        });
        document.getElementById("walletDepositBtn")?.addEventListener("click", () => {
            hapticLight();
            showAppAlert("В данный момент пополнить кошелёк нельзя, попробуйте позже");
        });
        document.getElementById("walletGoBtn")?.addEventListener("click", () => {
            hapticLight();
            showPage("wallet");
        });
        document.getElementById("cashbackInfoBtn")?.addEventListener("click", () => {
            hapticLight();
            showAppAlert(
                "Ваш процент кэшбэка - 2%\n\nПолучайте кэшбэк за каждую вашу покупку и за каждую покупку приглашенного друга, используйте заработанные средства для оплаты заказов"
            );
        });
                    document.getElementById("referralCopyBtn")?.addEventListener("click", async (e) => {
            hapticLight();
            e.stopPropagation();
            if (navigator.clipboard) {
                const el = e.currentTarget;
                el.style.transform = "scale(0.85)";
                await navigator.clipboard.writeText(`https://${referralLink}`);
                setTimeout(() => {
                    el.style.transform = "scale(1)";
                }, 150);
                showReferralCopiedAlert(referralLink);
            }
        });
        document.getElementById("referralCardGoBtn")?.addEventListener("click", () => {
hapticLight();
showPage("referrals");
});
                    document.getElementById("sectionReviewsBtn")?.addEventListener("click", () => {
            hapticLight();
            showPage("reviews");
        });
        document.getElementById("sectionHelpBtn")?.addEventListener("click", () => {
            hapticLight();
            showPage("help");
        });
        document.getElementById("supportEmailBtn")?.addEventListener("click", () => {
hapticLight();
const msg = `Связаться с поддержкой:\n\nСпособ связи: Email\nГрафик работы: 9:00 - 0:00\nВремя ответа: до 24 часов`;
if (window.Telegram?.WebApp?.showPopup) {
    window.Telegram.WebApp.showPopup({
        message: msg,
        buttons: [
            { id: 'go', type: 'default', text: 'Перейти' },
            { id: 'close', type: 'close' }
        ]
    }, (buttonId) => {
        if (buttonId === 'go') {
            hapticLight();
            window.open('mailto:placedsupport@gmail.com', '_blank');
        }
    });
} else {
    window.open('mailto:placedsupport@gmail.com', '_blank');
}
});
document.getElementById("supportTgBtn")?.addEventListener("click", () => {
hapticLight();
const msg = `Связаться с поддержкой:\n\nСпособ связи: Telegram\nГрафик работы: 9:00 - 0:00\nВремя ответа: до 30 минут`;
if (window.Telegram?.WebApp?.showPopup) {
    window.Telegram.WebApp.showPopup({
        message: msg,
        buttons: [
            { id: 'go', type: 'default', text: 'Перейти' },
            { id: 'close', type: 'close' }
        ]
    }, (buttonId) => {
        if (buttonId === 'go') {
            hapticLight();
            window.open('https://t.me/PlacedSupport', '_blank');
        }
    });
} else {
    window.open('https://t.me/PlacedSupport', '_blank');
}
});
        document.getElementById("sectionSubscribeBtn")?.addEventListener("click", () => {
            hapticLight();
            window.open("https://t.me/placedgames", "_blank");
        });
                    document.getElementById("profileInfoBtn")?.addEventListener("click", async () => {
            hapticLight();
            await showProfileInfoAlert();
        });
            }, 0);
}

async function renderWalletPage() {
const container = document.getElementById("walletContent");
if (!container) return;
container.innerHTML = '';
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

await fetchUserWalletBalance();

            let transactions = [];
    if (tgUser?.id) {
        try {
            const r = await fetch(`https://placedgames.up.railway.app/api/wallet-transactions?userId=${tgUser.id}&limit=5`);
            transactions = await r.json();
        } catch (e) {}
    }

    const txLabels = {
        cashback_own: 'Кэшбэк',
        cashback_referral: 'Реферал',
        purchase: 'Покупка',
        admin_topup: 'Админ'
    };

    function buildWalletTxRowHtml(tx) {
        const isPositive = tx.amount >= 0;
        let title;
        if (tx.type === 'purchase' || tx.type === 'cashback_referral' || tx.type === 'cashback_own') {
            title = tx.order_number ? `Заказ #${tx.order_number}` : (txLabels[tx.type] || '');
        } else {
            title = tx.amount >= 0 ? 'Пополнение' : 'Списание';
        }
        const subtitle = txLabels[tx.type] || '';
        const dt = tx.created_at ? new Date(tx.created_at) : null;
        let dateStr = '';
        if (dt && !isNaN(dt)) {
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            const mo = String(dt.getMonth() + 1).padStart(2, '0');
            const yy = String(dt.getFullYear()).slice(2);
            dateStr = `${hh}:${mm} ${dd}.${mo}.${yy}`;
        }
        return `<div class="wallet-tx-row">
            <div class="wallet-tx-line1">
                <span class="wallet-tx-title">${escapeHtml(title)}</span>
                <span class="wallet-tx-amount ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : '-'}${formatPrice(Math.abs(tx.amount))}</span>
            </div>
            <div class="wallet-tx-line2">
                <span class="wallet-tx-date">${dateStr}</span>
                <span class="wallet-tx-subtitle">${escapeHtml(subtitle)}</span>
            </div>
        </div>`;
    }

    function buildWalletTxListHtml(list, showMoreBtn) {
        if (!list.length) return `<div class="review-empty">История операций пуста</div>`;
        let html = list.map(buildWalletTxRowHtml).join('');
        if (showMoreBtn) html += `<div class="wallet-show-more-row" id="walletShowMoreBtn">Показать все операции</div>`;
        return html;
    }

    const txHtml = buildWalletTxListHtml(transactions, transactions.length >= 5);

    container.innerHTML = `
            <div class="profile-wrapper">
                <div class="referral-main-card">
                    <div class="referral-title">Кошелёк Placed Games</div>
                    <div style="font-size:17px;color:var(--text-secondary);font-weight:500;">Внутренний кошелёк приложения</div>
                </div>
                <div class="referral-bottom-card">
                    <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;">
                        <div style="padding-left:2px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:20px;font-weight:550;color:var(--text-primary);">${formatPrice(userWalletBalance)}</span>
                                <span id="walletPageCashbackInfoBtn" style="font-size:15px;font-weight:550;color:#4cb4e9;background:var(--accent-blue-bg);border-radius:20px;padding:2px 8px;cursor:pointer;">2%</span>
                            </div>
                            <div style="font-size:15px;color:var(--text-secondary);margin-top:4px;">Баланс кошелька</div>
                        </div>
                        <div style="display:flex;gap:10px;flex-shrink:0;">
                            <button id="walletPageDepositBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                            <button id="walletPageWithdrawBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="profile-wrapper" style="margin-top:13px;">
                <div class="referral-main-card">
                    <div class="referral-title">История всех операций</div>
                    <div style="font-size:17px;color:var(--text-secondary);font-weight:500;">История всех операций кошелька</div>
                </div>
                                    <div class="referral-bottom-card">
                    <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;" id="walletTxListWrap">
                        ${txHtml}
                    </div>
                </div>
            </div>
        `;

    setTimeout(() => {
        document.getElementById("walletPageDepositBtn")?.addEventListener("click", () => {
            hapticLight();
            showAppAlert("В данный момент пополнить кошелёк нельзя, попробуйте позже");
        });
        document.getElementById("walletPageWithdrawBtn")?.addEventListener("click", () => {
            hapticLight();
            showAppAlert("Вывод денежных средств в данный момент недоступен");
        });
        document.getElementById("walletPageCashbackInfoBtn")?.addEventListener("click", () => {
            hapticLight();
            showAppAlert("Ваш процент кэшбэка - 2%\n\nПолучайте кэшбэк за каждую вашу покупку и за каждую покупку приглашенного друга, используйте заработанные средства для оплаты заказов");
        });
        document.getElementById("walletShowMoreBtn")?.addEventListener("click", async function() {
            hapticLight();
            this.textContent = "Загрузка...";
            try {
                const r = await fetch(`https://placedgames.up.railway.app/api/wallet-transactions?userId=${tgUser.id}&limit=1000`);
                const allTx = await r.json();
                const wrap = document.getElementById("walletTxListWrap");
                if (wrap) wrap.innerHTML = buildWalletTxListHtml(allTx, false);
            } catch (e) {
                this.textContent = "Показать все";
            }
        });
    }, 0);
}

async function renderReferralsPage() {
const container = document.getElementById("referralsContent");
if (!container) return;
container.innerHTML = '';
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

let referralStats = { invited: 0, invited24h: 0, earned: 0, earned24h: 0 };
let referralList = [];

const referralPromise = tgUser?.id
    ? fetch(`https://placedgames.up.railway.app/api/referral-stats?userId=${tgUser.id}`)
          .then(r => r.json()).catch(() => referralStats)
    : Promise.resolve(referralStats);

    const listPromise = tgUser?.id
? fetch(`https://placedgames.up.railway.app/api/referral-list?userId=${tgUser.id}&limit=5`)
      .then(r => r.json()).catch(() => [])
: Promise.resolve([]);

const [statsRes, listRes] = await Promise.all([referralPromise, listPromise]);
referralStats = statsRes;
referralList = (listRes || []).slice().sort((a, b) => (b.earned || 0) - (a.earned || 0));

const referralLink = tgUser?.id ? `t.me/PlacedGamesBot?startapp=ref${tgUser.id}` : 't.me/PlacedGamesBot';

    function buildReferralRowHtml(r) {
    return `<div class="wallet-tx-row">
        <div class="wallet-tx-line1">
            <span class="wallet-tx-title">${escapeHtml(r.nickname || 'Пользователь')}</span>
            <span class="wallet-tx-amount" style="color:var(--text-primary);">${formatPrice(r.earned || 0)}</span>
        </div>
        <div class="wallet-tx-line2">
            <span class="wallet-tx-date">Пользователь</span>
            <span class="wallet-tx-subtitle">Заработано</span>
        </div>
    </div>`;
}

function buildReferralListHtml(list, showMoreBtn) {
    if (!list.length) return `<div class="review-empty">Пока нет приглашённых</div>`;
    let html = list.map(buildReferralRowHtml).join('');
    if (showMoreBtn) html += `<div class="wallet-show-more-row" id="referralsShowMoreBtn">Показать всех рефералов</div>`;
    return html;
}

const listHtml = buildReferralListHtml(referralList, referralList.length >= 5);

container.innerHTML = `
    <div class="referral-wrapper">
        <div class="referral-main-card">
            <div class="referral-title">Реферальная программа</div>
            <div class="referral-link-row">
                <span class="referral-link-text">${referralLink}</span>
                <svg class="icon icon-profile-referral-copy referral-copy-icon icon--muted" id="referralsPageCopyBtn"><use href="#icon-copy"></use></svg>
            </div>
        </div>
        <div class="referral-bottom-card">
            <div class="referral-stats-inner">
                <div class="referral-stat-item left">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="referral-stat-value">${referralStats.invited}</span>
                        <span class="referral-badge" id="referralsPageInvited24h" style="cursor:pointer;">+${referralStats.invited24h}</span>
                    </div>
                    <div class="referral-stat-label">Приглашено</div>
                </div>
                <div class="referral-stat-divider"></div>
                <div class="referral-stat-item right">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="referral-stat-value">${formatPrice(referralStats.earned)}</span>
                        <span class="referral-badge" id="referralsPageEarned24h" style="cursor:pointer;">2%</span>
                    </div>
                    <div class="referral-stat-label">Заработано</div>
                </div>
            </div>
        </div>
    </div>
            <div class="profile-wrapper" style="margin-top:13px;">
        <div class="referral-main-card">
            <div class="referral-title">Приглашенные рефералы</div>
            <div style="font-size:17px;color:var(--text-secondary);font-weight:500;">Список приглашенных рефералов</div>
        </div>
        <div class="referral-bottom-card">
            <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;" id="referralsListWrap">
                ${listHtml}
            </div>
        </div>
    </div>
`;

setTimeout(() => {
            document.getElementById("referralsPageCopyBtn")?.addEventListener("click", async (e) => {
        hapticLight();
        if (navigator.clipboard) {
            const el = e.currentTarget;
            el.style.transform = "scale(0.85)";
            await navigator.clipboard.writeText(`https://${referralLink}`);
            setTimeout(() => { el.style.transform = "scale(1)"; }, 150);
            showReferralCopiedAlert(referralLink);
        }
    });
    document.getElementById("referralsPageInvited24h")?.addEventListener("click", () => {
        hapticLight();
        showAppAlert(`+${referralStats.invited24h} – это количество пользователей, которых вы пригласили за последние 24 часа`);
    });
    document.getElementById("referralsPageEarned24h")?.addEventListener("click", () => {
        hapticLight();
        showAppAlert('Получайте 2% с покупок рефералов, заработанные средства начисляются на баланс кошелька');
    });
            document.getElementById("referralsShowMoreBtn")?.addEventListener("click", async function() {
        hapticLight();
        this.textContent = "Загрузка...";
        try {
            const r = await fetch(`https://placedgames.up.railway.app/api/referral-list?userId=${tgUser.id}&limit=1000`);
            let allList = await r.json();
            allList = (allList || []).slice().sort((a, b) => (b.earned || 0) - (a.earned || 0));
            const wrap = document.getElementById("referralsListWrap");
            if (wrap) wrap.innerHTML = buildReferralListHtml(allList, false);
        } catch (e) {
            this.textContent = "Показать всех";
        }
    });
}, 0);
}

function themeIconRotationDeg(theme) {
    return theme === 'light' ? 180 : 0;
}

function updateThemeIconRotations(theme) {
    const deg = themeIconRotationDeg(theme);
    document.querySelectorAll('.theme-icon-rotatable').forEach(icon => {
        icon.style.transform = `rotate(${deg}deg)`;
        icon.dataset.rotation = deg;
    });
}

function toggleAppTheme() {
    hapticLight();
    const current = localStorage.getItem('appTheme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    updateThemeIconRotations(newTheme);
}

function getBottomMenuOffset() {
    return parseInt(localStorage.getItem('bottomMenuOffset') || '16', 10);
}

function applyBottomMenuOffset(offset) {
    document.documentElement.style.setProperty('--bottom-menu-offset', offset + 'px');
    localStorage.setItem('bottomMenuOffset', String(offset));
}

    function cycleBottomMenuOffset() {
    const options = [16, 20, 24, 28, 32];
    const current = getBottomMenuOffset();
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    applyBottomMenuOffset(next);
    hapticLight();
    renderSettingsPage();
}

function pluralizePixels(n) {
    const n100 = n % 100;
    const n10 = n % 10;
    if (n100 >= 11 && n100 <= 14) return 'пикселей';
    if (n10 === 1) return 'пиксель';
    if (n10 >= 2 && n10 <= 4) return 'пикселя';
    return 'пикселей';
}

function renderSettingsPage() {
    const container = document.getElementById("settingsContent");
    if (!container) return;

    const currentTheme = localStorage.getItem('appTheme') || 'dark';
    const themeTitle = currentTheme === 'dark' ? 'Тёмная' : 'Светлая';
    const themeDeg = themeIconRotationDeg(currentTheme);

    const vibrationOn = isVibrationEnabled();

    const currentFormat = localStorage.getItem('appFormat') || 'fullscreen';
    const formatTitle = currentFormat === 'fullscreen' ? 'Fullscreen' : 'Fullsize';

    const bottomOffset = getBottomMenuOffset();

    container.innerHTML = `
                    <div class="referral-wrapper">
            <div class="referral-main-card">
                <div class="referral-title">Настройки приложения</div>
                <div style="font-size:17px;color:var(--text-secondary);font-weight:500;">Настройки мини-приложения</div>
            </div>
            <div class="referral-bottom-card">
                <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;">
                    <div class="settings-row">
                        <div style="padding-left:2px;min-width:0;">
                                                            <div id="settingsThemeTitleText" style="font-size:19px;font-weight:550;color:var(--text-primary);">${themeTitle}</div>
                            <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;">Тема приложения</div>
                        </div>
                        <button id="settingsThemeBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                            <svg class="icon theme-icon-rotatable" style="width:22px;height:22px;color:#4cb4e9;transform:rotate(${themeDeg}deg);transition:transform 0.3s ease;"><use href="#icon-theme"></use></svg>
                        </button>
                    </div>
                    <div class="settings-row">
                        <div style="padding-left:2px;min-width:0;">
                            <div style="font-size:19px;font-weight:550;color:var(--text-primary);">Русский</div>
                            <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;">Язык приложения</div>
                        </div>
                        <button id="settingsLangBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#4cb4e9;font-size:15px;font-weight:550;">RU</button>
                    </div>
                    <div class="settings-row">
                        <div style="padding-left:2px;min-width:0;">
                            <div style="font-size:19px;font-weight:550;color:var(--text-primary);">${vibrationOn ? 'Включено' : 'Выключено'}</div>
                            <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;">Вибрация нажатий</div>
                        </div>
                        <button id="settingsVibrationBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#4cb4e9;font-size:14px;font-weight:550;">${vibrationOn ? 'ON' : 'OFF'}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="referral-wrapper" style="margin-top:13px;">
            <div class="referral-main-card">
                <div class="referral-title">Эксперимен. настройки</div>
                <div style="font-size:17px;color:var(--text-secondary);font-weight:500;">Экспериментальные настройки</div>
            </div>
            <div class="referral-bottom-card">
                <div style="background:var(--card-bg);border-radius:29px;padding:16px 18px;">
                    <div class="settings-row">
                        <div style="padding-left:2px;min-width:0;">
                            <div style="font-size:19px;font-weight:550;color:var(--text-primary);">${formatTitle}</div>
                            <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;">Формат приложения</div>
                        </div>
                        <button id="settingsFormatBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#4cb4e9;font-size:14px;font-weight:550;">FS</button>
                    </div>
                    <div class="settings-row">
                        <div style="padding-left:2px;min-width:0;">
                            <div style="font-size:19px;font-weight:550;color:var(--text-primary);">Очист. кэш</div>
                            <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;">Оч. кэш приложения</div>
                        </div>
                        <button id="settingsClearCacheBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cb4e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 7h16"/>
                                <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>
                                <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>
                            </svg>
                        </button>
                    </div>
                    <div class="settings-row">
                        <div style="padding-left:2px;min-width:0;">
                            <div style="font-size:19px;font-weight:550;color:var(--text-primary);">${bottomOffset} ${pluralizePixels(bottomOffset)}</div>
                            <div style="font-size:16px;color:var(--text-secondary);margin-top:4px;">Нижний отступ меню</div>
                        </div>
                        <button id="settingsOffsetBtn" style="width:46px;height:46px;border-radius:16px;background:var(--accent-blue-bg);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#4cb4e9;font-size:14px;font-weight:550;">${bottomOffset}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
                    document.getElementById('settingsThemeBtn')?.addEventListener('click', () => {
            toggleAppTheme();
            const newTheme = localStorage.getItem('appTheme') || 'dark';
            const titleEl = document.getElementById('settingsThemeTitleText');
            if (titleEl) titleEl.textContent = newTheme === 'dark' ? 'Тёмная' : 'Светлая';
        });
        document.getElementById('settingsLangBtn')?.addEventListener('click', () => {
            hapticLight();
        });
        document.getElementById('settingsVibrationBtn')?.addEventListener('click', () => {
            const next = !isVibrationEnabled();
            localStorage.setItem('vibrationEnabled', next ? 'true' : 'false');
            if (next) hapticLight();
            renderSettingsPage();
        });
        document.getElementById('settingsFormatBtn')?.addEventListener('click', () => {
            const current = localStorage.getItem('appFormat') || 'fullscreen';
            const next = current === 'fullscreen' ? 'fullsize' : 'fullscreen';
            applyAppFormat(next);
            hapticLight();
            renderSettingsPage();
        });
        document.getElementById('settingsClearCacheBtn')?.addEventListener('click', () => {
            hapticLight();
            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({
                    message: 'Вы действительно хотите очистить кэш приложения?',
                    buttons: [
                        { id: 'clear', type: 'destructive', text: 'Очистить' },
                        { id: 'close', type: 'close' }
                    ]
                }, (buttonId) => {
                    if (buttonId === 'clear') {
                        hapticMedium();
                        clearAppCache();
                    }
                });
            }
        });
        document.getElementById('settingsOffsetBtn')?.addEventListener('click', () => {
            cycleBottomMenuOffset();
        });
    }, 0);
}

    // Текст подзаголовка меняется здесь один раз для всех разделов справки
const HELP_SUBTITLE_TEXT = "Справочная информация страницы";

const helpSectionsData = [
    { key: 'catalog', title: 'Каталог', items: [
        { q: 'Сортировка и поиск', a: 'Для быстрого поиска сервиса или товара вы можете использовать поиск по названию или использовать фильтры категорий находящийся справа от графы поиска.' },
        { q: 'Товары и количество', a: 'Для того чтобы добавить товар в корзину нажмите кнопку «В корзину», после чего товар будет добавлен в корзину, также вы можете добавить несколько позиций товара используя кнопку «+».' },
                ]},
    { key: 'cart', title: 'Корзина', items: [
        { q: 'Информация о товаре', a: 'Чтобы узнать информацию о товаре нажмите на иконку информации в правом верхнем углу карточки товара.' },
        { q: 'Применение промокода', a: 'Нажмите на круглую кнопку рядом с общей стоимостью и введите промокод в открывшемся поле.' },
        { q: 'Оформление и оплата', a: 'На странице оформления укажите нужные данные и выберите способ оплаты, после перехода к оплате отправьте нужную сумму по указанным реквизитам и нажмите кнопку «Оформить заказ».' },
    ]},
    { key: 'orders', title: 'Заказы', items: [
        { q: 'Статус «Ожидает проверки»', a: 'Данный статус появляется сразу после оформления заказа и означает то, что ваш перевод ожидает проверки, после подтверждения перевода статус заказа изменится на «Ожидает выполнения».' },
        { q: 'Статус «Ожидание кода»', a: 'Если вы увидели данный статус в карточке заказа, пожалуйста нажмите на карточку заказа и введите код, который вам придёт, в соответствующее поле на странице заказа.' },
        { q: 'Начисление кэшбэка', a: 'Кэшбэк начисляется автоматически после выполнения заказа, если оплата была произведена не с кошелька.' },
    ]},
    { key: 'profile', title: 'Профиль', items: [
        { q: 'Статистика аккаунта', a: 'Нажмите на иконку информации рядом с вашим именем в верхней части карточки профиля.' },
        { q: 'Смена темы приложения', a: 'Нажмите на иконку темы в правом верхнем углу, чтобы переключить светлую и тёмную тему.' },
        { q: 'Изм. формат приложения', a: 'Чтобы изменить формат приложения зажмите круглый элемент нижнего меню с вашей аватаркой профиля и удерживайте 2 секунды, после чего следуйте инструкции.' },
    ]},
    { key: 'reviews', title: 'Отзывы', items: [
        { q: 'Как оставить отзыв', a: 'Перейдите на страницу выполненного заказа и нажмите кнопку «Оставить отзыв».' },
        { q: 'Почему нельзя оставить отзыв повторно', a: 'На каждый заказ можно оставить только один отзыв.' },
        { q: 'Фильтрация отзывов', a: 'Используйте поиск и фильтры по сервису и оценке в верхней части страницы.' },
    ]},
    { key: 'wallet', title: 'Кошелёк', items: [
        { q: 'Начисление кэшбэка', a: 'Кэшбэк начисляется за каждую вашу покупку, но получить кэшбэк можно только если способ оплаты — любой перечисленный банк, а не «Кошелёк».' },
        { q: 'Пополнение и вывод', a: 'В данный момент функции пополнения и вывода средств временно недоступны, следите за обновлениями в новостном канале.' },
    ]},
    { key: 'referrals', title: 'Рефералы', items: [
        { q: 'Как получить реферальную ссылку', a: 'Скопируйте ссылку на странице «Рефералы» и поделитесь ей с друзьями.' },
        { q: 'Сколько можно заработать', a: 'Вы получаете 2% от каждой покупки приглашённого друга на баланс кошелька.' },
        { q: 'Статистика приглашений', a: 'Показывает общее количество приглашённых пользователей и количество за последние 24 часа.' },
    ]},
];

function buildHelpFaqItemHtml(sectionKey, idx, item) {
    return `<div class="help-faq-item" data-section="${sectionKey}" data-idx="${idx}">
        <div class="help-faq-row">
            <span class="help-faq-question">${escapeHtml(item.q)}</span>
            <svg class="icon help-faq-chevron icon--muted"><use href="#icon-chevron-down"></use></svg>
        </div>
        <div class="help-faq-answer">${escapeHtml(item.a)}</div>
    </div>`;
}

        function buildHelpSectionHtml(section, number) {
    const itemsHtml = section.items.map((item, idx) => {
        const divider = idx > 0 ? '<div class="help-faq-divider"></div>' : '';
        return divider + buildHelpFaqItemHtml(section.key, idx, item);
    }).join('');
    return `<div class="referral-wrapper" style="margin-bottom:13px;">
            <div class="referral-main-card">
                <div class="referral-title help-section-title">Страница «${escapeHtml(section.title)}»</div>
            <div class="help-section-subtitle">${HELP_SUBTITLE_TEXT}</div>
            </div>
            <div class="referral-bottom-card">
                <div class="help-faq-group">
                    ${itemsHtml}
                </div>
            </div>
        </div>`;
}

    function attachHelpFaqHandlers() {
document.querySelectorAll('.help-faq-row').forEach(row => {
    if (row.dataset.bound === 'true') return;
    row.dataset.bound = 'true';
    row.addEventListener('click', () => {
        hapticLight();
        const item = row.closest('.help-faq-item');
        if (!item) return;
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('#helpContent .help-faq-item.open').forEach(el => el.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
    });
});
}

function renderHelpPage() {
    const container = document.getElementById("helpContent");
    if (!container) return;
    container.innerHTML = helpSectionsData.map((section, i) => buildHelpSectionHtml(section, i + 1)).join('');
    attachHelpFaqHandlers();
}

function saveCurrentPage(pageId) {
    localStorage.setItem("lastPage", pageId);
}

function getLastPage() {
    const savedPage = localStorage.getItem("lastPage");
            if (savedPage === "payment") {
        const hasCart = Object.keys(cart).length > 0;
        const canRestore = hasCart && getCardNumberFromValue(checkoutData.paymentMethod) && pendingOrderNumber;
        if (canRestore) return "payment";
        appliedPromo = null;
        pendingOrderNumber = null;
        return hasCart ? "cart" : "catalog";
    }
    const validPages = ["catalog", "cart", "orders", "profile"];
    if (savedPage && validPages.includes(savedPage)) {
        return savedPage;
    }
    return "catalog";
}

function injectPageHeader() {
    const pageTitles = {
'catalog': 'Каталог',
'cart': 'Корзина',
'orders': 'Заказы',
'profile': 'Профиль',
'wallet': 'Кошелёк',
'referrals': 'Рефералы',
'settings': 'Настройки',
'checkout': 'Оформление',
'payment': 'Оплата',
'order-detail': 'Заказ',
'reviews': 'Отзывы',
    'write-review': 'Оставить отзыв',
'help': 'Справка',
'game': currentGame?.name || 'Игра',
};

    const activePage = document.querySelector('.page.active-page');
    if (!activePage) return;
    const pageId = activePage.id.replace('-page', '');
    const title = pageTitles[pageId];
    if (title === undefined) return;

                    document.querySelectorAll('.page-header-sticky').forEach(el => el.remove());

    activePage.insertAdjacentHTML('afterbegin', renderPageHeader(title, pageId));

    const navSelect = activePage.querySelector('#pageHeaderNavSelect');
    if (navSelect) {
        navSelect.onchange = function() {
            hapticLight();
            const target = this.value;
            currentGame = null;
            savedGameScrollY = 0;
            showPage(target);
        };
    }
}

function showPage(pageId, skipHistoryAdd = false) {
    let currentPageId = null;
    for (const page of document.querySelectorAll(".page")) {
        if (page.classList.contains("active-page")) {
            currentPageId = page.id.replace("-page", "");
            break;
        }
    }
    if (currentPageId === "game") {
        savedGameScrollY = window.scrollY;
    }
    if (currentPageId && currentPageId !== pageId && !skipHistoryAdd) {
        const lastInHistory = navigationHistory[navigationHistory.length - 1];
        if (lastInHistory !== currentPageId && currentPageId !== "game") {
            navigationHistory.push(currentPageId);
        }
    }
    if (pageId === "catalog") { navigationHistory = []; }
            if (pageId === "payment") {
        localStorage.setItem("lastPage", "payment");
    } else if (localStorage.getItem("lastPage") === "payment") {
        localStorage.setItem("lastPage", "cart");
    }
    if (isPromoMode) {
        isPromoMode = false;
        if (!['checkout', 'payment'].includes(pageId)) {
            appliedPromo = null;
        }
    }
    if (pageId !== "reviews") {
        const rf = document.getElementById("reviewsFixedAction");
        if (rf) rf.remove();
    }
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
    const targetPage = document.getElementById(pageId + "-page");
    if (targetPage) targetPage.classList.add("active-page");
    const checkoutBlock = document.getElementById("cartCheckoutFixed");
    if (pageId === "catalog") {
        window.scrollTo({ top: 0, behavior: 'instant' });
        currentGame = null;
        savedGameScrollY = 0;
        catalogServiceFilter = "Все сервисы";
        renderCatalog();
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "cart") { renderCartPage(); }
            if (pageId === "orders") {
        runWithLoader(() => renderOrdersPage(), 2000);
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "profile") {
        runWithLoader(() => renderProfilePage(), 2000);
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "wallet") {
runWithLoader(() => renderWalletPage(), 0);
if (checkoutBlock) checkoutBlock.style.display = "none";
}
            if (pageId === "referrals") {
runWithLoader(() => renderReferralsPage(), 0);
if (checkoutBlock) checkoutBlock.style.display = "none";
}
    if (pageId === "settings") {
renderSettingsPage();
if (checkoutBlock) checkoutBlock.style.display = "none";
}
    if (pageId === "checkout") { renderCheckoutForm(); }
    if (pageId === "payment") { renderPaymentPage(); }
    if (pageId === "filter") {
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "order-detail") {
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "reviews") {
        runWithLoader(() => renderReviewsPage(), 2000);
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }

    if (pageId === "game") {
        renderGamePage();
        if (checkoutBlock) checkoutBlock.style.display = "none";
        setTimeout(() => window.scrollTo({ top: savedGameScrollY, behavior: 'instant' }), 50);
    }
            if (pageId === "write-review") {
        runWithLoader(() => renderWriteReviewPage(), 2000);
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "help") {
        renderHelpPage();
        if (checkoutBlock) checkoutBlock.style.display = "none";
    }
    if (pageId === "checkout") { afterPaymentBackPage = "cart"; }

    const mainPages = ["catalog", "cart", "orders", "profile"];
    const profileLinkedPages = ["wallet", "reviews", "write-review", "referrals", "help", "settings"];
    if (mainPages.includes(pageId)) {
        document.querySelectorAll(".menu-item").forEach(btn => btn.classList.remove("active"));
        const activeBtn = document.querySelector(`.menu-item[data-page="${pageId}"]`);
        if (activeBtn) activeBtn.classList.add("active");
        const profileWrapper = document.getElementById("profileMenuWrapper");
        if (profileWrapper) {
            if (pageId === "profile") profileWrapper.classList.add("active");
            else profileWrapper.classList.remove("active");
        }
        saveCurrentPage(pageId);
        updateMenuSlider(pageId);
            } else if (profileLinkedPages.includes(pageId)) {
        document.querySelectorAll(".menu-item").forEach(btn => btn.classList.remove("active"));
        if (pageId === 'write-review' && writeReviewEntryPage === 'order') {
            document.querySelector('.menu-item[data-page="orders"]')?.classList.add("active");
            updateMenuSlider("orders");
        } else {
            document.getElementById("profileMenuWrapper")?.classList.add("active");
            updateMenuSlider("profile");
        }
    }

    injectPageHeader();

    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (pageId === "catalog") { tg.BackButton.hide(); } else { tg.BackButton.show(); }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function initBackButtonHandler() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.BackButton.onClick(function() {
if (navigationHistory.length > 0) {
    const previousPage = navigationHistory.pop();
    if (previousPage === "catalog") {
        currentGame = null;
        savedGameScrollY = 0;
        showPage("catalog", true);
    } else if (previousPage === "game") {
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
        document.getElementById("game-page")?.classList.add("active-page");
        document.getElementById("cartCheckoutFixed").style.display = "none";
        document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
        document.querySelector('.menu-item[data-page="catalog"]')?.classList.add("active");
        document.getElementById("profileMenuWrapper")?.classList.remove("active");
        updateMenuSlider("catalog");
        injectPageHeader();
        tg.BackButton.show();
        window.scrollTo({ top: savedGameScrollY, behavior: 'instant' });
            } else if (previousPage === "orders") {
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
        document.getElementById("orders-page")?.classList.add("active-page");
        document.getElementById("cartCheckoutFixed").style.display = "none";
        document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
        document.querySelector('.menu-item[data-page="orders"]')?.classList.add("active");
        document.getElementById("profileMenuWrapper")?.classList.remove("active");
        updateMenuSlider("orders");
        injectPageHeader();
        tg.BackButton.show();
        window.scrollTo({ top: savedOrdersScrollY, behavior: 'instant' });
            } else if (previousPage === "reviews") {
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
        document.getElementById("reviews-page")?.classList.add("active-page");
        document.getElementById("cartCheckoutFixed").style.display = "none";
        document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
        document.getElementById("profileMenuWrapper")?.classList.add("active");
        updateMenuSlider("profile");
        injectPageHeader();
        renderReviewsFixedAction();
        tg.BackButton.show();
        window.scrollTo({ top: savedReviewsScrollY, behavior: 'instant' });
    } else if (previousPage === "order-detail") {
        if (currentOpenOrder) {
            const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            const isOwner = String(currentOpenOrder.user_id) === String(tgUserId);
            showOrderDetail(currentOpenOrder, isOwner);
        } else {
            showPage(previousPage, true);
        }
    } else {
                    showPage(previousPage, true);
                }
            } else {
                if (currentGame) {
                    currentGame = null;
                    savedGameScrollY = 0;
                    showPage("catalog", true);
                } else {
                    showPage("catalog");
                }
            }
        });
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);

    const tg = window.Telegram?.WebApp;
    if (tg) {
        if (theme === 'light') {
            try { tg.setHeaderColor('#EFEFF3'); } catch (e) {}
            try { tg.setBackgroundColor('#EFEFF3'); } catch (e) {}
        } else {
            try { tg.setHeaderColor('#111112'); } catch (e) {}
            try { tg.setBackgroundColor('#111112'); } catch (e) {}
        }
    }
}

    function initTheme() {
    const saved = localStorage.getItem('appTheme') || 'dark';
    applyTheme(saved);
    applyBottomMenuOffset(getBottomMenuOffset());
}

    function requestTelegramWriteAccess() {
    try {
        const tg = window.Telegram?.WebApp;
        if (!tg || typeof tg.requestWriteAccess !== 'function') return;
        if (localStorage.getItem('writeAccessRequested') === 'true') return;
        tg.requestWriteAccess((granted) => {
            localStorage.setItem('writeAccessRequested', 'true');
        });
    } catch (e) {}
}

        async function initApp() {
    initTheme();
    loadCartFromLocalStorage();
    requestTelegramWriteAccess();
    const tgU = window.Telegram?.WebApp?.initDataUnsafe?.user;

            if (tgU?.id) {
        const avatarEl = document.getElementById("profileMenuAvatar");
        const cachedAvatar = getCachedAvatarDataUrl(tgU.id);
        if (avatarEl && cachedAvatar) {
            avatarEl.src = cachedAvatar;
        } else if (avatarEl && tgU.photo_url) {
            avatarEl.src = tgU.photo_url;
        }
        if (tgU.photo_url) cacheAvatarFromUrl(tgU.id, tgU.photo_url);
    }

    if (tgU?.id) {
        try {
            const r = await fetch(
                `https://placedgames.up.railway.app/api/user-status?userId=${tgU.id}`);
            const data = await r.json();
            if (data.status === 'blocked') {
                document.body.innerHTML = `
                        <div style="position:fixed;inset:0;background:var(--app-bg);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:30px;">
                            <div style="font-size:22px;font-weight:600;color:white;margin-bottom:12px;">Доступ к приложению ограничен</div>
                            <button onclick="window.open('https://t.me/PlacedSupport','_blank')" style="background:#4cb4e9;border:none;border-radius:34px;padding:14px 28px;color:white;font-size:17px;font-weight:600;cursor:pointer;margin-top:16px;">Связаться с поддержкой</button>
                        </div>`;
                return;
            }
        } catch (e) {}
    }

    const savedCheckout = localStorage.getItem('checkoutData');
    if (savedCheckout) {
        try {
            const parsed = JSON.parse(savedCheckout);
            checkoutData = { ...checkoutData, ...parsed };
        } catch (e) {}
    }

    restorePaymentSession();
    const lastPage = getLastPage();

    const slider = document.getElementById("menuSlider");
    if (slider) slider.classList.add("no-transition");

            showPage(lastPage);
    if (lastPage === 'payment') {
        navigationHistory = ['cart', 'checkout'];
        document.querySelector('.menu-item[data-page="cart"]')?.classList.add('active');
        updateMenuSlider('cart');
    }

    if (slider) {
        void slider.offsetWidth;
        slider.classList.remove("no-transition");
    }

    const bottomMenuWrapper = document.getElementById("bottomMenuWrapper");
    if (bottomMenuWrapper) bottomMenuWrapper.style.opacity = "1";

    const tg = window.Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get(
        "startapp");

    let referrerIdForTrack = null;
    if (startParam && startParam.startsWith("ref") && tgU?.id) {
        const parsedRef = parseInt(startParam.replace("ref", ""));
        if (parsedRef && parsedRef !== tgU.id) referrerIdForTrack = parsedRef;
    }

    if (tgU?.id) {
        fetch('https://placedgames.up.railway.app/api/track-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: String(tgU.id),
                userName: tgU.first_name || null,
                userUsername: tgU.username || null,
                photoUrl: tgU.photo_url || null,
                referrerId: referrerIdForTrack ? String(referrerIdForTrack) : null
            })
        }).catch(() => {});
    }

    if (startParam && startParam.startsWith('order_')) {
        const orderNum = startParam.slice(6);
        loadUserOrders().then(() => {
            const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            const found = orders.find(o => String(o.order_number) === orderNum);
            if (found) {
                const isOwner = String(found.user_id) === String(tgUserId);
                navigationHistory.push('orders');
                setTimeout(() => showOrderDetail(found, isOwner), 0);
            } else {
                fetch('https://placedgames.up.railway.app/api/refresh-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderNumber: orderNum })
                    })
                    .then(r => r.json())
                    .then(order => {
                        if (order && order.id) {
                            const isOwner = String(order.user_id) === String(tgUserId);
                            navigationHistory.push('orders');
                            setTimeout(() => showOrderDetail(order, isOwner), 0);
                        }
                    })
                    .catch(() => {});
            }
        });
    }
}

   (function() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
                    tg.ready();
        tg.expand();
        try {
            const savedFormat = localStorage.getItem('appFormat') || 'fullscreen';
            if (savedFormat === 'fullsize') {
                if (tg.exitFullscreen) tg.exitFullscreen();
            } else {
                tg.requestFullscreen();
            }
        } catch (e) {}
        try { tg.setHeaderColor("#111112"); tg.setBackgroundColor("#111112"); } catch (e) {}
        try { if (tg.disableClosingConfirmation) tg.disableClosingConfirmation(); } catch (e) {}
        try { if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) {}
        initBackButtonHandler();
        tg.BackButton.hide();
    }
})();

document.addEventListener("click", function(e) {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "SELECT") {
        if (e.target.closest('#codeActionBlock')) return;
        if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement
                .tagName === "TEXTAREA" || document.activeElement.tagName === "SELECT")) {
            document.activeElement.blur();
        }
    }
});

const searchInputEl = document.getElementById("searchInput");
if (searchInputEl) {
    searchInputEl.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderCatalog();
    });
}

setupSearchClear('searchInput', 'searchClearBtn');

    document.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.id === "profileMenuBtn" && profileLongPressFired) {
            profileLongPressFired = false;
            return;
        }
        hapticLight();
        if (btn.dataset.page === "catalog" && currentGame) {
            if (document.getElementById("game-page").classList.contains("active-page")) {
                currentGame = null;
                savedGameScrollY = 0;
                showPage("catalog", true);
                return;
            }
            document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
            document.getElementById("game-page")?.classList.add("active-page");
            document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("profileMenuWrapper")?.classList.remove("active");
            updateMenuSlider("catalog");
            injectPageHeader();
            document.getElementById("cartCheckoutFixed").style.display = "none";
            if (window.Telegram?.WebApp) window.Telegram.WebApp.BackButton.show();
            window.scrollTo({ top: savedGameScrollY, behavior: 'instant' });
            return;
        }
        showPage(btn.dataset.page);
    });
});

function updateMenuSlider(pageId) {
    const slider = document.getElementById("menuSlider");
    const wrapper = document.getElementById("bottomMenuWrapper");
    const pill = document.getElementById("menuPill");
    const profileCircle = document.getElementById("profileMenuWrapper");
    if (!slider || !wrapper || !pill || !profileCircle) return;

    const wrapperRect = wrapper.getBoundingClientRect();

    if (pageId === "profile") {
        const circleRect = profileCircle.getBoundingClientRect();
        slider.style.opacity = "1";
        slider.style.left = (circleRect.left - wrapperRect.left + 4) + "px";
        slider.style.width = (circleRect.width - 8) + "px";
        slider.style.borderRadius = "50%";
        return;
    }

    const pages = ["catalog", "cart", "orders"];
const index = pages.indexOf(pageId);
if (index === -1) {
slider.style.opacity = "0";
return;
}
const pillRect = pill.getBoundingClientRect();
const segmentWidth = (pillRect.width - 8) / 3;
slider.style.opacity = "1";
slider.style.left = (pillRect.left - wrapperRect.left + 4 + index * segmentWidth) + "px";
slider.style.width = segmentWidth + "px";
slider.style.borderRadius = "50px";
   }

document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
initApp().catch(e => showCrashRecoveryUI(e.message));

    document.addEventListener('click', function(e) {
    const doubleBtn = e.target.closest('#headerDoubleBtn');
    if (!doubleBtn) return;

    const isRefresh = e.target.closest('#headerRefreshIcon');
    const isTheme = e.target.closest('#headerThemeIcon');

            if (isRefresh) {
hapticLight();
showTopLoader();
Promise.resolve(refreshCurrentPage()).finally(hideTopLoader);
    } else if (isTheme) {
        toggleAppTheme();
        if (document.getElementById('settings-page')?.classList.contains('active-page')) {
            const newTheme = localStorage.getItem('appTheme') || 'dark';
            const titleEl = document.getElementById('settingsThemeTitleText');
            if (titleEl) titleEl.textContent = newTheme === 'dark' ? 'Тёмная' : 'Светлая';
        }
    }
});

    (function setupProfileLongPress() {
    const profileBtn = document.getElementById("profileMenuBtn");
    if (!profileBtn) return;
    const LONG_PRESS_MS = 350;
    let pressTimer = null;

    function startPress() {
        profileLongPressFired = false;
        pressTimer = setTimeout(() => {
            profileLongPressFired = true;
                            hapticMedium();
            if (document.getElementById('settings-page')?.classList.contains('active-page')) return;
            showProfileInfoAlert();
        }, LONG_PRESS_MS);
    }
    function cancelPress() {
        clearTimeout(pressTimer);
    }

    profileBtn.addEventListener("pointerdown", startPress);
    profileBtn.addEventListener("pointerup", cancelPress);
    profileBtn.addEventListener("pointerleave", cancelPress);
    profileBtn.addEventListener("pointercancel", cancelPress);
})();

async function refreshCurrentPage() {
const activePage = document.querySelector('.page.active-page');
if (!activePage) return;
const pageId = activePage.id.replace('-page', '');

try {
    switch (pageId) {
        case 'catalog':
            await fetch('https://placedgames.up.railway.app/api/products')
                .then(r => r.json())
                .then(() => renderCatalog())
                .catch(() => renderCatalog());
            break;
        case 'cart':
            renderCartPage();
            renderCheckoutBlock();
            break;
                    case 'orders':
            orderStatusFilter = "Все заказы";
            const orderSearchEl = document.getElementById('orderSearchInput');
            if (orderSearchEl) {
                orderSearchEl.value = '';
                document.getElementById('orderSearchClearBtn')?.classList.remove('visible');
            }
            await loadUserOrders().then(() => renderOrdersPage());
            break;
        case 'profile':
            await renderProfilePage();
            break;
        case 'wallet':
            await renderWalletPage();
            break;
        case 'reviews':
            await loadReviewsList(true);
            break;
        case 'order-detail':
            if (currentOpenOrder) {
                await fetch('https://placedgames.up.railway.app/api/refresh-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: currentOpenOrder.id })
                })
                .then(r => r.json())
                .then(updatedOrder => {
                    currentOpenOrder = updatedOrder;
                    const index = orders.findIndex(o => o.id == updatedOrder.id);
                    if (index !== -1) orders[index] = updatedOrder;
                    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
                    const isOwner = String(updatedOrder.user_id) === String(tgUserId);
                    showOrderDetail(updatedOrder, isOwner);
                    hapticLight();
                });
            }
            break;
        default:
            const fn = window[`render${pageId.charAt(0).toUpperCase() + pageId.slice(1)}Page`];
            if (typeof fn === 'function') await fn();
    }
} catch (e) {}
}
