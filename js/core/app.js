/**
 * Основной класс приложения Метеоанализ БВС
 * АВТОМАТИЧЕСКОЕ УПРАВЛЕНИЕ ЕДИНОЙ БАЗОЙ ДАННЫХ
 * ПОЛНАЯ СОВМЕСТИМОСТЬ С GITHUB PAGES
 */
function MeteoAnalysisApp() {
    // Глобальное состояние приложения
    this.state = {
        currentDate: new Date().toISOString().split('T')[0],
        weatherDatabase: {},
        databaseFileHandle: null,
        currentAnalysis: null,
        selectedDate: null,
        selectedPolygon: null,
        selectedRoute: null,
        analysisInProgress: false,
        mapManager: null,
        activePage: this.detectCurrentPage(),
        databaseInitialized: false,
        useFileSystemAPI: false
    };

    // Инициализация
    this.init();
}

// ======================
// МЕТОДЫ ПРОТОТИПА
// ======================

MeteoAnalysisApp.prototype.init = function() {
    console.log('🚀 Инициализация приложения Метеоанализ БВС...');
    console.log('ℹ️  Протокол приложения: ' + window.location.protocol);
    
    // Инициализация базы данных (асинхронно)
    this.initDatabase();
};

MeteoAnalysisApp.prototype.initDatabase = function() {
    var self = this;
    
    // Проверяем поддержку File System Access API
    var canUseFileSystem = false;
    try {
        canUseFileSystem = 'showOpenFilePicker' in window && window.location.protocol.indexOf('file:') === -1;
    } catch (e) {
        canUseFileSystem = false;
    }
    
    if (canUseFileSystem) {
        console.log('📁 File System Access API поддерживается');
        this.initFileSystemDatabase(function(success) {
            self.state.useFileSystemAPI = success;
            self.finishInitialization();
        });
    } else {
        console.log('📁 Используем IndexedDB + localStorage');
        this.initIndexedDBDatabase(function(success) {
            self.state.useFileSystemAPI = false;
            self.finishInitialization();
        });
    }
};

MeteoAnalysisApp.prototype.finishInitialization = function() {
    this.state.databaseInitialized = true;
    
    // Инициализация модулей
    this.initModules();
    
    // Настройка обработчиков
    this.setupGlobalEventListeners();
    
    // Загрузка данных
    this.loadDatabaseData();
    
    console.log('✅ Приложение полностью инициализировано');
    console.log('📄 Текущая страница: ' + this.state.activePage);
    console.log('📊 В базе данных: ' + Object.keys(this.state.weatherDatabase).length + ' записей');
};

MeteoAnalysisApp.prototype.initFileSystemDatabase = function(callback) {
    var self = this;
    
    // В среде GitHub Pages File System API недоступен, используем только IndexedDB
    console.log('ℹ️ File System API недоступен в среде GitHub Pages, используем IndexedDB');
    callback(false);
};

MeteoAnalysisApp.prototype.initIndexedDBDatabase = function(callback) {
    var self = this;
    var request = indexedDB.open('WeatherDatabase', 1);
    
    request.onupgradeneeded = function(event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains('weatherData')) {
            db.createObjectStore('weatherData', { keyPath: 'date' });
        }
    };
    
    request.onsuccess = function(event) {
        var db = event.target.result;
        var transaction = db.transaction(['weatherData'], 'readonly');
        var store = transaction.objectStore('weatherData');
        var getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = function() {
            var records = getAllRequest.result;
            self.state.weatherDatabase = {};
            
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                self.state.weatherDatabase[record.date] = record.data;
            }
            
            // Проверяем localStorage
            var localStorageData = localStorage.getItem('weather_database');
            if (localStorageData) {
                try {
                    var parsedData = JSON.parse(localStorageData);
                    for (var key in parsedData) {
                        if (parsedData.hasOwnProperty(key)) {
                            self.state.weatherDatabase[key] = parsedData[key];
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Ошибка парсинга localStorage:', e);
                }
            }
            
            console.log('✅ Загружено ' + records.length + ' записей из IndexedDB');
            callback(true);
        };
        
        getAllRequest.onerror = function() {
            console.error('❌ Ошибка загрузки из IndexedDB:', getAllRequest.error);
            callback(false);
        };
    };
    
    request.onerror = function(event) {
        console.error('❌ Ошибка открытия IndexedDB:', event.target.error);
        callback(false);
    };
};

MeteoAnalysisApp.prototype.saveAnalysisToDatabase = function(analysisData, callback) {
    var self = this;
    
    // Добавляем запись в память
    this.state.weatherDatabase[analysisData.analysisDate] = {
        timestamp: new Date().toISOString(),
        polygons: [analysisData.polygon],
        routes: analysisData.routes,
        weatherData: analysisData.weatherData,
        analysisResults: analysisData.analysisResults,
        recommendations: analysisData.recommendations
    };
    
    // Сохраняем в IndexedDB
    var request = indexedDB.open('WeatherDatabase', 1);
    
    request.onsuccess = function(event) {
        var db = event.target.result;
        var transaction = db.transaction(['weatherData'], 'readwrite');
        var store = transaction.objectStore('weatherData');
        
        store.put({
            date: analysisData.analysisDate,
            data: self.state.weatherDatabase[analysisData.analysisDate]
        });
        
        transaction.oncomplete = function() {
            // Сохраняем в localStorage
            try {
                localStorage.setItem('weather_database', JSON.stringify(self.state.weatherDatabase));
            } catch (e) {
                console.warn('⚠️ Ошибка сохранения в localStorage:', e);
            }
            
            // Обновляем состояние
            self.state.currentAnalysis = analysisData;
            self.state.selectedDate = analysisData.analysisDate;
            
            console.log('✅ Данные за ' + analysisData.analysisDate + ' сохранены');
            self.showNotification('✅ Анализ сохранен в базу данных', 'Успех', 'success');
            
            if (callback) callback(true);
        };
        
        transaction.onerror = function() {
            console.error('❌ Ошибка сохранения в IndexedDB:', transaction.error);
            if (callback) callback(false);
        };
    };
    
    request.onerror = function(event) {
        console.error('❌ Ошибка открытия IndexedDB:', event.target.error);
        if (callback) callback(false);
    };
};

MeteoAnalysisApp.prototype.getDatesWithData = function() {
    var dates = [];
    for (var key in this.state.weatherDatabase) {
        if (this.state.weatherDatabase.hasOwnProperty(key)) {
            dates.push(key);
        }
    }
    return dates.sort();
};

MeteoAnalysisApp.prototype.getWeatherDataByDate = function(date) {
    return this.state.weatherDatabase[date] || null;
};

MeteoAnalysisApp.prototype.loadDatabaseData = function() {
    var dates = this.getDatesWithData();
    console.log('📅 Доступные даты в базе: ' + dates.length);
    
    if (dates.length > 0) {
        this.state.selectedDate = dates[dates.length - 1];
        this.state.currentAnalysis = this.getWeatherDataByDate(this.state.selectedDate);
        console.log('✅ Выбрана дата: ' + this.state.selectedDate);
    }
};

MeteoAnalysisApp.prototype.initModules = function() {
    // Инициализация карты только на главной странице
    if (this.state.activePage === 'index' && typeof MapManager !== 'undefined') {
        this.mapManager = new MapManager(this);
    }
};

MeteoAnalysisApp.prototype.setupGlobalEventListeners = function() {
    var self = this;
    
    // Обработчик навигации
    var navLinks = document.querySelectorAll('.nav-menu a');
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function(e) {
            e.preventDefault();
            var targetPage = this.getAttribute('href').replace('.html', '');
            self.navigate(targetPage);
        });
    }
    
    // Обработчик кнопки "Анализ"
    var analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            self.analyzeRoute();
        });
    }
    
    // Обработчик кнопки "Экспорт"
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            if (self.pdfGenerator && typeof self.pdfGenerator.generateReport === 'function') {
                self.pdfGenerator.generateReport();
            }
        });
    }
    
    // Обработчик выбора даты
    var dateInputs = document.querySelectorAll('.date-select');
    for (var i = 0; i < dateInputs.length; i++) {
        dateInputs[i].addEventListener('change', function(e) {
            self.handleDateSelect(e.target.value);
        });
    }
    
    // Обработчик выбора полигона
    var polygonSelect = document.getElementById('polygonSelect');
    if (polygonSelect) {
        polygonSelect.addEventListener('change', function(e) {
            self.handlePolygonSelect(e.target.value);
        });
    }
    
    // Обработчик выбора маршрута
    var routeSelect = document.getElementById('routeSelect');
    if (routeSelect) {
        routeSelect.addEventListener('change', function(e) {
            self.handleRouteSelect(e.target.value);
        });
    }
};

MeteoAnalysisApp.prototype.navigate = function(page) {
    window.location.href = page + '.html';
    this.state.activePage = page;
    
    // Закрываем боковые панели
    var sidebars = document.querySelectorAll('.sidebar');
    for (var i = 0; i < sidebars.length; i++) {
        sidebars[i].classList.remove('open');
    }
};

MeteoAnalysisApp.prototype.handleDateSelect = function(date) {
    console.log('📅 Выбрана дата: ' + date);
    this.state.selectedDate = date;
    
    var weatherData = this.getWeatherDataByDate(date);
    if (weatherData) {
        this.state.currentAnalysis = weatherData;
        this.updateInterfaceWithDate(date, weatherData);
        this.showNotification('✅ Данные за ' + this.formatDate(new Date(date)) + ' загружены', 'Успех', 'success');
    } else {
        this.showNotification('ℹ️ Нет данных за ' + this.formatDate(new Date(date)), 'Информация', 'info');
        this.clearInterface();
    }
};

MeteoAnalysisApp.prototype.handlePolygonSelect = function(polygonId) {
    this.state.selectedPolygon = polygonId;
    this.updateRoutesList(polygonId);
};

MeteoAnalysisApp.prototype.handleRouteSelect = function(routeId) {
    this.state.selectedRoute = routeId;
    this.displayRouteData(routeId);
};

MeteoAnalysisApp.prototype.updateInterfaceWithDate = function(date, weatherData) {
    // Обновляем календарь
    var dateSelects = document.querySelectorAll('.date-select');
    for (var i = 0; i < dateSelects.length; i++) {
        dateSelects[i].value = date;
    }
    
    // Обновляем список полигонов
    this.updatePolygonsList(weatherData);
    
    // Восстанавливаем объекты на карте
    if (this.state.activePage === 'index' && this.mapManager) {
        this.restoreAnalysisObjects(weatherData);
    }
    
    // Обновляем данные на других страницах
    if (this.state.activePage === 'tables' && typeof window.tablesManager !== 'undefined' && window.tablesManager.updateData) {
        window.tablesManager.updateData(weatherData);
    }
    
    if (this.state.activePage === 'charts' && typeof window.chartsManager !== 'undefined' && window.chartsManager.updateData) {
        window.chartsManager.updateData(weatherData);
    }
};

MeteoAnalysisApp.prototype.updatePolygonsList = function(weatherData) {
    var polygonSelect = document.getElementById('polygonSelect');
    if (!polygonSelect || !weatherData || !weatherData.polygons) return;
    
    polygonSelect.innerHTML = '<option value="">Выберите полигон...</option>';
    
    for (var i = 0; i < weatherData.polygons.length; i++) {
        var polygon = weatherData.polygons[i];
        var option = document.createElement('option');
        option.value = i;
        option.textContent = polygon.name;
        polygonSelect.appendChild(option);
    }
    
    if (weatherData.polygons.length > 0) {
        polygonSelect.value = 0;
        this.handlePolygonSelect(0);
    }
};

MeteoAnalysisApp.prototype.updateRoutesList = function(polygonIndex) {
    var routeSelect = document.getElementById('routeSelect');
    if (!routeSelect || !this.state.currentAnalysis || !this.state.currentAnalysis.routes) return;
    
    routeSelect.innerHTML = '<option value="">Выберите маршрут...</option>';
    
    var routes = this.state.currentAnalysis.routes;
    for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        var option = document.createElement('option');
        option.value = i;
        option.textContent = route.name;
        routeSelect.appendChild(option);
    }
    
    if (routes.length > 0) {
        routeSelect.value = 0;
        this.handleRouteSelect(0);
    }
};

MeteoAnalysisApp.prototype.displayRouteData = function(routeIndex) {
    if (!this.state.currentAnalysis || !this.state.currentAnalysis.analysisResults || !this.state.currentAnalysis.analysisResults[routeIndex]) return;
    
    var analysisResult = this.state.currentAnalysis.analysisResults[routeIndex];
    
    if (this.state.activePage === 'index') {
        this.displayAnalysisResults(analysisResult);
    } else if (this.state.activePage === 'tables' && window.tablesManager && window.tablesManager.displayRouteData) {
        window.tablesManager.displayRouteData(analysisResult);
    } else if (this.state.activePage === 'charts' && window.chartsManager && window.chartsManager.displayRouteData) {
        window.chartsManager.displayRouteData(analysisResult);
    }
};

MeteoAnalysisApp.prototype.clearInterface = function() {
    var dateSelects = document.querySelectorAll('.date-select');
    for (var i = 0; i < dateSelects.length; i++) {
        dateSelects[i].value = '';
    }
    
    var polygonSelect = document.getElementById('polygonSelect');
    if (polygonSelect) polygonSelect.innerHTML = '<option value="">Выберите дату с данными</option>';
    
    var routeSelect = document.getElementById('routeSelect');
    if (routeSelect) routeSelect.innerHTML = '<option value="">Выберите полигон</option>';
    
    if (this.state.activePage === 'index') {
        var rightSidebar = document.querySelector('.right-sidebar');
        if (rightSidebar) rightSidebar.classList.remove('open');
    }
};

MeteoAnalysisApp.prototype.analyzeRoute = function() {
    var self = this;
    
    if (!this.state.databaseInitialized) {
        this.showNotification('База данных инициализируется. Подождите...', 'Информация', 'info');
        return;
    }
    
    if (this.state.analysisInProgress) {
        this.showNotification('Анализ уже выполняется', 'Информация', 'info');
        return;
    }
    
    if (!this.mapManager) {
        this.showNotification('Карта не инициализирована', 'Ошибка', 'error');
        return;
    }
    
    if (!this.mapManager.drawnFeatures || this.mapManager.drawnFeatures.length === 0) {
        this.showNotification('Нарисуйте полигон и маршрут', 'Ошибка', 'error');
        return;
    }
    
    // Находим полигоны и маршруты
    var polygons = [];
    var routes = [];
    for (var i = 0; i < this.mapManager.drawnFeatures.length; i++) {
        var feature = this.mapManager.drawnFeatures[i];
        if (feature.get && feature.get('type') === 'polygon') {
            polygons.push(feature);
        } else if (feature.get && feature.get('type') === 'route') {
            routes.push(feature);
        }
    }
    
    if (polygons.length === 0) {
        this.showNotification('Нарисуйте полигон', 'Ошибка', 'error');
        return;
    }
    
    if (routes.length === 0) {
        this.showNotification('Нарисуйте маршрут', 'Ошибка', 'error');
        return;
    }
    
    var polygon = polygons[0];
    var route = routes[0];
    
    // Получаем координаты центра полигона
    var extent = polygon.getGeometry().getExtent();
    var center = ol.extent.getCenter(extent);
    var coordinate = ol.proj.toLonLat(center);
    var lon = coordinate[0];
    var lat = coordinate[1];
    
    console.log('📍 Координаты: ' + lat.toFixed(4) + ', ' + lon.toFixed(4));
    
    var dateInput = document.getElementById('analysisDate');
    var analysisDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    this.state.analysisInProgress = true;
    this.showLoading(true, 'Получение данных с Open-Meteo...');
    
    // Проверка интернета
    if (!navigator.onLine) {
        this.showLoading(false);
        this.state.analysisInProgress = false;
        this.showNotification('Нет интернета', 'Ошибка', 'error');
        return;
    }
    
    // Формируем URL API
    var baseUrl = 'https://api.open-meteo.com/v1/forecast?';
    var params = 'latitude=' + lat + '&longitude=' + lon + 
                 '&daily=temperature_2m_max,temperature_2m_min,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,precipitation_sum' +
                 '&hourly=temperature_2m,relativehumidity_2m,pressure_msl,cloudcover,visibility,windspeed_10m,winddirection_10m,windgusts_10m' +
                 '&timezone=auto&forecast_days=1';
    var apiUrl = baseUrl + params;
    
    console.log('📡 Запрос к API: ' + apiUrl);
    
    // Функция с повторными попытками
    function fetchWithRetry(url, retries, currentRetry, callback) {
        currentRetry = currentRetry || 0;
        
        console.log('📡 Попытка ' + (currentRetry + 1) + ' из ' + retries);
        
        var controller = new AbortController();
        var timeoutId = setTimeout(function() {
            controller.abort();
        }, 60000); // 60 секунд
        
        fetch(url, { signal: controller.signal })
        .then(function(response) {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            callback(null, data);
        })
        .catch(function(error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError' && currentRetry < retries - 1) {
                console.log('⏱️ Таймаут, повторная попытка...');
                setTimeout(function() {
                    fetchWithRetry(url, retries, currentRetry + 1, callback);
                }, 2000 * (currentRetry + 1));
            } else {
                callback(error, null);
            }
        });
    }
    
    // Выполняем запрос
    fetchWithRetry(apiUrl, 3, 0, function(error, data) {
        self.showLoading(false);
        self.state.analysisInProgress = false;
        
        if (error) {
            console.error('❌ Ошибка:', error);
            self.showNotification('❌ Ошибка получения данных. Проверьте интернет и повторите попытку.', 'Ошибка', 'error');
            return;
        }
        
        console.log('✅ Данные получены');
        
        // Анализируем данные
        var analysisResult = self.analyzeWeatherData(data, polygon, route, analysisDate);
        
        // Сохраняем в базу
        self.saveAnalysisToDatabase({
            analysisDate: analysisDate,
            polygon: {
                name: polygon.get('name') || 'Полигон 1',
                type: 'polygon',
                coordinates: polygon.getGeometry().getCoordinates(),
                area: self.mapManager.calculatePolygonArea(polygon.getGeometry())
            },
            routes: [{
                name: route.get('name') || 'Маршрут 1',
                type: 'route',
                coordinates: route.getGeometry().getCoordinates(),
                length: self.mapManager.calculateRouteLength(route.getGeometry())
            }],
            weatherData: data,
            analysisResults: [analysisResult],
            recommendations: self.generateRecommendations(data)
        }, function(success) {
            if (success) {
                self.displayAnalysisResults(analysisResult);
                
                var rightSidebar = document.querySelector('.right-sidebar');
                if (rightSidebar) rightSidebar.classList.add('open');
                
                // Обновляем календарь
                var dateSelects = document.querySelectorAll('.date-select');
                for (var i = 0; i < dateSelects.length; i++) {
                    dateSelects[i].value = analysisDate;
                }
            }
        });
    });
};

MeteoAnalysisApp.prototype.analyzeWeatherData = function(data, polygon, route, analysisDate) {
    var daily = data.daily;
    var hourly = data.hourly;
    
    var polygonArea = this.mapManager ? this.mapManager.calculatePolygonArea(polygon.getGeometry()) : 0;
    var routeLength = this.mapManager ? this.mapManager.calculateRouteLength(route.getGeometry()) : 0;
    
    var maxTemp = daily.temperature_2m_max[0];
    var minTemp = daily.temperature_2m_min[0];
    var maxWind = daily.windspeed_10m_max[0];
    var maxGusts = daily.windgusts_10m_max[0];
    var windDirection = daily.winddirection_10m_dominant[0];
    var precipitation = daily.precipitation_sum[0];
    
    // Расчет средних значений
    var pressureSum = 0;
    for (var i = 0; i < hourly.pressure_msl.length; i++) pressureSum += hourly.pressure_msl[i];
    var avgPressure = pressureSum / hourly.pressure_msl.length;
    
    var humiditySum = 0;
    for (var i = 0; i < hourly.relativehumidity_2m.length; i++) humiditySum += hourly.relativehumidity_2m[i];
    var avgHumidity = humiditySum / hourly.relativehumidity_2m.length;
    
    var visibilitySum = 0;
    for (var i = 0; i < hourly.visibility.length; i++) visibilitySum += hourly.visibility[i];
    var avgVisibility = (visibilitySum / hourly.visibility.length) / 1000;
    
    var cloudCoverSum = 0;
    for (var i = 0; i < hourly.cloudcover.length; i++) cloudCoverSum += hourly.cloudcover[i];
    var avgCloudCover = cloudCoverSum / hourly.cloudcover.length;
    
    // Анализ условий
    var recommendations = [];
    var safetyStatus = 'safe';
    
    if (maxWind > 15 || maxGusts > 20) {
        recommendations.push('fas fa-wind ❌ Сильный ветер. Полет не рекомендуется.');
        safetyStatus = 'danger';
    } else if (maxWind > 10 || maxGusts > 15) {
        recommendations.push('fas fa-wind ⚠️ Умеренный ветер. Соблюдайте осторожность.');
        if (safetyStatus === 'safe') safetyStatus = 'warning';
    }
    
    if (precipitation > 10) {
        recommendations.push('fas fa-cloud-rain ❌ Сильные осадки. Полет не рекомендуется.');
        safetyStatus = 'danger';
    } else if (precipitation > 5) {
        recommendations.push('fas fa-cloud-showers-heavy ⚠️ Умеренные осадки. Ограничения видимости.');
        if (safetyStatus === 'safe') safetyStatus = 'warning';
    }
    
    if (avgVisibility < 3) {
        recommendations.push('fas fa-smog ❌ Плохая видимость. Полет запрещен.');
        safetyStatus = 'danger';
    } else if (avgVisibility < 5) {
        recommendations.push('fas fa-smog ⚠️ Ограниченная видимость.');
        if (safetyStatus === 'safe') safetyStatus = 'warning';
    }
    
    if (avgCloudCover > 80) {
        recommendations.push('fas fa-cloud ☁️ Сплошная облачность.');
        if (safetyStatus === 'safe') safetyStatus = 'caution';
    }
    
    if (recommendations.length === 0) {
        recommendations.push('fas fa-sun ✅ Метеоусловия благоприятны.');
    }
    
    // Определение иконки погоды
    var weatherIcon = 'fas fa-sun';
    if (precipitation > 5) {
        weatherIcon = maxTemp < 0 ? 'fas fa-snowflake' : 'fas fa-cloud-rain';
    } else if (avgCloudCover > 70) {
        weatherIcon = 'fas fa-cloud';
    } else if (avgCloudCover > 30) {
        weatherIcon = 'fas fa-cloud-sun';
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
        weatherIcon: weatherIcon
    };
};

MeteoAnalysisApp.prototype.getWindDirectionText = function(degrees) {
    var directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return directions[Math.round(degrees / 45) % 8];
};

MeteoAnalysisApp.prototype.generateRecommendations = function(data) {
    return this.analyzeWeatherData(data, 
        { getGeometry: function() { return { getExtent: function() { return [0,0,0,0]; } }; }, get: function() { return 'Полигон 1'; } },
        { getGeometry: function() { return { getCoordinates: function() { return [[0,0],[0,0]]; } }; }, get: function() { return 'Маршрут 1'; } },
        this.state.currentDate
    ).recommendations;
};

MeteoAnalysisApp.prototype.displayAnalysisResults = function(result) {
    // Обновление даты
    var el = document.getElementById('analysisDateDisplay');
    if (el) el.textContent = this.formatDate(new Date(result.date));
    
    // Обновление параметров с иконками Font Awesome
    this.updateElement('pressureValue', '<i class="fas fa-tachometer-alt"></i> ' + result.pressure.avg + ' гПа');
    this.updateElement('windValue', '<i class="fas fa-wind"></i> ' + result.wind.max + ' м/с (' + result.wind.directionText + ')');
    this.updateElement('tempValue', '<i class="' + result.weatherIcon + '"></i> ' + result.temperature.max + '°C / ' + result.temperature.min + '°C');
    this.updateElement('humidityValue', '<i class="fas fa-tint"></i> ' + result.humidity.avg + '%');
    this.updateElement('visibilityValue', '<i class="fas fa-eye"></i> ' + result.visibility.avg + ' км');
    this.updateElement('cloudCoverValue', '<i class="fas fa-cloud"></i> ' + result.cloudCover.avg + '%');
    
    // Обновление статуса полета
    var statusCard = document.getElementById('flightStatusCard');
    var statusIcon = document.getElementById('statusIcon');
    var statusTitle = document.getElementById('statusTitle');
    var statusSubtitle = document.getElementById('statusSubtitle');
    
    if (statusCard && statusIcon && statusTitle && statusSubtitle) {
        statusIcon.innerHTML = '<i class="' + result.weatherIcon + '" style="font-size:48px"></i>';
        
        if (result.safetyStatus === 'safe') {
            statusCard.className = 'analysis-card flight-status-card safe';
            statusTitle.textContent = 'Полет разрешен';
            statusSubtitle.textContent = 'Условия благоприятны';
        } else if (result.safetyStatus === 'warning' || result.safetyStatus === 'caution') {
            statusCard.className = 'analysis-card flight-status-card warning';
            statusTitle.textContent = 'Полет с ограничениями';
            statusSubtitle.textContent = 'Требуется осторожность';
        } else {
            statusCard.className = 'analysis-card flight-status-card danger';
            statusTitle.textContent = 'Полет запрещен';
            statusSubtitle.textContent = 'Неблагоприятные условия';
        }
    }
    
    // Обновление рекомендаций
    var recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList) {
        var html = '';
        for (var i = 0; i < result.recommendations.length; i++) {
            var rec = result.recommendations[i];
            var iconMatch = rec.match(/(fas [a-z-]+)/);
            var iconClass = iconMatch ? iconMatch[1] : 'fas fa-info-circle';
            var type = rec.indexOf('❌') !== -1 ? 'danger' : rec.indexOf('⚠️') !== -1 ? 'warning' : 'safe';
            var text = rec.replace(/fas [a-z-]+\s*/g, '').replace('❌ ', '').replace('⚠️ ', '').replace('✅ ', '');
            
            html += '<div class="recommendation-item ' + type + '">' +
                    '<div class="rec-icon"><i class="' + iconClass + '"></i></div>' +
                    '<div class="rec-content">' +
                    '<div class="rec-title">' + (type === 'danger' ? 'Опасно' : type === 'warning' ? 'Осторожно' : 'Безопасно') + '</div>' +
                    '<div class="rec-text">' + text + '</div>' +
                    '</div></div>';
        }
        recommendationsList.innerHTML = html;
    }
    
    // Обновление ключевых параметров
    this.updateElement('windParam', '<i class="fas fa-wind"></i> ' + result.wind.max);
    this.updateElement('visibilityParam', '<i class="fas fa-eye"></i> ' + result.visibility.avg);
    this.updateElement('precipitationParam', '<i class="fas fa-cloud-rain"></i> ' + result.precipitation.sum);
    this.updateElement('tempParam', '<i class="' + result.weatherIcon + '"></i> ' + result.temperature.avg);
};

MeteoAnalysisApp.prototype.updateElement = function(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

MeteoAnalysisApp.prototype.restoreAnalysisObjects = function(analysisData) {
    if (!this.mapManager || !analysisData || !analysisData.polygons) return;
    
    // Очищаем карту
    if (this.mapManager.sources && this.mapManager.sources.drawing) {
        this.mapManager.sources.drawing.clear();
    }
    this.mapManager.drawnFeatures = [];
    this.state.drawnObjects = [];
    
    // Восстанавливаем полигон
    if (analysisData.polygons[0]) {
        var polygonData = analysisData.polygons[0];
        var polygonFeature = new ol.Feature({
            geometry: new ol.geom.Polygon(polygonData.coordinates),
            name: polygonData.name,
            type: 'polygon',
            userDrawn: true
        });
        polygonFeature.setId(polygonData.name);
        
        if (this.mapManager.sources && this.mapManager.sources.drawing) {
            this.mapManager.sources.drawing.addFeature(polygonFeature);
        }
        this.mapManager.drawnFeatures.push(polygonFeature);
        this.addDrawnObjectToUI(polygonFeature);
    }
    
    // Восстанавливаем маршруты
    if (analysisData.routes) {
        for (var i = 0; i < analysisData.routes.length; i++) {
            var routeData = analysisData.routes[i];
            var routeFeature = new ol.Feature({
                geometry: new ol.geom.LineString(routeData.coordinates),
                name: routeData.name,
                type: 'route',
                userDrawn: true
            });
            routeFeature.setId(routeData.name);
            
            if (this.mapManager.sources && this.mapManager.sources.drawing) {
                this.mapManager.sources.drawing.addFeature(routeFeature);
            }
            this.mapManager.drawnFeatures.push(routeFeature);
            this.addDrawnObjectToUI(routeFeature);
        }
    }
    
    // Позиционируем карту
    if (this.mapManager.autoFitMap) {
        this.mapManager.autoFitMap();
    }
    
    console.log('✅ Объекты восстановлены на карте');
};

MeteoAnalysisApp.prototype.addDrawnObjectToUI = function(feature) {
    var type = feature.get('type');
    var name = feature.get('name');
    var containerId = type === 'polygon' ? 'polygonsList' : 'routesList';
    var container = document.getElementById(containerId);
    
    if (container) {
        container.innerHTML = '<div class="kml-item active">' +
            '<div class="kml-item-header">' +
            '<i class="fas ' + (type === 'polygon' ? 'fa-draw-polygon' : 'fa-route') + '"></i>' +
            '<span class="kml-item-name">' + name + '</span>' +
            '</div></div>';
    }
};

MeteoAnalysisApp.prototype.showNotification = function(message, title, type) {
    if (!title) title = 'Уведомление';
    if (!type) type = 'info';
    
    var notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.innerHTML = 
        '<div class="notification-icon ' + type + '">' +
        '<i class="fas fa-' + (type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info') + '"></i>' +
        '</div>' +
        '<div class="notification-content">' +
        '<div class="notification-title">' + title + '</div>' +
        '<div class="notification-message">' + message + '</div>' +
        '</div>';
    
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
};

MeteoAnalysisApp.prototype.showLoading = function(show, message) {
    var overlay = document.getElementById('loadingOverlay');
    var text = document.getElementById('loadingText');
    if (overlay && text) {
        text.textContent = message || 'Загрузка...';
        overlay.style.display = show ? 'flex' : 'none';
    }
};

MeteoAnalysisApp.prototype.formatDate = function(date) {
    var days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return days[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ' г.';
};

MeteoAnalysisApp.prototype.detectCurrentPage = function() {
    var path = window.location.pathname;
    if (path.indexOf('charts') !== -1) return 'charts';
    if (path.indexOf('tables') !== -1) return 'tables';
    if (path.indexOf('report') !== -1) return 'report';
    return 'index';
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.meteoApp = new MeteoAnalysisApp();
});
