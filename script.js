// XYZBank - Полноценная банковская система с выпуском карт и переводами

// ==================== СИСТЕМА ХРАНЕНИЯ ДАННЫХ ====================
const STORAGE_KEYS = {
    USERS: 'xyzbank_users_v2',
    CARDS: 'xyzbank_cards_v2',
    TRANSACTIONS: 'xyzbank_transactions_v2',
    CLICKER_DATA: 'xyzbank_clicker_data_v2',
    CURRENT_USER: 'xyzbank_current_user_v2'
};

// Инициализация данных при первом запуске
function initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const demoUser = createDemoUser();
        const users = [demoUser];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify([demoUser.cards[0]]));
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.CLICKER_DATA, JSON.stringify({}));
    }
}

// Создание демо-пользователя
function createDemoUser() {
    const userId = generateId('user');
    const cardId = generateId('card');
    
    return {
        id: userId,
        email: 'demo@xyzbank.ru',
        password: 'demo123',
        name: 'Демо Пользователь',
        balance: 10000,
        totalEarned: 10000,
        clicks: 1500,
        clicksToday: 0,
        lastClickDate: new Date().toDateString(),
        upgrades: {
            autoClicker: { level: 0, rate: 0 },
            doubleClick: { level: 0, multiplier: 1 },
            tripleClick: { level: 0, multiplier: 1 },
            timeWarp: { level: 0, multiplier: 1 }
        },
        cards: [{
            id: cardId,
            number: '4455 6677 8899 0011',
            type: 'debit',
            balance: 10000,
            currency: 'RUB',
            holder: 'DEMO USER',
            expiry: '12/28',
            cvv: '123',
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString()
        }],
        tier: 'basic',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
}

// ==================== УТИЛИТЫ ====================
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' ₽';
}

function formatCardNumber(number) {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function validateCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    return /^\d{16}$/.test(cleaned);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return 'Сегодня';
    if (diff < 172800000) return 'Вчера';
    
    return date.toLocaleDateString('ru-RU');
}

// ==================== УПРАВЛЕНИЕ ДАННЫМИ ====================
let currentUser = null;
let autoClickerInterval = null;

function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getCards() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CARDS)) || [];
}

function saveCards(cards) {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
}

function getTransactions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
}

function saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

function getClickerData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLICKER_DATA)) || {};
}

function saveClickerData(data) {
    localStorage.setItem(STORAGE_KEYS.CLICKER_DATA, JSON.stringify(data));
}

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================
function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        showNotification('Неверный email или пароль', 'error');
        return false;
    }
    
    currentUser = { ...user };
    currentUser.lastLogin = new Date().toISOString();
    
    // Обновляем пользователя в хранилище
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        saveUsers(users);
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    
    // Проверяем, новый ли день для кликера
    const today = new Date().toDateString();
    if (currentUser.lastClickDate !== today) {
        currentUser.clicksToday = 0;
        currentUser.lastClickDate = today;
    }
    
    updateUI();
    showNotification(`Добро пожаловать, ${currentUser.name}!`, 'success');
    startAutoClicker();
    
    return true;
}

function registerUser(name, email, password) {
    const users = getUsers();
    
    if (users.find(u => u.email === email)) {
        showNotification('Пользователь с таким email уже существует', 'error');
        return false;
    }
    
    if (!validateEmail(email)) {
        showNotification('Введите корректный email', 'error');
        return false;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return false;
    }
    
    const userId = generateId('user');
    const cardId = generateId('card');
    
    // Генерируем случайный номер карты
    const generateCardNumber = () => {
        let number = '';
        for (let i = 0; i < 16; i++) {
            number += Math.floor(Math.random() * 10);
        }
        return formatCardNumber(number);
    };
    
    const newUser = {
        id: userId,
        email,
        password,
        name,
        balance: 1000, // Стартовый бонус
        totalEarned: 1000,
        clicks: 0,
        clicksToday: 0,
        lastClickDate: new Date().toDateString(),
        upgrades: {
            autoClicker: { level: 0, rate: 0 },
            doubleClick: { level: 0, multiplier: 1 },
            tripleClick: { level: 0, multiplier: 1 },
            timeWarp: { level: 0, multiplier: 1 }
        },
        cards: [{
            id: cardId,
            number: generateCardNumber(),
            type: 'debit',
            balance: 1000,
            currency: 'RUB',
            holder: name.toUpperCase(),
            expiry: '12/28',
            cvv: Math.floor(100 + Math.random() * 900).toString(),
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString()
        }],
        tier: 'basic',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Сохраняем карту отдельно
    const cards = getCards();
    cards.push(newUser.cards[0]);
    saveCards(cards);
    
    // Добавляем стартовую транзакцию
    addTransaction({
        userId: newUser.id,
        type: 'bonus',
        amount: 1000,
        description: 'Регистрационный бонус',
        status: 'completed'
    });
    
    showNotification('Аккаунт успешно создан! Получен бонус 1000 рублей!', 'success');
    return loginUser(email, password);
}

function logout() {
    if (autoClickerInterval) {
        clearInterval(autoClickerInterval);
        autoClickerInterval = null;
    }
    
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    updateUI();
    showNotification('Вы вышли из системы', 'info');
}

// ==================== СИСТЕМА КАРТ ====================
function issueCard(cardType) {
    if (!currentUser) return false;
    
    const cardId = generateId('card');
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const year = String(expiryDate.getFullYear()).slice(-2);
    
    // Генерируем уникальный номер карты
    let cardNumber;
    let isUnique = false;
    const existingCards = getCards();
    
    while (!isUnique) {
        let number = '';
        for (let i = 0; i < 16; i++) {
            number += Math.floor(Math.random() * 10);
        }
        cardNumber = formatCardNumber(number);
        
        if (!existingCards.find(card => card.number === cardNumber)) {
            isUnique = true;
        }
    }
    
    const newCard = {
        id: cardId,
        number: cardNumber,
        type: cardType,
        balance: 0,
        currency: 'RUB',
        holder: currentUser.name.toUpperCase(),
        expiry: `${month}/${year}`,
        cvv: Math.floor(100 + Math.random() * 900).toString(),
        isActive: true,
        isDefault: currentUser.cards.length === 0,
        userId: currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    // Добавляем карту пользователю
    if (!currentUser.cards) currentUser.cards = [];
    currentUser.cards.push(newCard);
    
    // Сохраняем в общем хранилище карт
    const cards = getCards();
    cards.push(newCard);
    saveCards(cards);
    
    // Обновляем пользователя
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        saveUsers(users);
    }
    
    // Добавляем транзакцию
    addTransaction({
        userId: currentUser.id,
        type: 'card_issue',
        amount: 0,
        description: `Выпуск ${cardType === 'premium' ? 'премиум' : 'дебетовой'} карты`,
        status: 'completed'
    });
    
    updateDashboard();
    showNotification(`Карта успешно выпущена! Номер: ${cardNumber}`, 'success');
    return true;
}

function getCardByNumber(cardNumber) {
    const cards = getCards();
    return cards.find(card => card.number === cardNumber);
}

function getUserByCardNumber(cardNumber) {
    const card = getCardByNumber(cardNumber);
    if (!card) return null;
    
    const users = getUsers();
    return users.find(user => user.id === card.userId);
}

function getUserByEmail(email) {
    const users = getUsers();
    return users.find(user => user.email === email);
}

// ==================== СИСТЕМА ПЕРЕВОДОВ ====================
function transferMoney(fromUserId, toIdentifier, amount, description = '') {
    if (!currentUser) {
        showNotification('Войдите в систему для выполнения перевода', 'error');
        return false;
    }
    
    if (fromUserId !== currentUser.id) {
        showNotification('Ошибка доступа', 'error');
        return false;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return false;
    }
    
    if (currentUser.balance < amount) {
        showNotification('Недостаточно средств на счете', 'error');
        return false;
    }
    
    let recipient = null;
    let recipientCard = null;
    
    // Определяем получателя
    if (validateEmail(toIdentifier)) {
        // Перевод по email
        recipient = getUserByEmail(toIdentifier);
        if (!recipient) {
            showNotification('Пользователь с таким email не найден', 'error');
            return false;
        }
        
        // Находим карту по умолчанию получателя
        recipientCard = recipient.cards?.find(card => card.isDefault);
        if (!recipientCard) {
            showNotification('У получателя нет активных карт', 'error');
            return false;
        }
    } else {
        // Перевод по номеру карты
        const cleanedNumber = toIdentifier.replace(/\s/g, '');
        if (!validateCardNumber(cleanedNumber)) {
            showNotification('Неверный номер карты', 'error');
            return false;
        }
        
        recipientCard = getCardByNumber(formatCardNumber(cleanedNumber));
        if (!recipientCard) {
            showNotification('Карта получателя не найдена', 'error');
            return false;
        }
        
        recipient = getUserByCardNumber(recipientCard.number);
        if (!recipient) {
            showNotification('Владелец карты не найден', 'error');
            return false;
        }
    }
    
    if (recipient.id === currentUser.id) {
        showNotification('Нельзя переводить деньги самому себе', 'error');
        return false;
    }
    
    // Вычисляем комиссию (1.5% но не менее 10 рублей и не более 1000)
    const commission = Math.min(1000, Math.max(10, amount * 0.015));
    const totalAmount = amount + commission;
    
    if (currentUser.balance < totalAmount) {
        showNotification(`Недостаточно средств с учетом комиссии ${formatCurrency(commission)}`, 'error');
        return false;
    }
    
    // Находим карту отправителя по умолчанию
    const senderCard = currentUser.cards?.find(card => card.isDefault);
    
    // Выполняем перевод
    currentUser.balance -= totalAmount;
    recipient.balance += amount;
    
    // Обновляем баланс карт
    if (senderCard) {
        senderCard.balance -= totalAmount;
    }
    
    if (recipientCard) {
        recipientCard.balance += amount;
    }
    
    // Сохраняем изменения
    const users = getUsers();
    
    // Обновляем отправителя
    const senderIndex = users.findIndex(u => u.id === currentUser.id);
    if (senderIndex !== -1) {
        users[senderIndex] = currentUser;
    }
    
    // Обновляем получателя
    const recipientIndex = users.findIndex(u => u.id === recipient.id);
    if (recipientIndex !== -1) {
        users[recipientIndex] = recipient;
    }
    
    saveUsers(users);
    
    // Обновляем карты
    const cards = getCards();
    
    if (senderCard) {
        const senderCardIndex = cards.findIndex(c => c.id === senderCard.id);
        if (senderCardIndex !== -1) {
            cards[senderCardIndex] = senderCard;
        }
    }
    
    if (recipientCard) {
        const recipientCardIndex = cards.findIndex(c => c.id === recipientCard.id);
        if (recipientCardIndex !== -1) {
            cards[recipientCardIndex] = recipientCard;
        }
    }
    
    saveCards(cards);
    
    // Добавляем транзакции
    const transactionId = generateId('trans');
    
    // Транзакция для отправителя
    addTransaction({
        id: transactionId + '_out',
        userId: currentUser.id,
        type: 'transfer_out',
        amount: -amount,
        description: description || `Перевод ${recipient.name}`,
        status: 'completed',
        details: {
            toCard: recipientCard?.number,
            commission: commission
        }
    });
    
    // Транзакция для получателя
    addTransaction({
        id: transactionId + '_in',
        userId: recipient.id,
        type: 'transfer_in',
        amount: amount,
        description: description || `Перевод от ${currentUser.name}`,
        status: 'completed',
        details: {
            fromCard: senderCard?.number
        }
    });
    
    updateUI();
    updateDashboard();
    
    showNotification(
        `Перевод ${formatCurrency(amount)} выполнен успешно! ` +
        `Комиссия: ${formatCurrency(commission)}. ` +
        `Баланс получателя: ${formatCurrency(recipient.balance)}`,
        'success'
    );
    
    return true;
}

function addTransaction(transactionData) {
    const transactions = getTransactions();
    
    const transaction = {
        id: transactionData.id || generateId('trans'),
        userId: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description,
        status: transactionData.status || 'completed',
        details: transactionData.details || {},
        timestamp: new Date().toISOString()
    };
    
    transactions.push(transaction);
    saveTransactions(transactions);
    return transaction;
}

// ==================== СИСТЕМА КЛИКЕРА ====================
function handleClick() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Проверяем лимит на день (1000 кликов)
    if (currentUser.clicksToday >= 1000) {
        showNotification('Достигнут дневной лимит кликов (1000)', 'warning');
        return;
    }
    
    // Вычисляем доход за клик
    const baseEarning = 1;
    const multiplier = currentUser.upgrades.doubleClick.multiplier * 
                      currentUser.upgrades.tripleClick.multiplier * 
                      currentUser.upgrades.timeWarp.multiplier;
    const earnings = Math.round(baseEarning * multiplier);
    
    // Обновляем данные пользователя
    currentUser.balance += earnings;
    currentUser.totalEarned += earnings;
    currentUser.clicks += 1;
    currentUser.clicksToday += 1;
    
    // Обновляем карту по умолчанию
    const defaultCard = currentUser.cards?.find(card => card.isDefault);
    if (defaultCard) {
        defaultCard.balance += earnings;
        
        // Обновляем карту в общем хранилище
        const cards = getCards();
        const cardIndex = cards.findIndex(c => c.id === defaultCard.id);
        if (cardIndex !== -1) {
            cards[cardIndex] = defaultCard;
            saveCards(cards);
        }
    }
    
    // Сохраняем пользователя
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        saveUsers(users);
    }
    
    // Добавляем транзакцию
    addTransaction({
        userId: currentUser.id,
        type: 'clicker',
        amount: earnings,
        description: 'Заработок в кликере',
        status: 'completed'
    });
    
    // Обновляем UI
    updateClickerUI();
    updateDashboard();
    
    // Анимация
    createCoinAnimation(earnings);
    
    // Звуковой эффект
    playClickSound();
}

function buyUpgrade(upgradeType) {
    if (!currentUser) return;
    
    const upgrade = currentUser.upgrades[upgradeType];
    if (!upgrade) return;
    
    // Определяем стоимость и максимальный уровень
    const upgradeConfig = {
        'auto-clicker': { baseCost: 1000, maxLevel: 10, multiplier: 0.5 },
        'double-click': { baseCost: 5000, maxLevel: 5, multiplier: 0.5 },
        'triple-click': { baseCost: 15000, maxLevel: 3, multiplier: 1 },
        'time-warp': { baseCost: 50000, maxLevel: 2, multiplier: 1.5 }
    };
    
    const config = upgradeConfig[upgradeType];
    if (!config) return;
    
    if (upgrade.level >= config.maxLevel) {
        showNotification('Максимальный уровень улучшения достигнут', 'warning');
        return;
    }
    
    const cost = config.baseCost * Math.pow(2, upgrade.level);
    
    if (currentUser.balance >= cost) {
        // Покупаем улучшение
        currentUser.balance -= cost;
        upgrade.level += 1;
        
        // Применяем эффект улучшения
        switch(upgradeType) {
            case 'auto-clicker':
                upgrade.rate = config.multiplier * upgrade.level;
                startAutoClicker();
                break;
            case 'double-click':
                upgrade.multiplier = 1 + (config.multiplier * upgrade.level);
                break;
            case 'triple-click':
                upgrade.multiplier = 1 + (config.multiplier * upgrade.level);
                break;
            case 'time-warp':
                upgrade.multiplier = 1 + (config.multiplier * upgrade.level);
                break;
        }
        
        // Сохраняем пользователя
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            saveUsers(users);
        }
        
        // Добавляем транзакцию
        addTransaction({
            userId: currentUser.id,
            type: 'upgrade',
            amount: -cost,
            description: `Покупка улучшения: ${getUpgradeName(upgradeType)}`,
            status: 'completed'
        });
        
        // Обновляем UI
        updateClickerUI();
        updateDashboard();
        
        showNotification(`Улучшение "${getUpgradeName(upgradeType)}" куплено! Уровень ${upgrade.level}`, 'success');
    } else {
        showNotification('Недостаточно средств для покупки улучшения', 'error');
    }
}

function getUpgradeName(type) {
    const names = {
        'auto-clicker': 'Автокликер',
        'double-click': 'Двойной клик',
        'triple-click': 'Тройной клик',
        'time-warp': 'Искажение времени'
    };
    return names[type] || type;
}

function startAutoClicker() {
    if (autoClickerInterval) {
        clearInterval(autoClickerInterval);
    }
    
    if (currentUser && currentUser.upgrades.autoClicker.level > 0) {
        const rate = currentUser.upgrades.autoClicker.rate;
        
        autoClickerInterval = setInterval(() => {
            if (currentUser && currentUser.clicksToday < 1000) {
                // Автоклик работает
                currentUser.balance += rate;
                currentUser.totalEarned += rate;
                
                // Обновляем карту по умолчанию
                const defaultCard = currentUser.cards?.find(card => card.isDefault);
                if (defaultCard) {
                    defaultCard.balance += rate;
                }
                
                // Сохраняем пользователя
                const users = getUsers();
                const userIndex = users.findIndex(u => u.id === currentUser.id);
                if (userIndex !== -1) {
                    users[userIndex] = currentUser;
                    saveUsers(users);
                }
                
                // Добавляем транзакцию
                addTransaction({
                    userId: currentUser.id,
                    type: 'auto-clicker',
                    amount: rate,
                    description: 'Автокликер',
                    status: 'completed'
                });
                
                updateClickerUI();
                updateDashboard();
            }
        }, 1000); // Каждую секунду
    }
}

// ==================== UI ОБНОВЛЕНИЯ ====================
function updateUI() {
    updateNavbar();
    updateHeroSection();
    updateClickerSection();
}

function updateNavbar() {
    const navActions = document.getElementById('navActions');
    if (!navActions) return;
    
    if (currentUser) {
        navActions.innerHTML = `
            <div class="user-balance-nav">
                <i class="fas fa-wallet"></i>
                <span>${formatCurrency(currentUser.balance)}</span>
            </div>
            <button class="btn btn-outline" id="userLogoutBtn">
                <i class="fas fa-sign-out-alt"></i> Выйти
            </button>
        `;
        
        document.getElementById('userLogoutBtn')?.addEventListener('click', logout);
    } else {
        navActions.innerHTML = `
            <button class="btn btn-outline" id="navLoginBtn">
                <i class="fas fa-sign-in-alt"></i> Вход
            </button>
            <button class="btn btn-primary" id="navRegisterBtn">
                <i class="fas fa-user-plus"></i> Регистрация
            </button>
        `;
        
        document.getElementById('navLoginBtn')?.addEventListener('click', showLoginModal);
        document.getElementById('navRegisterBtn')?.addEventListener('click', showRegisterModal);
    }
}

function updateHeroSection() {
    const heroActions = document.getElementById('heroActions');
    if (!heroActions) return;
    
    if (currentUser) {
        heroActions.innerHTML = `
            <button class="btn btn-primary btn-large" onclick="scrollToSection('clicker')">
                <i class="fas fa-mouse-pointer"></i> Начать зарабатывать
            </button>
            <button class="btn btn-secondary btn-large" onclick="scrollToSection('dashboard')">
                <i class="fas fa-chart-line"></i> Личный кабинет
            </button>
        `;
    } else {
        heroActions.innerHTML = `
            <button class="btn btn-primary btn-large" id="heroLoginBtn">
                <i class="fas fa-sign-in-alt"></i> Войти в систему
            </button>
            <button class="btn btn-secondary btn-large" id="heroRegisterBtn">
                <i class="fas fa-user-plus"></i> Создать аккаунт
            </button>
        `;
        
        document.getElementById('heroLoginBtn')?.addEventListener('click', showLoginModal);
        document.getElementById('heroRegisterBtn')?.addEventListener('click', showRegisterModal);
    }
}

function updateClickerSection() {
    const clickerGame = document.getElementById('clickerGame');
    const loginPrompt = document.getElementById('loginPrompt');
    
    if (currentUser) {
        if (clickerGame) clickerGame.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
        updateClickerUI();
    } else {
        if (clickerGame) clickerGame.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'flex';
    }
}

function updateClickerUI() {
    if (!currentUser) return;
    
    // Обновляем статистику
    const elements = {
        'balance': formatCurrency(currentUser.balance),
        'totalEarned': formatCurrency(currentUser.totalEarned),
        'clicksToday': `${currentUser.clicksToday}/1000`,
        'multiplier': `${getTotalMultiplier()}x`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // Обновляем улучшения
    updateUpgradeUI('auto-clicker', currentUser.upgrades.autoClicker);
    updateUpgradeUI('double-click', currentUser.upgrades.doubleClick);
    updateUpgradeUI('triple-click', currentUser.upgrades.tripleClick);
    updateUpgradeUI('time-warp', currentUser.upgrades.timeWarp);
}

function getTotalMultiplier() {
    if (!currentUser) return 1;
    return currentUser.upgrades.doubleClick.multiplier * 
           currentUser.upgrades.tripleClick.multiplier * 
           currentUser.upgrades.timeWarp.multiplier;
}

function updateUpgradeUI(type, upgrade) {
    const upgradeConfig = {
        'auto-clicker': { baseCost: 1000, maxLevel: 10 },
        'double-click': { baseCost: 5000, maxLevel: 5 },
        'triple-click': { baseCost: 15000, maxLevel: 3 },
        'time-warp': { baseCost: 50000, maxLevel: 2 }
    };
    
    const config = upgradeConfig[type];
    if (!config) return;
    
    const levelElement = document.getElementById(`level-${type.split('-')[0]}`);
    const progressElement = document.getElementById(`progress-${type.split('-')[0]}`);
    
    if (levelElement) {
        levelElement.textContent = upgrade.level;
    }
    
    if (progressElement) {
        const progress = (upgrade.level / config.maxLevel) * 100;
        progressElement.style.width = `${progress}%`;
        
        // Обновляем стоимость
        const cost = config.baseCost * Math.pow(2, upgrade.level);
        const upgradeElement = document.querySelector(`[data-upgrade="${type}"]`);
        
        if (upgradeElement) {
            const costElement = upgradeElement.querySelector('.upgrade-cost');
            const button = upgradeElement.querySelector('.buy-upgrade');
            
            if (costElement) {
                costElement.textContent = `${formatCurrency(cost)}`;
            }
            
            if (button) {
                if (upgrade.level >= config.maxLevel) {
                    button.innerHTML = '<i class="fas fa-check"></i> Макс. ур.';
                    button.disabled = true;
                    button.classList.add('disabled');
                } else {
                    button.innerHTML = '<i class="fas fa-shopping-cart"></i> Купить';
                    button.disabled = false;
                    button.classList.remove('disabled');
                }
            }
        }
    }
}

function updateDashboard() {
    if (!currentUser) return;
    
    // Обновляем информацию пользователя
    const userInfo = {
        'userName': currentUser.name,
        'userEmail': currentUser.email,
        'userBalance': formatCurrency(currentUser.balance),
        'userId': currentUser.id.slice(0, 8).toUpperCase(),
        'userTier': currentUser.tier
    };
    
    Object.entries(userInfo).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'userTier') {
                element.textContent = value.charAt(0).toUpperCase() + value.slice(1);
                element.className = `tier-badge ${value}`;
            } else {
                element.textContent = value;
            }
        }
    });
    
    // Обновляем статистику кликера
    const stats = {
        'statsTotal': formatCurrency(currentUser.totalEarned),
        'statsClicks': currentUser.clicks,
        'statsToday': currentUser.clicksToday,
        'statsMultiplier': `${getTotalMultiplier()}x`
    };
    
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // Обновляем список карт
    updateCardsList();
    
    // Обновляем историю операций
    updateHistoryList();
    
    // Обновляем список пользователей
    updateUsersList();
}

function updateCardsList() {
    const cardsList = document.getElementById('cardsList');
    if (!cardsList) return;
    
    if (!currentUser.cards || currentUser.cards.length === 0) {
        cardsList.innerHTML = `
            <div class="no-cards">
                <i class="fas fa-credit-card"></i>
                <p>У вас пока нет карт</p>
                <button class="btn btn-primary" id="addFirstCardBtn">
                    <i class="fas fa-plus"></i> Выпустить первую карту
                </button>
            </div>
        `;
        
        document.getElementById('addFirstCardBtn')?.addEventListener('click', showCardModal);
        return;
    }
    
    cardsList.innerHTML = currentUser.cards.map(card => `
        <div class="card-item ${card.type === 'premium' ? 'premium' : ''}">
            <div class="card-item-header">
                <div class="card-type">
                    <i class="fas fa-${card.type === 'premium' ? 'crown' : 'credit-card'}"></i>
                    <span>${card.type === 'premium' ? 'Премиум карта' : 'Дебетовая карта'}</span>
                </div>
                <div class="card-balance">${formatCurrency(card.balance)}</div>
            </div>
            
            <div class="card-number-display">
                ${card.number}
                <button class="copy-btn" onclick="copyToClipboard('${card.number}')" 
                        title="Копировать номер карты">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            
            <div class="card-details">
                <div class="card-holder">
                    <span class="detail-label">Держатель:</span>
                    <span class="detail-value">${card.holder}</span>
                </div>
                <div class="card-expiry">
                    <span class="detail-label">Срок:</span>
                    <span class="detail-value">${card.expiry}</span>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-sm btn-outline" onclick="transferFromCard('${card.number}')">
                    <i class="fas fa-paper-plane"></i> Перевести
                </button>
                <button class="btn btn-sm btn-outline" onclick="showCardDetails('${card.id}')">
                    <i class="fas fa-info-circle"></i> Подробнее
                </button>
                ${card.isDefault ? '<span class="default-badge">Основная</span>' : ''}
            </div>
        </div>
    `).join('');
}

function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    const transactions = getTransactions()
        .filter(t => t.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    if (transactions.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <i class="fas fa-history"></i>
                <p>Нет операций</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = transactions.map(transaction => `
        <div class="history-item">
            <div class="history-info">
                <div class="history-title">${transaction.description}</div>
                <div class="history-date">
                    <i class="far fa-clock"></i>
                    ${formatDate(transaction.timestamp)}
                </div>
            </div>
            <div class="history-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                ${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

function updateUsersList() {
    const usersList = document.getElementById('usersList');
    const totalUsers = document.getElementById('totalUsers');
    const totalBalance = document.getElementById('totalBalance');
    
    if (!usersList || !totalUsers || !totalBalance) return;
    
    const users = getUsers()
        .filter(user => user.id !== currentUser.id)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5);
    
    // Общая статистика
    const allUsers = getUsers();
    totalUsers.textContent = allUsers.length;
    
    const systemBalance = allUsers.reduce((sum, user) => sum + user.balance, 0);
    totalBalance.textContent = formatCurrency(systemBalance);
    
    if (users.length === 0) {
        usersList.innerHTML = `
            <div class="no-users">
                <i class="fas fa-users"></i>
                <p>Других пользователей пока нет</p>
            </div>
        `;
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-list-item">
            <div class="user-list-info">
                <h4>${user.name}</h4>
                <p>${user.email}</p>
            </div>
            <div class="user-list-balance">
                ${formatCurrency(user.balance)}
            </div>
        </div>
    `).join('');
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showTransferModal() {
    const modal = document.getElementById('transferModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Сброс формы
    const form = document.getElementById('transferForm');
    if (form) form.reset();
    
    // Сброс значений комиссии
    updateCommission(0);
    
    // Установка активной вкладки
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    const firstTab = tabs[0];
    const firstContent = document.getElementById(`tab-${firstTab.dataset.tab}`);
    
    if (firstTab && firstContent) {
        firstTab.classList.add('active');
        firstContent.classList.add('active');
    }
}

function showCardModal() {
    const modal = document.getElementById('cardModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Выбор типа карты по умолчанию
    const options = document.querySelectorAll('.card-option');
    options.forEach(option => option.classList.remove('active'));
    if (options[0]) options[0].classList.add('active');
}

function hideModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ UI ====================
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        
        // Обновляем активную ссылку в навигации
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

function createCoinAnimation(amount) {
    const container = document.getElementById('coinAnimation');
    if (!container) return;
    
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.textContent = `+${amount}`;
    coin.style.left = `${Math.random() * 80 + 10}%`;
    coin.style.top = `${Math.random() * 80 + 10}%`;
    
    container.appendChild(coin);
    
    setTimeout(() => {
        coin.remove();
    }, 1000);
}

function playClickSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Если AudioContext не поддерживается, пропускаем звук
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer') || document.body;
    
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => {
        n.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => n.remove(), 300);
    });
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Закрытие по клику
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text.replace(/\s/g, '')).then(() => {
        showNotification('Номер карты скопирован в буфер обмена', 'success');
    }).catch(err => {
        showNotification('Не удалось скопировать номер карты', 'error');
    });
}

function updateCommission(amount) {
    const commission = Math.min(1000, Math.max(10, amount * 0.015));
    const total = amount + commission;
    
    const commissionElement = document.getElementById('commission');
    const totalElement = document.getElementById('totalToDeduct');
    
    if (commissionElement) commissionElement.textContent = formatCurrency(commission);
    if (totalElement) totalElement.textContent = formatCurrency(total);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Мобильное меню
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.innerHTML = navMenu.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
    }
    
    // Закрытие мобильного меню при клике на ссылку
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const navMenu = document.getElementById('navMenu');
            const menuToggle = document.getElementById('menuToggle');
            if (navMenu?.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (menuToggle) {
                    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        });
    });
    
    // Кликер
    const clickButton = document.getElementById('clickButton');
    if (clickButton) {
        clickButton.addEventListener('click', handleClick);
    }
    
    // Улучшения
    document.querySelectorAll('.buy-upgrade').forEach(button => {
        button.addEventListener('click', function() {
            const upgradeItem = this.closest('.upgrade-item');
            const upgradeType = upgradeItem?.dataset.upgrade;
            if (upgradeType) {
                buyUpgrade(upgradeType);
            }
        });
    });
    
    // Кнопки в кликере
    document.getElementById('promptLoginBtn')?.addEventListener('click', showLoginModal);
    document.getElementById('promptRegisterBtn')?.addEventListener('click', showRegisterModal);
    
    // Кнопки в личном кабинете
    document.getElementById('quickTransferBtn')?.addEventListener('click', showTransferModal);
    document.getElementById('quickTransferBtn2')?.addEventListener('click', () => {
        const cardNumber = document.getElementById('quickCardNumber')?.value;
        const amount = parseFloat(document.getElementById('quickAmount')?.value);
        
        if (cardNumber && amount) {
            if (transferMoney(currentUser.id, cardNumber, amount, 'Быстрый перевод')) {
                document.getElementById('quickCardNumber').value = '';
                document.getElementById('quickAmount').value = '';
            }
        } else {
            showTransferModal();
        }
    });
    
    document.getElementById('issueCardBtnMain')?.addEventListener('click', showCardModal);
    document.getElementById('addCardBtn')?.addEventListener('click', showCardModal);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshBalance')?.addEventListener('click', updateDashboard);
    document.getElementById('clearHistory')?.addEventListener('click', () => {
        if (confirm('Очистить историю операций?')) {
            // Очищаем только транзакции текущего пользователя
            const transactions = getTransactions();
            const filteredTransactions = transactions.filter(t => t.userId !== currentUser.id);
            saveTransactions(filteredTransactions);
            updateHistoryList();
            showNotification('История операций очищена', 'success');
        }
    });
    
    // Закрытие модальных окон
    document.getElementById('closeLoginModal')?.addEventListener('click', hideModals);
    document.getElementById('closeRegisterModal')?.addEventListener('click', hideModals);
    document.getElementById('closeTransferModal')?.addEventListener('click', hideModals);
    document.getElementById('closeCardModal')?.addEventListener('click', hideModals);
    
    // Переключение между модальными окнами
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideModals();
        setTimeout(showRegisterModal, 300);
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideModals();
        setTimeout(showLoginModal, 300);
    });
    
    // Форма входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (loginUser(email, password)) {
                hideModals();
            }
        });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            if (registerUser(name, email, password)) {
                hideModals();
            }
        });
    }
    
    // Форма перевода
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const activeTab = document.querySelector('.tab-btn.active');
            const transferType = activeTab?.dataset.tab;
            
            let recipient = '';
            if (transferType === 'email') {
                recipient = document.getElementById('transferEmail').value;
                if (!validateEmail(recipient)) {
                    showNotification('Введите корректный email', 'error');
                    return;
                }
            } else {
                recipient = document.getElementById('transferCardNumber').value;
                if (!validateCardNumber(recipient.replace(/\s/g, ''))) {
                    showNotification('Введите корректный номер карты', 'error');
                    return;
                }
            }
            
            const amount = parseFloat(document.getElementById('transferAmount').value);
            const description = document.getElementById('transferMessage').value;
            
            if (transferMoney(currentUser.id, recipient, amount, description)) {
                hideModals();
            }
        });
    }
    
    // Выпуск карты
    document.getElementById('issueCardBtn')?.addEventListener('click', () => {
        const selectedOption = document.querySelector('.card-option.active');
        const cardType = selectedOption?.dataset.type || 'debit';
        
        if (issueCard(cardType)) {
            hideModals();
        }
    });
    
    // Выбор типа карты
    document.querySelectorAll('.card-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.card-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
    
    // Переключение вкладок в форме перевода
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.dataset.tab;
            
            // Обновляем активную вкладку
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const content = document.getElementById(`tab-${tabType}`);
            if (content) content.classList.add('active');
        });
    });
    
    // Расчет комиссии в реальном времени
    const transferAmountInput = document.getElementById('transferAmount');
    if (transferAmountInput) {
        transferAmountInput.addEventListener('input', () => {
            const amount = parseFloat(transferAmountInput.value) || 0;
            updateCommission(amount);
        });
    }
    
    // Форматирование номера карты при вводе
    const cardInputs = document.querySelectorAll('input[type="text"][id*="CardNumber"]');
    cardInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            if (value.length > 16) value = value.substring(0, 16);
            
            // Добавляем пробелы через каждые 4 цифры
            const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = formatted;
        });
    });
    
    // Закрытие модальных окон при клике вне
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });
    
    // Закрытие модальных окон при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModals();
        }
    });
    
    // Прокрутка при загрузке страницы с хэшем
    window.addEventListener('load', () => {
        if (window.location.hash) {
            const sectionId = window.location.hash.substring(1);
            setTimeout(() => scrollToSection(sectionId), 100);
        }
    });
    
    // Обновление хэша при прокрутке
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
        
        // Обновляем URL без перезагрузки страницы
        if (current) {
            history.replaceState(null, null, `#${current}`);
        }
    });
    
    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем хранилище
    initializeStorage();
    
    // Проверяем авторизацию
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            
            // Обновляем пользователя из основного хранилища
            const users = getUsers();
            const updatedUser = users.find(u => u.id === currentUser.id);
            if (updatedUser) {
                currentUser = updatedUser;
                
                // Проверяем, новый ли день для кликера
                const today = new Date().toDateString();
                if (currentUser.lastClickDate !== today) {
                    currentUser.clicksToday = 0;
                    currentUser.lastClickDate = today;
                    
                    // Сохраняем изменения
                    const userIndex = users.findIndex(u => u.id === currentUser.id);
                    if (userIndex !== -1) {
                        users[userIndex] = currentUser;
                        saveUsers(users);
                    }
                }
            }
            
            startAutoClicker();
        } catch (e) {
            console.error('Error loading user data:', e);
            currentUser = null;
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
    }
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Обновляем UI
    updateUI();
    
    // Обновляем демо-карту в герое
    const demoCardNumber = document.getElementById('demoCardNumber');
    if (demoCardNumber) {
        const demoUser = getUsers().find(u => u.email === 'demo@xyzbank.ru');
        if (demoUser && demoUser.cards && demoUser.cards[0]) {
            demoCardNumber.textContent = demoUser.cards[0].number;
        }
    }
});

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================
window.transferFromCard = function(cardNumber) {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    showTransferModal();
    
    // Автозаполнение поля с номером карты
    setTimeout(() => {
        const cardInput = document.getElementById('transferCardNumber');
        if (cardInput) {
            cardInput.value = cardNumber;
        }
    }, 100);
};

window.showCardDetails = function(cardId) {
    if (!currentUser) return;
    
    const card = currentUser.cards?.find(c => c.id === cardId);
    if (!card) return;
    
    const details = `
        Номер карты: ${card.number}
        Держатель: ${card.holder}
        Срок действия: ${card.expiry}
        Баланс: ${formatCurrency(card.balance)}
        Тип: ${card.type === 'premium' ? 'Премиум' : 'Дебетовая'}
        Статус: ${card.isActive ? 'Активна' : 'Неактивна'}
        Выпущена: ${new Date(card.createdAt).toLocaleDateString('ru-RU')}
    `;
    
    showNotification(details.replace(/\n/g, '<br>'), 'info');
};
