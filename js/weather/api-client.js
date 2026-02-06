/**
 * Клиент для работы с Open-Meteo API
 * Обеспечивает типизированные запросы и обработку ошибок
 */
class WeatherAPIClient {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1/forecast';
        this.defaultParams = {
            timezone: 'UTC',
            hourly: [
                'temperature_2m',
                'relative_humidity_2m',
                'dewpoint_2m',
                'pressure_msl',
                'visibility',
                'cloudcover',
                'cloudcover_low',
                'cloudcover_mid',
                'cloudcover_high',
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
                'showers',
                'weathercode',
                'cape',
                'freezinglevel_height',
                'shortwave_radiation',
                'uv_index'
            ].join(','),
            daily: [
                'sunrise',
                'sunset',
                'precipitation_sum',
                'rain_sum',
                'snowfall_sum',
                'windspeed_10m_max',
                'windgusts_10m_max',
                'temperature_2m_max',
                'temperature_2m_min',
                'uv_index_max'
            ].join(','),
            forecast_days: 1
        };
        this.cache = new Map();
        this.requestTimeout = 10000; // 10 секунд
    }

    /**
     * Получение метеоданных для точки
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @param {string} date - Дата в формате YYYY-MM-DD
     * @returns {Promise<Object>} Обработанные метеоданные
     */
    async getWeatherData(lat, lon, date) {
        const cacheKey = this.generateCacheKey(lat, lon, date);
        
        // Проверка кэша
        if (this.isCacheValid(cacheKey)) {
            console.log('📦 Данные загружены из кэша API');
            return this.cache.get(cacheKey).data;
        }
        
        try {
            // Формирование параметров запроса
            const params = {
                ...this.defaultParams,
                latitude: lat.toFixed(4),
                longitude: lon.toFixed(4),
                start_date: date,
                end_date: date
            };
            
            // Выполнение запроса
            const response = await this.fetchWithTimeout(params);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Валидация данных
            if (!this.validateResponse(data)) {
                throw new Error('Invalid API response format');
            }
            
            // Сохранение в кэш
            this.cacheData(cacheKey, data);
            
            console.log('✅ Данные успешно загружены с Open-Meteo API');
            return data;
            
        } catch (error) {
            console.error('❌ Ошибка получения данных с Open-Meteo API:', error);
            throw this.handleApiError(error, lat, lon, date);
        }
    }

    /**
     * Расширенный запрос с дополнительными параметрами
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Метеоданные
     */
    async getExtendedWeatherData(options) {
        const {
            lat,
            lon,
            startDate,
            endDate,
            hourlyParams = [],
            dailyParams = [],
            models = ['best_match'] // best_match, icon_seamless, etc.
        } = options;
        
        const params = {
            latitude: lat.toFixed(4),
            longitude: lon.toFixed(4),
            start_date: startDate,
            end_date: endDate,
            timezone: 'UTC',
            models: models.join(','),
            hourly: [...this.defaultParams.hourly.split(','), ...hourlyParams].join(','),
            daily: [...this.defaultParams.daily.split(','), ...dailyParams].join(',')
        };
        
        try {
            const response = await this.fetchWithTimeout(params);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка расширенного запроса:', error);
            throw error;
        }
    }

    /**
     * Получение данных для нескольких точек
     * @param {Array} points - Массив точек [{lat, lon, date}]
     * @returns {Promise<Array>} Массив результатов
     */
    async getWeatherDataBatch(points) {
        const results = [];
        const batchSize = 5; // Количество параллельных запросов
        
        for (let i = 0; i < points.length; i += batchSize) {
            const batch = points.slice(i, i + batchSize);
            const batchPromises = batch.map(point => 
                this.getWeatherData(point.lat, point.lon, point.date)
                    .then(data => ({ ...point, data, success: true }))
                    .catch(error => ({ ...point, error, success: false }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }

    /**
     * Выполнение запроса с таймаутом
     */
    async fetchWithTimeout(params) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${this.baseUrl}?${queryString}`, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'BVU-Meteo-Analysis/1.0'
                }
            });
            
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Валидация ответа API
     */
    validateResponse(data) {
        return (
            data &&
            typeof data === 'object' &&
            data.hourly &&
            data.daily &&
            Array.isArray(data.hourly.time) &&
            data.hourly.time.length > 0
        );
    }

    /**
     * Генерация ключа кэша
     */
    generateCacheKey(lat, lon, date) {
        return `weather_${lat.toFixed(4)}_${lon.toFixed(4)}_${date}`;
    }

    /**
     * Проверка валидности кэша
     */
    isCacheValid(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        
        const CACHE_DURATION = 3600000; // 1 час в миллисекундах
        return (Date.now() - cached.timestamp) < CACHE_DURATION;
    }

    /**
     * Сохранение данных в кэш
     */
    cacheData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Кэш API очищен');
    }

    /**
     * Обработка ошибок API
     */
    handleApiError(error, lat, lon, date) {
        if (error.name === 'AbortError') {
            return new Error('Превышено время ожидания ответа от сервера погоды');
        }
        
        if (error.message.includes('Failed to fetch')) {
            return new Error('Нет подключения к интернету или сервер погоды недоступен');
        }
        
        if (error.message.includes('API error: 429')) {
            return new Error('Превышен лимит запросов к сервису погоды. Попробуйте позже.');
        }
        
        // Возврат оригинальной ошибки с контекстом
        return new Error(`Ошибка получения данных погоды для координат ${lat}, ${lon} на дату ${date}: ${error.message}`);
    }

    /**
     * Получение статуса сервиса
     */
    async getServiceStatus() {
        try {
            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&forecast_days=1', {
                method: 'HEAD'
            });
            
            return {
                available: response.ok,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherAPIClient;
} else {
    window.WeatherAPIClient = WeatherAPIClient;
}