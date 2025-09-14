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
        
        this.conveyorSpeed = 0.8; // немного увеличил скорость для лучшей плавности
        this.prizeWidth = 70; // ширина приза с отступом
        this.position = 0;
        this.lastShuffleTime = 0;
        this.shuffleInterval = 1000; // увеличил интервал между перемешиваниями
        
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

    // Добавляем дополнительные призы для заполнения
    for (let i = 0; i < 8; i++) {
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

    // Начальная позиция
    this.position = 0;
    if (this.conveyorTrack) {
        this.conveyorTrack.style.transform = 'translate3d(0,0,0)';
    }
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
        }
    }
    
    animate() {
        if (!this.isActive) return;
    
        const currentTime = performance.now();
        const deltaTime = currentTime - (this.lastFrameTime || currentTime);
        this.lastFrameTime = currentTime;
    
        this.position -= this.conveyorSpeed * (deltaTime / 16);
    
        const totalWidth = this.activePrizes.length * this.prizeWidth;
    
        // ⚡ Здесь сброс делаем только когда сместились на ширину половины трека
        if (Math.abs(this.position) >= totalWidth) {
            this.position = 0;
        }
    
        if (this.conveyorTrack) {
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


const slides = [
    { 
      title: "Халявные деньги ✩", 
      text: "Приглашай своих друзей и <br />получай проценты с депозитов!",
      bg: "linear-gradient(90deg, rgba(255, 64, 62, 1) 0%, rgba(255,64,62,0.8) 100%)",
      shadow: "0px 0px 55px #ff403f54",
      activeEllipse: "ellipse-4"
    },
    { 
      title: "NFT кейсы 🎨", 
      text: "Собирай NFT и получай уникальные бонусы <br />каждую неделю!",
      bg: "#8a369a",
      shadow: "0px 0px 45px #8a369a80",
      activeEllipse: "ellipse-5"
    },
    { 
      title: "Казик 🎰", 
      text: "Испытай удачу и выигрывай реальные призы <br />каждый день!",
      bg: "#3f3333",
      shadow: "0px 0px 50px #3f333380",
      activeEllipse: "ellipse-6"
    }
  ];
  
  let current = 0;
  const bannerEl = document.getElementById("banner");
  const titleEl = document.getElementById("banner-title");
  const textEl = document.getElementById("banner-text");
  const ellipses = {
    "ellipse-4": document.querySelector(".ellipse-4"),
    "ellipse-5": document.querySelector(".ellipse-5"),
    "ellipse-6": document.querySelector(".ellipse-6")
  };
  
  function showSlide(index) {
    // fade текста
    titleEl.classList.add('fade-out');
    textEl.classList.add('fade-out');
  
    setTimeout(() => {
      // обновляем текст
      titleEl.innerHTML = slides[index].title;
      textEl.innerHTML = slides[index].text;
  
      // фон и тень
      bannerEl.style.setProperty('--banner-bg', slides[index].bg);
      bannerEl.style.setProperty('--banner-shadow', slides[index].shadow);
  
      // эллипсы
      Object.keys(ellipses).forEach(key => {
        ellipses[key].style.backgroundColor = (key === slides[index].activeEllipse) ? "white" : "gray";
      });
  
      // fade-in текста
      titleEl.classList.remove('fade-out');
      textEl.classList.remove('fade-out');
      titleEl.classList.add('fade-in');
      textEl.classList.add('fade-in');
    }, 300);
  
    setTimeout(() => {
      titleEl.classList.remove('fade-in');
      textEl.classList.remove('fade-in');
    }, 600);
  }
  
  // инициализация первого слайда
  showSlide(current);
  
  // свайпы
  let startX = 0;
  
  bannerEl.addEventListener('touchstart', e => startX = e.touches[0].clientX);
  bannerEl.addEventListener('touchend', e => {
    let diff = e.changedTouches[0].clientX - startX;
    if (diff > 50) current = (current - 1 + slides.length) % slides.length;
    else if (diff < -50) current = (current + 1) % slides.length;
    showSlide(current);
  });


  const menuItems = document.querySelectorAll('.section-menu > div:not(.select)');
  const selectBg = document.querySelector('.section-menu .select');
  const cardsContainer = document.querySelector('.case');
  const cards = Array.from(cardsContainer.children);
  
  // Сохраняем исходный порядок карточек
  const originalOrder = [...cards];
  
  const BUTTON_WIDTH = 73;  
  const BUTTON_HEIGHT = 45;  
  
  const leftPositions = {
    all: '0',
    chips: '4.6rem',
    new: '9.1rem',
    low: '13.6rem',
    high: '18.5rem'
  };
  
  function filterCards(type) {
    let filtered;
  
    switch(type) {
      case 'all':
        filtered = [...originalOrder]; // возвращаем исходный порядок
        break;
      case 'chips':
        filtered = cards.filter(card => card.dataset.chip === "true");
        break;
      case 'new':
        filtered = cards.filter(card => card.dataset.new === "true");
        break;
      case 'low':
        filtered = cards.sort((a,b) => Number(a.dataset.price) - Number(b.dataset.price));
        break;
      case 'high':
        filtered = cards.sort((a,b) => Number(b.dataset.price) - Number(a.dataset.price));
        break;
    }
  
    cardsContainer.innerHTML = '';
    filtered.forEach(card => cardsContainer.appendChild(card));
  }
  
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      let text = item.querySelector('div')?.innerText.trim().toLowerCase();
      let type = 'all';
      if(text === 'all') type = 'all';
      else if(text === 'chips') type = 'chips';
      else if(text === 'new') type = 'new';
      else if(text === 'low') type = 'low';
      else if(text === 'high') type = 'high';
  
      filterCards(type);
  
      // Перемещаем .select на фиксированное значение left
      selectBg.style.width = BUTTON_WIDTH + 'px';
      selectBg.style.height = BUTTON_HEIGHT + 'px';
      selectBg.style.left = leftPositions[type];
  
      menuItems.forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
  });
  
  // Инициализация при загрузке — ставим на All
  window.addEventListener('load', () => {
    selectBg.style.width = BUTTON_WIDTH + 'px';
    selectBg.style.height = BUTTON_HEIGHT + 'px';
    selectBg.style.left = leftPositions['all'];
    menuItems[0].classList.add('active');
  });
