/**
 * Smooth Cyclical Conveyor - Плавный циклический конвейер призов
 * Фишки непрерывно движутся по кругу, постоянно меняя порядок
 */

class SmoothCyclicalConveyor {
    constructor() {
        this.isActive = false;
        this.animationId = null;
        this.streakContainer = null;
        this.conveyorContainer = null;
        this.conveyorTrack = null;
        this.lastFrameTime = null;
        
        // Все доступные призы из папки main/img
        this.prizesPool = [
            'main/img/very-high-prize.svg',
            'main/img/very-high-prize.svg', 
            'main/img/medium-prize.svg',
            'main/img/low-prize.svg',
            'main/img/very-low-prize.svg',
            'main/img/ultra-low-prize.svg'
        ];
        
        // Базовая скорость помедленнее; далее адаптивно настроим по ширине контейнера
        this.conveyorSpeed = 0.4;
        this.prizeWidth = 70; // будет переоценена по фактической ширине элементов
        this.position = 0;
        this.lastShuffleTime = 0;
        this.shuffleInterval = 1000; // увеличил интервал между перемешиваниями
        this.adaptiveSpeed = true; // включена адаптация скорости под ширину контейнера
        this._resizeTimer = null;
        
        this.init();
    }
    
    init() {
        this.streakContainer = document.querySelector('.streak');
        if (!this.streakContainer) {
            console.warn('Блок .streak не найден');
            return;
        }
        
        this.setupStyles();
        this.setupConveyor();
        this.startConveyor();
        this.attachResizeHandler();
    }
    
    // Настройка стилей для плавного конвейера
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .streak {
                position: relative;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .smooth-conveyor-container {
                flex: 1;
                height: 60px;
                overflow: hidden;
                position: relative;
                background: transparent;
            }
            
            .smooth-conveyor-track {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                display: flex;
                align-items: center;
                gap: 15px;
                will-change: transform;
                backface-visibility: hidden;
                perspective: 1000px;
                transform-style: preserve-3d;
            }
            
            .smooth-prize {
                flex-shrink: 0;
                position: relative;
            }
            
            .smooth-prize img {
                display: block;
                transition: filter 0.3s ease;
                /* Сохраняем оригинальные размеры из CSS */
            }
            
            .smooth-prize img:hover {
                filter: brightness(1.1) saturate(1.1);
            }
            
            .circle {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { 
                    opacity: 1; 
                    transform: scale(1); 
                }
                50% { 
                    opacity: 0.7; 
                    transform: scale(1.2); 
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Настройка конвейера
setupConveyor() {
    const existingPrizes = this.streakContainer.querySelectorAll('.img-2, .img-3');
    const frameElement = this.streakContainer.querySelector('.frame');

    // Создаем контейнер конвейера
    const conveyorContainer = document.createElement('div');
    conveyorContainer.className = 'smooth-conveyor-container';

    // Создаем движущуюся дорожку
    const conveyorTrack = document.createElement('div');
    conveyorTrack.className = 'smooth-conveyor-track';

    // Сохраняем в объект класса ДО вызова updateConveyorDOM
    this.conveyorContainer = conveyorContainer;
    this.conveyorTrack = conveyorTrack;

    // Массив активных призов
    this.activePrizes = [];

    existingPrizes.forEach((prize) => {
        this.activePrizes.push({
            src: prize.src,
            className: prize.className
        });
        prize.remove();
    });

    // Добавляем дополнительные призы для заполнения (обновим после измерения ширины контейнера)
    for (let i = 0; i < 4; i++) {
        const randomPrize = this.getRandomPrize();
        this.activePrizes.push({
            src: randomPrize,
            className: this.getPrizeClass(randomPrize)
        });
    }

    // Теперь можно обновлять DOM
    this.updateConveyorDOM();

    // Добавляем дорожку в контейнер
    conveyorContainer.appendChild(conveyorTrack);

    // Вставляем контейнер на страницу
    if (frameElement) {
        frameElement.insertAdjacentElement('afterend', conveyorContainer);
    } else {
        this.streakContainer.appendChild(conveyorContainer);
    }

    // Начальная позиция + первичная адаптация
    this.position = 0;
    if (this.conveyorTrack) {
        this.conveyorTrack.style.transform = 'translate3d(0,0,0)';
    }
    // Рассчитать фактическую ширину приза и требуемое количество элементов
    this.recalculateMetrics();
    this.applyAdaptiveSpeed();
}

    
    // Обновление DOM элементов конвейера
    updateConveyorDOM() {
        if (!this.conveyorTrack) return;
        
        // Очищаем существующие элементы
        this.conveyorTrack.innerHTML = '';
        
        // Создаем элементы для всех призов (дублируем для бесшовности)
        const allPrizes = [...this.activePrizes, ...this.activePrizes];
        
        allPrizes.forEach(prize => {
            const conveyorPrize = this.createConveyorPrize(prize.src, prize.className);
            this.conveyorTrack.appendChild(conveyorPrize);
        });

        // После вставки — оценим среднюю ширину элементов
        const samples = this.conveyorTrack.querySelectorAll('.smooth-prize');
        if (samples.length) {
            let total = 0;
            let count = 0;
            samples.forEach(el => { total += el.offsetWidth; count++; });
            const avg = total / (count || 1);
            if (avg && isFinite(avg)) this.prizeWidth = Math.max(40, Math.round(avg));
        }
    }
    
    // Создание элемента приза для конвейера
    createConveyorPrize(prizeSrc, className) {
        const conveyorPrize = document.createElement('div');
        conveyorPrize.className = 'smooth-prize';
        
        const img = document.createElement('img');
        img.src = prizeSrc;
        img.className = className;
        
        conveyorPrize.appendChild(img);
        
        return conveyorPrize;
    }
    
    // Запуск конвейера
    startConveyor() {
        this.isActive = true;
        this.lastShuffleTime = Date.now();
        this.animate();
    }
    
    // Остановка конвейера
    stopConveyor() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.conveyorTrack.style.transition = 'none';
            this.conveyorTrack.style.transform = `translate3d(${this.position}px, 0, 0)`;
        }
    
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    
    
    // Упрощенное перемешивание без анимации сдвига
    startSmoothShuffle() {
        if (this.isShuffling) return;
        
        this.isShuffling = true;
        
        // Меняем призы местами
        this.shufflePrizes();
        
        // Сбрасываем позицию в начало
        this.position = 0;
        if (this.conveyorTrack) {
            this.conveyorTrack.style.transition = 'none';
            this.conveyorTrack.style.transform = 'translate3d(0, 0, 0)';
            // Принудительный рефлоу
            this.conveyorTrack.offsetHeight;
        }
        
        this.isShuffling = false;
    }
    
    // Перемешивание призов для изменения порядка
    shufflePrizes() {
        // Перемешиваем текущий массив призов
        const shuffled = [...this.activePrizes];
        
        // Алгоритм Fisher-Yates для перемешивания
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Обновляем массив призов
        this.activePrizes = shuffled;
        
        // Обновляем DOM
        this.updateConveyorDOM();
        
        console.log('🔄 Порядок призов обновлен');
    }
    
    // Получение правильного CSS класса для приза
    getPrizeClass(prizeSrc) {
        // Для low, very-low, ultra-low используем img-3
        if (prizeSrc.includes('low-prize.svg') || 
            prizeSrc.includes('very-low-prize.svg') || 
            prizeSrc.includes('ultra-low-prize.svg')) {
            return 'img-3';
        }
        // Для остальных используем img-2
        return 'img-2';
    }
    
    // Получение случайного приза
    getRandomPrize() {
        return this.prizesPool[Math.floor(Math.random() * this.prizesPool.length)];
    }
    
    // Публичные методы для управления
    pause() {
        this.stopConveyor();
        console.log('🛑 Конвейер приостановлен');
    }
    
    resume() {
        if (!this.isActive) {
            this.startConveyor();
            console.log('▶️ Конвейер возобновлен');
        }
    }
    
    // Настройка скорости конвейера
    setSpeed(pixelsPerFrame) {
        this.conveyorSpeed = pixelsPerFrame;
        console.log(`⚡ Скорость конвейера: ${pixelsPerFrame} пикс/кадр`);
    }

    // Включить/выключить адаптивную скорость
    setAdaptive(enabled) {
        this.adaptiveSpeed = !!enabled;
        this.applyAdaptiveSpeed();
    }
    
    // Настройка интервала перемешивания
    setShuffleInterval(milliseconds) {
        this.shuffleInterval = milliseconds;
        console.log(`🔄 Интервал перемешивания: ${milliseconds}мс`);
    }
    
    // Принудительное перемешивание
    triggerShuffle() {
        this.shufflePrizes();
        console.log('🎰 Принудительное перемешивание призов');
    }
    
    // Добавление нового приза в пул
    addPrize(prizePath) {
        if (!this.prizesPool.includes(prizePath)) {
            this.prizesPool.push(prizePath);
            console.log(`➕ Добавлен новый приз: ${prizePath}`);
        }
    }
    
    // Получение текущего списка призов
    getPrizes() {
        return [...this.prizesPool];
    }
}

// Автоматический запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Небольшая задержка для полной загрузки DOM
    setTimeout(() => {
        window.SmoothConveyor = new SmoothCyclicalConveyor();
        console.log('🎰 Плавный циклический конвейер запущен!');
        console.log('📁 Призы загружаются из папки: main/img/');
        console.log('🔄 Порядок призов меняется каждые 4 секунды');
        console.log('🎮 Управление: window.SmoothConveyor.pause() / .resume() / .triggerShuffle()');
    }, 300);
});

// =====================
// Helpers (часть класса)
// =====================
SmoothCyclicalConveyor.prototype.recalculateMetrics = function() {
    if (!this.conveyorContainer || !this.conveyorTrack) return;
    // Убедимся, что элементов хватает минимум на 2 ширины контейнера
    const containerW = this.conveyorContainer.clientWidth || 0;
    const needWidth = containerW * 2; // запас для плавности
    const currentWidth = (this.activePrizes.length * this.prizeWidth);
    if (currentWidth < needWidth) {
        const toAdd = Math.ceil((needWidth - currentWidth) / this.prizeWidth);
        for (let i = 0; i < toAdd; i++) {
            const randomPrize = this.getRandomPrize();
            this.activePrizes.push({ src: randomPrize, className: this.getPrizeClass(randomPrize) });
        }
        this.updateConveyorDOM();
    }
};

SmoothCyclicalConveyor.prototype.applyAdaptiveSpeed = function() {
    if (!this.adaptiveSpeed || !this.conveyorContainer) return;
    const w = Math.max(320, this.conveyorContainer.clientWidth || 0);
    // Нормируем скорость: чем шире, тем немного быстрее, но в разумных пределах
    const v = w / 1200; // 1200px ~ 1.0; 320px ~ 0.27
    this.conveyorSpeed = Math.min(1.0, Math.max(0.25, v));
};

SmoothCyclicalConveyor.prototype.attachResizeHandler = function() {
    window.addEventListener('resize', () => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this.recalculateMetrics();
            this.applyAdaptiveSpeed();
        }, 120);
    });
};
