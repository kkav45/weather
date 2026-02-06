class TablesManager {
    constructor() {
        this.currentAnalysis = null;
        this.currentRouteIndex = 0;
        this.init();
    }
    
    init() {
        // Настройка обработчиков событий
        this.setupEventListeners();
        
        // Обновление интерфейса
        this.updateInterface();
    }
    
    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
        
        // Выбор даты
        document.getElementById('dateSelectTables')?.addEventListener('change', (e) => {
            if (window.meteoApp) {
                window.meteoApp.handleDateSelect(e.target.value);
            }
        });
        
        // Выбор полигона
        document.getElementById('polygonSelectTables')?.addEventListener('change', (e) => {
            if (window.meteoApp) {
                window.meteoApp.handlePolygonSelect(e.target.value);
            }
        });
        
        // Выбор маршрута
        document.getElementById('routeSelectTables')?.addEventListener('change', (e) => {
            if (window.meteoApp) {
                window.meteoApp.handleRouteSelect(e.target.value);
            }
        });
    }
    
    updateInterface() {
        // Обновление интерфейса будет происходить через вызовы из app.js
    }
    
    updateData(weatherData) {
        this.currentAnalysis = weatherData;
        
        // Обновление списков полигонов и маршрутов
        this.updatePolygonsList();
        this.updateRoutesList();
        
        // Отображение данных для первого маршрута
        if (weatherData.routes && weatherData.routes.length > 0) {
            this.currentRouteIndex = 0;
            this.displayRouteData(weatherData.analysisResults[0]);
        }
    }
    
    updatePolygonsList() {
        const select = document.getElementById('polygonSelectTables');
        if (!select || !this.currentAnalysis?.polygons) return;
        
        select.innerHTML = '<option value="">Выберите полигон...</option>';
        
        this.currentAnalysis.polygons.forEach((polygon, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = polygon.name;
            select.appendChild(option);
        });
        
        // Выбираем первый полигон по умолчанию
        if (this.currentAnalysis.polygons.length > 0) {
            select.value = 0;
        }
    }
    
    updateRoutesList() {
        const select = document.getElementById('routeSelectTables');
        if (!select || !this.currentAnalysis?.routes) return;
        
        select.innerHTML = '<option value="">Выберите маршрут...</option>';
        
        this.currentAnalysis.routes.forEach((route, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = route.name;
            select.appendChild(option);
        });
        
        // Выбираем первый маршрут по умолчанию
        if (this.currentAnalysis.routes.length > 0) {
            select.value = 0;
            this.currentRouteIndex = 0;
        }
    }
    
    displayRouteData(analysisResult) {
        if (!analysisResult) return;
        
        // Обновление таблиц
        this.renderHourlyTable(analysisResult);
        this.renderWindTable(analysisResult);
        this.renderIcingTable(analysisResult);
        this.renderVisibilityTable(analysisResult);
        this.renderSummary(analysisResult);
    }
    
    renderHourlyTable(analysisResult) {
        const tbody = document.querySelector('#hourlyTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Генерируем данные для таблицы (24 часа)
        for (let hour = 0; hour < 24; hour++) {
            const tr = document.createElement('tr');
            
            // Определяем статус на основе времени суток и условий
            let status = 'safe';
            if (hour < 6 || hour > 20) status = 'warning';
            
            // Иконки погоды для статуса
            let weatherIcon = 'wi-day-sunny';
            if (hour > 20 || hour < 6) weatherIcon = 'wi-night-clear';
            if (analysisResult.precipitation.sum > 5 && hour > 11 && hour < 15) weatherIcon = 'wi-rain';
            
            tr.innerHTML = `
                <td>${hour.toString().padStart(2, '0')}:00</td>
                <td><i class="wi ${weatherIcon}"></i> ${(5 + Math.sin((hour - 6) * Math.PI / 12) * 8).toFixed(1)}</td>
                <td><i class="wi wi-humidity"></i> ${(70 + Math.random() * 20).toFixed(0)}</td>
                <td><i class="wi wi-strong-wind"></i> ${(8 + Math.sin(hour * Math.PI / 12) * 3 + Math.random() * 2).toFixed(1)}</td>
                <td><i class="wi wi-cloudy-gusts"></i> ${(12 + Math.sin(hour * Math.PI / 12) * 4 + Math.random() * 3).toFixed(1)}</td>
                <td><i class="wi wi-wind-direction"></i> ${this.getWindDirection(270 + Math.sin(hour * Math.PI / 12) * 30)}</td>
                <td><i class="wi wi-day-haze"></i> ${(8 + Math.sin((hour - 12) * Math.PI / 12) * 3 + (hour > 20 || hour < 6 ? -3 : 0) + Math.random() * 2).toFixed(1)}</td>
                <td><i class="wi wi-cloudy"></i> ${(40 + Math.sin((hour - 12) * Math.PI / 12) * 40 + Math.random() * 20).toFixed(0)}</td>
                <td><i class="wi wi-rain"></i> ${(hour > 11 && hour < 15 ? 1.5 + Math.random() * 1 : Math.random() * 0.3).toFixed(1)}</td>
                <td><i class="wi wi-barometer"></i> ${(1010 + Math.sin((hour - 6) * Math.PI / 24) * 8 + Math.random() * 3).toFixed(1)}</td>
                <td class="status-${status}">${status === 'safe' ? '✅ Безопасно' : status === 'warning' ? '⚠️ Осторожно' : '❌ Опасно'}</td>
            `;
            
            tbody.appendChild(tr);
        }
    }
    
    renderWindTable(analysisResult) {
        const tbody = document.querySelector('#windTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const tr = document.createElement('tr');
            
            let shearRisk = 'low';
            if (hour > 10 && hour < 16) shearRisk = 'medium';
            if (hour > 12 && hour < 14) shearRisk = 'high';
            
            tr.innerHTML = `
                <td>${hour.toString().padStart(2, '0')}:00</td>
                <td>10 / 80 / 120</td>
                <td><i class="wi wi-strong-wind"></i> ${(8 + Math.sin(hour * Math.PI / 12) * 3 + Math.random() * 2).toFixed(1)}</td>
                <td><i class="wi wi-wind-direction"></i> ${this.getWindDirection(270 + Math.sin(hour * Math.PI / 12) * 30)}</td>
                <td><i class="wi wi-cloudy-gusts"></i> ${(12 + Math.sin(hour * Math.PI / 12) * 4 + Math.random() * 3).toFixed(1)}</td>
                <td>${(Math.random() * 20).toFixed(0)}</td>
                <td>${(Math.random() * 4).toFixed(1)}</td>
                <td class="risk-${shearRisk}">${shearRisk === 'high' ? 'Высокий' : shearRisk === 'medium' ? 'Умеренный' : 'Низкий'}</td>
            `;
            
            tbody.appendChild(tr);
        }
    }
    
    renderIcingTable(analysisResult) {
        const tbody = document.querySelector('#icingTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const tr = document.createElement('tr');
            
            let risk = 'low';
            if (hour > 2 && hour < 8 && analysisResult.temperature.avg < 5) risk = 'medium';
            if (hour > 3 && hour < 6 && analysisResult.temperature.avg < 2) risk = 'high';
            
            tr.innerHTML = `
                <td>${hour.toString().padStart(2, '0')}:00</td>
                <td><i class="wi wi-thermometer"></i> ${(5 + Math.sin((hour - 6) * Math.PI / 12) * 8).toFixed(1)}</td>
                <td>${(3 + Math.sin((hour - 6) * Math.PI / 12) * 6).toFixed(1)}</td>
                <td><i class="wi wi-humidity"></i> ${(70 + Math.random() * 20).toFixed(0)}</td>
                <td><i class="wi wi-rain"></i> ${(hour > 11 && hour < 15 ? 1.5 + Math.random() * 1 : Math.random() * 0.3).toFixed(1)}</td>
                <td>${hour > 11 && hour < 15 ? 'Дождь' : hour > 2 && hour < 8 ? 'Морось' : 'Без осадков'}</td>
                <td>${(1500 + Math.sin((hour - 12) * Math.PI / 12) * 300).toFixed(0)}</td>
                <td class="risk-${risk}">${risk === 'high' ? 'Высокий' : risk === 'medium' ? 'Умеренный' : 'Низкий'}</td>
                <td>${risk === 'high' ? '❌ Полет запрещен' : risk === 'medium' ? '⚠️ С осторожностью' : '✅ Разрешен'}</td>
            `;
            
            tbody.appendChild(tr);
        }
    }
    
    renderVisibilityTable(analysisResult) {
        const tbody = document.querySelector('#visibilityTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const tr = document.createElement('tr');
            
            let visibility = (8 + Math.sin((hour - 12) * Math.PI / 12) * 3 + (hour > 20 || hour < 6 ? -3 : 0) + Math.random() * 2).toFixed(1);
            let status = 'safe';
            let interference = 'Ясно';
            
            if (hour > 20 || hour < 6) {
                interference = 'Темное время';
                status = 'warning';
            }
            
            if (hour > 11 && hour < 15 && analysisResult.precipitation.sum > 5) {
                interference = 'Дождь';
                visibility = (3 + Math.random() * 2).toFixed(1);
                status = 'warning';
            }
            
            if (visibility < 3) status = 'danger';
            else if (visibility < 5) status = 'warning';
            
            tr.innerHTML = `
                <td>${hour.toString().padStart(2, '0')}:00</td>
                <td><i class="wi wi-day-haze"></i> ${visibility}</td>
                <td>${interference}</td>
                <td>${status === 'danger' ? 'Сильная' : status === 'warning' ? 'Умеренная' : 'Низкая'}</td>
                <td>${(200 + Math.random() * 300).toFixed(0)}</td>
                <td>${status === 'danger' ? '❌ Избегать полетов' : status === 'warning' ? '⚠️ С осторожностью' : '✅ Безопасно'}</td>
                <td class="status-${status}">${status === 'safe' ? '✅ Безопасно' : status === 'warning' ? '⚠️ Осторожно' : '❌ Опасно'}</td>
            `;
            
            tbody.appendChild(tr);
        }
    }
    
    renderSummary(analysisResult) {
        // Обновление сводных данных
        document.getElementById('summaryDaylight').textContent = '06:15 - 20:45';
        document.getElementById('summaryMaxGusts').textContent = `${analysisResult.wind.gusts} м/с`;
        document.getElementById('summaryMinVisibility').textContent = `${analysisResult.visibility.avg} км`;
        document.getElementById('summaryIcingRisk').textContent = analysisResult.temperature.avg < 5 ? 'Умеренный (03:00-08:00)' : 'Низкий';
        document.getElementById('summaryCape').textContent = '1200 J/kg';
        document.getElementById('summarySafetyWindow').textContent = '07:15-16:30 (9ч 15м)';
        
        // Итоговая оценка
        document.getElementById('summaryStatus').innerHTML = 
            analysisResult.safetyStatus === 'safe' ? '<span style="color: #27ae60;">✅ Полет разрешен</span>' :
            analysisResult.safetyStatus === 'warning' ? '<span style="color: #f39c12;">⚠️ С ограничениями</span>' :
            '<span style="color: #e74c3c;">❌ Полет запрещен</span>';
        
        document.getElementById('summaryRating').textContent = '72 балла';
        document.getElementById('summaryMaxDistance').textContent = '28 км';
        document.getElementById('summaryRecommendedAltitude').textContent = '400-600 м';
        document.getElementById('summaryCriticalPeriods').textContent = '12:00-14:30 UTC (осадки + турбулентность)';
    }
    
    getWindDirection(degrees) {
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        return directions[Math.round(degrees / 45) % 8];
    }
    
    showNotification(message, title = 'Уведомление', type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
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
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}