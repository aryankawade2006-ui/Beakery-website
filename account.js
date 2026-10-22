(() => {
const {
    USERS_KEY,
    CURRENT_USER_KEY,
    ORDERS_KEY,
    ADMIN_PASSWORD_KEY,
    ADMIN_PASSWORD_HASH_KEY,
    ADMIN_PASSWORD_SALT_KEY,
    getUsers,
    getCurrentUser,
    createPasswordSalt,
    hashPassword
} = window.SweetCrumbs;

window.addEventListener('DOMContentLoaded', function () {
    setupAccountPage();
    setupAdminPage();
});

function setupAccountPage() {
    const accountPage = document.getElementById('accountPage');
    if (!accountPage) return;

    const signInForm = document.getElementById('signInForm');
    const registerForm = document.getElementById('registerForm');
    const accountMessage = document.getElementById('accountMessage');
    const signedInPanel = document.getElementById('signedInPanel');
    const accountForms = document.getElementById('accountForms');

    const setMessage = function (message, isError) {
        accountMessage.textContent = message;
        accountMessage.className = 'form-message ' + (isError ? 'error' : 'success');
        accountMessage.style.display = 'block';
    };

    const renderAccount = function () {
        const user = getCurrentUser();
        accountForms.hidden = Boolean(user);
        signedInPanel.hidden = !user;
        if (!user) return;

        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
        const orders = readOrders().filter(function (order) { return order.userId === user.id; });
        renderOrders(document.getElementById('profileOrders'), orders, false);
    };

    signInForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const email = signInForm.elements.email.value.trim().toLowerCase();
        const password = signInForm.elements.password.value;
        const user = getUsers().find(function (entry) { return entry.email === email; });
        let passwordMatches = false;
        try {
            if (user && user.passwordHash && user.passwordSalt) {
                passwordMatches = await hashPassword(password, user.passwordSalt) === user.passwordHash;
            } else if (user && user.password === password) {
                passwordMatches = true;
                user.passwordSalt = createPasswordSalt();
                user.passwordHash = await hashPassword(password, user.passwordSalt);
                delete user.password;
                localStorage.setItem(USERS_KEY, JSON.stringify(getUsers().map(function (entry) {
                    return entry.id === user.id ? user : entry;
                })));
            }
        } catch (error) {
            setMessage('Secure password storage is unavailable in this browser.', true);
            return;
        }
        if (!passwordMatches) {
            setMessage('Email or password is incorrect.', true);
            return;
        }
        localStorage.setItem(CURRENT_USER_KEY, user.id);
        signInForm.reset();
        renderAccount();
    });

    registerForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const name = registerForm.elements.name.value.trim();
        const email = registerForm.elements.email.value.trim().toLowerCase();
        const password = registerForm.elements.password.value;
        const users = getUsers();
        if (name.length < 2) {
            setMessage('Please enter your name with at least 2 characters.', true);
            return;
        }
        if (password.length < 8) {
            setMessage('Choose a password with at least 8 characters.', true);
            return;
        }
        if (users.some(function (user) { return user.email === email; })) {
            setMessage('An account already uses this email. Please sign in.', true);
            return;
        }

        let passwordSalt;
        let passwordHash;
        try {
            passwordSalt = createPasswordSalt();
            passwordHash = await hashPassword(password, passwordSalt);
        } catch (error) {
            setMessage('Secure password storage is unavailable in this browser.', true);
            return;
        }
        const user = { id: 'SCU-' + Date.now(), name: name, email: email, passwordSalt: passwordSalt, passwordHash: passwordHash };
        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_USER_KEY, user.id);
        registerForm.reset();
        renderAccount();
    });

    document.getElementById('signOutButton').addEventListener('click', function () {
        localStorage.removeItem(CURRENT_USER_KEY);
        accountMessage.style.display = 'none';
        renderAccount();
    });

    renderAccount();
}

function readOrders() {
    try {
        const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
        return Array.isArray(orders) ? orders : [];
    } catch (error) {
        return [];
    }
}

function renderOrders(container, orders, showCustomer) {
    container.replaceChildren();
    if (!orders.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-orders';
        empty.textContent = 'No orders yet.';
        container.appendChild(empty);
        return;
    }

    orders.slice().reverse().forEach(function (order) {
        const article = document.createElement('article');
        article.className = 'saved-order';
        const heading = document.createElement('div');
        heading.className = 'saved-order-heading';
        const title = document.createElement('h3');
        title.textContent = order.id;
        const total = document.createElement('strong');
        total.textContent = '₹' + (Number(order.total) || 0);
        heading.append(title, total);

        const details = document.createElement('p');
        const orderDate = order.date ? new Date(order.date).toLocaleString() : 'Date unavailable';
        details.textContent = orderDate + ' · ' + (order.fulfillment || 'Pickup') + ' · ' + (order.readyDate || 'Date not selected');
        article.append(heading, details);

        if (showCustomer) {
            const customer = document.createElement('p');
            customer.className = 'order-customer';
            customer.textContent = (order.customerName || 'Customer') + ' · ' + (order.customerEmail || 'No email');
            article.appendChild(customer);
        }

        const items = document.createElement('ul');
        (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
            const line = document.createElement('li');
            line.textContent = item.name + (item.eggOption ? ' (' + item.eggOption + ')' : '') + ' · ₹' + (Number(item.price) || 0);
            items.appendChild(line);
        });
        article.appendChild(items);

        if (order.deliveryAddress) {
            const address = document.createElement('p');
            address.textContent = 'Delivery: ' + order.deliveryAddress;
            article.appendChild(address);
        }
        if (order.orderNotes) {
            const notes = document.createElement('p');
            notes.textContent = 'Notes: ' + order.orderNotes;
            article.appendChild(notes);
        }
        if (typeof order.inspirationImage === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(order.inspirationImage)) {
            const inspiration = document.createElement('img');
            inspiration.className = 'order-inspiration';
            inspiration.src = order.inspirationImage;
            inspiration.alt = 'Customer cake inspiration';
            article.appendChild(inspiration);
        }
        container.appendChild(article);
    });
}

function setupAdminPage() {
    const adminPage = document.getElementById('adminPage');
    if (!adminPage) return;

    const setupForm = document.getElementById('adminSetupForm');
    const loginForm = document.getElementById('adminLoginForm');
    const dashboard = document.getElementById('adminDashboard');
    const message = document.getElementById('adminMessage');
    const storedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY);
    const storedPasswordHash = localStorage.getItem(ADMIN_PASSWORD_HASH_KEY);

    const setMessage = function (text, isError) {
        message.textContent = text;
        message.className = 'form-message ' + (isError ? 'error' : 'success');
        message.style.display = 'block';
    };
    setupForm.hidden = Boolean(storedPassword || storedPasswordHash);
    loginForm.hidden = !storedPassword && !storedPasswordHash;

    setupForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const password = setupForm.elements.password.value;
        if (password.length < 10) {
            setMessage('Choose an owner passcode with at least 10 characters.', true);
            return;
        }
        try {
            const salt = createPasswordSalt();
            localStorage.setItem(ADMIN_PASSWORD_SALT_KEY, salt);
            localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await hashPassword(password, salt));
        } catch (error) {
            setMessage('Secure password storage is unavailable in this browser.', true);
            return;
        }
        setupForm.hidden = true;
        loginForm.hidden = false;
        setupForm.reset();
        setMessage('Owner passcode saved in this browser. Sign in to view orders.', false);
    });

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const password = loginForm.elements.password.value;
        const expectedHash = localStorage.getItem(ADMIN_PASSWORD_HASH_KEY);
        let passwordMatches = password === localStorage.getItem(ADMIN_PASSWORD_KEY);
        try {
            if (expectedHash) {
                passwordMatches = await hashPassword(password, localStorage.getItem(ADMIN_PASSWORD_SALT_KEY)) === expectedHash;
            } else if (passwordMatches) {
                const salt = createPasswordSalt();
                localStorage.setItem(ADMIN_PASSWORD_SALT_KEY, salt);
                localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await hashPassword(password, salt));
                localStorage.removeItem(ADMIN_PASSWORD_KEY);
            }
        } catch (error) {
            setMessage('Secure password storage is unavailable in this browser.', true);
            return;
        }
        if (!passwordMatches) {
            setMessage('That passcode is incorrect.', true);
            return;
        }
        loginForm.hidden = true;
        dashboard.hidden = false;
        const orders = readOrders();
        document.getElementById('adminOrderCount').textContent = orders.length;
        renderOrders(document.getElementById('adminOrders'), orders, true);
    });
}
})();