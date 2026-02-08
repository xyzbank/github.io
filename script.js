// Система пользователей и кликера для XYZBank

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let currentUser = null;
let users = JSON.parse(localStorage.getItem('xyzbank_users')) || [];
let clickerData = JSON.parse(localStorage.getItem('xyzbank_clicker')) || {};
let autoClickerInterval = null;

// Демо-пользователь по умолчанию
const DEMO_USER = {
    email: 'demo@xyzbank.ru',
    password: 'demo123',
    name: 'Демо Пользователь',
    createdAt: new Date().toISOString()
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    loadClickerData();
    updateUI();
    setupEventListeners();
    checkAutoClicker();
});

// ==================== СИСТЕМА ПОЛЬЗОВАТЕЛЕЙ ====================
function initApp() {
    // Добавляем демо-пользователя если его нет
    if (!users.find(u => u.email === DEMO_USER.email)) {
        users.push({
            ...DEMO_USER,
            balance: 1000,
            totalEarned: 1000,
            clicks: 500,
            lastLogin: new Date().toISOString()
        });
        saveUsers();
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

function loginUser(user) {
    currentUser = user;
    localStorage.setItem('xyzbank_currentUser', user.email);
    
    // Обновляем последний вход
    user.lastLogin = new Date().toISOString();
    saveUsers();
    
    updateUI();
    showNotification(`Добро пожаловать, ${user.name}!`, 'success');
    
    // Загружаем данные кликера для пользователя
    loadClickerData();
    
    // Показываем личный кабинет
    showDashboard();
}

function logout() {
    // Сохраняем данные кликера перед выходом
    saveClickerData();
    
    currentUser = null;
    localStorage.removeItem('xyzbank_currentUser');
    updateUI();
    showNotification('Вы вышли из системы', 'info');
    
    // Останавливаем автокликер
    if (autoClickerInterval) {
        clearInterval(autoClickerInterval);
        autoClickerInterval = null;
    }
    
    // Показываем главную страницу
    showHomepage();
}

function registerUser(name, email, password) {
    // Проверяем, существует ли пользователь
    if (users.find(u => u.email === email)) {
        showNotification('Пользователь с таким email уже существует', 'error');
        return false;
    }
    
    // Создаем нового пользователя
    const newUser = {
        email,
        password,
        name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        balance: 100, // Начальный бонус
        totalEarned: 100,
        clicks: 0,
        tier: 'basic',
        phone: ''
    };
    
    users.push(newUser);
    saveUsers();
    loginUser(newUser);
    
    // Инициализируем данные кликера для нового пользователя
    initClickerData();
    
    showNotification('Аккаунт успешно создан! Получен бонус 100 рублей!', 'success');
    return true;
}

// ==================== КЛИКЕР ====================
function initClickerData() {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    if (!clickerData[userId]) {
        clickerData[userId] = {
            balance: currentUser.balance || 100,
            totalEarned: currentUser.totalEarned || 100,
            clicks: currentUser.clicks || 0,
            clicksToday: 0,
            lastClickDate: new Date().toDateString(),
            upgrades: {
                autoClicker: { level: 0, rate: 0 },
                doubleClick: { level: 0, multiplier: 1 },
                tripleClick: { level: 0, multiplier: 1 },
                timeWarp: { level: 0, multiplier: 1 }
            },
            achievements: {},
            clickHistory: [],
            autoClickerActive: false
        };
        saveClickerData();
    }
}

function loadClickerData() {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    initClickerData(); // Создает если не существует
    
    // Проверяем, новый ли день
    const today = new Date().toDateString();
    if (clickerData[userId].lastClickDate !== today) {
        clickerData[userId].clicksToday = 0;
        clickerData[userId].lastClickDate = today;
        saveClickerData();
    }
    
    updateClickerUI();
}

function saveClickerData() {
    localStorage.setItem('xyzbank_clicker', JSON.stringify(clickerData));
}

function handleClick() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const userId = currentUser.email;
    const data = clickerData[userId];
    
    // Проверяем лимит на день (1000 кликов)
    if (data.clicksToday >= 1000) {
        showNotification('Достигнут дневной лимит кликов (1000)', 'warning');
        return;
    }
    
    // Вычисляем доход за клик
    const baseEarning = 1;
    const multiplier = data.upgrades.doubleClick.multiplier * 
                      data.upgrades.tripleClick.multiplier * 
                      data.upgrades.timeWarp.multiplier;
    const earnings = baseEarning * multiplier;
    
    // Обновляем данные
    data.balance += earnings;
    data.totalEarned += earnings;
    data.clicks += 1;
    data.clicksToday += 1;
    currentUser.balance = data.balance;
    currentUser.totalEarned = data.totalEarned;
    currentUser.clicks = data.clicks;
    
    // Добавляем в историю
    data.clickHistory.push({
        amount: earnings,
        timestamp: new Date().toISOString(),
        multiplier: multiplier
    });
    
    // Ограничиваем историю последними 50 записями
    if (data.clickHistory.length > 50) {
        data.clickHistory = data.clickHistory.slice(-50);
    }
    
    // Проверяем достижения
    checkAchievements();
    
    // Сохраняем
    saveUsers();
    saveClickerData();
    
    // Обновляем UI
    updateClickerUI();
    updateDashboard();
    
    // Анимация
    createCoinAnimation(earnings);
    
    // Звуковой эффект (опционально)
    playClickSound();
}

function buyUpgrade(upgradeType) {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    const data = clickerData[userId];
    const upgrade = data.upgrades[upgradeType];
    
    // Определяем стоимость улучшения
    const costs = {
        'auto-clicker': 1000 * Math.pow(2, upgrade.level),
        'double-click': 5000 * Math.pow(2, upgrade.level),
        'triple-click': 15000 * Math.pow(2, upgrade.level),
        'time-warp': 50000 * Math.pow(2, upgrade.level)
    };
    
    const cost = costs[upgradeType];
    
    if (data.balance >= cost) {
        // Покупаем улучшение
        data.balance -= cost;
        currentUser.balance = data.balance;
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
        
        // Сохраняем
        saveUsers();
        saveClickerData();
        
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
    const userId = currentUser.email;
    const data = clickerData[userId];
    
    if (autoClickerInterval) {
        clearInterval(autoClickerInterval);
    }
    
    if (data.upgrades.autoClicker.level > 0) {
        autoClickerInterval = setInterval(() => {
            if (currentUser && data.clicksToday < 1000) {
                // Автоклик работает в фоне
                const earnings = data.upgrades.autoClicker.rate;
                data.balance += earnings;
                data.totalEarned += earnings;
                currentUser.balance = data.balance;
                currentUser.totalEarned = data.totalEarned;
                
                // Добавляем в историю
                data.clickHistory.push({
                    amount: earnings,
                    timestamp: new Date().toISOString(),
                    multiplier: 1,
                    auto: true
                });
                
                saveUsers();
                saveClickerData();
                updateClickerUI();
                updateDashboard();
            }
        }, 1000); // Каждую секунду
    }
}

function checkAutoClicker() {
    if (currentUser && clickerData[currentUser.email]?.upgrades?.autoClicker?.level > 0) {
        startAutoClicker();
    }
}

function checkAchievements() {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    const data = clickerData[userId];
    const achievements = document.querySelectorAll('.achievement');
    
    achievements.forEach(achievement => {
        const requirement = parseInt(achievement.dataset.requirement);
        const reward = parseInt(achievement.dataset.reward);
        const status = achievement.querySelector('.achievement-status');
        
        if (!data.achievements[requirement] && data.totalEarned >= requirement) {
            // Разблокируем достижение
            data.achievements[requirement] = true;
            data.balance += reward;
            currentUser.balance = data.balance;
            
            // Обновляем UI
            achievement.classList.add('unlocked');
            status.textContent = 'Получено!';
            status.dataset.status = 'unlocked';
            
            // Уведомление
            showNotification(`Достижение разблокировано! +${reward} рублей`, 'success');
            
            saveUsers();
            saveClickerData();
            updateClickerUI();
        }
    });
}

// ==================== UI ОБНОВЛЕНИЯ ====================
function updateUI() {
    const navActions = document.getElementById('navActions');
    const heroActions = document.getElementById('heroActions');
    const loginPrompt = document.getElementById('loginPrompt');
    const clickerGame = document.getElementById('clickerGame');
    
    if (currentUser) {
        // Пользователь авторизован
        navActions.innerHTML = `
            <div class="user-balance">
                <i class="fas fa-wallet"></i>
                <span id="navBalance">${formatCurrency(currentUser.balance)}</span>
            </div>
            <div class="user-menu">
                <button class="btn btn-outline" id="userMenuBtn">
                    <i class="fas fa-user-circle"></i>
                    ${currentUser.name.split(' ')[0]}
                </button>
                <div class="dropdown-menu" id="userDropdown">
                    <a href="#dashboard" class="dropdown-item">
                        <i class="fas fa-tachometer-alt"></i> Личный кабинет
                    </a>
                    <a href="#clicker" class="dropdown-item">
                        <i class="fas fa-mouse-pointer"></i> Кликер
                    </a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>
                </div>
            </div>
        `;
        
        heroActions.innerHTML = `
            <a href="#clicker" class="btn btn-primary btn-large">
                <i class="fas fa-mouse-pointer"></i> Начать зарабатывать
            </a>
            <a href="#dashboard" class="btn btn-secondary btn-large">
                <i class="fas fa-chart-line"></i> Личный кабинет
            </a>
        `;
        
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (clickerGame) clickerGame.style.display = 'block';
        
        setupUserMenu();
    } else {
        // Пользователь не авторизован
        navActions.innerHTML = `
            <button class="btn btn-outline" id="loginBtn">Вход</button>
            <button class="btn btn-primary" id="registerBtn">Открыть счет</button>
        `;
        
        heroActions.innerHTML = `
            <button class="btn btn-primary btn-large" id="mainLoginBtn">
                <i class="fas fa-sign-in-alt"></i> Войти в систему
            </button>
            <button class="btn btn-secondary btn-large" id="mainRegisterBtn">
                <i class="fas fa-user-plus"></i> Создать аккаунт
            </button>
        `;
        
        if (loginPrompt) loginPrompt.style.display = 'flex';
        if (clickerGame) clickerGame.style.display = 'none';
    }
}

function updateClickerUI() {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    const data = clickerData[userId];
    
    // Обновляем статистику
    document.getElementById('balance').textContent = formatCurrency(data.balance);
    document.getElementById('totalEarned').textContent = formatCurrency(data.totalEarned);
    document.getElementById('clicksToday').textContent = data.clicksToday;
    document.getElementById('maxPerDay').textContent = '1000';
    
    // Вычисляем множитель
    const multiplier = data.upgrades.doubleClick.multiplier * 
                      data.upgrades.tripleClick.multiplier * 
                      data.upgrades.timeWarp.multiplier;
    document.getElementById('multiplier').textContent = `${multiplier}x`;
    
    // Обновляем улучшения
    updateUpgradeUI('auto-clicker', data.upgrades.autoClicker);
    updateUpgradeUI('double-click', data.upgrades.doubleClick);
    updateUpgradeUI('triple-click', data.upgrades.tripleClick);
    updateUpgradeUI('time-warp', data.upgrades.timeWarp);
    
    // Обновляем достижения
    updateAchievementsUI();
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
            if (costElement) {
                costElement.textContent = `${formatCurrency(cost)}`;
            }
            
            // Блокируем кнопку если максимальный уровень
            const button = upgradeElement.querySelector('button');
            if (button) {
                if (upgrade.level >= 10) {
                    button.textContent = 'Макс. ур.';
                    button.disabled = true;
                    button.classList.add('disabled');
                } else {
                    button.textContent = 'Купить';
                    button.disabled = false;
                    button.classList.remove('disabled');
                }
            }
        }
    }
}

function updateAchievementsUI() {
    if (!currentUser) return;
    
    const data = clickerData[currentUser.email];
    const achievements = document.querySelectorAll('.achievement');
    
    achievements.forEach(achievement => {
        const requirement = parseInt(achievement.dataset.requirement);
        const status = achievement.querySelector('.achievement-status');
        
        if (data.achievements[requirement]) {
            achievement.classList.add('unlocked');
            status.textContent = 'Получено!';
            status.dataset.status = 'unlocked';
        } else if (data.totalEarned >= requirement) {
            achievement.classList.add('unlocked');
            status.textContent = 'Получить награду';
            status.dataset.status = 'unlocked';
            status.style.cursor = 'pointer';
            status.onclick = () => claimAchievement(requirement);
        }
    });
}

function claimAchievement(requirement) {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    const data = clickerData[userId];
    const reward = parseInt(document.querySelector(`[data-requirement="${requirement}"]`).dataset.reward);
    
    if (!data.achievements[requirement] && data.totalEarned >= requirement) {
        data.achievements[requirement] = true;
        data.balance += reward;
        currentUser.balance = data.balance;
        
        saveUsers();
        saveClickerData();
        updateClickerUI();
        updateDashboard();
        
        showNotification(`Достижение получено! +${reward} рублей`, 'success');
    }
}

// ==================== ЛИЧНЫЙ КАБИНЕТ ====================
function showDashboard() {
    document.getElementById('dashboard').style.display = 'block';
    document.querySelector('.clicker-section').style.display = 'none';
    document.querySelector('.services').style.display = 'none';
    document.querySelector('.advantages').style.display = 'none';
    document.querySelector('.tariffs').style.display = 'none';
    updateDashboard();
}

function showHomepage() {
    document.getElementById('dashboard').style.display = 'none';
    document.querySelector('.clicker-section').style.display = 'block';
    document.querySelector('.services').style.display = 'block';
    document.querySelector('.advantages').style.display = 'block';
    document.querySelector('.tariffs').style.display = 'block';
}

function updateDashboard() {
    if (!currentUser) return;
    
    const userId = currentUser.email;
    const data = clickerData[userId];
    
    // Обновляем общую информацию
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('overviewBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('overviewClicker').textContent = formatCurrency(data.totalEarned);
    document.getElementById('overviewClicks').textContent = data.clicks;
    document.getElementById('overviewLevel').textContent = calculateLevel(data.totalEarned);
    
    // Обновляем счета
    document.getElementById('mainAccountBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('savingsBalance').textContent = formatCurrency(Math.floor(currentUser.balance * 0.3));
    
    // Детальная статистика кликера
    document.getElementById('detailedTotal').textContent = formatCurrency(data.totalEarned);
    document.getElementById('detailedClicks').textContent = data.clicks;
    document.getElementById('detailedAvg').textContent = formatCurrency(data.clicks > 0 ? data.totalEarned / data.clicks : 0);
    document.getElementById('detailedMaxDay').textContent = formatCurrency(Math.max(...data.clickHistory.filter(h => !h.auto).map(h => h.amount) || [0]));
    document.getElementById('detailedAuto').textContent = data.upgrades.autoClicker.level;
    document.getElementById('detailedUpgrades').textContent = Object.values(data.upgrades).reduce((sum, u) => sum + u.level, 0);
    
    // Обновляем последние операции
    updateActivityList();
    
    // Обновляем настройки
    document.getElementById('settingsName').value = currentUser.name;
    document.getElementById('settingsEmail').value = currentUser.email;
    document.getElementById('settingsPhone').value = currentUser.phone || '';
}

function calculateLevel(totalEarned) {
    return Math.floor(Math.log10(totalEarned + 1)) + 1;
}

function updateActivityList() {
    if (!currentUser) return;
    
    const data = clickerData[currentUser.email];
    const activityList = document.getElementById('activityList');
    
    if (!activityList) return;
    
    // Берем последние 5 операций
    const recentActivities = data.clickHistory.slice(-5).reverse();
    
    activityList.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-info">
                <h4>${activity.auto ? 'Автокликер' : 'Клик'}</h4>
                <p>${new Date(activity.timestamp).toLocaleString()}</p>
            </div>
            <div class="activity-amount positive">
                +${formatCurrency(activity.amount)}
            </div>
        </div>
    `).join('');
    
    if (recentActivities.length === 0) {
        activityList.innerHTML = '<p class="no-activities">Нет операций</p>';
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' ₽';
}

function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Добавляем стили
    const style = document.createElement('style');
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
            animation: slideIn 0.3s ease;
            border-left: 4px solid #0052cc;
        }
        .notification-success { border-left-color: #36b37e; }
        .notification-error { border-left-color: #ff6b6b; }
        .notification-warning { border-left-color: #ffab00; }
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
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Закрытие по клику
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

function createCoinAnimation(amount) {
    const container = document.getElementById('coinAnimation');
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
    // Создаем простой звуковой эффект
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

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
function setupEventListeners() {
    // Кликер
    document.getElementById('clickButton')?.addEventListener('click', handleClick);
    
    // Улучшения
    document.querySelectorAll('[data-action="buy"]').forEach(button => {
        button.addEventListener('click', function() {
            const upgradeType = this.closest('.upgrade-item').dataset.upgrade;
            buyUpgrade(upgradeType);
        });
    });
    
    // Навигация в личном кабинете
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Убираем активный класс у всех
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.dashboard-panel').forEach(panel => panel.classList.remove('active'));
            
            // Добавляем активный класс текущему
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // Перемещение средств
    document.getElementById('transferBtn')?.addEventListener('click', function() {
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const account = document.getElementById('transferAccount').value;
        
        if (!amount || amount <= 0) {
            showNotification('Введите корректную сумму', 'error');
            return;
        }
        
        if (!account) {
            showNotification('Введите номер счета получателя', 'error');
            return;
        }
        
        if (currentUser.balance < amount) {
            showNotification('Недостаточно средств на счете', 'error');
            return;
        }
        
        currentUser.balance -= amount;
        saveUsers();
        updateDashboard();
        updateUI();
        
        showNotification(`Перевод ${formatCurrency(amount)} на счет ${account} выполнен`, 'success');
        
        // Очищаем поля
        document.getElementById('transferAmount').value = '';
        document.getElementById('transferAccount').value = '';
    });
    
    // Пополнение вклада
    document.getElementById('depositBtn')?.addEventListener('click', function() {
        const amount = Math.floor(currentUser.balance * 0.3);
        
        if (amount > 0) {
            showNotification(`Вклад пополнен на ${formatCurrency(amount)}. Доходность: 5.5% годовых`, 'success');
        } else {
            showNotification('Недостаточно средств для пополнения вклада', 'error');
        }
    });
    
    // Сохранение настроек
    document.getElementById('saveSettings')?.addEventListener('click', function() {
        const name = document.getElementById('settingsName').value;
        const phone = document.getElementById('settingsPhone').value;
        
        if (name.length < 2) {
            showNotification('Введите корректное ФИО', 'error');
            return;
        }
        
        currentUser.name = name;
        currentUser.phone = phone;
        saveUsers();
        updateDashboard();
        updateUI();
        
        showNotification('Настройки профиля сохранены', 'success');
    });
    
    // Опасные действия
    document.getElementById('resetProgress')?.addEventListener('click', function() {
        if (confirm('Вы уверены? Весь прогресс в кликере будет сброшен!')) {
            const userId = currentUser.email;
            clickerData[userId] = {
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
                achievements: {},
                clickHistory: [],
                autoClickerActive: false
            };
            
            currentUser.balance = 100;
            currentUser.totalEarned = 100;
            currentUser.clicks = 0;
            
            saveUsers();
            saveClickerData();
            updateClickerUI();
            updateDashboard();
            updateUI();
            
            showNotification('Прогресс кликера сброшен', 'success');
        }
    });
    
    document.getElementById('deleteAccount')?.addEventListener('click', function() {
        if (confirm('ВНИМАНИЕ: Вы собираетесь удалить аккаунт. Это действие нельзя отменить!')) {
            users = users.filter(u => u.email !== currentUser.email);
            delete clickerData[currentUser.email];
            
            saveUsers();
            saveClickerData();
            logout();
            
            showNotification('Аккаунт успешно удален', 'info');
        }
    });
}

function setupUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // Закрытие при клике вне меню
        document.addEventListener('click', function() {
            userDropdown.style.display = 'none';
        });
        
        // Предотвращаем закрытие при клике внутри меню
        userDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Выход из системы
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
    }
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

function hideModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Инициализация модальных окон
document.getElementById('loginBtn')?.addEventListener('click', showLoginModal);
document.getElementById('registerBtn')?.addEventListener('click', showRegisterModal);
document.getElementById('mainLoginBtn')?.addEventListener('click', showLoginModal);
document.getElementById('mainRegisterBtn')?.addEventListener('click', showRegisterModal);
document.getElementById('promptLogin')?.addEventListener('click', showLoginModal);
document.getElementById('promptRegister')?.addEventListener('click', showRegisterModal);

document.getElementById('closeLoginModal')?.addEventListener('click', hideModals);
document.getElementById('closeRegisterModal')?.addEventListener('click', hideModals);

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

// Закрытие модальных окон при клике вне
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        hideModals();
    }
});

// Форма входа
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Демо-доступ
    if (email === 'demo@xyzbank.ru' && password === 'demo123') {
        if (!users.find(u => u.email === 'demo@xyzbank.ru')) {
            registerUser('Демо Пользователь', 'demo@xyzbank.ru', 'demo123');
        } else {
            const user = users.find(u => u.email === 'demo@xyzbank.ru');
            loginUser(user);
        }
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
