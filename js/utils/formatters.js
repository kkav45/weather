/**
 * Утилиты форматирования данных для отображения
 * Все функции прикреплены к глобальному объекту window.DataFormatters
 */

(function() {
    'use strict';
    
    // Создание глобального объекта для форматтеров
    window.DataFormatters = {
        /**
         * Форматирование температуры
         * @param {number} value - Значение температуры в °C
         * @param {string} unit - Единица измерения ('celsius' или 'fahrenheit')
         * @returns {string} Отформатированная строка
         */
        formatTemperature: function(value, unit = 'celsius') {
            if (value === null || value === undefined) return 'Н/Д';
            
            if (unit === 'fahrenheit') {
                const fahrenheit = (value * 9/5) + 32;
                return `${fahrenheit.toFixed(1)}°F`;
            }
            
            return `${value.toFixed(1)}°C`;
        },
        
        /**
         * Форматирование скорости ветра
         * @param {number} value - Значение скорости в м/с
         * @param {string} unit - Единица измерения ('ms', 'kmh', 'kt')
         * @returns {string} Отформатированная строка
         */
        formatWindSpeed: function(value, unit = 'ms') {
            if (value === null || value === undefined) return 'Н/Д';
            
            switch(unit) {
                case 'kmh':
                    return `${(value * 3.6).toFixed(1)} км/ч`;
                case 'kt':
                    return `${(value * 1.94384).toFixed(1)} уз`;
                default:
                    return `${value.toFixed(1)} м/с`;
            }
        },
        
        /**
         * Форматирование видимости
         * @param {number} value - Значение видимости в км
         * @returns {string} Отформатированная строка
         */
        formatVisibility: function(value) {
            if (value === null || value === undefined) return 'Н/Д';
            
            // Для очень маленьких значений показываем в метрах
            if (value < 0.1) {
                return `${Math.round(value * 1000)} м`;
            }
            
            // Для значений меньше 1 км показываем с двумя знаками
            if (value < 1) {
                return `${value.toFixed(2)} км`;
            }
            
            // Для значений от 1 до 10 км - один знак
            if (value < 10) {
                return `${value.toFixed(1)} км`;
            }
            
            // Для больших значений - целое число
            return `${Math.round(value)} км`;
        },
        
        /**
         * Форматирование времени
         * @param {number} hour - Час (0-23)
         * @param {number} minute - Минута (0-59)
         * @returns {string} Отформатированная строка ЧЧ:ММ
         */
        formatTime: function(hour, minute = 0) {
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        },
        
        /**
         * Форматирование времени из дробного числа
         * @param {number} hourFloat - Час в формате дробного числа (например, 14.5 = 14:30)
         * @returns {string} Отформатированная строка ЧЧ:ММ
         */
        formatHourFloat: function(hourFloat) {
            const hours = Math.floor(hourFloat);
            const minutes = Math.round((hourFloat - hours) * 60);
            return this.formatTime(hours, minutes);
        },
        
        /**
         * Форматирование давления
         * @param {number} value - Значение давления в гПа
         * @param {string} unit - Единица измерения ('hPa' или 'mmHg')
         * @returns {string} Отформатированная строка
         */
        formatPressure: function(value, unit = 'hPa') {
            if (value === null || value === undefined) return 'Н/Д';
            
            if (unit === 'mmHg') {
                const mmHg = value * 0.750062;
                return `${Math.round(mmHg)} мм.рт.ст.`;
            }
            
            return `${Math.round(value)} гПа`;
        },
        
        /**
         * Форматирование осадков
         * @param {number} value - Значение осадков в мм
         * @returns {string} Отформатированная строка
         */
        formatPrecipitation: function(value) {
            if (value === null || value === undefined) return 'Н/Д';
            
            // Для очень маленьких значений
            if (value < 0.1) {
                return '< 0.1 мм';
            }
            
            // Для значений меньше 1 мм
            if (value < 1) {
                return `${value.toFixed(1)} мм`;
            }
            
            // Для значений от 1 до 10 мм
            if (value < 10) {
                return `${value.toFixed(1)} мм`;
            }
            
            // Для больших значений
            return `${Math.round(value)} мм`;
        },
        
        /**
         * Форматирование высоты
         * @param {number} value - Значение высоты в метрах
         * @returns {string} Отформатированная строка
         */
        formatAltitude: function(value) {
            if (value === null || value === undefined) return 'Н/Д';
            
            // Для высот меньше 1000м показываем в метрах
            if (value < 1000) {
                return `${Math.round(value)} м`;
            }
            
            // Для высот от 1000м показываем в км
            return `${(value / 1000).toFixed(1)} км`;
        },
        
        /**
         * Форматирование расстояния
         * @param {number} value - Значение расстояния в км
         * @returns {string} Отформатированная строка
         */
        formatDistance: function(value) {
            if (value === null || value === undefined) return 'Н/Д';
            
            // Для расстояний меньше 1 км показываем в метрах
            if (value < 1) {
                return `${Math.round(value * 1000)} м`;
            }
            
            // Для расстояний от 1 до 10 км - один знак
            if (value < 10) {
                return `${value.toFixed(1)} км`;
            }
            
            // Для больших расстояний - целое число
            return `${Math.round(value)} км`;
        },
        
        /**
         * Форматирование направления ветра
         * @param {number} degrees - Направление в градусах
         * @returns {string} Сокращенное название направления
         */
        formatWindDirection: function(degrees) {
            if (degrees === null || degrees === undefined) return 'Н/Д';
            
            // Нормализация значения
            degrees = degrees % 360;
            
            // Определение направления
            const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
            const index = Math.round(degrees / 45) % 8;
            
            return directions[index];
        },
        
        /**
         * Полное название направления ветра
         * @param {number} degrees - Направление в градусах
         * @returns {string} Полное название направления
         */
        formatWindDirectionFull: function(degrees) {
            if (degrees === null || degrees === undefined) return 'Неизвестно';
            
            // Нормализация значения
            degrees = degrees % 360;
            
            // Определение направления
            const directions = [
                'Северный', 'Северо-Восточный', 'Восточный', 'Юго-Восточный',
                'Южный', 'Юго-Западный', 'Западный', 'Северо-Западный'
            ];
            const index = Math.round(degrees / 45) % 8;
            
            return directions[index];
        },
        
        /**
         * Форматирование даты
         * @param {Date|string} date - Дата
         * @param {string} format - Формат ('short', 'long', 'time', 'datetime')
         * @returns {string} Отформатированная строка
         */
        formatDate: function(date, format = 'short') {
            if (!date) return 'Н/Д';
            
            // Преобразование строки в объект Date
            const d = typeof date === 'string' ? new Date(date) : date;
            
            if (isNaN(d.getTime())) return 'Неверная дата';
            
            switch(format) {
                case 'short':
                    return d.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short'
                    });
                case 'long':
                    return d.toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    });
                case 'time':
                    return d.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                case 'datetime':
                    return d.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                default:
                    return d.toLocaleDateString('ru-RU');
            }
        },
        
        /**
         * Форматирование продолжительности
         * @param {number} minutes - Продолжительность в минутах
         * @returns {string} Отформатированная строка
         */
        formatDuration: function(minutes) {
            if (minutes === null || minutes === undefined) return 'Н/Д';
            
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            
            if (hours > 0) {
                return `${hours}ч ${mins}м`;
            }
            
            return `${mins}м`;
        },
        
        /**
         * Форматирование процентов
         * @param {number} value - Значение в процентах
         * @returns {string} Отформатированная строка
         */
        formatPercentage: function(value) {
            if (value === null || value === undefined) return 'Н/Д';
            
            // Для значений близких к целым числам
            if (Math.abs(value - Math.round(value)) < 0.1) {
                return `${Math.round(value)}%`;
            }
            
            return `${value.toFixed(1)}%`;
        },
        
        /**
         * Форматирование скорости набора/снижения
         * @param {number} value - Значение в м/с
         * @returns {string} Отформатированная строка
         */
        formatVerticalSpeed: function(value) {
            if (value === null || value === undefined) return 'Н/Д';
            
            const absValue = Math.abs(value);
            const direction = value >= 0 ? 'набор' : 'снижение';
            
            // Для малых значений
            if (absValue < 1) {
                return `${absValue.toFixed(1)} м/с (${direction})`;
            }
            
            // Для больших значений
            return `${absValue.toFixed(1)} м/с (${direction})`;
        },
        
        /**
         * Форматирование координат
         * @param {number} lat - Широта
         * @param {number} lon - Долгота
         * @returns {string} Отформатированная строка
         */
        formatCoordinates: function(lat, lon) {
            if (lat === null || lon === null) return 'Н/Д';
            
            // Форматирование с 4 знаками после запятой
            const latStr = lat.toFixed(4);
            const lonStr = lon.toFixed(4);
            
            // Добавление направлений
            const latDir = lat >= 0 ? 'N' : 'S';
            const lonDir = lon >= 0 ? 'E' : 'W';
            
            return `${Math.abs(latStr)}°${latDir} ${Math.abs(lonStr)}°${lonDir}`;
        },
        
        /**
         * Форматирование статуса
         * @param {string} status - Статус
         * @returns {Object} Объект с текстом и цветом
         */
        formatStatus: function(status) {
            const statuses = {
                safe: { text: 'Безопасно', color: '#27ae60' },
                caution: { text: 'Осторожно', color: '#f39c12' },
                warning: { text: 'Предупреждение', color: '#e67e22' },
                danger: { text: 'Опасно', color: '#e74c3c' },
                critical: { text: 'Критично', color: '#c0392b' },
                unknown: { text: 'Неизвестно', color: '#95a5a6' }
            };
            
            return statuses[status] || statuses.unknown;
        },
        
        /**
         * Форматирование риска обледенения
         * @param {number} level - Уровень риска (0-3)
         * @returns {Object} Объект с текстом, цветом и описанием
         */
        formatIcingRisk: function(level) {
            const risks = {
                0: { text: 'Нет', color: '#2ecc71', description: 'Безопасные условия' },
                1: { text: 'Низкий', color: '#27ae60', description: 'Низкий риск обледенения' },
                2: { text: 'Умеренный', color: '#f39c12', description: 'Умеренный риск обледенения' },
                3: { text: 'Высокий', color: '#e74c3c', description: 'Высокий риск обледенения' }
            };
            
            return risks[level] || risks[0];
        },
        
        /**
         * Форматирование категории видимости
         * @param {string} category - Категория видимости
         * @returns {Object} Объект с текстом и цветом
         */
        formatVisibilityCategory: function(category) {
            const categories = {
                excellent: { text: 'Отличная', color: '#2ecc71' },
                good: { text: 'Хорошая', color: '#27ae60' },
                moderate: { text: 'Умеренная', color: '#f1c40f' },
                poor: { text: 'Плохая', color: '#e67e22' },
                veryPoor: { text: 'Очень плохая', color: '#e74c3c' }
            };
            
            return categories[category] || { text: 'Неизвестно', color: '#95a5a6' };
        },
        
        /**
         * Форматирование категории облачности
         * @param {string} category - Категория облачности
         * @returns {Object} Объект с текстом и цветом
         */
        formatCloudCategory: function(category) {
            const categories = {
                clear: { text: 'Ясно', color: '#3498db' },
                scattered: { text: 'Переменная', color: '#2980b9' },
                broken: { text: 'Облачно', color: '#1a5276' },
                overcast: { text: 'Пасмурно', color: '#2c3e50' }
            };
            
            return categories[category] || { text: 'Неизвестно', color: '#95a5a6' };
        },
        
        /**
         * Форматирование погодного кода WMO
         * @param {number} code - Код погоды WMO
         * @returns {Object} Объект с описанием, иконкой и категорией
         */
        formatWeatherCode: function(code) {
            return window.WEATHER_CODES[code] || { 
                code: code, 
                description: 'Неизвестно', 
                icon: '❓', 
                category: 'unknown' 
            };
        }
    };
    
    console.log('✅ Форматтеры данных загружены');
})();