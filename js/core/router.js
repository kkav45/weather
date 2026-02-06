/**
 * Роутер для навигации между страницами приложения
 * Обеспечивает плавные переходы и управление историей
 */
class Router {
    constructor() {
        this.currentPage = null;
        this.pageCache = new Map();
        this.init();
    }

    init() {
        // Настройка обработчика изменений истории
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });
        
        // Кэширование текущей страницы
        this.cacheCurrentPage();
    }

    navigate(pageName, state = {}) {
        // Полный путь к странице
        const pagePath = `${pageName}.html`;
        
        // Проверка, не находимся ли мы уже на этой странице
        if (window.location.pathname.endsWith(pagePath)) {
            return;
        }
        
        // Создание нового состояния
        const newState = {
            page: pageName,
            ...state,
            timestamp: Date.now()
        };
        
        // Добавление в историю
        history.pushState(newState, '', pagePath);
        
        // Загрузка новой страницы
        this.loadPage(pagePath, newState);
        
        // Логирование
        console.log(`➡️ Навигация: ${this.currentPage || 'start'} -> ${pageName}`);
    }

    loadPage(url, state) {
        // Показ индикатора загрузки
        if (window.meteoApp) {
            window.meteoApp.showLoading(true, 'Загрузка страницы...');
        }
        
        // Сохранение текущей страницы в кэш
        this.cacheCurrentPage();
        
        // Создание AJAX запроса для загрузки содержимого
        fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Парсинг HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Извлечение содержимого страницы
            const newContent = doc.querySelector('.main-container, .charts-container, .tables-container, .report-container');
            const newTitle = doc.querySelector('title')?.textContent;
            const newScripts = Array.from(doc.querySelectorAll('script[src]'));
            
            if (newContent) {
                // Анимация ухода текущего контента
                const currentContainer = document.querySelector('.main-container, .charts-container, .tables-container, .report-container');
                if (currentContainer) {
                    currentContainer.style.opacity = '0';
                    currentContainer.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        // Замена контента
                        document.title = newTitle || 'Метеоанализ БВС';
                        document.body.replaceChild(newContent, currentContainer);
                        
                        // Анимация появления нового контента
                        newContent.style.opacity = '0';
                        newContent.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            newContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                            newContent.style.opacity = '1';
                            newContent.style.transform = 'translateY(0)';
                        }, 50);
                        
                        // Загрузка скриптов страницы
                        this.loadPageScripts(newScripts);
                        
                        // Инициализация нового контента
                        this.initNewPageContent(state);
                        
                        // Обновление текущей страницы
                        this.currentPage = state.page;
                        
                        // Скрытие индикатора загрузки
                        if (window.meteoApp) {
                            window.meteoApp.showLoading(false);
                        }
                        
                        // Логирование
                        window.meteoApp?.logEvent('page_loaded', { page: state.page });
                    }, 300);
                } else {
                    // Полная перезагрузка страницы
                    window.location.href = url;
                }
            } else {
                // Полная перезагрузка страницы
                window.location.href = url;
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки страницы:', error);
            window.meteoApp?.showNotification('Ошибка загрузки страницы', 'Ошибка', 'error');
            window.meteoApp?.showLoading(false);
            
            // Резервный переход
            window.location.href = url;
        });
    }

    cacheCurrentPage() {
        const currentContainer = document.querySelector('.main-container, .charts-container, .tables-container, .report-container');
        if (currentContainer && this.currentPage) {
            this.pageCache.set(this.currentPage, {
                content: currentContainer.cloneNode(true),
                title: document.title,
                timestamp: Date.now()
            });
        }
    }

    handlePopState(e) {
        const state = e.state;
        if (state && state.page) {
            const cachedPage = this.pageCache.get(state.page);
            
            if (cachedPage && Date.now() - cachedPage.timestamp < 300000) { // Кэш 5 минут
                // Восстановление из кэша
                document.title = cachedPage.title;
                const currentContainer = document.querySelector('.main-container, .charts-container, .tables-container, .report-container');
                if (currentContainer) {
                    currentContainer.style.opacity = '0';
                    setTimeout(() => {
                        document.body.replaceChild(cachedPage.content.cloneNode(true), currentContainer);
                        this.currentPage = state.page;
                        this.initNewPageContent(state);
                        
                        if (window.meteoApp) {
                            window.meteoApp.showLoading(false);
                        }
                    }, 300);
                }
            } else {
                // Загрузка страницы заново
                this.loadPage(`${state.page}.html`, state);
            }
        }
    }

    loadPageScripts(scripts) {
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
                newScript.async = false; // Загрузка в порядке очереди
            } else {
                newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript);
        });
    }

    initNewPageContent(state) {
        // Инициализация компонентов на новой странице
        if (window.meteoApp) {
            // Обновление состояния приложения
            window.meteoApp.state.activePage = state.page;
            
            // Инициализация обработчиков событий
            if (typeof window.meteoApp.setupEventListeners === 'function') {
                window.meteoApp.setupEventListeners();
            }
            
            // Загрузка данных для страницы
            if (state.page === 'charts' && window.meteoApp.dataManager) {
                window.meteoApp.dataManager.loadChartData();
            } else if (state.page === 'tables' && window.meteoApp.dataManager) {
                window.meteoApp.dataManager.loadTableData();
            } else if (state.page === 'report' && window.meteoApp.pdfGenerator) {
                window.meteoApp.pdfGenerator.initForm();
            }
        }
        
        // Прокрутка наверх
        window.scrollTo(0, 0);
    }

    // Метод для программной навигации
    goBack() {
        history.back();
    }

    goForward() {
        history.forward();
    }

    reload() {
        window.location.reload();
    }
}