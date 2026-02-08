// XYZBank - Рабочая банковская система
class BankSystem {
    constructor() {
        this.storageKeys = {
            users: 'xyzbank_users',
            currentUser: 'xyzbank_current_user'
        };
        
        this.currentUser = null;
        this.init();
    }
    
    init() {
        this.initializeStorage();
        this.loadCurrentUser();
        this.setupEventListeners();
        this.updateUI();
        this.updateFooterStats();
    }
    
    // ==================== ХРАНЕНИЕ ДАННЫХ ====================
    initializeStorage() {
        if (!localStorage.getItem(this.storageKeys.users)) {
            const demoUser = this.createDemoUser();
            const testUser = this.createTestUser();
            const users = [demoUser, testUser];
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
        }
    }
    
    createDemoUser() {
        return {
            id: 'demo_001',
            email: 'demo@xyzbank.ru',
            password: 'demo123',
            name: 'Демо Пользователь',
            balance: 10000,
            cards: [{
                id: 'card_demo_001',
                number: '4455 6677 8899 0011',
                type: 'debit',
                balance: 10000,
                holder: 'DEMO USER',
                expiry: '12/28',
                isDefault: true
            }],
            transactions: [],
            clicks: 1500,
            clicksToday: 0,
            lastClickDate: new Date().toDateString(),
            upgrades: {
                autoClicker: { level: 0, rate: 0 },
                doubleClick: { level: 0, multiplier: 1 }
            }
        };
    }
    
    createTestUser() {
        return {
            id: 'test_001',
            email: 'test@xyzbank.ru',
            password: 'test123',
            name: 'Тестовый Пользователь',
            balance: 5000,
            cards: [{
                id: 'card_test_001',
                number: '5566 7788 9900 1122',
                type: 'debit',
                balance: 5000,
                holder: 'TEST USER',
                expiry: '12/28',
                isDefault: true
            }],
            transactions: [],
            clicks: 800,
            clicksToday: 0,
            lastClickDate: new Date().toDateString(),
            upgrades: {
                autoClicker: { level: 0, rate: 0 },
                doubleClick: { level: 0, multiplier: 1 }
            }
        };
    }
    
    getUsers() {
        return JSON.parse(localStorage.getItem(this.storageKeys.users)) || [];
    }
    
    saveUsers(users) {
        localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
    }
    
    // ==================== АВТОРИЗАЦИЯ ====================
    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            this.showNotification('Неверный email или пароль', 'error');
            return false;
        }
        
        this.currentUser = JSON.parse(JSON.stringify(user)); // Глубокая копия
        
        // Проверяем новый день для кликера
        const today = new Date().toDateString();
        if (this.currentUser.lastClickDate !== today) {
            this.currentUser.clicksToday = 0;
            this.currentUser.lastClickDate = today;
            this.saveUser(this.currentUser);
        }
        
        localStorage.setItem(this.storageKeys.currentUser, JSON.stringify(this.currentUser));
        this.showNotification(`Добро пожаловать, ${this.currentUser.name}!`, 'success');
        this.updateUI();
        return true;
    }
    
    register(name, email, password) {
        const users = this.getUsers();
        
        if (users.find(u => u.email === email)) {
            this.showNotification('Пользователь с таким email уже существует', 'error');
            return false;
        }
        
        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return false;
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            email,
            password,
            name,
            balance: 1000,
            cards: [{
                id: 'card_' + Date.now(),
                number: this.generateCardNumber(),
                type: 'debit',
                balance: 1000,
                holder: name.toUpperCase(),
                expiry: '12/28',
                isDefault: true
            }],
            transactions: [],
            clicks: 0,
            clicksToday: 0,
            lastClickDate: new Date().toDateString(),
            upgrades: {
                autoClicker: { level: 0, rate: 0 },
                doubleClick: { level: 0, multiplier: 1 }
            }
        };
        
        users.push(newUser);
        this.saveUsers(users);
        
        // Автоматический вход после регистрации
        return this.login(email, password);
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.storageKeys.currentUser);
        this.showNotification('Вы вышли из системы', 'info');
        this.updateUI();
    }
    
    loadCurrentUser() {
        const savedUser = localStorage.getItem(this.storageKeys.currentUser);
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                // Обновляем из основного хранилища
                const users = this.getUsers();
                const updatedUser = users.find(u => u.id === this.currentUser.id);
                if (updatedUser) {
                    this.currentUser = JSON.parse(JSON.stringify(updatedUser));
                }
            } catch (e) {
                console.error('Error loading user:', e);
                this.currentUser = null;
            }
        }
    }
    
    saveUser(user) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = JSON.parse(JSON.stringify(user));
            this.saveUsers(users);
        }
    }
    
    // ==================== КАРТЫ ====================
    generateCardNumber() {
        let number = '';
        for (let i = 0; i < 16; i++) {
            number += Math.floor(Math.random() * 10);
            if ((i + 1) % 4 === 0 && i !== 15) {
                number += ' ';
            }
        }
        return number;
    }
    
    issueCard(cardType) {
        if (!this.currentUser) return false;
        
        const newCard = {
            id: 'card_' + Date.now(),
            number: this.generateCardNumber(),
            type: cardType,
            balance: 0,
            holder: this.currentUser.name.toUpperCase(),
            expiry: '12/28',
            isDefault: false
        };
        
        this.currentUser.cards.push(newCard);
        this.saveUser(this.currentUser);
        
        // Добавляем транзакцию
        this.addTransaction(this.currentUser.id, 0, 'card_issue', 'Выпуск карты');
        
        this.showNotification(`Карта выпущена! Номер: ${newCard.number}`, 'success');
        this.updateDashboard();
        return true;
    }
    
    getCardByNumber(cardNumber) {
        const users = this.getUsers();
        for (const user of users) {
            const card = user.cards.find(c => c.number === cardNumber);
            if (card) return { user, card };
        }
        return null;
    }
    
    getUserByEmail(email) {
        const users = this.getUsers();
        return users.find(u => u.email === email);
    }
    
    // ==================== ПЕРЕВОДЫ (РАБОЧАЯ ВЕРСИЯ) ====================
    transferMoney(fromUserId, toIdentifier, amount, description = '') {
        if (!this.currentUser || this.currentUser.id !== fromUserId) {
            this.showNotification('Ошибка доступа', 'error');
            return false;
        }
        
        if (!amount || amount <= 0) {
            this.showNotification('Введите корректную сумму', 'error');
            return false;
        }
        
        if (this.currentUser.balance < amount) {
            this.showNotification('Недостаточно средств', 'error');
            return false;
        }
        
        // Ищем получателя
        let recipient = null;
        let recipientCard = null;
        
        if (toIdentifier.includes('@')) {
            // Перевод по email
            recipient = this.getUserByEmail(toIdentifier);
            if (!recipient) {
                this.showNotification('Пользователь не найден', 'error');
                return false;
            }
            recipientCard = recipient.cards.find(c => c.isDefault);
        } else {
            // Перевод по номеру карты
            const result = this.getCardByNumber(toIdentifier);
            if (!result) {
                this.showNotification('Карта не найдена', 'error');
                return false;
            }
            recipient = result.user;
            recipientCard = result.card;
        }
        
        if (!recipient || !recipientCard) {
            this.showNotification('Ошибка при поиске получателя', 'error');
            return false;
        }
        
        if (recipient.id === this.currentUser.id) {
            this.showNotification('Нельзя переводить себе', 'error');
            return false;
        }
        
        // Рассчитываем комиссию
        const commission = Math.max(10, Math.min(1000, amount * 0.015));
        const totalAmount = amount + commission;
        
        if (this.currentUser.balance < totalAmount) {
            this.showNotification(`Недостаточно средств с учетом комиссии ${commission}₽`, 'error');
            return false;
        }
        
        // Находим карту отправителя
        const senderCard = this.currentUser.cards.find(c => c.isDefault);
        
        // Выполняем перевод
        this.currentUser.balance -= totalAmount;
        if (senderCard) senderCard.balance -= totalAmount;
        
        recipient.balance += amount;
        recipientCard.balance += amount;
        
        // Сохраняем изменения
        const users = this.getUsers();
        const senderIndex = users.findIndex(u => u.id === this.currentUser.id);
        const recipientIndex = users.findIndex(u => u.id === recipient.id);
        
        if (senderIndex !== -1) users[senderIndex] = JSON.parse(JSON.stringify(this.currentUser));
        if (recipientIndex !== -1) users[recipientIndex] = JSON.parse(JSON.stringify(recipient));
        
        this.saveUsers(users);
        
        // Добавляем транзакции
        const transId = 'trans_' + Date.now();
        this.addTransaction(this.currentUser.id, -amount, 'transfer_out', 
            description || `Перевод ${recipient.name}`, { toCard: recipientCard.number, commission });
        
        this.addTransaction(recipient.id, amount, 'transfer_in',
            description || `Перевод от ${this.currentUser.name}`, { fromCard: senderCard?.number });
        
        // Обновляем текущего пользователя из хранилища
        this.currentUser = users[senderIndex];
        localStorage.setItem(this.storageKeys.currentUser, JSON.stringify(this.currentUser));
        
        this.showNotification(
            `Перевод ${this.formatCurrency(amount)} выполнен! ` +
            `Комиссия: ${this.formatCurrency(commission)}. ` +
            `Новый баланс: ${this.formatCurrency(this.currentUser.balance)}`,
            'success'
        );
        
        this.updateUI();
        this.updateDashboard();
        this.updateFooterStats();
        
        return true;
    }
    
    addTransaction(userId, amount, type, description, details = {}) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        const transaction = {
            id: 'trans_' + Date.now(),
            amount,
            type,
            description,
            details,
            date: new Date().toISOString()
        };
        
        if (!user.transactions) user.transactions = [];
        user.transactions.push(transaction);
        
        this.saveUsers(users);
        
        // Обновляем текущего пользователя если нужно
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser.transactions = user.transactions;
        }
    }
    
    // ==================== КЛИКЕР ====================
    handleClick() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        
        if (this.currentUser.clicksToday >= 1000) {
            this.showNotification('Достигнут дневной лимит (1000 кликов)', 'warning');
            return;
        }
        
        const baseEarning = 1;
        const multiplier = this.currentUser.upgrades.doubleClick.multiplier;
        const earnings = baseEarning * multiplier;
        
        this.currentUser.balance += earnings;
        this.currentUser.clicksToday += 1;
        
        const defaultCard = this.currentUser.cards.find(c => c.isDefault);
        if (defaultCard) {
            defaultCard.balance += earnings;
        }
        
        this.addTransaction(this.currentUser.id, earnings, 'clicker', 'Заработок в кликере');
        this.saveUser(this.currentUser);
        
        this.showNotification(`+${earnings}₽! Баланс: ${this.formatCurrency(this.currentUser.balance)}`, 'success');
        this.updateClickerUI();
        this.updateDashboard();
    }
    
    buyUpgrade(upgradeType) {
        if (!this.currentUser) return;
        
        const upgrade = this.currentUser.upgrades[upgradeType];
        if (!upgrade) return;
        
        const costs = {
            'auto-clicker': 1000 * Math.pow(2, upgrade.level),
            'double-click': 5000 * Math.pow(2, upgrade.level)
        };
        
        const cost = costs[upgradeType];
        
        if (this.currentUser.balance >= cost) {
            this.currentUser.balance -= cost;
            upgrade.level += 1;
            
            if (upgradeType === 'auto-clicker') {
                upgrade.rate += 0.5;
            } else if (upgradeType === 'double-click') {
                upgrade.multiplier += 0.5;
            }
            
            this.saveUser(this.currentUser);
            this.addTransaction(this.currentUser.id, -cost, 'upgrade', `Покупка улучшения: ${upgradeType}`);
            
            this.showNotification(`Улучшение куплено! Уровень: ${upgrade.level}`, 'success');
            this.updateClickerUI();
            this.updateDashboard();
        } else {
            this.showNotification('Недостаточно средств', 'error');
        }
    }
    
    // ==================== UI ОБНОВЛЕНИЯ ====================
    updateUI() {
        this.updateNavbar();
        this.updateHeroSection();
        this.updateClickerSection();
    }
    
    updateNavbar() {
        const navActions = document.getElementById('navActions');
        if (!navActions) return;
        
        if (this.currentUser) {
            navActions.innerHTML = `
                <div class="user-balance-nav">
                    <i class="fas fa-wallet"></i>
                    <span>${this.formatCurrency(this.currentUser.balance)}</span>
                </div>
                <button class="btn btn-outline" id="userLogoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Выйти
                </button>
            `;
            
            document.getElementById('userLogoutBtn')?.addEventListener('click', () => this.logout());
        } else {
            navActions.innerHTML = `
                <button class="btn btn-outline" id="navLoginBtn">Вход</button>
                <button class="btn btn-primary" id="navRegisterBtn">Регистрация</button>
            `;
        }
    }
    
    updateHeroSection() {
        const heroActions = document.getElementById('heroActions');
        if (!heroActions) return;
        
        if (this.currentUser) {
            heroActions.innerHTML = `
                <button class="btn btn-primary btn-large" onclick="bank.scrollToSection('clicker')">
                    <i class="fas fa-mouse-pointer"></i> Зарабатывать
                </button>
                <button class="btn btn-secondary btn-large" onclick="bank.scrollToSection('dashboard')">
                    <i class="fas fa-chart-line"></i> Кабинет
                </button>
            `;
        } else {
            heroActions.innerHTML = `
                <button class="btn btn-primary btn-large" id="heroLoginBtn">
                    <i class="fas fa-sign-in-alt"></i> Войти
                </button>
                <button class="btn btn-secondary btn-large" id="heroRegisterBtn">
                    <i class="fas fa-user-plus"></i> Регистрация
                </button>
            `;
        }
    }
    
    updateClickerSection() {
        const clickerGame = document.getElementById('clickerGame');
        const loginPrompt = document.getElementById('loginPrompt');
        
        if (this.currentUser) {
            if (clickerGame) clickerGame.style.display = 'block';
            if (loginPrompt) loginPrompt.style.display = 'none';
            this.updateClickerUI();
        } else {
            if (clickerGame) clickerGame.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = 'flex';
        }
    }
    
    updateClickerUI() {
        if (!this.currentUser) return;
        
        const elements = {
            'balance': this.formatCurrency(this.currentUser.balance),
            'totalEarned': this.formatCurrency(this.currentUser.balance + 9000), // Пример
            'clicksToday': `${this.currentUser.clicksToday}/1000`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    updateDashboard() {
        if (!this.currentUser) return;
        
        // Информация пользователя
        document.getElementById('userName').textContent = this.currentUser.name;
        document.getElementById('userEmail').textContent = this.currentUser.email;
        document.getElementById('userBalance').textContent = this.formatCurrency(this.currentUser.balance);
        
        // Карты
        this.updateCardsList();
        
        // История операций
        this.updateHistoryList();
    }
    
    updateCardsList() {
        const cardsList = document.getElementById('cardsList');
        if (!cardsList) return;
        
        if (!this.currentUser.cards || this.currentUser.cards.length === 0) {
            cardsList.innerHTML = `
                <div class="no-cards">
                    <p>У вас пока нет карт</p>
                    <button class="btn btn-primary" onclick="bank.showCardModal()">
                        Выпустить карту
                    </button>
                </div>
            `;
            return;
        }
        
        cardsList.innerHTML = this.currentUser.cards.map(card => `
            <div class="card-item">
                <div class="card-item-header">
                    <div class="card-type">
                        <i class="fas fa-credit-card"></i>
                        <span>${card.type === 'premium' ? 'Премиум' : 'Дебетовая'}</span>
                    </div>
                    <div class="card-balance">${this.formatCurrency(card.balance)}</div>
                </div>
                
                <div class="card-number-display">
                    ${card.number}
                    <button class="copy-btn" onclick="bank.copyToClipboard('${card.number}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                
                <div class="card-details">
                    <div>Держатель: ${card.holder}</div>
                    <div>Срок: ${card.expiry}</div>
                </div>
                
                <div class="card-actions">
                    <button class="btn btn-sm btn-outline" onclick="bank.transferFromCard('${card.number}')">
                        Перевести
                    </button>
                    ${card.isDefault ? '<span class="default-badge">Основная</span>' : ''}
                </div>
            </div>
        `).join('');
    }
    
    updateHistoryList() {
        const historyList = document.getElementById('historyList');
        if (!historyList || !this.currentUser) return;
        
        const transactions = (this.currentUser.transactions || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        if (transactions.length === 0) {
            historyList.innerHTML = '<p class="no-history">Нет операций</p>';
            return;
        }
        
        historyList.innerHTML = transactions.map(trans => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">${trans.description}</div>
                    <div class="history-date">${this.formatDate(trans.date)}</div>
                </div>
                <div class="history-amount ${trans.amount > 0 ? 'positive' : 'negative'}">
                    ${trans.amount > 0 ? '+' : ''}${this.formatCurrency(trans.amount)}
                </div>
            </div>
        `).join('');
    }
    
    updateFooterStats() {
        const users = this.getUsers();
        
        // Общее количество пользователей
        document.getElementById('totalUsersFooter').textContent = users.length;
        
        // Общее количество карт
        const totalCards = users.reduce((sum, user) => sum + (user.cards?.length || 0), 0);
        document.getElementById('totalCardsFooter').textContent = totalCards;
        
        // Общее количество транзакций
        const totalTransactions = users.reduce((sum, user) => sum + (user.transactions?.length || 0), 0);
        document.getElementById('totalTransactionsFooter').textContent = totalTransactions;
    }
    
    // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + ' ₽';
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return 'Сегодня';
        
        return date.toLocaleDateString('ru-RU');
    }
    
    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Добавляем стили
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
                    gap: 0.75rem;
                    z-index: 9999;
                    animation: slideIn 0.3s ease;
                    border-left: 4px solid #0052cc;
                }
                .notification-success { border-left-color: #36b37e; }
                .notification-error { border-left-color: #ff6b6b; }
                .notification-warning { border-left-color: #ffab00; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Удаляем через 5 секунд
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text.replace(/\s/g, '')).then(() => {
            this.showNotification('Номер карты скопирован', 'success');
        });
    }
    
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // ==================== МОДАЛЬНЫЕ ОКНА ====================
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    showTransferModal() {
        const modal = document.getElementById('transferModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Сброс формы
            const form = document.getElementById('transferForm');
            if (form) form.reset();
            
            // Обновление комиссии
            this.updateCommission(0);
        }
    }
    
    showCardModal() {
        const modal = document.getElementById('cardModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
    }
    
    updateCommission(amount) {
        const commission = Math.max(10, Math.min(1000, amount * 0.015));
        const total = amount + commission;
        
        document.getElementById('commission').textContent = this.formatCurrency(commission);
        document.getElementById('totalToDeduct').textContent = this.formatCurrency(total);
    }
    
    // ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
    setupEventListeners() {
        // Мобильное меню
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            const navMenu = document.getElementById('navMenu');
            navMenu.classList.toggle('active');
        });
        
        // Кликер
        document.getElementById('clickButton')?.addEventListener('click', () => this.handleClick());
        
        // Улучшения
        document.querySelectorAll('.buy-upgrade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const upgradeType = e.target.closest('.upgrade-item').dataset.upgrade;
                this.buyUpgrade(upgradeType);
            });
        });
        
        // Кнопки в кликере
        document.getElementById('promptLoginBtn')?.addEventListener('click', () => this.showLoginModal());
        document.getElementById('promptRegisterBtn')?.addEventListener('click', () => this.showRegisterModal());
        
        // Кнопки в кабинете
        document.getElementById('quickTransferBtn')?.addEventListener('click', () => {
            const cardNumber = document.getElementById('quickCardNumber')?.value;
            const amount = parseFloat(document.getElementById('quickAmount')?.value);
            
            if (cardNumber && amount) {
                this.transferMoney(this.currentUser.id, cardNumber, amount, 'Быстрый перевод');
            } else {
                this.showTransferModal();
            }
        });
        
        document.getElementById('openTransferModalBtn')?.addEventListener('click', () => this.showTransferModal());
        document.getElementById('addCardBtn')?.addEventListener('click', () => this.showCardModal());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('issueCardBtn')?.addEventListener('click', () => {
            const cardType = document.querySelector('.card-option.active')?.dataset.type || 'debit';
            if (this.issueCard(cardType)) {
                this.hideModals();
            }
        });
        
        // Закрытие модальных окон
        document.getElementById('closeLoginModal')?.addEventListener('click', () => this.hideModals());
        document.getElementById('closeRegisterModal')?.addEventListener('click', () => this.hideModals());
        document.getElementById('closeTransferModal')?.addEventListener('click', () => this.hideModals());
        document.getElementById('closeCardModal')?.addEventListener('click', () => this.hideModals());
        
        // Переключение между модальными окнами
        document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModals();
            setTimeout(() => this.showRegisterModal(), 300);
        });
        
        document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModals();
            setTimeout(() => this.showLoginModal(), 300);
        });
        
        // Форма входа
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (this.login(email, password)) {
                this.hideModals();
            }
        });
        
        // Форма регистрации
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                this.showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            if (this.register(name, email, password)) {
                this.hideModals();
            }
        });
        
        // Форма перевода
        document.getElementById('transferForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const activeTab = document.querySelector('.tab-btn.active');
            const transferType = activeTab?.dataset.tab;
            
            let recipient = '';
            if (transferType === 'email') {
                recipient = document.getElementById('transferEmail').value;
            } else {
                recipient = document.getElementById('transferCardNumber').value;
            }
            
            const amount = parseFloat(document.getElementById('transferAmount').value);
            const description = document.getElementById('transferMessage').value;
            
            if (this.transferMoney(this.currentUser.id, recipient, amount, description)) {
                this.hideModals();
            }
        });
        
        // Расчет комиссии
        document.getElementById('transferAmount')?.addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value) || 0;
            this.updateCommission(amount);
        });
        
        // Форматирование номера карты
        document.querySelectorAll('input[id*="CardNumber"]').forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                if (value.length > 16) value = value.substring(0, 16);
                
                const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                e.target.value = formatted;
            });
        });
        
        // Выбор типа карты
        document.querySelectorAll('.card-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.card-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                option.classList.add('active');
            });
        });
        
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`tab-${tabType}`)?.classList.add('active');
            });
        });
        
        // Закрытие модальных окон при клике вне
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
        
        // Кнопки входа/регистрации в навигации
        document.addEventListener('click', (e) => {
            if (e.target.id === 'navLoginBtn' || e.target.closest('#navLoginBtn')) {
                this.showLoginModal();
            }
            if (e.target.id === 'navRegisterBtn' || e.target.closest('#navRegisterBtn')) {
                this.showRegisterModal();
            }
            if (e.target.id === 'heroLoginBtn' || e.target.closest('#heroLoginBtn')) {
                this.showLoginModal();
            }
            if (e.target.id === 'heroRegisterBtn' || e.target.closest('#heroRegisterBtn')) {
                this.showRegisterModal();
            }
        });
        
        // Закрытие при Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideModals();
        });
    }
    
    // ==================== ГЛОБАЛЬНЫЕ МЕТОДЫ ====================
    transferFromCard(cardNumber) {
        if (!this.currentUser) {
            this.showNotification('Войдите в систему', 'error');
            return;
        }
        
        this.showTransferModal();
        
        // Автозаполнение поля
        setTimeout(() => {
            const input = document.getElementById('transferCardNumber');
            if (input) input.value = cardNumber;
        }, 100);
    }
}

// Инициализация системы
const bank = new BankSystem();

// Глобальные методы для HTML
window.bank = bank;
window.transferFromCard = (cardNumber) => bank.transferFromCard(cardNumber);
window.copyToClipboard = (text) => bank.copyToClipboard(text);
window.scrollToSection = (sectionId) => bank.scrollToSection(sectionId);
