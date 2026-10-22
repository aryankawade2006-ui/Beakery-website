const CART_KEY = 'sweetcrumbsCart';
const USERS_KEY = 'sweetcrumbsUsers';
const CURRENT_USER_KEY = 'sweetcrumbsCurrentUser';
const ORDERS_KEY = 'sweetcrumbsOrders';
const ADMIN_PASSWORD_KEY = 'sweetcrumbsAdminPassword';
const ADMIN_PASSWORD_HASH_KEY = 'sweetcrumbsAdminPasswordHash';
const ADMIN_PASSWORD_SALT_KEY = 'sweetcrumbsAdminPasswordSalt';

window.addEventListener('DOMContentLoaded', function () {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const navType = performance.getEntriesByType('navigation')[0]?.type;

    if (page === 'cart.html' && navType === 'reload') {
        localStorage.removeItem(CART_KEY);
    }

    startSlider();
    setupContactForm();
    setupFeedbackForm();
    setActivePage();
    setupCartButtons();
    setupCheckoutOptions();
    showCart();
    addJQueryEffects();
    window.addEventListener('storage', showCart);
});

function startSlider() {
    const slides = document.querySelectorAll('.slide');
    if (slides.length < 2) return;
    let current = 0;
    setInterval(function () {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 4000);
}

function validateForm(form) {
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();
    if (name.length < 2) return 'Please enter your name with at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (message.length < 10) return 'Please enter a message with at least 10 characters.';
    return '';
}

function setupContactForm() {
    const form = document.getElementById('contactForm');
    const messageBox = document.getElementById('formMessage');
    if (!form || !messageBox) return;
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const error = validateForm(form);
        messageBox.textContent = error || 'Your message has been sent successfully!';
        messageBox.className = 'form-message ' + (error ? 'error' : 'success');
        messageBox.style.display = 'block';
        if (!error) form.reset();
    });
}

function setupFeedbackForm() {
    const form = document.getElementById('feedbackForm');
    const status = document.getElementById('feedbackStatus');
    if (!form || !status) return;

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const feedback = form.elements.feedback.value.trim();
        const error = !form.elements.rating.value
            ? 'Please choose a rating.'
            : feedback.length < 10
                ? 'Please enter at least 10 characters of feedback.'
                : '';

        if (!error) {
            try {
                const savedFeedback = JSON.parse(localStorage.getItem('sweetcrumbsFeedback') || '[]');
                const entries = Array.isArray(savedFeedback) ? savedFeedback : [];
                entries.push({ rating: form.elements.rating.value, feedback: feedback, date: new Date().toISOString() });
                localStorage.setItem('sweetcrumbsFeedback', JSON.stringify(entries));
            } catch (storageError) {
                status.textContent = 'Feedback received for this visit, but could not be saved in this browser.';
                status.className = 'form-message error';
                status.style.display = 'block';
                return;
            }
        }

        status.textContent = error || 'Thank you! Your feedback has been saved in this browser.';
        status.className = 'form-message ' + (error ? 'error' : 'success');
        status.style.display = 'block';
        if (!error) form.reset();
    });
}

function setActivePage() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(function (link) {
        if (link.getAttribute('href') === page) link.classList.add('active-link');
    });
}

function getCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(saved) ? saved.map(function (item) {
            return {
                name: item && item.name ? item.name : 'Bakery Item',
                price: Number(item && item.price) || 0,
                image: item && item.image ? item.image : '',
                eggOption: item && item.eggOption ? item.eggOption : ''
            };
        }) : [];
    } catch (error) {
        return [];
    }
}

function getUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        return Array.isArray(users) ? users : [];
    } catch (error) {
        return [];
    }
}

function getCurrentUser() {
    try {
        const userId = localStorage.getItem(CURRENT_USER_KEY);
        return getUsers().find(function (user) { return user.id === userId; }) || null;
    } catch (error) {
        return null;
    }
}

function createPasswordSalt() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
}

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await window.crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 120000,
        hash: 'SHA-256'
    }, key, 256);
    return Array.from(new Uint8Array(bits), function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
}

window.SweetCrumbs = {
    USERS_KEY: USERS_KEY,
    CURRENT_USER_KEY: CURRENT_USER_KEY,
    ORDERS_KEY: ORDERS_KEY,
    ADMIN_PASSWORD_KEY: ADMIN_PASSWORD_KEY,
    ADMIN_PASSWORD_HASH_KEY: ADMIN_PASSWORD_HASH_KEY,
    ADMIN_PASSWORD_SALT_KEY: ADMIN_PASSWORD_SALT_KEY,
    getUsers: getUsers,
    getCurrentUser: getCurrentUser,
    createPasswordSalt: createPasswordSalt,
    hashPassword: hashPassword
};

function setupCartButtons() {
    document.querySelectorAll('.egg-option').forEach(function (select) {
        const updateDietTag = function () {
            const card = select.closest('.menu-content, .flavour-copy');
            const tag = card && card.querySelector('.diet-tag');
            if (!tag) return;

            const hasEgg = select.value === 'With Egg';
            tag.textContent = hasEgg ? tag.dataset.nonvegLabel : tag.dataset.vegLabel;
            tag.classList.toggle('is-nonveg', hasEgg);
        };

        select.addEventListener('change', updateDietTag);
        updateDietTag();
    });

    document.querySelectorAll('.add-to-cart').forEach(function (button) {
        button.addEventListener('click', function () {
            const card = button.closest('.menu-content, .flavour-copy');
            const eggOption = card && card.querySelector('.egg-option');
            const item = {
                name: button.dataset.name,
                price: Number(button.dataset.price),
                image: button.dataset.image,
                eggOption: eggOption ? eggOption.value : ''
            };
            const cart = getCart();
            cart.push(item);
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            button.textContent = 'Added';
            setTimeout(function () { button.textContent = 'Add to Cart'; }, 800);
        });
    });
}

function setupCheckoutOptions() {
    const form = document.getElementById('checkoutOptions');
    if (!form) return;

    const deliveryAddressField = document.getElementById('deliveryAddressField');
    const deliveryAddress = form.elements.deliveryAddress;
    const inspirationInput = document.getElementById('cakeInspiration');
    const inspirationPreview = document.getElementById('cakeInspirationPreview');
    const inspirationError = document.getElementById('cakeInspirationError');
    let inspirationImage = '';

    inspirationInput.addEventListener('change', function () {
        const file = inspirationInput.files[0];
        inspirationImage = '';
        inspirationPreview.replaceChildren();
        inspirationPreview.hidden = true;
        inspirationError.hidden = true;
        inspirationError.style.display = 'none';
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
            inspirationInput.value = '';
            inspirationError.textContent = 'Choose a JPG, PNG, or WebP image no larger than 1 MB.';
            inspirationError.hidden = false;
            inspirationError.style.display = 'block';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', function () {
            inspirationImage = typeof reader.result === 'string' ? reader.result : '';
            if (!inspirationImage) return;
            const previewImage = document.createElement('img');
            previewImage.src = inspirationImage;
            previewImage.alt = 'Selected cake inspiration preview';
            inspirationPreview.appendChild(previewImage);
            inspirationPreview.hidden = false;
        });
        reader.addEventListener('error', function () {
            inspirationError.textContent = 'This image could not be read. Please choose another file.';
            inspirationError.hidden = false;
            inspirationError.style.display = 'block';
        });
        reader.readAsDataURL(file);
    });

    const updateDeliveryAddress = function () {
        const needsAddress = form.elements.fulfillment.value === 'delivery';
        deliveryAddressField.hidden = !needsAddress;
        deliveryAddress.required = needsAddress;
    };

    form.querySelectorAll('input[name="fulfillment"]').forEach(function (input) {
        input.addEventListener('change', function () {
            updateDeliveryAddress();
            showCart();
        });
    });
    document.getElementById('giftPackaging').addEventListener('change', showCart);
    updateDeliveryAddress();

    const proceedButton = document.getElementById('proceedCheckout');
    const confirmButton = document.getElementById('confirmDemoOrder');
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutMessage = document.getElementById('checkoutModalMessage');
    if (!proceedButton || !confirmButton || !checkoutModal || !checkoutMessage) return;

    const modal = new bootstrap.Modal(checkoutModal);
    proceedButton.addEventListener('click', function () {
        if (!getCart().length) {
            window.alert('Your cart is empty. Add an item before checkout.');
            return;
        }
        if (!getCurrentUser()) {
            window.alert('Please sign in or create a profile before placing your order.');
            window.location.href = 'account.html';
            return;
        }
        if (!form.reportValidity()) return;

        const paymentMethod = form.elements.paymentMethod.value;
        const paymentLabel = paymentMethod === 'upi' ? 'UPI'
            : paymentMethod === 'bank-transfer' ? 'Direct Bank Transfer' : 'Cash on Delivery';
        checkoutMessage.textContent = paymentMethod === 'cod'
            ? 'Cash on Delivery selected. Order will be processed as a cash on delivery.'
            : paymentLabel + ' selected.';
        confirmButton.disabled = false;
        confirmButton.textContent = 'Complete demo order';
        modal.show();
    });

    confirmButton.addEventListener('click', function () {
        const cart = getCart();
        if (!cart.length) return;

        const fulfillment = form.elements.fulfillment.value;
        const subtotal = cart.reduce(function (sum, item) { return sum + item.price; }, 0);
        const giftPackaging = document.getElementById('giftPackaging').checked ? 50 : 0;
        const order = {
            id: 'SC-' + Date.now(),
            userId: getCurrentUser().id,
            customerName: getCurrentUser().name,
            customerEmail: getCurrentUser().email,
            items: cart,
            fulfillment: fulfillment,
            readyDate: form.elements.readyDate.value,
            timeSlot: form.elements.timeSlot.value,
            paymentMethod: form.elements.paymentMethod.value,
            deliveryAddress: fulfillment === 'delivery' ? form.elements.deliveryAddress.value.trim() : '',
            orderNotes: form.elements.orderNotes.value.trim(),
            inspirationImage: inspirationImage,
            giftPackaging: giftPackaging > 0,
            total: subtotal + giftPackaging,
            date: new Date().toISOString()
        };

        try {
            const savedOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
            const orders = Array.isArray(savedOrders) ? savedOrders : [];
            orders.push(order);
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
            localStorage.removeItem(CART_KEY);
        } catch (storageError) {
            checkoutMessage.textContent = 'This browser could not save the demo order. Your cart has not been cleared.';
            confirmButton.disabled = true;
            return;
        }

        checkoutMessage.textContent = 'Demo order ' + order.id + ' saved in this browser. No payment was processed.';
        confirmButton.disabled = true;
        confirmButton.textContent = 'Demo order saved';
        showCart();
    });
}

function showCart() {
    const list = document.getElementById('cartItems');
    if (!list) return;

    const cart = getCart();
    let subtotal = 0;

    list.replaceChildren();
    if (!cart.length) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-cart';
        emptyMessage.textContent = 'Your cart is empty.';
        list.appendChild(emptyMessage);
    }

    cart.forEach(function (item) {
        const price = Number(item.price) || 0;
        subtotal += price;
        const row = document.createElement('div');
        row.className = 'cart-item';

        const image = document.createElement('img');
        image.src = item.image;
        image.alt = item.name;

        const details = document.createElement('div');
        const name = document.createElement('h3');
        name.textContent = item.name;
        const description = document.createElement('p');
        description.textContent = item.eggOption ? item.eggOption + ' · 1 item' : '1 item';
        details.append(name, description);

        const itemPrice = document.createElement('span');
        itemPrice.textContent = '₹' + price;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-item';

        removeButton.addEventListener('click', function () {
            cart.splice(cart.indexOf(item), 1);
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            showCart();
        });
        row.append(image, details, itemPrice, removeButton);
        list.appendChild(row);
    });

    const fulfillment = document.querySelector('input[name="fulfillment"]:checked');
    const isDelivery = fulfillment && fulfillment.value === 'delivery';
    const giftSelected = document.getElementById('giftPackaging');
    const giftPackaging = subtotal > 0 && giftSelected && giftSelected.checked ? 50 : 0;
    const total = subtotal + giftPackaging;

    const subtotalValue = document.getElementById('subtotalValue');
    const deliveryValue = document.getElementById('deliveryValue');
    const giftPackagingSummary = document.getElementById('giftPackagingSummary');
    const giftPackagingValue = document.getElementById('giftPackagingValue');
    const totalValue = document.getElementById('totalValue');

    if (subtotalValue) subtotalValue.textContent = '₹' + subtotal;
    if (deliveryValue) deliveryValue.textContent = isDelivery && subtotal > 0 ? 'Calculated at checkout' : '₹0';
    if (giftPackagingSummary) giftPackagingSummary.hidden = giftPackaging === 0;
    if (giftPackagingValue) giftPackagingValue.textContent = '₹' + giftPackaging;
    if (totalValue) totalValue.textContent = '₹' + total;
}

function addJQueryEffects() {
    if (typeof jQuery === 'undefined') return;
    jQuery('.contact-card, .menu-card, .product-card, .category-card').hide().fadeIn(700);
    jQuery('.detail-item').hide().slideDown(500);
    jQuery('.product-card, .menu-card').hover(
        function () { jQuery(this).css({ transform: 'translateY(-8px)', transition: '.3s' }); },
        function () { jQuery(this).css('transform', 'translateY(0)'); }
    );
}
