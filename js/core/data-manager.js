/**
 * Менеджер данных приложения
 * Отвечает за загрузку, кэширование, обработку и синхронизацию данных
 */
class DataManager {
    constructor(app) {
        this.app = app;
        this.apiBaseUrl = 'https://api.open-meteo.com/v1/forecast';
        this.cacheDuration = 3600000; // 1 час в миллисекундах
        this.dataCache = new Map();
        this.pendingRequests = new Map();
    }

    // Загрузка данных для карты и анализа
    async loadRouteData(routeId, date) {
        const cacheKey = `route_${routeId}_${date}`;
        
        // Проверка кэша
        if (this.isCacheValid(cacheKey)) {
            console.log('📦 Данные загружены из кэша');
            return this.dataCache.get(cacheKey).data;
        }
        
        // Проверка ожидающих запросов
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        
        // Создание нового запроса
        const requestPromise = this.fetchRouteDataFromApi(routeId, date)
            .then(data => {
                // Сохранение в кэш
                this.cacheData(cacheKey, data);
                this.pendingRequests.delete(cacheKey);
                return data;
            })
            .catch(error => {
                this.pendingRequests.delete(cacheKey);
                throw error;
            });
        
        this.pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }

    async fetchRouteDataFromApi(routeId, date) {
        try {
            // Получение координат маршрута
            const route = this.app.state.routes.find(r => r.id === routeId);
            if (!route || !route.coordinates || route.coordinates.length === 0) {
                throw new Error('Маршрут не найден или не имеет координат');
            }
            
            // Берем первую точку маршрута
            const [lon, lat] = route.coordinates[0];
            
            // Формирование параметров запроса
            const params = new URLSearchParams({
                latitude: lat.toFixed(4),
                longitude: lon.toFixed(4),
                hourly: [
                    'temperature_2m',
                    'relative_humidity_2m',
                    'dewpoint_2m',
                    'pressure_msl',
                    'visibility',
                    'cloudcover',
                    'cloudcover_low',
                    'windspeed_10m',
                    'windspeed_80m',
                    'windspeed_120m',
                    'winddirection_10m',
                    'winddirection_80m',
                    'winddirection_120m',
                    'windgusts_10m',
                    'precipitation',
                    'rain',
                    'snowfall',
                    'weathercode',
                    'cape',
                    'freezinglevel_height'
                ].join(','),
                daily: [
                    'sunrise',
                    'sunset',
                    'precipitation_sum',
                    'windspeed_10m_max',
                    'windgusts_10m_max',
                    'temperature_2m_max',
                    'temperature_2m_min'
                ].join(','),
                timezone: 'UTC',
                start_date: date,
                end_date: date
            });
            
            // Выполнение запроса
            const response = await fetch(`${this.apiBaseUrl}?${params}`);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            this.app.logEvent('api_data_loaded', { source: 'open-meteo', routeId, date });
            
            return this.processWeatherData(data, lat, lon, date);
            
        } catch (error) {
            console.error('Ошибка загрузки данных маршрута:', error);
            
            // Возврат резервных данных при ошибке
            if (error.name === 'NetworkError' || error.message.includes('API error')) {
                this.app.showNotification('Используются резервные данные. Проверьте подключение к интернету.', 'Предупреждение', 'warning');
                return this.getFallbackWeatherData(date);
            }
            
            throw error;
        }
    }

    // Обработка сырых данных от API
    processWeatherData(rawData, lat, lon, date) {
        const hourly = rawData.hourly;
        const daily = rawData.daily;
        
        // Обработка почасовых данных
        const hourlyData = hourly.time.map((time, index) => {
            const hour = new Date(time).getUTCHours();
            return {
                hour: hour,
                time: `${hour.toString().padStart(2, '0')}:00`,
                temperature: hourly.temperature_2m[index],
                dewpoint: hourly.dewpoint_2m[index],
                humidity: hourly.relative_humidity_2m[index],
                pressure: hourly.pressure_msl[index],
                visibility: hourly.visibility[index] / 1000, // в км
                cloudcover: hourly.cloudcover[index],
                cloudcoverLow: hourly.cloudcover_low[index],
                windSpeed10m: hourly.windspeed_10m[index],
                windSpeed80m: hourly.windspeed_80m[index],
                windSpeed120m: hourly.windspeed_120m[index],
                windDir10m: hourly.winddirection_10m[index],
                windDir80m: hourly.winddirection_80m[index],
                windDir120m: hourly.winddirection_120m[index],
                windGusts: hourly.windgusts_10m[index],
                precipitation: hourly.precipitation[index],
                rain: hourly.rain[index],
                snowfall: hourly.snowfall[index],
                weathercode: hourly.weathercode[index],
                cape: hourly.cape[index],
                freezingLevel: hourly.freezinglevel_height[index]
            };
        });
        
        // Расчет дополнительных параметров
        hourlyData.forEach(hour => {
            // Расчет риска обледенения
            hour.icingRisk = this.calculateIcingRisk(
                hour.temperature,
                hour.dewpoint,
                hour.humidity,
                hour.precipitation
            );
            
            // Расчет ветрового сдвига
            hour.windShear = this.calculateWindShear(
                hour.windSpeed10m,
                hour.windSpeed120m,
                hour.windDir10m,
                hour.windDir120m
            );
            
            // Расчет видимости статуса
            hour.visibilityStatus = this.calculateVisibilityStatus(hour.visibility);
            
            // Расчет статуса безопасности
            hour.safetyStatus = this.calculateHourSafetyStatus(hour);
        });
        
        // Обработка ежедневных данных
        const dailyData = {
            sunrise: this.parseTime(daily.sunrise[0]),
            sunset: this.parseTime(daily.sunset[0]),
            precipitationSum: daily.precipitation_sum[0],
            maxWindSpeed: daily.windspeed_10m_max[0],
            maxWindGusts: daily.windgusts_10m_max[0],
            maxTemperature: daily.temperature_2m_max[0],
            minTemperature: daily.temperature_2m_min[0]
        };
        
        return {
            metadata: {
                lat: lat.toFixed(4),
                lon: lon.toFixed(4),
                date: date,
                source: 'open-meteo',
                processedAt: new Date().toISOString()
            },
            hourly: hourlyData,
            daily: dailyData,
            summary: this.generateSummary(hourlyData, dailyData)
        };
    }

    // Расчет риска обледенения
    calculateIcingRisk(temp, dewpoint, humidity, precipitation) {
        if (temp >= 0 && temp <= 5 && humidity > 85 && precipitation > 0.5) {
            return { level: 3, text: 'Высокий' };
        } else if (temp >= -2 && temp <= 7 && humidity > 80 && precipitation > 0.2) {
            return { level: 2, text: 'Умеренный' };
        } else if (temp >= -5 && temp <= 10 && humidity > 75 && precipitation > 0.1) {
            return { level: 1, text: 'Низкий' };
        }
        return { level: 0, text: 'Нет' };
    }

    // Расчет ветрового сдвига
    calculateWindShear(speed10m, speed120m, dir10m, dir120m) {
        const speedDiff = Math.abs(speed120m - speed10m);
        const dirDiff = Math.abs(dir120m - dir10m);
        
        let level = 0;
        let text = 'Низкий';
        
        if (dirDiff > 40 || speedDiff > 6) {
            level = 3;
            text = 'Критический';
        } else if (dirDiff > 25 || speedDiff > 4) {
            level = 2;
            text = 'Умеренный';
        } else if (dirDiff > 15 || speedDiff > 2) {
            level = 1;
            text = 'Слабый';
        }
        
        return {
            level: level,
            text: text,
            speedDiff: speedDiff.toFixed(1),
            dirDiff: dirDiff.toFixed(0)
        };
    }

    // Расчет статуса видимости
    calculateVisibilityStatus(visibility) {
        if (visibility < 1) return { level: 4, text: 'Очень плохая' };
        if (visibility < 3) return { level: 3, text: 'Плохая' };
        if (visibility < 5) return { level: 2, text: 'Умеренная' };
        if (visibility < 10) return { level: 1, text: 'Хорошая' };
        return { level: 0, text: 'Отличная' };
    }

    // Расчет статуса безопасности для часа
    calculateHourSafetyStatus(hour) {
        // Начинаем с безопасного статуса
        let status = { level: 0, text: 'Безопасно', color: 'safe' };
        
        // Проверка критических условий
        if (hour.icingRisk.level >= 3 || hour.windShear.level >= 3 || hour.cape > 2000) {
            return { level: 3, text: 'Запрещено', color: 'danger' };
        }
        
        // Проверка условий с ограничениями
        if (hour.icingRisk.level >= 2 || 
            hour.windShear.level >= 2 || 
            hour.windGusts > 12 || 
            hour.visibility < 3 ||
            hour.cape > 1500) {
            return { level: 2, text: 'Ограничения', color: 'warning' };
        }
        
        // Проверка осторожных условий
        if (hour.windGusts > 8 || hour.visibility < 5 || hour.cape > 1000) {
            return { level: 1, text: 'Осторожно', color: 'caution' };
        }
        
        return status;
    }

    // Генерация сводки
    generateSummary(hourlyData, dailyData) {
        // Расчет средних значений
        const avgTemp = hourlyData.reduce((sum, h) => sum + h.temperature, 0) / hourlyData.length;
        const maxGusts = Math.max(...hourlyData.map(h => h.windGusts));
        const minVisibility = Math.min(...hourlyData.map(h => h.visibility));
        const totalPrecip = hourlyData.reduce((sum, h) => sum + h.precipitation, 0);
        
        // Поиск опасных периодов
        const dangerousPeriods = hourlyData
            .filter(h => h.safetyStatus.level >= 2)
            .map(h => h.time);
        
        // Расчет окна безопасности
        const safeHours = hourlyData.filter(h => h.safetyStatus.level === 0);
        const safetyWindow = safeHours.length > 0 
            ? `${safeHours[0].time} - ${safeHours[safeHours.length - 1].time}`
            : 'Нет безопасного окна';
        
        return {
            averageTemperature: avgTemp.toFixed(1),
            maxWindGusts: maxGusts.toFixed(1),
            minVisibility: minVisibility.toFixed(1),
            totalPrecipitation: totalPrecip.toFixed(1),
            dangerousPeriods: dangerousPeriods,
            safetyWindow: safetyWindow,
            overallSafety: this.calculateOverallSafety(hourlyData)
        };
    }

    // Расчет общего уровня безопасности
    calculateOverallSafety(hourlyData) {
        const dangerHours = hourlyData.filter(h => h.safetyStatus.level >= 2).length;
        const cautionHours = hourlyData.filter(h => h.safetyStatus.level === 1).length;
        
        if (dangerHours > 8) return { level: 3, text: 'Опасные условия', rating: 30 };
        if (dangerHours > 4) return { level: 2, text: 'Условно безопасно', rating: 60 };
        if (cautionHours > 6) return { level: 1, text: 'Благоприятно с ограничениями', rating: 80 };
        return { level: 0, text: 'Благоприятные условия', rating: 95 };
    }

    // Резервные данные при ошибке API
    getFallbackWeatherData(date) {
        const dayOfYear = Math.floor((new Date(date) - new Date(new Date(date).getFullYear(), 0, 0)) / 86400000);
        const baseTemp = 5 + Math.sin((dayOfYear - 80) * Math.PI / 182.5) * 10;
        
        // Генерация тестовых данных
        const hourlyData = Array.from({length: 24}, (_, i) => {
            const tempVariation = Math.sin((i - 6) * Math.PI / 12) * 8;
            const windVariation = Math.sin(i * Math.PI / 12) * 3;
            
            return {
                hour: i,
                time: `${i.toString().padStart(2, '0')}:00`,
                temperature: (baseTemp + tempVariation + (Math.random() - 0.5) * 2).toFixed(1),
                dewpoint: (baseTemp + tempVariation - 3 + (Math.random() - 0.5) * 2).toFixed(1),
                humidity: Math.min(95, Math.max(60, 80 + Math.sin((i - 6) * Math.PI / 12) * 15 + (Math.random() - 0.5) * 10)).toFixed(0),
                pressure: (1010 + Math.sin((i - 6) * Math.PI / 24) * 8 + (Math.random() - 0.5) * 3).toFixed(1),
                visibility: Math.max(2, 8 + Math.sin((i - 12) * Math.PI / 12) * 4 + (Math.random() - 0.5) * 3).toFixed(1),
                cloudcover: Math.min(95, Math.max(10, 40 + Math.sin((i - 12) * Math.PI / 12) * 35 + Math.random() * 20)).toFixed(0),
                windSpeed10m: (5 + windVariation + Math.random() * 2).toFixed(1),
                windSpeed80m: (7 + windVariation + Math.random() * 3).toFixed(1),
                windSpeed120m: (9 + windVariation + Math.random() * 4).toFixed(1),
                windDir10m: (270 + Math.sin(i * Math.PI / 12) * 30).toFixed(0),
                windDir80m: (280 + Math.sin(i * Math.PI / 12) * 35).toFixed(0),
                windDir120m: (290 + Math.sin(i * Math.PI / 12) * 40).toFixed(0),
                windGusts: (9 + windVariation + Math.random() * 5).toFixed(1),
                precipitation: (i > 11 && i < 15 ? 1.5 + Math.random() * 1 : Math.random() * 0.3).toFixed(1),
                rain: (i > 11 && i < 15 ? 1.2 + Math.random() * 0.8 : Math.random() * 0.2).toFixed(1),
                snowfall: '0.0',
                weathercode: (i > 11 && i < 15 ? 61 : 3).toFixed(0),
                cape: (i > 13 && i < 18 ? 1200 + Math.random() * 800 : 300 + Math.random() * 400).toFixed(0),
                freezingLevel: '2500',
                icingRisk: { level: i > 11 && i < 15 ? 2 : 0, text: i > 11 && i < 15 ? 'Умеренный' : 'Нет' },
                windShear: { level: 1, text: 'Слабый', speedDiff: '3.5', dirDiff: '25' },
                visibilityStatus: { level: 1, text: 'Хорошая' },
                safetyStatus: { 
                    level: i > 11 && i < 15 ? 2 : 0, 
                    text: i > 11 && i < 15 ? 'Ограничения' : 'Безопасно',
                    color: i > 11 && i < 15 ? 'warning' : 'safe'
                }
            };
        });
        
        return {
            metadata: {
                lat: '55.7558',
                lon: '37.6173',
                date: date,
                source: 'fallback',
                processedAt: new Date().toISOString()
            },
            hourly: hourlyData,
            daily: {
                sunrise: '05:30',
                sunset: '21:30',
                precipitationSum: '2.5',
                maxWindSpeed: '8.5',
                maxWindGusts: '13.2',
                maxTemperature: (baseTemp + 8).toFixed(1),
                minTemperature: (baseTemp - 3).toFixed(1)
            },
            summary: {
                averageTemperature: baseTemp.toFixed(1),
                maxWindGusts: '13.2',
                minVisibility: '3.5',
                totalPrecipitation: '2.5',
                dangerousPeriods: ['12:00', '13:00', '14:00'],
                safetyWindow: '06:00 - 11:00, 15:00 - 20:00',
                overallSafety: { level: 1, text: 'Благоприятно с ограничениями', rating: 75 }
            }
        };
    }

    // Работа с кэшем
    cacheData(key, data) {
        this.dataCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Сохранение в локальное хранилище для персистентности
        this.app.saveToLocalStorage(`cache_${key}`, {
            data: data,
            timestamp: Date.now()
        });
    }

    isCacheValid(key) {
        const cached = this.dataCache.get(key) || this.app.loadFromLocalStorage(`cache_${key}`);
        if (!cached) return false;
        
        return (Date.now() - cached.timestamp) < this.cacheDuration;
    }

    clearCache() {
        this.dataCache.clear();
        // Очистка кэша в локальном хранилище
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('bvu_meteo_cache_')) {
                localStorage.removeItem(key);
            }
        });
        this.app.logEvent('cache_cleared');
    }

    // Загрузка данных для графиков
    async loadChartData() {
        if (!this.app.state.currentRoute) return;
        
        try {
            const data = await this.loadRouteData(this.app.state.currentRoute, this.app.state.currentDate);
            this.app.state.weatherData = data;
            
            // Обновление графиков
            if (typeof window.updateCharts === 'function') {
                window.updateCharts(data);
            }
            
            this.app.logEvent('chart_data_loaded');
        } catch (error) {
            console.error('Ошибка загрузки данных для графиков:', error);
            this.app.showNotification('Ошибка загрузки данных для графиков', 'Ошибка', 'error');
        }
    }

    // Загрузка данных для таблиц
    async loadTableData() {
        if (!this.app.state.currentRoute) return;
        
        try {
            const data = await this.loadRouteData(this.app.state.currentRoute, this.app.state.currentDate);
            this.app.state.weatherData = data;
            
            // Обновление таблиц
            if (typeof window.updateTables === 'function') {
                window.updateTables(data);
            }
            
            this.app.logEvent('table_data_loaded');
        } catch (error) {
            console.error('Ошибка загрузки данных для таблиц:', error);
            this.app.showNotification('Ошибка загрузки данных для таблиц', 'Ошибка', 'error');
        }
    }

    // Загрузка данных для конкретной даты
    async loadDataForDate(date) {
        this.app.state.currentDate = date;
        this.app.saveToLocalStorage('lastSelectedDate', date);
        
        if (this.app.state.activePage === 'charts') {
            await this.loadChartData();
        } else if (this.app.state.activePage === 'tables') {
            await this.loadTableData();
        }
        
        this.app.logEvent('data_loaded_for_date', { date });
    }

    // Обновление всех данных
    async refreshAllData() {
        this.clearCache();
        
        if (this.app.state.currentRoute) {
            if (this.app.state.activePage === 'charts') {
                await this.loadChartData();
            } else if (this.app.state.activePage === 'tables') {
                await this.loadTableData();
            }
        }
        
        this.app.logEvent('all_data_refreshed');
    }

    // Вспомогательные методы
    parseTime(timeString) {
        if (!timeString) return '00:00';
        const timePart = timeString.split('T')[1];
        return timePart ? timePart.substring(0, 5) : '00:00';
    }
}