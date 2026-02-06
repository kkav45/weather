/**
 * Вспомогательные функции для работы с геоданными и расчетами
 * Все функции прикреплены к глобальному объекту window.Helpers
 */

(function() {
    'use strict';
    
    // Создание глобального объекта для хелперов
    window.Helpers = {
        /**
         * Расчет расстояния между двумя точками по формуле гаверсинуса
         * @param {number} lat1 - Широта первой точки
         * @param {number} lon1 - Долгота первой точки
         * @param {number} lat2 - Широта второй точки
         * @param {number} lon2 - Долгота второй точки
         * @returns {number} Расстояние в километрах
         */
        calculateDistance: function(lat1, lon1, lat2, lon2) {
            const R = 6371; // Радиус Земли в км
            
            // Перевод координат в радианы
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            
            // Формула гаверсинуса
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            
            return R * c;
        },
        
        /**
         * Расчет длины маршрута
         * @param {Array} coordinates - Массив координат [[lon, lat], ...]
         * @returns {number} Длина маршрута в километрах
         */
        calculateRouteLength: function(coordinates) {
            if (!coordinates || coordinates.length < 2) return 0;
            
            let totalLength = 0;
            
            for (let i = 0; i < coordinates.length - 1; i++) {
                totalLength += this.calculateDistance(
                    coordinates[i][1], coordinates[i][0],
                    coordinates[i+1][1], coordinates[i+1][0]
                );
            }
            
            return totalLength;
        },
        
        /**
         * Проверка, находится ли точка внутри полигона (алгоритм "луча")
         * @param {Array} point - Координаты точки [lon, lat]
         * @param {Array} polygon - Массив координат полигона [[lon, lat], ...]
         * @returns {boolean} true, если точка внутри полигона
         */
        isPointInPolygon: function(point, polygon) {
            if (!polygon || polygon.length < 3) return false;
            
            const x = point[0], y = point[1];
            let inside = false;
            
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i][0], yi = polygon[i][1];
                const xj = polygon[j][0], yj = polygon[j][1];
                
                const intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                    
                if (intersect) inside = !inside;
            }
            
            return inside;
        },
        
        /**
         * Проверка, пересекаются ли два полигона
         * @param {Array} polygon1 - Первый полигон
         * @param {Array} polygon2 - Второй полигон
         * @returns {boolean} true, если полигоны пересекаются
         */
        doPolygonsIntersect: function(polygon1, polygon2) {
            if (!polygon1 || !polygon2 || polygon1.length < 3 || polygon2.length < 3) return false;
            
            // Проверка, есть ли общие точки
            for (const point of polygon1) {
                if (this.isPointInPolygon(point, polygon2)) return true;
            }
            
            for (const point of polygon2) {
                if (this.isPointInPolygon(point, polygon1)) return true;
            }
            
            // Более сложная проверка пересечения ребер (упрощенная версия)
            // В реальном приложении здесь должна быть полная реализация
            // алгоритма проверки пересечения отрезков
            
            return false;
        },
        
        /**
         * Расчет центра полигона (центроид)
         * @param {Array} coordinates - Массив координат полигона
         * @returns {Object} Объект с координатами центра {lat, lon}
         */
        calculatePolygonCenter: function(coordinates) {
            if (!coordinates || coordinates.length === 0) {
                return { lat: 0, lon: 0 };
            }
            
            let latSum = 0, lonSum = 0;
            
            coordinates.forEach(coord => {
                lonSum += coord[0];
                latSum += coord[1];
            });
            
            return {
                lat: latSum / coordinates.length,
                lon: lonSum / coordinates.length
            };
        },
        
        /**
         * Debounce функция - откладывает выполнение функции до тех пор, пока не пройдет указанное время
         * @param {Function} func - Функция для выполнения
         * @param {number} wait - Время ожидания в миллисекундах
         * @returns {Function} Декорированная функция
         */
        debounce: function(func, wait) {
            let timeout;
            
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        /**
         * Throttle функция - ограничивает выполнение функции до одного раза в указанный период
         * @param {Function} func - Функция для выполнения
         * @param {number} limit - Минимальный интервал между вызовами в миллисекундах
         * @returns {Function} Декорированная функция
         */
        throttle: function(func, limit) {
            let inThrottle;
            
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        /**
         * Генерация уникального идентификатора
         * @returns {string} Уникальный идентификатор
         */
        generateUUID: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        
        /**
         * Округление числа до указанного количества знаков
         * @param {number} value - Число для округления
         * @param {number} decimals - Количество знаков после запятой
         * @returns {number} Округленное число
         */
        round: function(value, decimals = 0) {
            if (typeof value !== 'number' || isNaN(value)) return value;
            
            const multiplier = Math.pow(10, decimals);
            return Math.round(value * multiplier) / multiplier;
        },
        
        /**
         * Проверка, является ли значение числом
         * @param {*} value - Значение для проверки
         * @returns {boolean} true, если значение является числом
         */
        isNumber: function(value) {
            return typeof value === 'number' && !isNaN(value);
        },
        
        /**
         * Проверка, является ли значение валидной координатой
         * @param {*} lat - Широта
         * @param {*} lon - Долгота
         * @returns {boolean} true, если координаты валидны
         */
        isValidCoordinate: function(lat, lon) {
            return this.isNumber(lat) && this.isNumber(lon) &&
                   lat >= -90 && lat <= 90 &&
                   lon >= -180 && lon <= 180;
        },
        
        /**
         * Преобразование градусов в радианы
         * @param {number} degrees - Угол в градусах
         * @returns {number} Угол в радианах
         */
        degreesToRadians: function(degrees) {
            return degrees * Math.PI / 180;
        },
        
        /**
         * Преобразование радиан в градусы
         * @param {number} radians - Угол в радианах
         * @returns {number} Угол в градусах
         */
        radiansToDegrees: function(radians) {
            return radians * 180 / Math.PI;
        },
        
        /**
         * Расчет направления между двумя точками
         * @param {number} lat1 - Широта первой точки
         * @param {number} lon1 - Долгота первой точки
         * @param {number} lat2 - Широта второй точки
         * @param {number} lon2 - Долгота второй точки
         * @returns {number} Направление в градусах (0-360)
         */
        calculateBearing: function(lat1, lon1, lat2, lon2) {
            const dLon = this.degreesToRadians(lon2 - lon1);
            const lat1Rad = this.degreesToRadians(lat1);
            const lat2Rad = this.degreesToRadians(lat2);
            
            const y = Math.sin(dLon) * Math.cos(lat2Rad);
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
            
            const bearing = Math.atan2(y, x);
            const bearingDegrees = (this.radiansToDegrees(bearing) + 360) % 360;
            
            return bearingDegrees;
        },
        
        /**
         * Расчет промежуточной точки между двумя координатами
         * @param {number} lat1 - Широта первой точки
         * @param {number} lon1 - Долгота первой точки
         * @param {number} lat2 - Широта второй точки
         * @param {number} lon2 - Долгота второй точки
         * @param {number} fraction - Доля расстояния (0-1)
         * @returns {Array} Координаты промежуточной точки [lon, lat]
         */
        calculateIntermediatePoint: function(lat1, lon1, lat2, lon2, fraction) {
            const φ1 = this.degreesToRadians(lat1);
            const λ1 = this.degreesToRadians(lon1);
            const φ2 = this.degreesToRadians(lat2);
            const λ2 = this.degreesToRadians(lon2);
            
            const sinφ1 = Math.sin(φ1);
            const cosφ1 = Math.cos(φ1);
            const sinφ2 = Math.sin(φ2);
            const cosφ2 = Math.cos(φ2);
            
            // Векторное представление точек
            const x1 = cosφ1 * Math.cos(λ1);
            const y1 = cosφ1 * Math.sin(λ1);
            const z1 = sinφ1;
            
            const x2 = cosφ2 * Math.cos(λ2);
            const y2 = cosφ2 * Math.sin(λ2);
            const z2 = sinφ2;
            
            // Линейная интерполяция в 3D
            const x = x1 + fraction * (x2 - x1);
            const y = y1 + fraction * (y2 - y1);
            const z = z1 + fraction * (z2 - z1);
            
            // Нормализация
            const norm = Math.sqrt(x*x + y*y + z*z);
            const xN = x / norm;
            const yN = y / norm;
            const zN = z / norm;
            
            // Обратное преобразование в координаты
            const lat = this.radiansToDegrees(Math.atan2(zN, Math.sqrt(xN*xN + yN*yN)));
            const lon = this.radiansToDegrees(Math.atan2(yN, xN));
            
            return [lon, lat];
        },
        
        /**
         * Создание копии объекта (глубокое копирование)
         * @param {*} obj - Объект для копирования
         * @returns {*} Копия объекта
         */
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (obj instanceof Object) {
                const clonedObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        clonedObj[key] = this.deepClone(obj[key]);
                    }
                }
                return clonedObj;
            }
            
            return obj;
        },
        
        /**
         * Проверка, пустой ли объект
         * @param {Object} obj - Объект для проверки
         * @returns {boolean} true, если объект пустой
         */
        isEmptyObject: function(obj) {
            return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
        },
        
        /**
         * Объединение объектов (аналог Object.assign)
         * @param {...Object} objects - Объекты для объединения
         * @returns {Object} Объединенный объект
         */
        mergeObjects: function(...objects) {
            return Object.assign({}, ...objects);
        },
        
        /**
         * Генерация случайного целого числа в диапазоне
         * @param {number} min - Минимальное значение
         * @param {number} max - Максимальное значение
         * @returns {number} Случайное целое число
         */
        randomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        
        /**
         * Генерация случайного числа с плавающей точкой в диапазоне
         * @param {number} min - Минимальное значение
         * @param {number} max - Максимальное значение
         * @param {number} decimals - Количество знаков после запятой
         * @returns {number} Случайное число
         */
        randomFloat: function(min, max, decimals = 2) {
            const multiplier = Math.pow(10, decimals);
            return Math.round((Math.random() * (max - min) + min) * multiplier) / multiplier;
        },
        
        /**
         * Форматирование числа с разделителями тысяч
         * @param {number} number - Число для форматирования
         * @returns {string} Отформатированная строка
         */
        formatNumber: function(number) {
            if (typeof number !== 'number' || isNaN(number)) return number;
            
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        },
        
        /**
         * Преобразование строки в безопасный идентификатор
         * @param {string} str - Строка для преобразования
         * @returns {string} Безопасный идентификатор
         */
        toSafeId: function(str) {
            return str
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
        },
        
        /**
         * Проверка поддержки браузером
         * @returns {Object} Объект с результатами проверки
         */
        checkBrowserSupport: function() {
            return {
                localStorage: typeof localStorage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                fetch: typeof fetch !== 'undefined',
                promises: typeof Promise !== 'undefined',
                asyncAwait: typeof Symbol !== 'undefined' && Symbol.asyncIterator,
                geolocation: typeof navigator !== 'undefined' && !!navigator.geolocation,
                canvas: typeof document !== 'undefined' && !!document.createElement('canvas').getContext
            };
        },
        
        /**
         * Получение параметров из URL
         * @returns {Object} Объект с параметрами
         */
        getUrlParams: function() {
            const params = {};
            const queryString = window.location.search.substring(1);
            const queries = queryString.split('&');
            
            queries.forEach(query => {
                const [key, value] = query.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            });
            
            return params;
        },
        
        /**
         * Установка параметров в URL
         * @param {Object} params - Объект с параметрами
         */
        setUrlParams: function(params) {
            const url = new URL(window.location);
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.set(key, params[key]);
                } else {
                    url.searchParams.delete(key);
                }
            });
            window.history.pushState({}, '', url);
        },
        
        /**
         * Скачивание данных в виде файла
         * @param {string} data - Данные для скачивания
         * @param {string} filename - Имя файла
         * @param {string} type - MIME тип файла
         */
        downloadFile: function(data, filename, type = 'text/plain') {
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        /**
         * Копирование текста в буфер обмена
         * @param {string} text - Текст для копирования
         * @returns {Promise<boolean>} true, если копирование успешно
         */
        copyToClipboard: async function(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Ошибка копирования в буфер обмена:', err);
                return false;
            }
        }
    };
    
    console.log('✅ Вспомогательные функции загружены');
})();