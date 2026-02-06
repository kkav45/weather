/**
 * Константы приложения Метеоанализ БВС
 * Все константы прикреплены к глобальному объекту window
 */

(function() {
    'use strict';
    
    // Версия приложения
    window.APP_VERSION = '1.0.0';
    window.APP_NAME = 'Метеоанализ БВС';
    window.APP_DESCRIPTION = 'Профессиональная система анализа метеоусловий для планирования безопасных полетов БВС';
    
    // Базовые настройки API
    window.API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
    window.API_TIMEOUT = 10000; // 10 секунд
    window.API_MAX_RETRIES = 3;
    
    // Параметры кэширования
    window.CACHE_DURATION = 3600000; // 1 час в миллисекундах
    window.CACHE_MAX_SIZE = 50; // Максимальное количество записей в кэше
    
    // Географические константы
    window.DEFAULT_COORDINATES = { 
        lat: 55.7558, 
        lon: 37.6173,
        name: 'Москва, Россия'
    };
    
    window.DEFAULT_ZOOM = 9;
    window.MIN_ZOOM = 3;
    window.MAX_ZOOM = 19;
    
    // Параметры БВС
    window.CRUISE_SPEED = 69; // км/ч - крейсерская скорость
    window.MIN_FLIGHT_SPEED = 30; // км/ч - минимальная скорость полета
    window.MAX_FLIGHT_ALTITUDE = 800; // м - максимальная высота полета
    window.MIN_FLIGHT_ALTITUDE = 50; // м - минимальная высота полета
    window.BATTERY_CAPACITY = 210; // минут - емкость батареи
    window.MIN_BATTERY_RESERVE = 30; // минут - минимальный резерв
    
    // Пороговые значения для анализа безопасности
    window.THRESHOLDS = {
        // Ветер
        MAX_WIND_GUSTS: 15,        // м/с - максимальные порывы для полета
        MAX_WIND_GUSTS_WARNING: 12, // м/с - предупреждение о сильном ветре
        MAX_WIND_SHEAR_DIR: 30,    // градусов - критический сдвиг направления
        MAX_WIND_SHEAR_SPEED: 5,   // м/с - критический сдвиг скорости
        
        // Видимость
        MIN_VISIBILITY_VFR: 5,     // км - минимальная видимость для ВПВ
        MIN_VISIBILITY_MARGINAL: 3, // км - предельная видимость для ВПВ
        MIN_VISIBILITY_CRITICAL: 1, // км - критическая видимость
        
        // Облака
        MIN_CLOUD_CEILING_VFR: 300, // м - минимальный потолок для ВПВ
        MIN_CLOUD_CEILING_MARGINAL: 200, // м - предельный потолок
        
        // Обледенение
        MAX_ICING_RISK: 2,         // уровень - максимальный допустимый риск
        ICING_TEMP_MIN: -10,       // °C - минимальная температура для обледенения
        ICING_TEMP_MAX: 5,         // °C - максимальная температура для обледенения
        ICING_HUMIDITY_MIN: 80,    // % - минимальная влажность для обледенения
        
        // Грозовая активность
        MAX_CAPE: 1500,            // J/kg - максимальный индекс для полетов
        CAPE_WARNING: 1000,        // J/kg - предупреждение о грозовой активности
        
        // Осадки
        MAX_PRECIPITATION: 2,      // мм/ч - максимальные осадки для полета
        PRECIPITATION_WARNING: 1,  // мм/ч - предупреждение об осадках
        
        // Давление
        MIN_PRESSURE: 980,         // гПа - минимальное давление
        MAX_PRESSURE_GRADIENT: 2.0, // гПа/100км - максимальный градиент
        
        // Батарея
        MIN_BATTERY_RESERVE: 30    // минут - минимальный резерв батареи
    };
    
    // Цвета для статусов и категорий
    window.STATUS_COLORS = {
        // Статусы безопасности
        safe: '#27ae60',           // Зеленый - безопасно
        caution: '#f39c12',        // Оранжевый - осторожно
        warning: '#e67e22',        // Темно-оранжевый - предупреждение
        danger: '#e74c3c',         // Красный - опасно
        critical: '#c0392b',       // Темно-красный - критично
        
        // Категории видимости
        visibility_excellent: '#2ecc71',
        visibility_good: '#27ae60',
        visibility_moderate: '#f1c40f',
        visibility_poor: '#e67e22',
        visibility_veryPoor: '#e74c3c',
        
        // Категории облаков
        clouds_clear: '#3498db',
        clouds_scattered: '#2980b9',
        clouds_broken: '#1a5276',
        clouds_overcast: '#2c3e50',
        
        // Уровни риска обледенения
        icing_none: '#2ecc71',
        icing_low: '#27ae60',
        icing_moderate: '#f39c12',
        icing_high: '#e74c3c',
        
        // Сдвиг ветра
        shear_low: '#2ecc71',
        shear_moderate: '#f1c40f',
        shear_high: '#e67e22',
        shear_critical: '#e74c3c'
    };
    
    // Направления ветра
    window.WIND_DIRECTIONS = [
        { deg: 0, name: 'С', fullName: 'Северный' },
        { deg: 45, name: 'СВ', fullName: 'Северо-Восточный' },
        { deg: 90, name: 'В', fullName: 'Восточный' },
        { deg: 135, name: 'ЮВ', fullName: 'Юго-Восточный' },
        { deg: 180, name: 'Ю', fullName: 'Южный' },
        { deg: 225, name: 'ЮЗ', fullName: 'Юго-Западный' },
        { deg: 270, name: 'З', fullName: 'Западный' },
        { deg: 315, name: 'СЗ', fullName: 'Северо-Западный' }
    ];
    
    // Погодные коды WMO
    window.WEATHER_CODES = {
        0: { code: 0, description: 'Ясно', icon: '☀️', category: 'clear' },
        1: { code: 1, description: 'Преимущественно ясно', icon: '🌤️', category: 'mostly_clear' },
        2: { code: 2, description: 'Переменная облачность', icon: '⛅', category: 'partly_cloudy' },
        3: { code: 3, description: 'Пасмурно', icon: '☁️', category: 'overcast' },
        45: { code: 45, description: 'Туман', icon: '🌫️', category: 'fog' },
        48: { code: 48, description: 'Отлагающийся туман', icon: '🌫️', category: 'depositing_fog' },
        51: { code: 51, description: 'Морось: слабая', icon: '🌦️', category: 'drizzle_light' },
        53: { code: 53, description: 'Морось: умеренная', icon: '🌧️', category: 'drizzle_moderate' },
        55: { code: 55, description: 'Морось: густая', icon: '🌧️', category: 'drizzle_dense' },
        56: { code: 56, description: 'Морозная морось: слабая', icon: '🌧️', category: 'freezing_drizzle_light' },
        57: { code: 57, description: 'Морозная морось: густая', icon: '🌧️', category: 'freezing_drizzle_dense' },
        61: { code: 61, description: 'Дождь: слабый', icon: '🌦️', category: 'rain_light' },
        63: { code: 63, description: 'Дождь: умеренный', icon: '🌧️', category: 'rain_moderate' },
        65: { code: 65, description: 'Дождь: сильный', icon: '🌧️', category: 'rain_heavy' },
        66: { code: 66, description: 'Ледяной дождь: слабый', icon: '🌧️', category: 'freezing_rain_light' },
        67: { code: 67, description: 'Ледяной дождь: сильный', icon: '🌧️', category: 'freezing_rain_heavy' },
        71: { code: 71, description: 'Снег: слабый', icon: '🌨️', category: 'snow_light' },
        73: { code: 73, description: 'Снег: умеренный', icon: '🌨️', category: 'snow_moderate' },
        75: { code: 75, description: 'Снег: сильный', icon: '🌨️', category: 'snow_heavy' },
        77: { code: 77, description: 'Снежная крупа', icon: '🌨️', category: 'snow_grains' },
        80: { code: 80, description: 'Ливневый дождь: слабый', icon: '🌦️', category: 'rain_shower_light' },
        81: { code: 81, description: 'Ливневый дождь: умеренный', icon: '🌧️', category: 'rain_shower_moderate' },
        82: { code: 82, description: 'Ливневый дождь: сильный', icon: '🌧️', category: 'rain_shower_heavy' },
        85: { code: 85, description: 'Ливневый снег: слабый', icon: '🌨️', category: 'snow_shower_light' },
        86: { code: 86, description: 'Ливневый снег: сильный', icon: '🌨️', category: 'snow_shower_heavy' },
        95: { code: 95, description: 'Гроза', icon: '⛈️', category: 'thunderstorm' },
        96: { code: 96, description: 'Гроза с градом', icon: '⛈️', category: 'thunderstorm_hail' },
        99: { code: 99, description: 'Гроза с сильным градом', icon: '⛈️', category: 'thunderstorm_heavy_hail' }
    };
    
    // Типы маршрутов БВС
    window.ROUTE_TYPES = {
        inspection: { name: 'Инспекция', color: '#3498db', icon: '🔍' },
        mapping: { name: 'Картографирование', color: '#2ecc71', icon: '🗺️' },
        surveillance: { name: 'Наблюдение', color: '#9b59b6', icon: '👁️' },
        delivery: { name: 'Доставка', color: '#e67e22', icon: '📦' },
        emergency: { name: 'Экстренный', color: '#e74c3c', icon: '🚨' }
    };
    
    // Единицы измерения
    window.UNITS = {
        temperature: { celsius: '°C', fahrenheit: '°F' },
        windSpeed: { ms: 'м/с', kmh: 'км/ч', kt: 'уз' },
        pressure: { hPa: 'гПа', mmHg: 'мм.рт.ст.' },
        visibility: { km: 'км', m: 'м' },
        precipitation: { mm: 'мм' },
        distance: { km: 'км', m: 'м' },
        altitude: { m: 'м' },
        time: { hours: 'ч', minutes: 'мин', seconds: 'с' }
    };
    
    // Настройки по умолчанию
    window.DEFAULT_SETTINGS = {
        mapLayer: 'osm',
        temperatureUnit: 'celsius',
        windUnit: 'ms',
        pressureUnit: 'hPa',
        distanceUnit: 'km',
        theme: 'light',
        notifications: true,
        autoRefresh: false,
        autoRefreshInterval: 300000, // 5 минут
        defaultRouteType: 'inspection',
        showWindLayer: true,
        showVisibilityLayer: true,
        showIcingLayer: false,
        showPrecipitationLayer: false,
        showThunderstormLayer: false
    };
    
    // Сообщения и тексты интерфейса
    window.MESSAGES = {
        loading: 'Загрузка данных...',
        error: 'Произошла ошибка',
        success: 'Операция выполнена успешно',
        noData: 'Нет данных для отображения',
        confirmDelete: 'Вы уверены, что хотите удалить этот объект?',
        unsavedChanges: 'У вас есть несохраненные изменения. Продолжить?',
        exportSuccess: 'Данные успешно экспортированы',
        importSuccess: 'Данные успешно импортированы',
        validationError: 'Пожалуйста, заполните все обязательные поля'
    };
    
    // Коды ошибок
    window.ERROR_CODES = {
        NETWORK_ERROR: 'NETWORK_ERROR',
        API_ERROR: 'API_ERROR',
        TIMEOUT_ERROR: 'TIMEOUT_ERROR',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        AUTH_ERROR: 'AUTH_ERROR',
        NOT_FOUND: 'NOT_FOUND',
        SERVER_ERROR: 'SERVER_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    };
    
    console.log('✅ Константы приложения загружены');
})();