// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.nav-menu');
const calculatorModal = document.getElementById('calculatorModal');
const calcBtn = document.getElementById('calcBtn');
const closeCalcModal = document.getElementById('closeCalcModal');
const applyLoanBtn = document.getElementById('applyLoan');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');

// Calculator Elements
const loanAmount = document.getElementById('loanAmount');
const loanTerm = document.getElementById('loanTerm');
const interestRate = document.getElementById('interestRate');
const loanAmountValue = document.getElementById('loanAmountValue');
const loanTermValue = document.getElementById('loanTermValue');
const interestRateValue = document.getElementById('interestRateValue');
const monthlyPayment = document.getElementById('monthlyPayment');
const totalOverpayment = document.getElementById('totalOverpayment');
const totalAmount = document.getElementById('totalAmount');

// Mobile Menu Toggle
menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.innerHTML = navMenu.classList.contains('active') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
});

// Calculator Modal
calcBtn.addEventListener('click', () => {
    calculatorModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
});

closeCalcModal.addEventListener('click', () => {
    calculatorModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === calculatorModal) {
        calculatorModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' ₽';
}

// Calculate loan
function calculateLoan() {
    const amount = parseFloat(loanAmount.value);
    const term = parseFloat(loanTerm.value);
    const rate = parseFloat(interestRate.value) / 100 / 12; // Monthly rate
    
    // Update display values
    loanAmountValue.textContent = formatCurrency(amount).replace(' ₽', '');
    loanTermValue.textContent = term;
    interestRateValue.textContent = parseFloat(interestRate.value).toFixed(1);
    
    // Calculate monthly payment using annuity formula
    const monthlyRate = rate;
    const monthly = amount * monthlyRate * Math.pow(1 + monthlyRate, term) / 
                   (Math.pow(1 + monthlyRate, term) - 1);
    
    // Calculate totals
    const totalPayment = monthly * term;
    const overpayment = totalPayment - amount;
    
    // Update results
    monthlyPayment.textContent = formatCurrency(monthly);
    totalOverpayment.textContent = formatCurrency(overpayment);
    totalAmount.textContent = formatCurrency(totalPayment);
}

// Initialize calculator
calculateLoan();

// Add event listeners for calculator inputs
loanAmount.addEventListener('input', calculateLoan);
loanTerm.addEventListener('input', calculateLoan);
interestRate.addEventListener('input', calculateLoan);

// Apply for loan button
applyLoanBtn.addEventListener('click', () => {
    alert('Заявка на кредит отправлена! Наш менеджер свяжется с вами в течение 30 минут.');
    calculatorModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

// Login and Register buttons
loginBtn.addEventListener('click', () => {
    alert('Функция входа в личный кабинет. В реальном банке здесь была бы форма входа.');
});

registerBtn.addEventListener('click', () => {
    alert('Функция открытия счета. В реальном банке здесь была бы форма регистрации.');
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Active nav link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelector(`.nav-link[href="#${sectionId}"]`)?.classList.add('active');
        } else {
            document.querySelector(`.nav-link[href="#${sectionId}"]`)?.classList.remove('active');
        }
    });
});

// Animate stats counter
const statCards = document.querySelectorAll('.stat-card');
const observerOptions = {
    threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target.querySelector('.stat-number');
            const value = statNumber.textContent;
            
            // Remove non-numeric characters
            const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
            
            // Animate counting
            let start = 0;
            const duration = 2000;
            const step = Math.ceil(numericValue / (duration / 16));
            
            const timer = setInterval(() => {
                start += step;
                if (start >= numericValue) {
                    start = numericValue;
                    clearInterval(timer);
                }
                statNumber.textContent = value.replace(/[0-9]+/g, start.toLocaleString());
            }, 16);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

statCards.forEach(card => observer.observe(card));

// Tariff card hover effect
document.querySelectorAll('.tariff-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        if (!this.classList.contains('featured')) {
            this.style.transform = 'translateY(-10px)';
            this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
        }
    });
    
    card.addEventListener('mouseleave', function() {
        if (!this.classList.contains('featured')) {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 8px 16px rgba(0, 82, 204, 0.1)';
        }
    });
});

// Service card animation on scroll
const serviceCards = document.querySelectorAll('.service-card');
const serviceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100);
        }
    });
}, { threshold: 0.1 });

serviceCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    serviceObserver.observe(card);
});
