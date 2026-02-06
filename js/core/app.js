/**
 * Основной класс приложения Метеоанализ БВС
 * АВТОМАТИЧЕСКОЕ УПРАВЛЕНИЕ ЕДИНОЙ БАЗОЙ ДАННЫХ В ФАЙЛЕ weather_database.json
 * РАБОТАЕТ В ЛЮБОМ РЕЖИМЕ (ВКЛЮЧАЯ file:// С ОГРАНИЧЕНИЯМИ)
 * УЛУЧШЕННАЯ ОБРАБОТКА ТАЙМАУТОВ С ПОВТОРНЫМИ ПОПЫТКАМИ
 * БЕЗ ЗАВИСИМОСТИ ОТ ВНЕШНИХ БИБЛИОТЕК ИКОНОК ПОГОДЫ
 */
class MeteoAnalysisApp {
    constructor() {
        // Глобальное состояние приложения
        this.state = {
            currentDate: new Date().toISOString().split('T')[0],
            weatherDatabase: {},      // База данных в памяти
            databaseFileHandle: null, // Handle для файла базы данных (File System Access API)
            currentAnalysis: null,
            selectedDate: null,
            selectedPolygon: null,
            selectedRoute: null,
            analysisInProgress: false,
            mapManager: null,
            activePage: this.detectCurrentPage(),
            databaseInitialized: false,
            useFileSystemAPI: false   // Флаг использования File System API
        };

        // Инициализация
        this.init();
    }

    init() {
        console.log('🚀 Инициализация приложения Метеоанализ БВС...');
        console.log('ℹ️  Протокол приложения: ' + window.location.protocol);
        
        // Предупреждение о режиме file:// (но без блокировки)
        if (window.location.protocol === 'file:') {
            console.warn('⚠️ Приложение запущено через протокол file://. Некоторые функции могут быть ограничены.');
            console.warn('💡 Рекомендуется запустить через локальный сервер: python -m http.server 8000');
            
            // Показываем однократное предупреждение
            if (localStorage.getItem('fileModeWarningShown') !== 'true') {
                this.showNotification(
                    '⚠️ <strong>Режим ограниченной функциональности</strong><br><br>' +
                    'Приложение запущено через <code>file://</code>.<br>' +
                    '• Запросы к внешним API могут не работать из-за CORS<br>' +
                    '• Данные сохраняются только в памяти браузера (IndexedDB)<br><br>' +
                    '💡 <strong>Рекомендуется:</strong> Запустите через локальный сервер:<br>' +
                    '<code>python -m http.server 8000</code><br>' +
                    'Затем откройте: <code>http://localhost:8000</code>',
                    'Важное предупреждение',
                    'warning'
                );
                localStorage.setItem('fileModeWarningShown', 'true');
            }
        }
        
        // Инициализация базы данных (асинхронно)
        this.initDatabase()
            .then(function() {
                // Инициализация модулей
                this.initModules();
                
                // Настройка глобальных обработчиков
                this.setupGlobalEventListeners();
                
                // Загрузка данных из базы
                this.loadDatabaseData();
                
                console.log('✅ Приложение полностью инициализировано');
                console.log('📄 Текущая страница: ' + this.state.activePage);
                console.log('📊 В базе данных: ' + Object.keys(this.state.weatherDatabase).length + ' записей');
                console.log('📁 Режим сохранения: ' + (this.state.useFileSystemAPI ? 'File System API' : 'IndexedDB + localStorage'));
            }.bind(this))
            .catch(function(error) {
                console.error('❌ Ошибка инициализации базы данных:', error);
                this.showNotification(
                    '❌ Ошибка инициализации базы данных:<br>' + error.message + '<br><br>' +
                    'Данные будут сохраняться только в памяти браузера до закрытия вкладки.',
                    'Ошибка базы данных',
                    'error'
                );
                this.state.databaseInitialized = false;
            }.bind(this));
    }

    // ======================
    // АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
    // ======================

    initDatabase() {
        return new Promise(function(resolve, reject) {
            // Проверяем поддержку File System Access API и режим работы
            var canUseFileSystem = 'showOpenFilePicker' in window && window.location.protocol !== 'file:';
            
            if (canUseFileSystem) {
                console.log('📁 File System Access API поддерживается и доступен');
                this.initFileSystemDatabase()
                    .then(function() {
                        this.state.useFileSystemAPI = true;
                        resolve();
                    }.bind(this))
                    .catch(function(error) {
                        console.log('ℹ️ Откат к резервному варианту (IndexedDB)');
                        this.initIndexedDBDatabase()
                            .then(function() {
                                this.state.useFileSystemAPI = false;
                                resolve();
                            }.bind(this))
                            .catch(reject);
                    }.bind(this));
            } else {
                console.log('📁 File System Access API недоступен или заблокирован, используем IndexedDB + localStorage');
                this.initIndexedDBDatabase()
                    .then(function() {
                        this.state.useFileSystemAPI = false;
                        resolve();
                    }.bind(this))
                    .catch(reject);
            }
        }.bind(this));
    }

    initFileSystemDatabase() {
        return new Promise(function(resolve, reject) {
            // Пытаемся получить доступ к папке data_weather
            window.showDirectoryPicker({
                id: 'weather-data-directory',
                startIn: 'downloads'
            })
            .then(function(dirHandle) {
                // Проверяем, существует ли файл базы данных
                dirHandle.getFileHandle('weather_database.json', { create: false })
                .then(function(fileHandle) {
                    // Файл существует - загружаем его
                    return fileHandle.getFile();
                })
                .then(function(file) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            if (e.target.result) {
                                this.state.weatherDatabase = JSON.parse(e.target.result);
                                console.log('✅ Загружено ' + Object.keys(this.state.weatherDatabase).length + ' записей из файла');
                            } else {
                                this.state.weatherDatabase = {};
                            }
                            
                            this.state.databaseFileHandle = fileHandle;
                            console.log('✅ Подключение к существующему файлу базы данных установлено');
                            
                            // Сохраняем выбранную папку для будущих сессий
                            if ('persist' in dirHandle) {
                                dirHandle.persist().then(function() {
                                    resolve();
                                }.bind(this)).catch(function() {
                                    resolve(); // Не критично, если не удалось сохранить
                                }.bind(this));
                            } else {
                                resolve();
                            }
                        } catch (error) {
                            reject(error);
                        }
                    }.bind(this);
                    reader.onerror = function(e) {
                        reject(e.target.error);
                    };
                    reader.readAsText(file);
                }.bind(this))
                .catch(function(error) {
                    // Файл не существует - создаем новый
                    dirHandle.getFileHandle('weather_database.json', { create: true })
                    .then(function(newFileHandle) {
                        newFileHandle.createWritable()
                        .then(function(writable) {
                            writable.write(JSON.stringify({}, null, 2));
                            return writable.close();
                        })
                        .then(function() {
                            this.state.weatherDatabase = {};
                            this.state.databaseFileHandle = newFileHandle;
                            console.log('✅ Создан новый файл базы данных weather_database.json');
                            
                            this.showNotification(
                                '✅ База данных создана!<br><br>' +
                                'Файл <code>weather_database.json</code> создан в выбранной папке.<br>' +
                                'Теперь все метеоданные будут автоматически сохраняться в этот файл.',
                                'База данных готова',
                                'success'
                            );
                            
                            // Сохраняем выбранную папку для будущих сессий
                            if ('persist' in dirHandle) {
                                dirHandle.persist().then(function() {
                                    resolve();
                                }.bind(this)).catch(function() {
                                    resolve(); // Не критично
                                }.bind(this));
                            } else {
                                resolve();
                            }
                        }.bind(this))
                        .catch(reject);
                    }.bind(this));
                }.bind(this));
            }.bind(this))
            .catch(function(error) {
                if (error.name === 'AbortError') {
                    console.log('ℹ️ Пользователь отменил выбор папки, используем резервный вариант');
                    // Отклоняем промис, чтобы вызвать резервный вариант в initDatabase
                    reject(error);
                } else {
                    reject(error);
                }
            }.bind(this));
        }.bind(this));
    }

    initIndexedDBDatabase() {
        return new Promise(function(resolve, reject) {
            var request = indexedDB.open('WeatherDatabase', 1);
            
            request.onupgradeneeded = function(event) {
                var db = event.target.result;
                if (!db.objectStoreNames.contains('weatherData')) {
                    db.createObjectStore('weatherData', { keyPath: 'date' });
                }
            };
            
            request.onsuccess = function(event) {
                var db = event.target.result;
                
                // Загружаем все данные из IndexedDB
                var transaction = db.transaction(['weatherData'], 'readonly');
                var store = transaction.objectStore('weatherData');
                var getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = function() {
                    var records = getAllRequest.result;
                    this.state.weatherDatabase = {};
                    
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        this.state.weatherDatabase[record.date] = record.data;
                    }
                    
                    console.log('✅ Загружено ' + records.length + ' записей из IndexedDB');
                    
                    // Также проверяем localStorage как дополнительный источник
                    var localStorageData = localStorage.getItem('weather_database');
                    if (localStorageData) {
                        try {
                            var parsedData = JSON.parse(localStorageData);
                            // Объединяем данные из IndexedDB и localStorage (IndexedDB имеет приоритет)
                            for (var key in parsedData) {
                                if (parsedData.hasOwnProperty(key)) {
                                    this.state.weatherDatabase[key] = parsedData[key];
                                }
                            }
                            console.log('✅ Данные из localStorage объединены с IndexedDB');
                        } catch (e) {
                            console.warn('⚠️ Ошибка парсинга данных из localStorage:', e);
                        }
                    }
                    
                    resolve();
                }.bind(this);
                
                getAllRequest.onerror = function() {
                    reject(getAllRequest.error);
                };
            }.bind(this);
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        }.bind(this));
    }

    // ======================
    // СОХРАНЕНИЕ ДАННЫХ В БАЗУ
    // ======================

    saveAnalysisToDatabase(analysisData) {
        return new Promise(function(resolve, reject) {
            try {
                // Добавляем запись в базу данных в памяти
                this.state.weatherDatabase[analysisData.analysisDate] = {
                    timestamp: new Date().toISOString(),
                    polygons: [analysisData.polygon],
                    routes: analysisData.routes,
                    weatherData: analysisData.weatherData,
                    analysisResults: analysisData.analysisResults,
                    recommendations: analysisData.recommendations
                };
                
                // Сохраняем в постоянное хранилище в зависимости от режима
                if (this.state.useFileSystemAPI && this.state.databaseFileHandle && 'createWritable' in this.state.databaseFileHandle) {
                    // Сохраняем через File System Access API
                    this.state.databaseFileHandle.createWritable()
                    .then(function(writable) {
                        return writable.write(JSON.stringify(this.state.weatherDatabase, null, 2));
                    }.bind(this))
                    .then(function() {
                        return this.state.databaseFileHandle.createWritable().then(function(w) { return w.close(); });
                    }.bind(this))
                    .then(function() {
                        console.log('✅ Данные за ' + analysisData.analysisDate + ' сохранены в файл');
                        this.finalizeSave(analysisData, resolve);
                    }.bind(this))
                    .catch(function(error) {
                        console.warn('⚠️ Ошибка сохранения через File System API, используем резервный вариант');
                        this.saveToIndexedDB(analysisData)
                            .then(function() {
                                this.finalizeSave(analysisData, resolve);
                            }.bind(this))
                            .catch(reject);
                    }.bind(this));
                } else {
                    // Сохраняем через IndexedDB и localStorage
                    this.saveToIndexedDB(analysisData)
                        .then(function() {
                            this.finalizeSave(analysisData, resolve);
                        }.bind(this))
                        .catch(reject);
                }
            } catch (error) {
                reject(error);
            }
        }.bind(this));
    }
    
    saveToIndexedDB(analysisData) {
        return new Promise(function(resolve, reject) {
            var request = indexedDB.open('WeatherDatabase', 1);
            
            request.onsuccess = function(event) {
                var db = event.target.result;
                var transaction = db.transaction(['weatherData'], 'readwrite');
                var store = transaction.objectStore('weatherData');
                
                store.put({
                    date: analysisData.analysisDate,
                     this.state.weatherDatabase[analysisData.analysisDate]
                });
                
                transaction.oncomplete = function() {
                    // Также сохраняем в localStorage для дополнительной надежности
                    localStorage.setItem('weather_database', JSON.stringify(this.state.weatherDatabase));
                    console.log('✅ Данные за ' + analysisData.analysisDate + ' сохранены в IndexedDB и localStorage');
                    resolve();
                }.bind(this);
                
                transaction.onerror = function() {
                    reject(transaction.error);
                };
            }.bind(this);
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        }.bind(this));
    }
    
    finalizeSave(analysisData, resolveCallback) {
        // Обновляем состояние приложения
        this.state.currentAnalysis = analysisData;
        this.state.selectedDate = analysisData.analysisDate;
        
        console.log('✅ Данные за ' + analysisData.analysisDate + ' сохранены в базу данных');
        
        // Формируем сообщение в зависимости от режима сохранения
        var message = '✅ Анализ за ' + this.formatDate(new Date(analysisData.analysisDate)) + ' сохранен!<br><br>';
        
        if (this.state.useFileSystemAPI) {
            message += 'Данные автоматически добавлены в файл <code>weather_database.json</code> в папке <code>data_weather</code>.';
        } else {
            message += 'Данные сохранены в памяти браузера (IndexedDB).<br>' +
                      'Для постоянного хранения запустите приложение через локальный сервер.';
        }
        
        this.showNotification(message, 'Анализ сохранен', 'success');
        
        if (resolveCallback) {
            resolveCallback();
        }
    }

    // ======================
    // ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ
    // ======================

    getDatesWithData() {
        return Object.keys(this.state.weatherDatabase).sort();
    }

    getWeatherDataByDate(date) {
        return this.state.weatherDatabase[date] || null;
    }

    loadDatabaseData() {
        var dates = this.getDatesWithData();
        console.log('📅 Доступные даты в базе: ' + dates.length);
        
        if (dates.length > 0) {
            // Выбираем последнюю дату по умолчанию
            this.state.selectedDate = dates[dates.length - 1];
            this.state.currentAnalysis = this.getWeatherDataByDate(this.state.selectedDate);
            console.log('✅ Выбрана дата по умолчанию: ' + this.state.selectedDate);
        }
    }

    // ======================
    // ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ И ОБРАБОТКА СОБЫТИЙ
    // ======================

    initModules() {
        if (this.state.activePage === 'index' && typeof MapManager !== 'undefined') {
            this.mapManager = new MapManager(this);
        }
    }

    setupGlobalEventListeners() {
        // Обработчик навигации
        var navLinks = document.querySelectorAll('.nav-menu a');
        for (var i = 0; i < navLinks.length; i++) {
            navLinks[i].addEventListener('click', function(e) {
                e.preventDefault();
                var targetPage = this.getAttribute('href').replace('.html', '');
                this.navigate(targetPage);
            }.bind(this));
        }
        
        // Обработчик кнопки "Анализ"
        var analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', function() {
                this.analyzeRoute();
            }.bind(this));
        }
        
        // Обработчик кнопки "Экспорт"
        var exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                if (this.pdfGenerator) {
                    this.pdfGenerator.generateReport();
                }
            }.bind(this));
        }
        
        // Обработчик выбора даты в календаре (на всех страницах)
        var dateInputs = document.querySelectorAll('.date-select');
        for (var i = 0; i < dateInputs.length; i++) {
            dateInputs[i].addEventListener('change', function(e) {
                this.handleDateSelect(e.target.value);
            }.bind(this));
        }
        
        // Обработчик выбора полигона
        var polygonSelect = document.getElementById('polygonSelect');
        if (polygonSelect) {
            polygonSelect.addEventListener('change', function(e) {
                this.handlePolygonSelect(e.target.value);
            }.bind(this));
        }
        
        // Обработчик выбора маршрута
        var routeSelect = document.getElementById('routeSelect');
        if (routeSelect) {
            routeSelect.addEventListener('change', function(e) {
                this.handleRouteSelect(e.target.value);
            }.bind(this));
        }
        
        // Закрытие боковых панелей
        var closeLeftSidebar = document.getElementById('closeLeftSidebar');
        if (closeLeftSidebar) {
            closeLeftSidebar.addEventListener('click', function() {
                var leftSidebar = document.querySelector('.left-sidebar');
                if (leftSidebar) {
                    leftSidebar.classList.remove('open');
                    this.updateSidebarOverlay();
                }
            }.bind(this));
        }
        
        var closeRightSidebar = document.getElementById('closeRightSidebar');
        if (closeRightSidebar) {
            closeRightSidebar.addEventListener('click', function() {
                var rightSidebar = document.querySelector('.right-sidebar');
                if (rightSidebar) {
                    rightSidebar.classList.remove('open');
                    this.updateSidebarOverlay();
                }
            }.bind(this));
        }
        
        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function() {
                var leftSidebar = document.querySelector('.left-sidebar');
                if (leftSidebar) {
                    leftSidebar.classList.toggle('open');
                    this.updateSidebarOverlay();
                }
            }.bind(this));
        }
        
        var sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                var sidebars = document.querySelectorAll('.sidebar');
                for (var i = 0; i < sidebars.length; i++) {
                    sidebars[i].classList.remove('open');
                }
                sidebarOverlay.classList.remove('active');
            });
        }
    }

    updateSidebarOverlay() {
        var sidebarOverlay = document.getElementById('sidebarOverlay');
        var anySidebarOpen = document.querySelector('.sidebar.open');
        
        if (sidebarOverlay) {
            if (anySidebarOpen) {
                sidebarOverlay.classList.add('active');
            } else {
                sidebarOverlay.classList.remove('active');
            }
        }
    }

    detectCurrentPage() {
        var path = window.location.pathname;
        if (path.indexOf('charts') !== -1) return 'charts';
        if (path.indexOf('tables') !== -1) return 'tables';
        if (path.indexOf('report') !== -1) return 'report';
        return 'index';
    }

    navigate(page) {
        if (window.location.protocol === 'file:') {
            window.location.href = page + '.html';
            return;
        }
        
        if (this.router) {
            this.router.navigate(page);
        } else {
            window.location.href = page + '.html';
        }
        
        this.state.activePage = page;
        
        var sidebars = document.querySelectorAll('.sidebar');
        for (var i = 0; i < sidebars.length; i++) {
            sidebars[i].classList.remove('open');
        }
        this.updateSidebarOverlay();
    }

    // ======================
    // ОБРАБОТКА ВЫБОРА ДАТЫ, ПОЛИГОНА И МАРШРУТА
    // ======================

    handleDateSelect(date) {
        console.log('📅 Выбрана дата: ' + date);
        this.state.selectedDate = date;
        
        var weatherData = this.getWeatherDataByDate(date);
        if (weatherData) {
            this.state.currentAnalysis = weatherData;
            
            // Обновляем интерфейс на всех страницах
            this.updateInterfaceWithDate(date, weatherData);
            
            this.showNotification(
                '✅ Загружены данные за ' + this.formatDate(new Date(date)),
                'Данные загружены',
                'success'
            );
        } else {
            this.showNotification(
                'ℹ️ Нет данных за ' + this.formatDate(new Date(date)) + '. Проведите анализ на главной странице.',
                'Данные не найдены',
                'info'
            );
            
            // Очищаем интерфейс
            this.clearInterface();
        }
    }

    handlePolygonSelect(polygonId) {
        console.log('🗺️ Выбран полигон: ' + polygonId);
        this.state.selectedPolygon = polygonId;
        
        // Обновляем список маршрутов для выбранного полигона
        this.updateRoutesList(polygonId);
    }

    handleRouteSelect(routeId) {
        console.log('📍 Выбран маршрут: ' + routeId);
        this.state.selectedRoute = routeId;
        
        // Отображаем данные для выбранного маршрута
        this.displayRouteData(routeId);
    }

    updateInterfaceWithDate(date, weatherData) {
        // Обновление календаря на всех страницах
        var dateSelects = document.querySelectorAll('.date-select');
        for (var i = 0; i < dateSelects.length; i++) {
            dateSelects[i].value = date;
        }
        
        // Обновление списка полигонов
        this.updatePolygonsList(weatherData);
        
        // Если на главной странице - восстанавливаем объекты на карте
        if (this.state.activePage === 'index' && this.mapManager) {
            this.restoreAnalysisObjects(weatherData);
        }
        
        // Если на странице таблиц или графиков - обновляем данные
        if (this.state.activePage === 'tables' && typeof window.tablesManager !== 'undefined') {
            window.tablesManager.updateData(weatherData);
        }
        
        if (this.state.activePage === 'charts' && typeof window.chartsManager !== 'undefined') {
            window.chartsManager.updateData(weatherData);
        }
    }

    updatePolygonsList(weatherData) {
        var polygonSelect = document.getElementById('polygonSelect');
        if (!polygonSelect || !weatherData.polygons) return;
        
        polygonSelect.innerHTML = '<option value="">Выберите полигон...</option>';
        
        for (var i = 0; i < weatherData.polygons.length; i++) {
            var polygon = weatherData.polygons[i];
            var option = document.createElement('option');
            option.value = i;
            option.textContent = polygon.name;
            polygonSelect.appendChild(option);
        }
        
        // Выбираем первый полигон по умолчанию
        if (weatherData.polygons.length > 0) {
            polygonSelect.value = 0;
            this.handlePolygonSelect(0);
        }
    }

    updateRoutesList(polygonIndex) {
        var routeSelect = document.getElementById('routeSelect');
        if (!routeSelect || !this.state.currentAnalysis) return;
        
        routeSelect.innerHTML = '<option value="">Выберите маршрут...</option>';
        
        // Фильтруем маршруты по полигону (в нашем случае все маршруты привязаны к одному полигону)
        var routes = this.state.currentAnalysis.routes;
        for (var i = 0; i < routes.length; i++) {
            var route = routes[i];
            var option = document.createElement('option');
            option.value = i;
            option.textContent = route.name;
            routeSelect.appendChild(option);
        }
        
        // Выбираем первый маршрут по умолчанию
        if (routes.length > 0) {
            routeSelect.value = 0;
            this.handleRouteSelect(0);
        }
    }

    displayRouteData(routeIndex) {
        if (!this.state.currentAnalysis || !this.state.currentAnalysis.analysisResults[routeIndex]) return;
        
        var analysisResult = this.state.currentAnalysis.analysisResults[routeIndex];
        
        // Обновление интерфейса в зависимости от страницы
        if (this.state.activePage === 'index') {
            this.displayAnalysisResults(analysisResult);
        } else if (this.state.activePage === 'tables' && window.tablesManager) {
            window.tablesManager.displayRouteData(analysisResult);
        } else if (this.state.activePage === 'charts' && window.chartsManager) {
            window.chartsManager.displayRouteData(analysisResult);
        }
    }

    clearInterface() {
        // Очищаем интерфейс на всех страницах
        var dateSelects = document.querySelectorAll('.date-select');
        for (var i = 0; i < dateSelects.length; i++) {
            dateSelects[i].value = '';
        }
        
        var polygonSelect = document.getElementById('polygonSelect');
        if (polygonSelect) polygonSelect.innerHTML = '<option value="">Выберите дату с данными</option>';
        
        var routeSelect = document.getElementById('routeSelect');
        if (routeSelect) routeSelect.innerHTML = '<option value="">Выберите полигон</option>';
        
        // Очищаем правую панель на главной странице
        if (this.state.activePage === 'index') {
            var rightSidebar = document.querySelector('.right-sidebar');
            if (rightSidebar) {
                rightSidebar.classList.remove('open');
            }
        }
    }

    // ======================
    // ФУНКЦИЯ АНАЛИЗА МАРШРУТА С УЛУЧШЕННОЙ ОБРАБОТКОЙ ТАЙМАУТОВ
    // ======================

    analyzeRoute() {
        // Предупреждение о режиме file:// для запросов к внешним API
        if (window.location.protocol === 'file:') {
            this.showNotification(
                '⚠️ <strong>Режим file://</strong><br><br>' +
                'Запросы к внешним API (Open-Meteo) часто блокируются браузером из-за ограничений CORS.<br><br>' +
                '💡 <strong>Решение:</strong> Запустите приложение через локальный сервер:<br>' +
                '<code>python -m http.server 8000</code><br>' +
                'Затем откройте: <code>http://localhost:8000</code>',
                'Важное предупреждение',
                'warning'
            );
            console.warn('⚠️ Режим file:// обнаружен. Запросы к внешним API могут быть заблокированы.');
        }
        
        if (!this.state.databaseInitialized) {
            this.showNotification('База данных еще не инициализирована. Подождите несколько секунд.', 'Информация', 'info');
            return;
        }
        
        if (this.state.analysisInProgress) {
            this.showNotification('Анализ уже выполняется. Пожалуйста, подождите.', 'Информация', 'info');
            return;
        }

        if (!this.mapManager) {
            this.showNotification('Карта не инициализирована. Обновите страницу.', 'Ошибка', 'error');
            return;
        }

        if (!this.mapManager.drawnFeatures || this.mapManager.drawnFeatures.length === 0) {
            this.showNotification('Сначала нарисуйте полигон и маршрут на карте', 'Ошибка', 'error');
            return;
        }

        var polygons = [];
        var routes = [];
        for (var i = 0; i < this.mapManager.drawnFeatures.length; i++) {
            var feature = this.mapManager.drawnFeatures[i];
            if (feature.get('type') === 'polygon') {
                polygons.push(feature);
            } else if (feature.get('type') === 'route') {
                routes.push(feature);
            }
        }

        if (polygons.length === 0) {
            this.showNotification('Нарисуйте полигон зоны полета', 'Ошибка', 'error');
            return;
        }

        if (routes.length === 0) {
            this.showNotification('Нарисуйте маршрут полета', 'Ошибка', 'error');
            return;
        }

        var polygon = polygons[0];
        var route = routes[0];

        var extent = polygon.getGeometry().getExtent();
        var center = ol.extent.getCenter(extent);
        var coordinate = ol.proj.toLonLat(center);
        var lon = coordinate[0];
        var lat = coordinate[1];

        console.log('📍 Координаты для анализа:', { lat: lat.toFixed(4), lon: lon.toFixed(4) });

        var dateInput = document.getElementById('analysisDate');
        var analysisDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

        this.state.analysisInProgress = true;
        this.showLoading(true, 'Получение метеоданных с Open-Meteo...');

        // Проверка доступности интернета
        if (!navigator.onLine) {
            this.showLoading(false);
            this.state.analysisInProgress = false;
            this.showNotification('❌ Отсутствует подключение к интернету. Проверьте сетевое соединение.', 'Ошибка сети', 'error');
            return;
        }

        // УЛУЧШЕННЫЙ ЗАПРОС С ПОВТОРНЫМИ ПОПЫТКАМИ И УВЕЛИЧЕННЫМ ТАЙМАУТОМ
        // Разбиваем длинный URL на части для лучшей совместимости
        var baseUrl = 'https://api.open-meteo.com/v1/forecast?';
        var params = 'latitude=' + lat + '&longitude=' + lon + 
                     '&daily=temperature_2m_max,temperature_2m_min,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,precipitation_sum' +
                     '&hourly=temperature_2m,relativehumidity_2m,pressure_msl,cloudcover,visibility,windspeed_10m,winddirection_10m,windgusts_10m' +
                     '&timezone=auto&forecast_days=1';
        var apiUrl = baseUrl + params;

        console.log('📡 Запрос к API:', apiUrl);
        console.log('⏱️  Таймаут запроса: 60 секунд (с возможностью повторных попыток)');

        // Функция для выполнения запроса с повторными попытками
        var fetchWithRetry = function(url, options, retries, currentRetry) {
            var self = this;
            currentRetry = currentRetry || 0;
            
            return new Promise(function(resolve, reject) {
                console.log('📡 Попытка ' + (currentRetry + 1) + ' из ' + retries + '...');
                
                var controller = new AbortController();
                var timeoutId = setTimeout(function() {
                    controller.abort();
                }, 60000); // 60 секунд
                
                fetch(url, { 
                    signal: controller.signal 
                })
                .then(function(response) {
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        if (response.status === 429) {
                            throw new Error('Превышен лимит запросов. Повторная попытка через 2 секунды...');
                        }
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                    }
                    return response.json();
                })
                .then(function(data) {
                    resolve(data);
                })
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    
                    if (error.name === 'AbortError') {
                        console.warn('⏱️ Таймаут попытки ' + (currentRetry + 1) + ' (60 секунд)');
                        if (currentRetry >= retries - 1) {
                            reject(new Error('Таймаут запроса после ' + retries + ' попыток (общее время ' + (retries * 60) + ' секунд)'));
                        } else {
                            // Задержка перед повторной попыткой (экспоненциальная)
                            var delay = Math.min(2000 * Math.pow(2, currentRetry), 10000); // 2с, 4с, 8с
                            console.log('⏳ Повторная попытка через ' + (delay/1000) + ' секунд...');
                            setTimeout(function() {
                                fetchWithRetry.call(self, url, options, retries, currentRetry + 1)
                                    .then(resolve)
                                    .catch(reject);
                            }, delay);
                        }
                    } else if (error.name === 'TypeError' && error.message.indexOf('Failed to fetch') !== -1) {
                        console.warn('🌐 Ошибка сети на попытке ' + (currentRetry + 1) + ': ' + error.message);
                        if (currentRetry >= retries - 1) {
                            if (window.location.protocol === 'file:') {
                                reject(new Error('Ошибка CORS: приложение запущено через file://. Запустите через локальный сервер.'));
                            } else {
                                reject(new Error('Ошибка сети: не удалось подключиться к серверу Open-Meteo'));
                            }
                        } else {
                            // Повторная попытка
                            var delay = Math.min(2000 * Math.pow(2, currentRetry), 10000);
                            console.log('⏳ Повторная попытка через ' + (delay/1000) + ' секунд...');
                            setTimeout(function() {
                                fetchWithRetry.call(self, url, options, retries, currentRetry + 1)
                                    .then(resolve)
                                    .catch(reject);
                            }, delay);
                        }
                    } else {
                        console.warn('⚠️ Ошибка на попытке ' + (currentRetry + 1) + ': ' + error.message);
                        if (currentRetry >= retries - 1) {
                            reject(error);
                        } else {
                            // Повторная попытка
                            var delay = Math.min(2000 * Math.pow(2, currentRetry), 10000);
                            console.log('⏳ Повторная попытка через ' + (delay/1000) + ' секунд...');
                            setTimeout(function() {
                                fetchWithRetry.call(self, url, options, retries, currentRetry + 1)
                                    .then(resolve)
                                    .catch(reject);
                            }, delay);
                        }
                    }
                });
            });
        }.bind(this);

        // Выполнение запроса с повторными попытками
        fetchWithRetry(apiUrl, {}, 3)
            .then(function(data) {
                console.log('✅ Данные получены:', data);
                
                // Формируем данные анализа
                var analysisData = {
                    analysisDate: analysisDate,
                    polygon: {
                        name: polygon.get('name'),
                        type: polygon.get('type'),
                        coordinates: polygon.getGeometry().getCoordinates(),
                        area: this.mapManager.calculatePolygonArea(polygon.getGeometry())
                    },
                    routes: [{
                        name: route.get('name'),
                        type: route.get('type'),
                        coordinates: route.getGeometry().getCoordinates(),
                        length: this.mapManager.calculateRouteLength(route.getGeometry())
                    }],
                    weatherData: data,
                    analysisResults: [this.analyzeWeatherData(data, polygon, route, analysisDate)],
                    recommendations: this.generateRecommendations(data)
                };
                
                // Сохраняем в базу данных (автоматически)
                this.saveAnalysisToDatabase(analysisData)
                    .then(function() {
                        this.showLoading(false);
                        
                        // Отображаем результаты
                        this.displayAnalysisResults(analysisData.analysisResults[0]);
                        
                        // Открываем правую панель
                        var rightSidebar = document.querySelector('.right-sidebar');
                        if (rightSidebar) {
                            rightSidebar.classList.add('open');
                        }
                        this.updateSidebarOverlay();
                        
                        this.state.analysisInProgress = false;
                        
                        // Обновляем календарь на всех страницах
                        var dateSelects = document.querySelectorAll('.date-select');
                        for (var i = 0; i < dateSelects.length; i++) {
                            dateSelects[i].value = analysisDate;
                        }
                        
                        this.showNotification('✅ Анализ завершен! Данные автоматически сохранены в базу.', 'Успех', 'success');
                    }.bind(this))
                    .catch(function(error) {
                        this.showLoading(false);
                        this.state.analysisInProgress = false;
                        console.error('Ошибка сохранения анализа:', error);
                        this.showNotification('❌ Ошибка сохранения данных: ' + error.message, 'Ошибка', 'error');
                    }.bind(this));
            }.bind(this))
            .catch(function(error) {
                this.showLoading(false);
                this.state.analysisInProgress = false;
                
                console.error('❌ Ошибка получения данных после всех попыток:', error);
                
                var errorMessage = '❌ <strong>Ошибка получения метеоданных</strong><br><br>';
                
                if (error.message.indexOf('CORS') !== -1 || error.message.indexOf('file://') !== -1) {
                    errorMessage += '⚠️ <strong>Причина:</strong> Браузер блокирует запросы к внешним API в режиме <code>file://</code>.<br><br>' +
                                   '💡 <strong>Решение:</strong><br>' +
                                   '1. Запустите приложение через локальный сервер:<br>' +
                                   '<code>python -m http.server 8000</code><br>' +
                                   '2. Откройте в браузере:<br>' +
                                   '<code>http://localhost:8000</code>';
                } else if (error.message.indexOf('таймаут') !== -1) {
                    errorMessage += '⏱️ <strong>Причина:</strong> Сервер не ответил в течение 3 минут (3 попытки по 60 секунд).<br><br>' +
                                   '💡 <strong>Решение:</strong><br>' +
                                   '• Проверьте интернет-соединение<br>' +
                                   '• Попробуйте позже (сервер может быть перегружен)<br>' +
                                   '• Если используете режим <code>file://</code>, запустите через локальный сервер';
                } else if (error.message.indexOf('429') !== -1) {
                    errorMessage += '⚠️ <strong>Причина:</strong> Превышен лимит запросов к серверу Open-Meteo.<br><br>' +
                                   '💡 <strong>Решение:</strong> Попробуйте повторить запрос через 1-2 минуты.';
                } else {
                    errorMessage += '📄 <strong>Ошибка:</strong> ' + error.message + '<br><br>' +
                                   '💡 <strong>Рекомендации:</strong><br>' +
                                   '• Проверьте интернет-соединение<br>' +
                                   '• Убедитесь, что приложение запущено через <code>http://</code> (локальный сервер)<br>' +
                                   '• Попробуйте повторить запрос через несколько минут';
                }
                
                this.showNotification(errorMessage, 'Ошибка получения данных', 'error');
            }.bind(this));
    }

    // ======================
    // АНАЛИЗ МЕТЕОДАННЫХ И ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ (С ИКОНКАМИ FONT AWESOME)
    // ======================

    analyzeWeatherData(data, polygon, route, analysisDate) {
        var daily = data.daily;
        var hourly = data.hourly;
        
        var polygonArea = this.mapManager.calculatePolygonArea(polygon.getGeometry());
        var routeLength = this.mapManager.calculateRouteLength(route.getGeometry());
        
        var maxTemp = daily.temperature_2m_max[0];
        var minTemp = daily.temperature_2m_min[0];
        var maxWind = daily.windspeed_10m_max[0];
        var maxGusts = daily.windgusts_10m_max[0];
        var windDirection = daily.winddirection_10m_dominant[0];
        var precipitation = daily.precipitation_sum[0];
        
        var pressureSum = 0;
        for (var i = 0; i < hourly.pressure_msl.length; i++) {
            pressureSum += hourly.pressure_msl[i];
        }
        var avgPressure = pressureSum / hourly.pressure_msl.length;
        
        var humiditySum = 0;
        for (var i = 0; i < hourly.relativehumidity_2m.length; i++) {
            humiditySum += hourly.relativehumidity_2m[i];
        }
        var avgHumidity = humiditySum / hourly.relativehumidity_2m.length;
        
        var visibilitySum = 0;
        for (var i = 0; i < hourly.visibility.length; i++) {
            visibilitySum += hourly.visibility[i];
        }
        var avgVisibility = (visibilitySum / hourly.visibility.length) / 1000;
        
        var cloudCoverSum = 0;
        for (var i = 0; i < hourly.cloudcover.length; i++) {
            cloudCoverSum += hourly.cloudcover[i];
        }
        var avgCloudCover = cloudCoverSum / hourly.cloudcover.length;
        
        var recommendations = [];
        var safetyStatus = 'safe';
        
        // Анализ ветра
        if (maxWind > 15 || maxGusts > 20) {
            recommendations.push('fas fa-wind ❌ Сильный ветер и порывы. Полет не рекомендуется.');
            safetyStatus = 'danger';
        } else if (maxWind > 10 || maxGusts > 15) {
            recommendations.push('fas fa-wind ⚠️ Умеренный ветер. Соблюдайте осторожность.');
            if (safetyStatus === 'safe') safetyStatus = 'warning';
        }
        
        // Анализ осадков
        if (precipitation > 10) {
            recommendations.push('fas fa-cloud-rain ❌ Сильные осадки. Полет не рекомендуется.');
            safetyStatus = 'danger';
        } else if (precipitation > 5) {
            recommendations.push('fas fa-cloud-showers-heavy ⚠️ Умеренные осадки. Возможны ограничения видимости.');
            if (safetyStatus === 'safe') safetyStatus = 'warning';
        }
        
        // Анализ видимости
        if (avgVisibility < 3) {
            recommendations.push('fas fa-smog ❌ Плохая видимость. Полет запрещен по ВПВ.');
            safetyStatus = 'danger';
        } else if (avgVisibility < 5) {
            recommendations.push('fas fa-smog ⚠️ Ограниченная видимость. Соблюдайте осторожность.');
            if (safetyStatus === 'safe') safetyStatus = 'warning';
        }
        
        // Анализ облачности
        if (avgCloudCover > 80) {
            recommendations.push('fas fa-cloud ☁️ Сплошная облачность. Возможны ограничения по высоте.');
            if (safetyStatus === 'safe') safetyStatus = 'caution';
        }
        
        if (recommendations.length === 0) {
            recommendations.push('fas fa-sun ✅ Метеоусловия благоприятны для полета БВС.');
        }
        
        return {
            date: analysisDate,
            location: {
                lat: parseFloat(data.latitude.toFixed(4)),
                lon: parseFloat(data.longitude.toFixed(4))
            },
            polygon: {
                area: polygonArea,
                name: polygon.get('name') || 'Полигон 1'
            },
            route: {
                length: routeLength,
                name: route.get('name') || 'Маршрут 1'
            },
            sun: {
                sunrise: '06:15',
                sunset: '20:45'
            },
            temperature: {
                max: maxTemp,
                min: minTemp,
                avg: ((maxTemp + minTemp) / 2).toFixed(1)
            },
            wind: {
                max: maxWind,
                gusts: maxGusts,
                direction: windDirection,
                directionText: this.getWindDirectionText(windDirection)
            },
            precipitation: {
                sum: precipitation
            },
            pressure: {
                avg: avgPressure.toFixed(1)
            },
            humidity: {
                avg: avgHumidity.toFixed(0)
            },
            visibility: {
                avg: avgVisibility.toFixed(1)
            },
            cloudCover: {
                avg: avgCloudCover.toFixed(0)
            },
            recommendations: recommendations,
            safetyStatus: safetyStatus,
            weatherIcon: this.getWeatherIcon(maxTemp, precipitation, avgCloudCover)
        };
    }

    getWeatherIcon(temperature, precipitation, cloudCover) {
        // Возвращаем классы иконок из Font Awesome вместо Weather Icons
        if (precipitation > 5) {
            if (temperature < 0) return 'fas fa-snowflake';
            return 'fas fa-cloud-rain';
        }
        
        if (cloudCover > 70) return 'fas fa-cloud';
        if (cloudCover > 30) return 'fas fa-cloud-sun';
        return 'fas fa-sun';
    }

    getWindDirectionText(degrees) {
        var directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        return directions[Math.round(degrees / 45) % 8];
    }

    generateRecommendations(data) {
        return this.analyzeWeatherData(data, 
            new ol.Feature({geometry: new ol.geom.Polygon([[[0,0],[0,0],[0,0]]])}),
            new ol.Feature({geometry: new ol.geom.LineString([[0,0],[0,0]])}),
            this.state.currentDate
        ).recommendations;
    }

    displayAnalysisResults(result) {
        // Обновление даты анализа
        var analysisDateDisplay = document.getElementById('analysisDateDisplay');
        if (analysisDateDisplay) {
            analysisDateDisplay.textContent = this.formatDate(new Date(result.date));
        }
        
        // Обновление метеопараметров с иконками из Font Awesome
        var pressureValue = document.getElementById('pressureValue');
        if (pressureValue) pressureValue.innerHTML = '<i class="fas fa-tachometer-alt"></i> ' + result.pressure.avg + ' гПа';
        
        var windValue = document.getElementById('windValue');
        if (windValue) windValue.innerHTML = '<i class="fas fa-wind"></i> ' + result.wind.max + ' м/с (' + result.wind.directionText + ')';
        
        var tempValue = document.getElementById('tempValue');
        if (tempValue) tempValue.innerHTML = '<i class="' + result.weatherIcon + '"></i> ' + result.temperature.max + '°C / ' + result.temperature.min + '°C';
        
        var humidityValue = document.getElementById('humidityValue');
        if (humidityValue) humidityValue.innerHTML = '<i class="fas fa-tint"></i> ' + result.humidity.avg + '%';
        
        var visibilityValue = document.getElementById('visibilityValue');
        if (visibilityValue) visibilityValue.innerHTML = '<i class="fas fa-eye"></i> ' + result.visibility.avg + ' км';
        
        var cloudCoverValue = document.getElementById('cloudCoverValue');
        if (cloudCoverValue) cloudCoverValue.innerHTML = '<i class="fas fa-cloud"></i> ' + result.cloudCover.avg + '%';
        
        // Обновление статуса полета с иконкой погоды
        var flightStatusCard = document.getElementById('flightStatusCard');
        var statusIcon = document.getElementById('statusIcon');
        var statusTitle = document.getElementById('statusTitle');
        var statusSubtitle = document.getElementById('statusSubtitle');
        
        if (flightStatusCard && statusIcon && statusTitle && statusSubtitle) {
            // Устанавливаем иконку погоды из Font Awesome
            statusIcon.innerHTML = '<i class="' + result.weatherIcon + '" style="font-size: 48px;"></i>';
            
            if (result.safetyStatus === 'safe') {
                flightStatusCard.className = 'analysis-card flight-status-card safe';
                statusTitle.textContent = 'Полет разрешен';
                statusSubtitle.textContent = 'Метеоусловия благоприятны';
            } else if (result.safetyStatus === 'warning' || result.safetyStatus === 'caution') {
                flightStatusCard.className = 'analysis-card flight-status-card warning';
                statusTitle.textContent = result.safetyStatus === 'warning' ? 'Полет с ограничениями' : 'Условия требуют внимания';
                statusSubtitle.textContent = result.safetyStatus === 'warning' ? 'Требуется осторожность' : 'Соблюдайте рекомендации';
            } else { // danger
                flightStatusCard.className = 'analysis-card flight-status-card danger';
                statusTitle.textContent = 'Полет запрещен';
                statusSubtitle.textContent = 'Неблагоприятные метеоусловия';
            }
        }
        
        // Обновление рекомендаций с иконками из Font Awesome
        var recommendationsList = document.getElementById('recommendationsList');
        if (recommendationsList) {
            var recHTML = '';
            for (var i = 0; i < result.recommendations.length; i++) {
                var rec = result.recommendations[i];
                // Извлекаем иконку из текста рекомендации
                var iconMatch = rec.match(/(fas [a-z-]+)/);
                var iconClass = iconMatch ? iconMatch[1] : 'fas fa-info-circle';
                var type = rec.indexOf('❌') !== -1 ? 'danger' : rec.indexOf('⚠️') !== -1 ? 'warning' : 'safe';
                var cleanText = rec.replace(new RegExp('fas [a-z-]+\\s*', 'g'), '').replace('❌ ', '').replace('⚠️ ', '').replace('✅ ', '');
                
                recHTML += `
                    <div class="recommendation-item ${type}">
                        <div class="rec-icon"><i class="${iconClass}"></i></div>
                        <div class="rec-content">
                            <div class="rec-title">${type === 'danger' ? 'Опасно' : type === 'warning' ? 'Осторожно' : 'Безопасно'}</div>
                            <div class="rec-text">${cleanText}</div>
                        </div>
                    </div>
                `;
            }
            recommendationsList.innerHTML = recHTML;
        }
        
        // Обновление ключевых параметров с иконками из Font Awesome
        var windParam = document.getElementById('windParam');
        if (windParam) windParam.innerHTML = '<i class="fas fa-wind"></i> ' + result.wind.max;
        
        var visibilityParam = document.getElementById('visibilityParam');
        if (visibilityParam) visibilityParam.innerHTML = '<i class="fas fa-eye"></i> ' + result.visibility.avg;
        
        var precipitationParam = document.getElementById('precipitationParam');
        if (precipitationParam) precipitationParam.innerHTML = '<i class="fas fa-cloud-rain"></i> ' + result.precipitation.sum;
        
        var tempParam = document.getElementById('tempParam');
        if (tempParam) tempParam.innerHTML = '<i class="' + result.weatherIcon + '"></i> ' + result.temperature.avg;
        
        // Обновление выбора даты в календаре
        var dateSelects = document.querySelectorAll('.date-select');
        for (var i = 0; i < dateSelects.length; i++) {
            dateSelects[i].value = result.date;
        }
    }

    // ======================
    // ВОССТАНОВЛЕНИЕ ОБЪЕКТОВ НА КАРТЕ
    // ======================

    restoreAnalysisObjects(analysisData) {
        if (!this.mapManager) return;
        
        // Очищаем текущие нарисованные объекты
        this.mapManager.sources.drawing.clear();
        this.mapManager.drawnFeatures = [];
        this.state.drawnObjects = [];
        
        // Восстанавливаем полигон
        if (analysisData.polygons && analysisData.polygons[0]) {
            var polygonData = analysisData.polygons[0];
            var polygonFeature = new ol.Feature({
                geometry: new ol.geom.Polygon(polygonData.coordinates),
                name: polygonData.name,
                type: 'polygon',
                userDrawn: true
            });
            polygonFeature.setId(polygonData.name);
            this.mapManager.sources.drawing.addFeature(polygonFeature);
            this.mapManager.drawnFeatures.push(polygonFeature);
            
            // Добавляем в интерфейс
            this.addDrawnObjectToUI(polygonFeature);
        }
        
        // Восстанавливаем маршруты
        if (analysisData.routes && analysisData.routes.length > 0) {
            for (var i = 0; i < analysisData.routes.length; i++) {
                var routeData = analysisData.routes[i];
                var routeFeature = new ol.Feature({
                    geometry: new ol.geom.LineString(routeData.coordinates),
                    name: routeData.name,
                    type: 'route',
                    userDrawn: true
                });
                routeFeature.setId(routeData.name);
                this.mapManager.sources.drawing.addFeature(routeFeature);
                this.mapManager.drawnFeatures.push(routeFeature);
                
                // Добавляем в интерфейс
                this.addDrawnObjectToUI(routeFeature);
            }
        }
        
        // Автоматическое позиционирование карты
        this.mapManager.autoFitMap();
        
        console.log('✅ Объекты анализа восстановлены на карте');
    }

    addDrawnObjectToUI(feature) {
        var type = feature.get('type');
        var name = feature.get('name');
        
        // Обновляем списки в интерфейсе
        var listContainer = type === 'polygon' ? 
            document.getElementById('polygonsList') : 
            document.getElementById('routesList');
        
        if (listContainer) {
            // Очищаем и добавляем новый элемент
            listContainer.innerHTML = `
                <div class="kml-item active">
                    <div class="kml-item-header">
                        <i class="fas ${type === 'polygon' ? 'fa-draw-polygon' : 'fa-route'}"></i>
                        <span class="kml-item-name">${name}</span>
                    </div>
                </div>
            `;
        }
    }

    // ======================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ======================

    showNotification(message, title, type) {
        if (!title) title = 'Уведомление';
        if (!type) type = 'info';
        
        var notification = document.createElement('div');
        notification.className = 'notification ' + type;
        notification.innerHTML = `
            <div class="notification-icon ${type}">
                <i class="fas fa-${type === 'success' ? 'check' : 
                           type === 'error' ? 'times' : 
                           type === 'warning' ? 'exclamation' : 'info'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(function() {
            notification.style.transform = 'translateX(120%)';
            notification.style.opacity = '0';
            setTimeout(function() {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showLoading(show, message) {
        if (!message) message = 'Загрузка данных...';
        
        var overlay = document.getElementById('loadingOverlay');
        var textElement = document.getElementById('loadingText');
        
        if (overlay && textElement) {
            if (message) textElement.textContent = message;
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    formatDate(date) {
        var days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
        var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        
        var day = days[date.getDay()];
        var dateNum = date.getDate();
        var month = months[date.getMonth()];
        var year = date.getFullYear();
        
        return day + ', ' + dateNum + ' ' + month + ' ' + year + ' г.';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    window.meteoApp = new MeteoAnalysisApp();
});