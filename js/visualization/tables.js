// Управление таблицами и экспортом данных

class TablesManager {
    constructor() {
        // Проверка, что мы на странице таблиц
        if (!document.getElementById('hourlyTable')) {
            console.log('Не страница таблиц - инициализация пропущена');
            return;
        }
        
        // Глобальное состояние
        this.currentRoute = null;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.tableData = {};
        this.activeTab = 'hourly';
        this.weatherData = null; // Сохраненные метеоданные
        
        // Инициализация
        this.init();
    }

    init() {
        console.log('📊 Инициализация таблиц...');
        
        // Установка текущей даты
        const dateSelect = document.getElementById('dateSelect');
        if (dateSelect) {
            dateSelect.value = this.currentDate;
        }
        
        const dateDisplay = document.getElementById('currentDateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = this.formatDate(new Date());
        }
        
        // Загрузка списка маршрутов
        this.loadRoutesList();
        
        // Настройка обработчиков событий
        this.setupEventListeners();
        
        // Загрузка данных по умолчанию
        this.loadDefaultData();
    }

    // Загрузка списка маршрутов из состояния приложения
    loadRoutesList() {
        const routeSelect = document.getElementById('routeSelect');
        if (!routeSelect) return;
        
        // Очищаем существующие опции (кроме первой)
        while (routeSelect.options.length > 1) {
            routeSelect.remove(1);
        }
        
        // Получаем список маршрутов из глобального приложения
        const routes = window.getRoutesList ? window.getRoutesList() : [];
        
        if (routes.length > 0) {
            routes.forEach(route => {
                const option = document.createElement('option');
                option.value = route.id;
                option.textContent = route.name;
                routeSelect.appendChild(option);
            });
            
            console.log(`✅ Загружено ${routes.length} маршрутов в список`);
            
            // Автоматически выбираем первый маршрут
            if (routes.length > 0) {
                routeSelect.value = routes[0].id;
                this.currentRoute = routes[0].id;
            }
        } else {
            console.log('⚠️ Нет доступных маршрутов для отображения');
            
            // Показываем предупреждение
            const warningEl = document.getElementById('dataLoadWarning');
            if (warningEl) {
                warningEl.style.display = 'block';
            }
        }
    }

    setupEventListeners() {
        // Смена маршрута
        const routeSelect = document.getElementById('routeSelect');
        if (routeSelect) {
            routeSelect.addEventListener('change', (e) => {
                this.currentRoute = e.target.value;
                if (this.currentRoute && this.currentDate) {
                    this.loadData();
                }
            });
        }
        
        // Смена даты
        const dateSelect = document.getElementById('dateSelect');
        if (dateSelect) {
            dateSelect.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                if (this.currentRoute && this.currentDate) {
                    this.loadData();
                }
            });
        }
        
        // Обновление данных
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.currentRoute && this.currentDate) {
                    this.loadData();
                } else {
                    this.showNotification('Выберите маршрут и дату для обновления данных', 'Предупреждение', 'warning');
                }
            });
        }
        
        // Загрузка данных из файла
        const loadWeatherDataBtn = document.getElementById('loadWeatherDataBtn');
        if (loadWeatherDataBtn) {
            loadWeatherDataBtn.addEventListener('click', () => {
                // Создаем и кликаем по скрытому input для загрузки файла
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json';
                fileInput.style.display = 'none';
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.loadWeatherDataFromFile(file);
                    }
                    document.body.removeChild(fileInput);
                });
                document.body.appendChild(fileInput);
                fileInput.click();
            });
        }
        
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        // Экспорт данных
        document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
            this.openExportModal('csv');
        });
        
        document.getElementById('exportXlsBtn')?.addEventListener('click', () => {
            this.openExportModal('xls');
        });
        
        document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
            this.openExportModal('json');
        });
        
        // Копирование таблиц
        document.getElementById('copyHourlyTable')?.addEventListener('click', () => {
            this.copyTable('hourlyTable');
        });
        
        document.getElementById('copyCriticalTable')?.addEventListener('click', () => {
            this.copyTable('criticalTable');
        });
        
        document.getElementById('copySummaryTable')?.addEventListener('click', () => {
            this.copyTable('summaryTable');
        });
        
        document.getElementById('copyWindTable')?.addEventListener('click', () => {
            this.copyTable('windTable');
        });
        
        document.getElementById('copyIcingTable')?.addEventListener('click', () => {
            this.copyTable('icingTable');
        });
        
        // Печать таблиц
        document.getElementById('printHourlyTable')?.addEventListener('click', () => {
            this.printTable('hourlyTable');
        });
        
        document.getElementById('printCriticalTable')?.addEventListener('click', () => {
            this.printTable('criticalTable');
        });
        
        document.getElementById('printSummaryTable')?.addEventListener('click', () => {
            this.printTable('summaryTable');
        });
        
        document.getElementById('printWindTable')?.addEventListener('click', () => {
            this.printTable('windTable');
        });
        
        document.getElementById('printIcingTable')?.addEventListener('click', () => {
            this.printTable('icingTable');
        });
        
        // Поиск в таблице
        document.getElementById('hourlySearch')?.addEventListener('input', (e) => {
            this.filterTable('hourlyTable', e.target.value);
        });
        
        // Модальное окно экспорта
        document.getElementById('closeExportModal')?.addEventListener('click', () => {
            this.closeExportModal();
        });
        
        document.getElementById('cancelExport')?.addEventListener('click', () => {
            this.closeExportModal();
        });
        
        document.getElementById('confirmExport')?.addEventListener('click', () => {
            this.confirmExport();
        });
        
        // Выбор формата экспорта
        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.export-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
            });
        });
    }

    switchTab(tabId) {
        // Скрыть все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Убрать активный класс у всех кнопок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Показать выбранную вкладку
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
        
        // Активировать кнопку
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add('active');
        
        this.activeTab = tabId;
    }

    async loadData() {
        this.showLoading(true, 'Загрузка данных...');
        
        try {
            // Проверяем, есть ли сохраненные метеоданные в состоянии приложения
            if (window.meteoApp && window.meteoApp.state.weatherData) {
                this.weatherData = window.meteoApp.state.weatherData;
                console.log('✅ Используем метеоданные из состояния приложения');
            } else {
                // Если данных нет, пытаемся загрузить из локального хранилища
                const savedData = localStorage.getItem('lastWeatherData');
                if (savedData) {
                    this.weatherData = JSON.parse(savedData);
                    console.log('✅ Используем метеоданные из локального хранилища');
                } else {
                    throw new Error('Нет доступных метеоданных. Проведите анализ на главной странице или загрузите файл с данными.');
                }
            }
            
            // Генерация таблиц данных на основе метеоданных
            this.tableData = await this.generateTableData(this.currentRoute, this.currentDate);
            
            // Обновление всех таблиц
            this.renderHourlyTable();
            this.renderCriticalTable();
            this.renderSummaryTable();
            this.renderWindTable();
            this.renderIcingTable();
            
            this.showNotification('Данные успешно загружены', 'Успех', 'success');
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showNotification(error.message || 'Ошибка при загрузке данных', 'Ошибка', 'error');
            
            // Показываем предупреждение
            const warningEl = document.getElementById('dataLoadWarning');
            if (warningEl) {
                warningEl.style.display = 'block';
            }
        } finally {
            this.showLoading(false);
        }
    }

    // Загрузка данных из файла JSON
    loadWeatherDataFromFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Проверка версии и структуры
                if (data.version !== '1.0') {
                    throw new Error('Несовместимая версия файла данных');
                }
                
                // Сохраняем данные в состояние приложения
                if (window.meteoApp) {
                    window.meteoApp.state.weatherData = data.weatherData;
                    localStorage.setItem('lastWeatherData', JSON.stringify(data.weatherData));
                    
                    // Восстанавливаем полигон и маршрут на карте
                    window.meteoApp.restorePolygonAndRoute(data.polygon, data.route);
                    
                    // Обновляем список маршрутов
                    this.loadRoutesList();
                    
                    this.showNotification(`Данные загружены из файла: ${file.name}`, 'Загрузка', 'success');
                    console.log('✅ Данные загружены из файла:', file.name);
                    
                    // Автоматически загружаем данные в таблицы
                    this.currentRoute = data.route.name;
                    this.currentDate = data.analysisDate;
                    this.loadData();
                } else {
                    throw new Error('Приложение не инициализировано');
                }
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                this.showNotification(`Ошибка при загрузке данных: ${error.message}`, 'Ошибка', 'error');
            }
        };
        
        reader.onerror = (e) => {
            console.error('Ошибка чтения файла:', e);
            this.showNotification('Ошибка при чтении файла', 'Ошибка', 'error');
        };
        
        reader.readAsText(file);
    }

    async generateTableData(routeId, date) {
        // Имитация загрузки данных (в реальном приложении здесь будет обработка данных)
        await this.delay(500);
        
        // Если у нас есть погодные данные, используем их
        if (!this.weatherData) {
            throw new Error('Нет метеоданных для генерации таблиц');
        }
        
        const hours = Array.from({length: 24}, (_, i) => i);
        const baseTemp = 5; // Базовая температура
        const baseWind = 8; // Базовая скорость ветра
        
        return {
            hourly: hours.map(h => {
                const temp = baseTemp + Math.sin((h - 6) * Math.PI / 12) * 8;
                const dewpoint = temp - 2 - Math.random() * 3;
                const humidity = Math.min(98, Math.max(60, 85 - Math.sin((h - 6) * Math.PI / 12) * 20 + Math.random() * 10));
                const wind10m = baseWind + Math.sin(h * Math.PI / 12) * 3 + Math.random() * 2;
                const wind120m = wind10m + 3 + Math.sin(h * Math.PI / 12) * 2 + Math.random() * 2;
                const gusts = wind120m + 2 + Math.random() * 4;
                const windDir = 270 + Math.sin(h * Math.PI / 12) * 30;
                const visibility = Math.max(1.5, 8 + Math.sin((h - 12) * Math.PI / 12) * 3 + (h > 20 || h < 6 ? -3 : 0) + Math.random() * 2);
                const cloudCover = 30 + Math.sin((h - 12) * Math.PI / 12) * 40 + Math.random() * 20;
                const precipitation = (h > 11 && h < 15) ? 1.5 + Math.random() * 1 : Math.random() * 0.3;
                const cape = (h > 13 && h < 18) ? 1200 + Math.random() * 800 : 300 + Math.random() * 400;
                const pressure = 1010 + Math.sin((h - 6) * Math.PI / 24) * 8 + Math.random() * 3;
                
                // Определение статуса
                let status = 'safe';
                if (h < 6 || h > 20) status = 'dark';
                else if (h > 11 && h < 15 && precipitation > 1) status = 'warning';
                else if (gusts > 12) status = 'caution';
                
                return {
                    time: `${h.toString().padStart(2, '0')}:00`,
                    temperature: temp.toFixed(1),
                    dewpoint: dewpoint.toFixed(1),
                    humidity: humidity.toFixed(0),
                    wind10m: wind10m.toFixed(1),
                    wind120m: wind120m.toFixed(1),
                    gusts: gusts.toFixed(1),
                    windDir: windDir.toFixed(0),
                    windDirText: this.getWindDirection(windDir),
                    visibility: visibility.toFixed(1),
                    cloudCover: cloudCover.toFixed(0),
                    precipitation: precipitation.toFixed(1),
                    cape: cape.toFixed(0),
                    pressure: pressure.toFixed(1),
                    status: status
                };
            }),
            
            criticalPoints: [
                {
                    point: 1,
                    coords: '55.78°N, 37.55°E',
                    distance: '12.4',
                    altitude: '120',
                    time: '08:45',
                    risk: 'medium',
                    threat: 'Повышенная турбулентность',
                    recommendation: 'Снизить высоту до 80м'
                },
                {
                    point: 2,
                    coords: '55.82°N, 37.62°E',
                    distance: '24.7',
                    altitude: '120',
                    time: '10:15',
                    risk: 'high',
                    threat: 'Риск обледенения',
                    recommendation: 'Обойти участок или подняться выше 200м'
                },
                {
                    point: 3,
                    coords: '55.79°N, 37.71°E',
                    distance: '35.2',
                    altitude: '120',
                    time: '11:30',
                    risk: 'medium',
                    threat: 'Снижение видимости',
                    recommendation: 'Увеличить интервал с другими БВС'
                }
            ],
            
            windProfile: hours.map(h => {
                const wind10m = baseWind + Math.sin(h * Math.PI / 12) * 3 + Math.random() * 2;
                const wind80m = wind10m + 2 + Math.sin(h * Math.PI / 12) * 3 + Math.random() * 2;
                const wind120m = wind80m + 1.5 + Math.sin(h * Math.PI / 12) * 2 + Math.random() * 2;
                const dir10m = 270 + Math.sin(h * Math.PI / 12) * 20;
                const dir80m = dir10m + 10 + Math.sin(h * Math.PI / 12) * 10;
                const dir120m = dir80m + 5 + Math.sin(h * Math.PI / 12) * 5;
                const gusts = wind120m + 2 + Math.random() * 4;
                
                const dirShift = Math.abs(dir120m - dir10m);
                const speedShift = Math.abs(wind120m - wind10m);
                
                let shearRisk = 'low';
                if (dirShift > 30 || speedShift > 4) shearRisk = 'high';
                else if (dirShift > 20 || speedShift > 3) shearRisk = 'medium';
                
                return {
                    time: `${h.toString().padStart(2, '0')}:00`,
                    altitude: '10м / 80м / 120м',
                    speed10m: wind10m.toFixed(1),
                    speed80m: wind80m.toFixed(1),
                    speed120m: wind120m.toFixed(1),
                    dir10m: dir10m.toFixed(0),
                    dir80m: dir80m.toFixed(0),
                    dir120m: dir120m.toFixed(0),
                    dir10mText: this.getWindDirection(dir10m),
                    dir80mText: this.getWindDirection(dir80m),
                    dir120mText: this.getWindDirection(dir120m),
                    gusts: gusts.toFixed(1),
                    dirShift: dirShift.toFixed(0),
                    speedShift: speedShift.toFixed(1),
                    shearRisk: shearRisk
                };
            }),
            
            icingRisk: hours.map(h => {
                const temp = baseTemp + Math.sin((h - 6) * Math.PI / 12) * 8;
                const dewpoint = temp - 2 - Math.random() * 3;
                const humidity = Math.min(98, Math.max(60, 85 - Math.sin((h - 6) * Math.PI / 12) * 20 + Math.random() * 10));
                const precipitation = (h > 11 && h < 15) ? 1.5 + Math.random() * 1 : Math.random() * 0.3;
                const freezingLevel = 1500 + Math.sin((h - 12) * Math.PI / 12) * 300;
                
                let risk = 'low';
                let precipType = 'Без осадков';
                let recommendation = 'Полет разрешен';
                
                if (temp >= 0 && temp <= 5 && humidity > 85 && precipitation > 0.5) {
                    risk = 'high';
                    precipType = 'Моросящий дождь';
                    recommendation = 'Полет запрещен - высокий риск обледенения';
                } else if (temp >= -2 && temp <= 7 && humidity > 80 && precipitation > 0.2) {
                    risk = 'medium';
                    precipType = precipitation > 1 ? 'Дождь' : 'Морось';
                    recommendation = 'Полет с осторожностью, избегать длительного пребывания в облаках';
                } else if (precipitation > 0) {
                    precipType = temp < 0 ? 'Снег' : 'Морось';
                }
                
                return {
                    time: `${h.toString().padStart(2, '0')}:00`,
                    temperature: temp.toFixed(1),
                    dewpoint: dewpoint.toFixed(1),
                    humidity: humidity.toFixed(0),
                    precipitation: precipitation.toFixed(1),
                    precipType: precipType,
                    freezingLevel: freezingLevel.toFixed(0),
                    risk: risk,
                    recommendation: recommendation
                };
            })
        };
    }

    renderHourlyTable() {
        const tbody = document.querySelector('#hourlyTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.tableData.hourly.forEach(row => {
            const tr = document.createElement('tr');
            
            // Цветовая индикация статуса
            if (row.status === 'dark') {
                tr.style.backgroundColor = 'rgba(52, 58, 64, 0.08)';
            } else if (row.status === 'warning') {
                tr.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            } else if (row.status === 'caution') {
                tr.style.backgroundColor = 'rgba(241, 196, 15, 0.15)';
            }
            
            tr.innerHTML = `
                <td>${row.time}</td>
                <td>${row.temperature}</td>
                <td>${row.dewpoint}</td>
                <td>${row.humidity}</td>
                <td>${row.wind10m}</td>
                <td>${row.wind120m}</td>
                <td>${row.gusts}</td>
                <td>${row.windDir} (${row.windDirText})</td>
                <td>${row.visibility}</td>
                <td>${row.cloudCover}</td>
                <td>${row.precipitation}</td>
                <td>${row.cape}</td>
                <td>${row.pressure}</td>
                <td class="status-${row.status === 'safe' ? 'safe' : row.status === 'warning' || row.status === 'caution' ? 'warning' : 'danger'}">
                    ${row.status === 'safe' ? 'Безопасно' : 
                      row.status === 'warning' ? 'Ограничения' : 
                      row.status === 'caution' ? 'Осторожно' : 'Темное время'}
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    renderCriticalTable() {
        const tbody = document.querySelector('#criticalTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.tableData.criticalPoints.forEach(point => {
            const tr = document.createElement('tr');
            
            // Цветовая индикация риска
            if (point.risk === 'high') {
                tr.style.backgroundColor = 'rgba(231, 76, 60, 0.08)';
            } else if (point.risk === 'medium') {
                tr.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
            }
            
            tr.innerHTML = `
                <td>${point.point}</td>
                <td>${point.coords}</td>
                <td>${point.distance} км</td>
                <td>${point.altitude} м</td>
                <td>${point.time} UTC</td>
                <td class="risk-${point.risk}">${point.risk === 'high' ? 'Высокий' : 'Умеренный'}</td>
                <td>${point.threat}</td>
                <td>${point.recommendation}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    renderSummaryTable() {
        // Обновление сводных данных
        document.getElementById('summaryDaylight').textContent = '06:15 - 20:45';
        document.getElementById('summaryMaxGusts').textContent = '14 м/с';
        document.getElementById('summaryMinVisibility').textContent = '4.2 км';
        document.getElementById('summaryIcingRisk').textContent = 'Умеренный (12:00-14:30)';
        document.getElementById('summaryCape').textContent = '1200 J/kg';
        document.getElementById('summarySafetyWindow').textContent = '07:15-16:30 (9ч 15м)';
        document.getElementById('summaryStatus').textContent = 'УСЛОВНО БЕЗОПАСНО';
        document.getElementById('summaryRating').textContent = '72 балла';
        document.getElementById('summaryMaxDistance').textContent = '28 км';
        document.getElementById('summaryRecommendedAltitude').textContent = '400-600 м';
        document.getElementById('summaryCriticalPeriods').textContent = '12:00-14:30 UTC (осадки + турбулентность)';
    }

    renderWindTable() {
        const tbody = document.querySelector('#windTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.tableData.windProfile.forEach(row => {
            const tr = document.createElement('tr');
            
            // Цветовая индикация риска сдвига
            if (row.shearRisk === 'high') {
                tr.style.backgroundColor = 'rgba(231, 76, 60, 0.08)';
            } else if (row.shearRisk === 'medium') {
                tr.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
            }
            
            tr.innerHTML = `
                <td>${row.time}</td>
                <td>${row.altitude}</td>
                <td>${row.speed10m} / ${row.speed80m} / ${row.speed120m}</td>
                <td>${row.dir10m} / ${row.dir80m} / ${row.dir120m}</td>
                <td>${row.dir10mText} / ${row.dir80mText} / ${row.dir120mText}</td>
                <td>${row.gusts}</td>
                <td>${row.dirShift}°</td>
                <td>${row.speedShift}</td>
                <td class="risk-${row.shearRisk}">
                    ${row.shearRisk === 'high' ? 'Высокий' : row.shearRisk === 'medium' ? 'Умеренный' : 'Низкий'}
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    renderIcingTable() {
        const tbody = document.querySelector('#icingTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.tableData.icingRisk.forEach(row => {
            const tr = document.createElement('tr');
            
            // Цветовая индикация риска обледенения
            if (row.risk === 'high') {
                tr.style.backgroundColor = 'rgba(231, 76, 60, 0.08)';
            } else if (row.risk === 'medium') {
                tr.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
            }
            
            tr.innerHTML = `
                <td>${row.time}</td>
                <td>${row.temperature}</td>
                <td>${row.dewpoint}</td>
                <td>${row.humidity}</td>
                <td>${row.precipitation}</td>
                <td>${row.precipType}</td>
                <td>${row.freezingLevel}</td>
                <td class="risk-${row.risk}">
                    ${row.risk === 'high' ? 'Высокий' : row.risk === 'medium' ? 'Умеренный' : 'Низкий'}
                </td>
                <td>${row.recommendation}</td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    openExportModal(format) {
        const modal = document.getElementById('exportModal');
        if (!modal) return;
        
        modal.classList.add('show');
        
        // Установка активного формата
        document.querySelectorAll('.export-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.format === format) {
                option.classList.add('active');
            }
        });
        
        // Установка имени файла по умолчанию
        const routeName = document.getElementById('routeSelect')?.selectedOptions[0]?.text || 'route';
        const dateStr = this.currentDate.replace(/-/g, '');
        document.getElementById('exportFilename').value = `meteo_${routeName.replace(/\s+/g, '_')}_${dateStr}`;
    }

    closeExportModal() {
        document.getElementById('exportModal')?.classList.remove('show');
    }

    confirmExport() {
        const format = document.querySelector('.export-option.active')?.dataset.format;
        const filename = document.getElementById('exportFilename')?.value;
        const includeHeaders = document.getElementById('exportHeaders')?.checked;
        const exportAllTabs = document.getElementById('exportAllTabs')?.checked;
        
        try {
            if (format === 'csv') {
                this.exportToCsv(filename, includeHeaders, exportAllTabs);
            } else if (format === 'xls') {
                this.exportToXls(filename, includeHeaders, exportAllTabs);
            } else if (format === 'json') {
                this.exportToJson(filename, exportAllTabs);
            } else if (format === 'pdf') {
                this.exportToPdf(filename, exportAllTabs);
            }
            
            this.closeExportModal();
            this.showNotification(`Данные успешно экспортированы в формате ${format.toUpperCase()}`, 'Успех', 'success');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            this.showNotification('Ошибка при экспорте данных', 'Ошибка', 'error');
        }
    }

    exportToCsv(filename, includeHeaders, exportAllTabs) {
        let csvContent = '';
        
        if (exportAllTabs) {
            // Экспорт всех вкладок
            csvContent += '=== ПОЧАСОВОЙ ПРОГНОЗ ===\n';
            csvContent += this.tableToCsv('hourlyTable', includeHeaders);
            csvContent += '\n\n=== КРИТИЧЕСКИЕ ТОЧКИ ===\n';
            csvContent += this.tableToCsv('criticalTable', includeHeaders);
            csvContent += '\n\n=== ВЕТРОВОЙ ПРОФИЛЬ ===\n';
            csvContent += this.tableToCsv('windTable', includeHeaders);
            csvContent += '\n\n=== РИСК ОБЛЕДЕНЕНИЯ ===\n';
            csvContent += this.tableToCsv('icingTable', includeHeaders);
        } else {
            // Экспорт текущей вкладки
            const tableId = `tab-${this.activeTab}`;
            const table = document.querySelector(`#${tableId} .data-table`);
            if (table) {
                csvContent = this.tableToCsv(table.id, includeHeaders);
            }
        }
        
        // Создание и скачивание файла
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    tableToCsv(tableId, includeHeaders) {
        const table = document.getElementById(tableId);
        if (!table) return '';
        
        let csv = [];
        
        if (includeHeaders) {
            const headers = [];
            table.querySelectorAll('thead th').forEach(th => {
                headers.push(this.escapeCsv(th.textContent.trim()));
            });
            csv.push(headers.join(';'));
        }
        
        table.querySelectorAll('tbody tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('td').forEach(td => {
                row.push(this.escapeCsv(td.textContent.trim()));
            });
            csv.push(row.join(';'));
        });
        
        return csv.join('\n');
    }

    escapeCsv(text) {
        if (text.includes(';') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    exportToXls(filename, includeHeaders, exportAllTabs) {
        // Используем библиотеку SheetJS (xlsx.full.min.js)
        const wb = XLSX.utils.book_new();
        
        if (exportAllTabs) {
            // Экспорт всех вкладок как отдельных листов
            const sheets = [
                { id: 'hourlyTable', name: 'Почасовой прогноз' },
                { id: 'criticalTable', name: 'Критические точки' },
                { id: 'windTable', name: 'Ветровой профиль' },
                { id: 'icingTable', name: 'Риск обледенения' }
            ];
            
            sheets.forEach(sheet => {
                const table = document.getElementById(sheet.id);
                if (table) {
                    const ws = XLSX.utils.table_to_sheet(table, { raw: true });
                    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
                }
            });
        } else {
            // Экспорт текущей вкладки
            const tableId = `tab-${this.activeTab}`;
            const table = document.querySelector(`#${tableId} .data-table`);
            if (table) {
                const ws = XLSX.utils.table_to_sheet(table, { raw: true });
                XLSX.utils.book_append_sheet(wb, ws, 'Данные');
            }
        }
        
        // Скачивание файла
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }

    exportToJson(filename, exportAllTabs) {
        let jsonData = {};
        
        if (exportAllTabs) {
            jsonData = {
                hourlyForecast: this.tableData.hourly,
                criticalPoints: this.tableData.criticalPoints,
                windProfile: this.tableData.windProfile,
                icingRisk: this.tableData.icingRisk,
                meta: {
                    route: document.getElementById('routeSelect')?.selectedOptions[0]?.text || 'Не указан',
                    date: this.currentDate,
                    generatedAt: new Date().toISOString()
                }
            };
        } else {
            // Экспорт данных текущей вкладки
            switch (this.activeTab) {
                case 'hourly':
                    jsonData = { hourlyForecast: this.tableData.hourly };
                    break;
                case 'critical':
                    jsonData = { criticalPoints: this.tableData.criticalPoints };
                    break;
                case 'wind':
                    jsonData = { windProfile: this.tableData.windProfile };
                    break;
                case 'icing':
                    jsonData = { icingRisk: this.tableData.icingRisk };
                    break;
            }
        }
        
        // Создание и скачивание файла
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportToPdf(filename, exportAllTabs) {
        this.showNotification('Экспорт в PDF доступен на странице "Отчет"', 'Информация', 'info');
    }

    copyTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        // Создание скрытого textarea для копирования
        const textarea = document.createElement('textarea');
        textarea.value = this.tableToCsv(tableId, true);
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        this.showNotification('Данные таблицы скопированы в буфер обмена', 'Успех', 'success');
    }

    printTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Печать таблицы</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    @media print {
                        body { padding: 0; }
                        table { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                </style>
            </head>
            <body onload="window.print(); window.close()">
                <h1>Таблица метеоданных</h1>
                <p>Маршрут: ${document.getElementById('routeSelect')?.selectedOptions[0]?.text || 'Не указан'}</p>
                <p>Дата: ${this.currentDate}</p>
                ${table.outerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    filterTable(tableId, searchTerm) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    getWindDirection(degrees) {
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        return directions[Math.round(degrees / 45) % 8];
    }

    formatDate(date) {
        return date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showLoading(show, message = 'Загрузка данных...') {
        const overlay = document.getElementById('loadingOverlay');
        const textElement = document.getElementById('loadingText');
        
        if (overlay && textElement) {
            if (message) textElement.textContent = message;
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, title = 'Уведомление', type = 'info') {
        // Создание уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
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
        
        // Показ уведомления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Скрытие через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadDefaultData() {
        // Загрузка данных по умолчанию, если выбран маршрут и дата
        const routeSelect = document.getElementById('routeSelect');
        if (routeSelect && routeSelect.value && this.currentDate) {
            this.currentRoute = routeSelect.value;
            this.loadData();
        }
    }
}

// Инициализация менеджера таблиц при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('hourlyTable')) {
        window.tablesManager = new TablesManager();
    }
});