/**
 * Процессор метеоданных
 * Преобразует сырые данные от API в удобный для анализа формат
 */
class WeatherDataProcessor {
    constructor() {
        this.windDirections = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        this.weatherCodeDescriptions = this.initWeatherCodeDescriptions();
    }

    /**
     * Инициализация описаний погодных кодов WMO
     */
    initWeatherCodeDescriptions() {
        return {
            0: 'Ясно',
            1: 'Преимущественно ясно',
            2: 'Переменная облачность',
            3: 'Пасмурно',
            45: 'Туман',
            48: 'Отлагающийся туман',
            51: 'Морось: слабая',
            53: 'Морось: умеренная',
            55: 'Морось: густая',
            56: 'Морозная морось: слабая',
            57: 'Морозная морось: густая',
            61: 'Дождь: слабый',
            63: 'Дождь: умеренный',
            65: 'Дождь: сильный',
            66: 'Ледяной дождь: слабый',
            67: 'Ледяной дождь: сильный',
            71: 'Снег: слабый',
            73: 'Снег: умеренный',
            75: 'Снег: сильный',
            77: 'Снежная крупа',
            80: 'Ливневый дождь: слабый',
            81: 'Ливневый дождь: умеренный',
            82: 'Ливневый дождь: сильный',
            85: 'Ливневый снег: слабый',
            86: 'Ливневый снег: сильный',
            95: 'Гроза',
            96: 'Гроза с градом',
            99: 'Гроза с сильным градом'
        };
    }

    /**
     * Обработка сырых данных от API
     * @param {Object} rawData - Сырые данные от Open-Meteo
     * @param {number} lat - Широта точки
     * @param {number} lon - Долгота точки
     * @param {string} date - Дата анализа
     * @returns {Object} Обработанные данные
     */
    processWeatherData(rawData, lat, lon, date) {
        const hourly = this.processHourlyData(rawData.hourly);
        const daily = this.processDailyData(rawData.daily);
        const summary = this.generateSummary(hourly, daily);
        
        return {
            metadata: {
                lat: lat.toFixed(4),
                lon: lon.toFixed(4),
                date: date,
                source: 'open-meteo',
                processedAt: new Date().toISOString(),
                apiVersion: rawData?.generationtime_ms ? 'v1' : 'unknown'
            },
            hourly: hourly,
            daily: daily,
            summary: summary,
            alerts: this.generateAlerts(hourly, daily)
        };
    }

    /**
     * Обработка почасовых данных
     */
    processHourlyData(hourlyData) {
        return hourlyData.time.map((time, index) => {
            const hour = new Date(time).getUTCHours();
            const timeString = `${hour.toString().padStart(2, '0')}:00`;
            
            // Базовые метеопараметры
            const temperature = this.safeGet(hourlyData.temperature_2m, index);
            const dewpoint = this.safeGet(hourlyData.dewpoint_2m, index);
            const humidity = this.safeGet(hourlyData.relative_humidity_2m, index);
            const pressure = this.safeGet(hourlyData.pressure_msl, index);
            const visibility = this.safeGet(hourlyData.visibility, index) / 1000; // в км
            const cloudcover = this.safeGet(hourlyData.cloudcover, index);
            const cloudcoverLow = this.safeGet(hourlyData.cloudcover_low, index);
            const cloudcoverMid = this.safeGet(hourlyData.cloudcover_mid, index);
            const cloudcoverHigh = this.safeGet(hourlyData.cloudcover_high, index);
            
            // Ветровой профиль
            const windSpeed10m = this.safeGet(hourlyData.windspeed_10m, index);
            const windSpeed80m = this.safeGet(hourlyData.windspeed_80m, index);
            const windSpeed120m = this.safeGet(hourlyData.windspeed_120m, index);
            const windDir10m = this.safeGet(hourlyData.winddirection_10m, index);
            const windDir80m = this.safeGet(hourlyData.winddirection_80m, index);
            const windDir120m = this.safeGet(hourlyData.winddirection_120m, index);
            const windGusts = this.safeGet(hourlyData.windgusts_10m, index);
            
            // Осадки и явления
            const precipitation = this.safeGet(hourlyData.precipitation, index);
            const rain = this.safeGet(hourlyData.rain, index);
            const snowfall = this.safeGet(hourlyData.snowfall, index);
            const showers = this.safeGet(hourlyData.showers, index);
            const weathercode = this.safeGet(hourlyData.weathercode, index);
            const cape = this.safeGet(hourlyData.cape, index);
            const freezingLevel = this.safeGet(hourlyData.freezinglevel_height, index);
            const radiation = this.safeGet(hourlyData.shortwave_radiation, index);
            const uvIndex = this.safeGet(hourlyData.uv_index, index);
            
            // Расчет производных параметров
            const windShear = this.calculateWindShear(
                windSpeed10m, windSpeed120m,
                windDir10m, windDir120m
            );
            
            const icingRisk = this.calculateIcingRisk(
                temperature, dewpoint, humidity, precipitation
            );
            
            const visibilityStatus = this.calculateVisibilityStatus(visibility);
            
            const safetyStatus = this.calculateHourSafetyStatus({
                temperature, dewpoint, humidity, precipitation,
                windGusts, visibility, cape, icingRisk, windShear
            });
            
            return {
                hour: hour,
                time: timeString,
                timestamp: time,
                
                // Температура и влажность
                temperature: this.round(temperature, 1),
                dewpoint: this.round(dewpoint, 1),
                humidity: this.round(humidity, 0),
                pressure: this.round(pressure, 1),
                
                // Видимость и облачность
                visibility: this.round(visibility, 1),
                cloudcover: this.round(cloudcover, 0),
                cloudcoverLow: this.round(cloudcoverLow, 0),
                cloudcoverMid: this.round(cloudcoverMid, 0),
                cloudcoverHigh: this.round(cloudcoverHigh, 0),
                
                // Ветровой профиль
                windSpeed10m: this.round(windSpeed10m, 1),
                windSpeed80m: this.round(windSpeed80m, 1),
                windSpeed120m: this.round(windSpeed120m, 1),
                windDir10m: this.round(windDir10m, 0),
                windDir80m: this.round(windDir80m, 0),
                windDir120m: this.round(windDir120m, 0),
                windGusts: this.round(windGusts, 1),
                windDir10mText: this.getWindDirection(windDir10m),
                windDir80mText: this.getWindDirection(windDir80m),
                windDir120mText: this.getWindDirection(windDir120m),
                
                // Осадки и явления
                precipitation: this.round(precipitation, 1),
                rain: this.round(rain, 1),
                snowfall: this.round(snowfall, 1),
                showers: this.round(showers, 1),
                weathercode: weathercode,
                weatherDescription: this.getWeatherDescription(weathercode),
                cape: this.round(cape, 0),
                freezingLevel: this.round(freezingLevel, 0),
                radiation: this.round(radiation, 1),
                uvIndex: this.round(uvIndex, 1),
                
                // Производные параметры
                windShear: windShear,
                icingRisk: icingRisk,
                visibilityStatus: visibilityStatus,
                safetyStatus: safetyStatus
            };
        });
    }

    /**
     * Обработка ежедневных данных
     */
    processDailyData(dailyData) {
        return {
            sunrise: this.parseTime(dailyData.sunrise[0]),
            sunset: this.parseTime(dailyData.sunset[0]),
            precipitationSum: this.round(dailyData.precipitation_sum[0], 1),
            rainSum: this.round(dailyData.rain_sum[0], 1),
            snowfallSum: this.round(dailyData.snowfall_sum[0], 1),
            maxWindSpeed: this.round(dailyData.windspeed_10m_max[0], 1),
            maxWindGusts: this.round(dailyData.windgusts_10m_max[0], 1),
            maxTemperature: this.round(dailyData.temperature_2m_max[0], 1),
            minTemperature: this.round(dailyData.temperature_2m_min[0], 1),
            maxUvIndex: this.round(dailyData.uv_index_max[0], 1)
        };
    }

    /**
     * Генерация сводки по данным
     */
    generateSummary(hourly, daily) {
        // Расчет статистики по часам
        const temperatures = hourly.map(h => h.temperature);
        const windGusts = hourly.map(h => h.windGusts);
        const visibilities = hourly.map(h => h.visibility);
        const precipitations = hourly.map(h => h.precipitation);
        const capeValues = hourly.map(h => h.cape);
        
        // Поиск опасных периодов
        const dangerousHours = hourly.filter(h => 
            h.safetyStatus.level >= 2 || 
            h.icingRisk.level >= 2 || 
            h.windGusts > 12
        );
        
        // Расчет окна безопасности
        const safeHours = hourly.filter(h => h.safetyStatus.level === 0);
        const safetyWindow = safeHours.length > 0 
            ? `${safeHours[0].time}-${safeHours[safeHours.length - 1].time}`
            : null;
        
        // Расчет продолжительности светлого времени
        const sunriseHour = parseInt(daily.sunrise.split(':')[0]);
        const sunsetHour = parseInt(daily.sunset.split(':')[0]);
        const daylightHours = sunsetHour - sunriseHour;
        const daylightMinutes = Math.round((sunsetHour - sunriseHour - daylightHours) * 60);
        
        return {
            // Температурные показатели
            avgTemperature: this.round(temperatures.reduce((a, b) => a + b, 0) / temperatures.length, 1),
            minTemperature: Math.min(...temperatures),
            maxTemperature: Math.max(...temperatures),
            
            // Ветровые показатели
            avgWindGusts: this.round(windGusts.reduce((a, b) => a + b, 0) / windGusts.length, 1),
            maxWindGusts: Math.max(...windGusts),
            
            // Показатели видимости
            avgVisibility: this.round(visibilities.reduce((a, b) => a + b, 0) / visibilities.length, 1),
            minVisibility: Math.min(...visibilities),
            
            // Осадки
            totalPrecipitation: this.round(precipitations.reduce((a, b) => a + b, 0), 1),
            maxPrecipitation: Math.max(...precipitations),
            
            // Грозовая активность
            maxCape: Math.max(...capeValues),
            avgCape: this.round(capeValues.reduce((a, b) => a + b, 0) / capeValues.length, 0),
            
            // Временные параметры
            sunrise: daily.sunrise,
            sunset: daily.sunset,
            daylightDuration: `${daylightHours}ч ${daylightMinutes}м`,
            safetyWindow: safetyWindow,
            
            // Статистика опасных периодов
            dangerousHoursCount: dangerousHours.length,
            dangerousPeriods: dangerousHours.map(h => h.time),
            
            // Общая оценка безопасности
            overallSafety: this.calculateOverallSafety(hourly)
        };
    }

    /**
     * Генерация предупреждений
     */
    generateAlerts(hourly, daily) {
        const alerts = [];
        
        // Проверка сильного ветра
        const highWindHours = hourly.filter(h => h.windGusts > 15);
        if (highWindHours.length > 0) {
            alerts.push({
                type: 'wind',
                level: 'danger',
                title: 'Сильный ветер',
                message: `Порывы ветра до ${Math.max(...highWindHours.map(h => h.windGusts))} м/с в период ${highWindHours[0].time}-${highWindHours[highWindHours.length - 1].time}`,
                hours: highWindHours.map(h => h.hour)
            });
        }
        
        // Проверка риска обледенения
        const highIcingHours = hourly.filter(h => h.icingRisk.level >= 2);
        if (highIcingHours.length > 2) {
            alerts.push({
                type: 'icing',
                level: 'warning',
                title: 'Риск обледенения',
                message: `Повышенный риск обледенения в период ${highIcingHours[0].time}-${highIcingHours[highIcingHours.length - 1].time}`,
                hours: highIcingHours.map(h => h.hour)
            });
        }
        
        // Проверка низкой видимости
        const lowVisibilityHours = hourly.filter(h => h.visibility < 2);
        if (lowVisibilityHours.length > 0) {
            alerts.push({
                type: 'visibility',
                level: 'warning',
                title: 'Низкая видимость',
                message: `Видимость менее 2 км в период ${lowVisibilityHours[0].time}-${lowVisibilityHours[lowVisibilityHours.length - 1].time}`,
                hours: lowVisibilityHours.map(h => h.hour)
            });
        }
        
        // Проверка грозовой активности
        const highCapeHours = hourly.filter(h => h.cape > 1500);
        if (highCapeHours.length > 0) {
            alerts.push({
                type: 'thunderstorm',
                level: 'warning',
                title: 'Грозовая активность',
                message: `Повышенная грозовая активность (CAPE до ${Math.max(...highCapeHours.map(h => h.cape))} J/kg)`,
                hours: highCapeHours.map(h => h.hour)
            });
        }
        
        // Проверка интенсивных осадков
        const heavyPrecipHours = hourly.filter(h => h.precipitation > 5);
        if (heavyPrecipHours.length > 0) {
            alerts.push({
                type: 'precipitation',
                level: 'warning',
                title: 'Интенсивные осадки',
                message: `Интенсивные осадки до ${Math.max(...heavyPrecipHours.map(h => h.precipitation))} мм/ч`,
                hours: heavyPrecipHours.map(h => h.hour)
            });
        }
        
        return alerts;
    }

    // Вспомогательные методы расчета

    /**
     * Расчет ветрового сдвига
     */
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
            speedDiff: this.round(speedDiff, 1),
            dirDiff: this.round(dirDiff, 0),
            directionChange: dirDiff > 20
        };
    }

    /**
     * Расчет риска обледенения
     */
    calculateIcingRisk(temp, dewpoint, humidity, precipitation) {
        if (temp >= 0 && temp <= 5 && humidity > 85 && precipitation > 0.5) {
            return { level: 3, text: 'Высокий', conditions: 'Температура 0..+5°C, влажность >85%, осадки' };
        } else if (temp >= -2 && temp <= 7 && humidity > 80 && precipitation > 0.2) {
            return { level: 2, text: 'Умеренный', conditions: 'Температура -2..+7°C, влажность >80%, осадки' };
        } else if (temp >= -5 && temp <= 10 && humidity > 75 && precipitation > 0.1) {
            return { level: 1, text: 'Низкий', conditions: 'Температура -5..+10°C, влажность >75%' };
        }
        return { level: 0, text: 'Нет', conditions: 'Безопасные условия' };
    }

    /**
     * Расчет статуса видимости
     */
    calculateVisibilityStatus(visibility) {
        if (visibility < 1) return { level: 4, text: 'Очень плохая', color: 'danger' };
        if (visibility < 3) return { level: 3, text: 'Плохая', color: 'warning' };
        if (visibility < 5) return { level: 2, text: 'Умеренная', color: 'caution' };
        if (visibility < 10) return { level: 1, text: 'Хорошая', color: 'good' };
        return { level: 0, text: 'Отличная', color: 'excellent' };
    }

    /**
     * Расчет статуса безопасности для часа
     */
    calculateHourSafetyStatus(params) {
        const { windGusts, visibility, cape, icingRisk, windShear } = params;
        
        // Проверка критических условий
        if (icingRisk.level >= 3 || windShear.level >= 3 || cape > 2000) {
            return { level: 3, text: 'Запрещено', color: 'danger' };
        }
        
        // Проверка условий с ограничениями
        if (icingRisk.level >= 2 || 
            windShear.level >= 2 || 
            windGusts > 12 || 
            visibility < 3 ||
            cape > 1500) {
            return { level: 2, text: 'Ограничения', color: 'warning' };
        }
        
        // Проверка осторожных условий
        if (windGusts > 8 || visibility < 5 || cape > 1000) {
            return { level: 1, text: 'Осторожно', color: 'caution' };
        }
        
        return { level: 0, text: 'Безопасно', color: 'safe' };
    }

    /**
     * Расчет общего уровня безопасности
     */
    calculateOverallSafety(hourlyData) {
        const dangerHours = hourlyData.filter(h => h.safetyStatus.level >= 2).length;
        const cautionHours = hourlyData.filter(h => h.safetyStatus.level === 1).length;
        const totalHours = hourlyData.length;
        
        // Расчет рейтинга безопасности
        let rating = 100;
        rating -= dangerHours * 5;
        rating -= cautionHours * 2;
        rating = Math.max(0, Math.min(100, rating));
        
        // Определение текстового статуса
        let statusText = 'Благоприятные условия';
        let statusLevel = 0;
        
        if (dangerHours > 8) {
            statusText = 'Опасные условия';
            statusLevel = 3;
        } else if (dangerHours > 4) {
            statusText = 'Условно безопасно';
            statusLevel = 2;
        } else if (cautionHours > 6) {
            statusText = 'Благоприятно с ограничениями';
            statusLevel = 1;
        }
        
        return {
            level: statusLevel,
            text: statusText,
            rating: rating,
            dangerHours: dangerHours,
            cautionHours: cautionHours,
            safeHours: totalHours - dangerHours - cautionHours,
            safetyPercentage: Math.round(((totalHours - dangerHours) / totalHours) * 100)
        };
    }

    // Вспомогательные методы

    /**
     * Безопасное получение значения из массива
     */
    safeGet(array, index, defaultValue = 0) {
        return array && array[index] !== undefined ? array[index] : defaultValue;
    }

    /**
     * Округление числа
     */
    round(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Получение направления ветра
     */
    getWindDirection(degrees) {
        if (degrees === undefined || degrees === null) return 'Н/Д';
        const index = Math.round(degrees / 45) % 8;
        return this.windDirections[index];
    }

    /**
     * Получение описания погоды по коду
     */
    getWeatherDescription(code) {
        return this.weatherCodeDescriptions[code] || 'Неизвестно';
    }

    /**
     * Парсинг времени из строки
     */
    parseTime(timeString) {
        if (!timeString) return '00:00';
        const parts = timeString.split('T');
        return parts[1] ? parts[1].substring(0, 5) : '00:00';
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherDataProcessor;
} else {
    window.WeatherDataProcessor = WeatherDataProcessor;
}