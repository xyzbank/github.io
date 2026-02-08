// Система банка XYZBank с кликером и переводами

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let users = JSON.parse(localStorage.getItem('xyzbank_users')) || [];
let transactions = JSON.parse(localStorage.getItem('xyzbank_transactions')) || [];
let autoClickerInterval = null;

// Демо-пользователь по умолчанию
const DEMO_USER = {
    id: 'demo_001',
    email: 'demo@xyzbank.ru',
    password: 'demo123',
    name: 'Демо Пользователь',
    balance: 1000,
    totalEarned: 1000,
    clicks: 500,
    clicksToday: 0,
    lastClickDate: new Date().toDateString(),
    upgrades: {
        autoClicker: { level: 0, rate: 0 },
        doubleClick: { level: 0, multiplier: 1 },
        tripleClick: { level: 0, multiplier: 1 },
        timeWarp: { level: 0, multiplier: 1 }
    },
    cardNumber: '4567 8912 3456 7890',
    createdAt: new Date().toISOString(),
    tier: 'basic'
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    updateUI();
});

function initApp() {
    // Добавляем демо-пользователя если его нет
    if (!users.find(u => u.email === DEMO_USER.email)) {
        users.push(DEMO_USER);
        saveUsers();
    }
    
    // Загружаем транзакции если нет
    if (transactions.length === 0) {
        transactions = [
            {
                id: 'trans_001',
                userId: 'demo_001',
                type: 'clicker',
                amount: 50,
                description: 'Заработок в кликере',
                date: new Date().toISOString(),
                status: 'completed'
            },
            {
                id: 'trans_002',
                userId: 'demo_001',
                type: 'transfer',
                amount: -1000,
                description: 'Перевод на карту **** 1234',
                date: new Date(Date.now() - 86400000).toISOString(), // Вчера
                status: 'completed'
            },
            {
                id: 'trans_003',
                userId: 'demo_001',
                type: 'interest',
                amount: 250,
                description: 'Начисление процентов',
                date: new Date(Date.now() - 172800000).toISOString(), // Позавчера
                status: 'completed'
            }
        ];
        saveTransactions();
    }
    
    // Проверяем авторизацию
    const savedUser = localStorage.getItem('xyzbank_currentUser');
    if (savedUser) {
        const user = users.find(u => u.email === savedUser);
        if (user) {
            loginUser(user);
        }
    }
}

function saveUsers() {
    localStorage.setItem('xyzbank_users', JSON.stringify(users));
}

function saveTransactions() {
    localStorage.setItem('xyzbank_transactions', JSON.stringify(transactions));
}

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================
function loginUser(user) {
    currentUser = user;
    localStorage.setItem('xyzbank_currentUser', user.email);
    
    // Обновляем последний вход
    user.lastLogin = new Date().toISOString();
    saveUsers();
    
    updateUI();
    showNotification(`Добро пожаловать, ${user.name}!`, 'success');
    
    // Запускаем автокликер если есть улучшения
    startAutoClicker();
}

function logout() {
    // Останавливаем автокликер
    if (autoClickerInterval) {
        clearInterval(autoClickerInterval);
        autoClickerInterval = null;
    }
    
    currentUser = null;
    localStorage.removeItem('xyzbank_currentUser');
    updateUI();
    showNotification('Вы вышли из системы', 'info');
}

function registerUser(name, email, password) {
    // Проверяем, существует ли пользователь
    if (users.find(u => u.email === email)) {
        showNotification('Пользователь с таким email уже существует', 'error');
        return false;
    }
    
    // Создаем нового пользователя
    const newUser = {
        id: 'user_' + Date.now(),
        email,
        password,
        name,
        balance: 100,
        totalEarned: 100,
        clicks: 0,
        clicksToday: 0,
        lastClickDate: new Date().toDateString(),
        upgrades: {
            autoClicker: { level: 0, rate: 0 },
            doubleClick: { level: 0, multiplier: 1 },
            tripleClick: { level: 0, multiplier: 1 },
            timeWarp: { level: 0, multiplier: 1 }
        },
        cardNumber: generateCardNumber(),
        createdAt: new Date().toISOString(),
        tier: 'basic'
    };
    
    users.push(newUser);
    saveUsers();
    loginUser(newUser);
    
    // Добавляем начальную транзакцию
    transactions.push({
        id: 'trans_' + Date.now(),
        userId: newUser.id,
        type: 'bonus',
        amount: 100,
        description: 'Регистрационный бонус',
        date: new Date().toISOString(),
        status: 'completed'
    });
    saveTransactions();
    
    showNotification('Аккаунт успешно создан! Получен бонус 100 рублей!', 'success');
    return true;
}

function generateCardNumber() {
    // Генерируем случайный номер карты
    let cardNumber = '';
    for (let i = 0; i < 16; i++) {
        cardNumber += Math.floor(Math.random() * 10);
        if ((i + 1) % 4 === 0 && i !== 15) {
            cardNumber += ' ';
        }
    }
    return cardNumber;
}

// ==================== КЛИКЕР ====================
function handleClick() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Проверяем, новый ли день
    const today = new Date().toDateString();
    if (currentUser.lastClickDate !== today) {
        currentUser.clicksToday = 0;
        currentUser.lastClickDate = today;
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
    const earnings = baseEarning * multiplier;
    
    // Обновляем данные пользователя
    currentUser.balance += earnings;
    currentUser.totalEarned += earnings;
    currentUser.clicks += 1;
    currentUser.clicksToday += 1;
    
    // Добавляем транзакцию
    transactions.push({
        id: 'trans_' + Date.now(),
        userId: currentUser.id,
        type: 'clicker',
        amount: earnings,
        description: 'Заработок в кликере',
        date: new Date().toISOString(),
        status: 'completed'
    });
    
    // Сохраняем данные
    saveUsers();
    saveTransactions();
    
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
    
    // Определяем стоимость улучшения
    const costs = {
        'auto-clicker': 1000 * Math.pow(2, upgrade.level),
        'double-click': 5000 * Math.pow(2, upgrade.level),
        'triple-click': 15000 * Math.pow(2, upgrade.level),
        'time-warp': 50000 * Math.pow(2, upgrade.level)
    };
    
    const cost = costs[upgradeType];
    
    if (currentUser.balance >= cost) {
        // Покупаем улучшение
        currentUser.balance -= cost;
        upgrade.level += 1;
        
        // Применяем эффект улучшения
        switch(upgradeType) {
            case 'auto-clicker':
                upgrade.rate += 0.1;
                startAutoClicker();
                break;
            case 'double-click':
                upgrade.multiplier = 2;
                break;
            case 'triple-click':
                upgrade.multiplier = 3;
                break;
            case 'time-warp':
                upgrade.multiplier = 5;
                break;
        }
        
        // Добавляем транзакцию
        transactions.push({
            id: 'trans_' + Date.now(),
            userId: currentUser.id,
            type: 'upgrade',
            amount: -cost,
            description: `Покупка улучшения: ${getUpgradeName(upgradeType)}`,
            date: new Date().toISOString(),
            status: 'completed'
        });
        
        // Сохраняем
        saveUsers();
        saveTransactions();
        
        // Обновляем UI
        updateClickerUI();
        updateDashboard();
        
        showNotification(`Улучшение "${getUpgradeName(upgradeType)}" куплено!`, 'success');
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
        autoClickerInterval = setInterval(() => {
            if (currentUser && currentUser.clicksToday < 1000) {
                // Автоклик работает в фоне
                const earnings = currentUser.upgrades.autoClicker.rate;
                currentUser.balance += earnings;
                currentUser.totalEarned += earnings;
                
                // Добавляем транзакцию
                transactions.push({
                    id: 'trans_' + Date.now(),
                    userId: currentUser.id,
                    type: 'auto-clicker',
                    amount: earnings,
                    description: 'Автокликер',
                    date: new Date().toISOString(),
                    status: 'completed'
                });
                
                saveUsers();
                saveTransactions();
                updateClickerUI();
                updateDashboard();
            }
        }, 1000); // Каждую секунду
    }
}

// ==================== СИСТЕМА ПЕРЕВОДОВ ====================
function transferMoney(cardNumber, amount, description = '') {
    if (!currentUser) {
        showNotification('Войдите в систему для выполнения перевода', 'error');
        return false;
    }
    
    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        showNotification('Введите корректный номер карты (16 цифр)', 'error');
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
    
    // Рассчитываем комиссию (1% но не менее 10 рублей)
    const commission = Math.max(10, amount * 0.01);
    const total = amount + commission;
    
    if (currentUser.balance < total) {
        showNotification(`Недостаточно средств с учетом комиссии ${commission} ₽`, 'error');
        return false;
    }
    
    // Выполняем перевод
    currentUser.balance -= total;
    
    // Добавляем транзакцию
    transactions.push({
        id: 'trans_' + Date.now(),
        userId: currentUser.id,
        type: 'transfer',
        amount: -amount,
        description: description || `Перевод на карту **** ${cardNumber.slice(-4)}`,
        date: new Date().toISOString(),
        status: 'completed',
        details: {
            toCard: cardNumber,
            commission: commission
        }
    });
    
    // Сохраняем
    saveUsers();
    saveTransactions();
    
    // Обновляем UI
    updateDashboard();
    updateUI();
    
    showNotification(`Перевод ${formatCurrency(amount)} выполнен успешно! Комиссия: ${formatCurrency(commission)}`, 'success');
    return true;
}

// ==================== UI ОБНОВЛЕНИЯ ====================
function updateUI() {
    const navActions = document.getElementById('navActions');
    const heroActions = document.getElementById('heroActions');
    const clickerGame = document.getElementById('clickerGame');
    const loginPrompt = document.getElementById('loginPrompt');
    const dashboardSection = document.getElementById('dashboard');
    const navMenu = document.getElementById('navMenu');
    
    if (currentUser) {
        // Пользователь авторизован
        navActions.innerHTML = `
            <div class="user-balance-nav">
                <i class="fas fa-wallet"></i>
                <span>${formatCurrency(currentUser.balance)}</span>
            </div>
            <button class="btn btn-outline" id="userLogoutBtn">
                <i class="fas fa-sign-out-alt"></i> Выйти
            </button>
        `;
        
        heroActions.innerHTML = `
            <button class="btn btn-primary btn-large" onclick="document.getElementById('clicker').scrollIntoView()">
                <i class="fas fa-mouse-pointer"></i> Начать зарабатывать
            </button>
            <button class="btn btn-secondary btn-large" onclick="showDashboardSection()">
                <i class="fas fa-chart-line"></i> Личный кабинет
            </button>
        `;
        
        if (clickerGame) clickerGame.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'none';
        
        // Обновляем навигацию
        if (navMenu) {
            const dashboardLink = navMenu.querySelector('.dashboard-link');
            if (dashboardLink) {
                dashboardLink.style.display = 'block';
            }
        }
        
        // Добавляем обработчик выхода
        document.getElementById('userLogoutBtn')?.addEventListener('click', logout);
        
        // Обновляем данные кликера
        updateClickerUI();
    } else {
        // Пользователь не авторизован
        navActions.innerHTML = `
            <button class="btn btn-outline" id="navLoginBtn">Вход</button>
            <button class="btn btn-primary" id="navRegisterBtn">Открыть счет</button>
        `;
        
        heroActions.innerHTML = `
            <button class="btn btn-primary btn-large" id="heroLoginBtn">
                <i class="fas fa-sign-in-alt"></i> Войти в систему
            </button>
            <button class="btn btn-secondary btn-large" id="heroRegisterBtn">
                <i class="fas fa-user-plus"></i> Создать аккаунт
            </button>
        `;
        
        if (clickerGame) clickerGame.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'flex';
        if (dashboardSection) dashboardSection.style.display = 'none';
        
        // Обновляем навигацию
        if (navMenu) {
            const dashboardLink = navMenu.querySelector('.dashboard-link');
            if (dashboardLink) {
                dashboardLink.style.display = 'none';
            }
        }
        
        // Добавляем обработчики для кнопок входа/регистрации
        document.getElementById('navLoginBtn')?.addEventListener('click', showLoginModal);
        document.getElementById('navRegisterBtn')?.addEventListener('click', showRegisterModal);
        document.getElementById('heroLoginBtn')?.addEventListener('click', showLoginModal);
        document.getElementById('heroRegisterBtn')?.addEventListener('click', showRegisterModal);
    }
}

function updateClickerUI() {
    if (!currentUser) return;
    
    // Обновляем статистику
    document.getElementById('balance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('totalEarned').textContent = formatCurrency(currentUser.totalEarned);
    document.getElementById('clicksToday').textContent = currentUser.clicksToday;
    
    // Вычисляем множитель
    const multiplier = currentUser.upgrades.doubleClick.multiplier * 
                      currentUser.upgrades.tripleClick.multiplier * 
                      currentUser.upgrades.timeWarp.multiplier;
    document.getElementById('multiplier').textContent = `${multiplier}x`;
    
    // Обновляем улучшения
    updateUpgradeUI('auto-clicker', currentUser.upgrades.autoClicker);
    updateUpgradeUI('double-click', currentUser.upgrades.doubleClick);
    updateUpgradeUI('triple-click', currentUser.upgrades.tripleClick);
    updateUpgradeUI('time-warp', currentUser.upgrades.timeWarp);
}

function updateUpgradeUI(type, upgrade) {
    const levelElement = document.getElementById(`level-${type.split('-')[0]}`);
    const progressElement = document.getElementById(`progress-${type.split('-')[0]}`);
    
    if (levelElement) {
        levelElement.textContent = upgrade.level;
    }
    
    if (progressElement) {
        const maxLevel = 10;
        const progress = (upgrade.level / maxLevel) * 100;
        progressElement.style.width = `${progress}%`;
        
        // Обновляем стоимость
        const cost = {
            'auto-clicker': 1000 * Math.pow(2, upgrade.level),
            'double-click': 5000 * Math.pow(2, upgrade.level),
            'triple-click': 15000 * Math.pow(2, upgrade.level),
            'time-warp': 50000 * Math.pow(2, upgrade.level)
        }[type];
        
        const upgradeElement = document.querySelector(`[data-upgrade="${type}"]`);
        if (upgradeElement) {
            const costElement = upgradeElement.querySelector('.upgrade-cost');
            const button = upgradeElement.querySelector('.buy-upgrade');
            
            if (costElement) {
                costElement.textContent = `${formatCurrency(cost)}`;
            }
            
            if (button) {
                if (upgrade.level >= 10) {
                    button.textContent = 'Макс. ур.';
                    button.disabled = true;
                    button.style.opacity = '0.5';
                } else {
                    button.textContent = 'Купить';
                    button.disabled = false;
                    button.style.opacity = '1';
                }
            }
        }
    }
}

function updateDashboard() {
    if (!currentUser) return;
    
    // Обновляем информацию пользователя
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('mainCardBalance').textContent = formatCurrency(currentUser.balance);
    
    // Обновляем статистику кликера
    document.getElementById('statsTotal').textContent = formatCurrency(currentUser.totalEarned);
    document.getElementById('statsClicks').textContent = currentUser.clicks;
    document.getElementById('statsToday').textContent = currentUser.clicksToday;
    
    const multiplier = currentUser.upgrades.doubleClick.multiplier * 
                      currentUser.upgrades.tripleClick.multiplier * 
                      currentUser.upgrades.timeWarp.multiplier;
    document.getElementById('statsMultiplier').textContent = `${multiplier}x`;
    
    // Обновляем историю операций
    updateHistoryList();
}

function updateHistoryList() {
    if (!currentUser) return;
    
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    // Получаем последние 5 транзакций пользователя
    const userTransactions = transactions
        .filter(t => t.userId === currentUser.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (userTransactions.length === 0) {
        historyList.innerHTML = '<p class="no-history">Нет операций</p>';
        return;
    }
    
    historyList.innerHTML = userTransactions.map(transaction => `
        <div class="history-item">
            <div class="history-info">
                <div class="history-title">${transaction.description}</div>
                <div class="history-date">${formatDate(transaction.date)}</div>
            </div>
            <div class="history-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                ${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount)) + ' ₽';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Менее суток
        return 'Сегодня, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 172800000) { // Менее двух суток
        return 'Вчера, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU') + ', ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
}

function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Закрытие по клику
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    });
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

// ==================== УПРАВЛЕНИЕ СЕКЦИЯМИ ====================
function showDashboardSection() {
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('clicker').style.display = 'none';
    document.getElementById('services').style.display = 'none';
    
    // Прокручиваем к кабинету
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    
    // Обновляем данные
    updateDashboard();
}

function showClickerSection() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('clicker').style.display = 'block';
    document.getElementById('services').style.display = 'block';
    
    // Прокручиваем к кликеру
    document.getElementById('clicker').scrollIntoView({ behavior: 'smooth' });
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function showTransferModal() {
    document.getElementById('transferModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Сбрасываем форму
    document.getElementById('transferForm').reset();
    document.getElementById('commission').textContent = '0 ₽';
    document.getElementById('totalToDeduct').textContent = '0 ₽';
}

function hideModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('transferModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Мобильное меню
    document.getElementById('menuToggle')?.addEventListener('click', function() {
        const navMenu = document.getElementById('navMenu');
        navMenu.classList.toggle('active');
        this.innerHTML = navMenu.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Закрытие мобильного меню при клике на ссылку
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            const navMenu = document.getElementById('navMenu');
            const menuToggle = document.getElementById('menuToggle');
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    });
    
    // Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#dashboard') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Кликер
    document.getElementById('clickButton')?.addEventListener('click', handleClick);
    
    // Улучшения
    document.querySelectorAll('.buy-upgrade').forEach(button => {
        button.addEventListener('click', function() {
            const upgradeType = this.closest('.upgrade-item').dataset.upgrade;
            buyUpgrade(upgradeType);
        });
    });
    
    // Кнопки входа в кликере
    document.getElementById('promptLoginBtn')?.addEventListener('click', showLoginModal);
    document.getElementById('promptRegisterBtn')?.addEventListener('click', showRegisterModal);
    
    // Быстрый перевод
    document.getElementById('quickTransferBtn')?.addEventListener('click', function() {
        const cardNumber = document.getElementById('quickCardNumber').value;
        const amount = parseFloat(document.getElementById('quickAmount').value);
        
        if (transferMoney(cardNumber, amount, 'Быстрый перевод')) {
            // Очищаем поля
            document.getElementById('quickCardNumber').value = '';
            document.getElementById('quickAmount').value = '';
        }
    });
    
    // Подробный перевод
    document.getElementById('openTransferModalBtn')?.addEventListener('click', showTransferModal);
    
    // Выход из системы
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Закрытие модальных окон
    document.getElementById('closeLoginModal')?.addEventListener('click', hideModals);
    document.getElementById('closeRegisterModal')?.addEventListener('click', hideModals);
    document.getElementById('closeTransferModal')?.addEventListener('click', hideModals);
    
    // Переключение между модальными окнами
    document.getElementById('switchToRegister')?.addEventListener('click', function(e) {
        e.preventDefault();
        hideModals();
        showRegisterModal();
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', function(e) {
        e.preventDefault();
        hideModals();
        showLoginModal();
    });
    
    // Форма входа
    document.getElementById('loginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Демо-доступ
        if (email === 'demo@xyzbank.ru' && password === 'demo123') {
            let user = users.find(u => u.email === 'demo@xyzbank.ru');
            if (!user) {
                user = DEMO_USER;
                users.push(user);
                saveUsers();
            }
            loginUser(user);
            hideModals();
            return;
        }
        
        // Поиск пользователя
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            loginUser(user);
            hideModals();
        } else {
            showNotification('Неверный email или пароль', 'error');
        }
    });
    
    // Форма регистрации
    document.getElementById('registerForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        
        if (password !== confirmPassword) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        if (registerUser(name, email, password)) {
            hideModals();
        }
    });
    
    // Форма перевода
    document.getElementById('transferForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const cardNumber = document.getElementById('transferCardNumber').value.replace(/\s/g, '');
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const description = document.getElementById('transferMessage').value;
        
        if (transferMoney(cardNumber, amount, description)) {
            hideModals();
        }
    });
    
    // Расчет комиссии в реальном времени
    document.getElementById('transferAmount')?.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        const commission = Math.max(10, amount * 0.01);
        const total = amount + commission;
        
        document.getElementById('commission').textContent = formatCurrency(commission);
        document.getElementById('totalToDeduct').textContent = formatCurrency(total);
    });
    
    // Форматирование номера карты
    document.getElementById('transferCardNumber')?.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        if (value.length > 16) value = value.substring(0, 16);
        
        // Добавляем пробелы через каждые 4 цифры
        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = formatted;
    });
    
    document.getElementById('quickCardNumber')?.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        if (value.length > 16) value = value.substring(0, 16);
        
        // Добавляем пробелы через каждые 4 цифры
        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = formatted;
    });
    
    // Закрытие модальных окон при клике вне
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            hideModals();
        }
    });
}

// ==================== ЗАГРУЗКА СТРАНИЦЫ ====================
// Инициализируем при загрузке
window.addEventListener('load', function() {
    // Добавляем стили для уведомлений если их нет
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                padding: 1rem 1.5rem;
                box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                min-width: 300px;
                max-width: 400px;
                z-index: 9999;
                transform: translateX(100%);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            .notification-success { border-left: 4px solid #36b37e; }
            .notification-error { border-left: 4px solid #ff6b6b; }
            .notification-warning { border-left: 4px solid #ffab00; }
            .notification-info { border-left: 4px solid #0052cc; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #666;
                cursor: pointer;
                line-height: 1;
            }
            .user-balance-nav {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
                color: var(--primary);
            }
            @media (max-width: 768px) {
                .notification {
                    min-width: 250px;
                    right: 10px;
                    left: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }
});
