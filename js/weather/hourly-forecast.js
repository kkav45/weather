/**
 * Модуль почасового прогноза
 * Предоставляет методы для анализа и визуализации почасовых данных
 */
class HourlyForecast {
    constructor(dataProcessor) {
        this.dataProcessor = dataProcessor || new WeatherDataProcessor();
        this.currentForecast = null;
    }

    /**
     * Загрузка и обработка почасового прогноза
     * @param {Object} rawData - Сырые данные от API
     * @returns {Object} Обработанный прогноз
     */
    loadForecast(rawData, lat, lon, date) {
        this.currentForecast = this.dataProcessor.processWeatherData(rawData, lat, lon, date);
        return this.currentForecast;
    }

    /**
     * Получение данных для конкретного часа
     * @param {number} hour - Час (0-23)
     * @returns {Object|null} Данные для часа
     */
    getHourData(hour) {
        if (!this.currentForecast) return null;
        return this.currentForecast.hourly.find(h => h.hour === hour) || null;
    }

    /**
     * Получение безопасных периодов для полета
     * @returns {Array} Массив безопасных периодов
     */
    getSafePeriods() {
        if (!this.currentForecast) return [];
        
        const safeHours = this.currentForecast.hourly.filter(h => h.safetyStatus.level === 0);
        if (safeHours.length === 0) return [];
        
        // Группировка последовательных часов в периоды
        const periods = [];
        let currentPeriod = { start: safeHours[0].hour, end: safeHours[0].hour };
        
        for (let i = 1; i < safeHours.length; i++) {
            if (safeHours[i].hour === currentPeriod.end + 1) {
                currentPeriod.end = safeHours[i].hour;
            } else {
                periods.push(currentPeriod);
                currentPeriod = { start: safeHours[i].hour, end: safeHours[i].hour };
            }
        }
        periods.push(currentPeriod);
        
        // Форматирование периодов
        return periods.map(period => ({
            start: `${period.start.toString().padStart(2, '0')}:00`,
            end: `${period.end.toString().padStart(2, '0')}:00`,
            duration: period.end - period.start + 1,
            hours: Array.from({length: period.end - period.start + 1}, (_, i) => period.start + i)
        }));
    }

    /**
     * Получение опасных периодов
     * @returns {Array} Массив опасных периодов
     */
    getDangerousPeriods() {
        if (!this.currentForecast) return [];
        
        const dangerousHours = this.currentForecast.hourly.filter(h => h.safetyStatus.level >= 2);
        if (dangerousHours.length === 0) return [];
        
        // Группировка последовательных часов
        const periods = [];
        let currentPeriod = { 
            start: dangerousHours[0].hour, 
            end: dangerousHours[0].hour,
            reasons: [this.getDangerReasons(dangerousHours[0])]
        };
        
        for (let i = 1; i < dangerousHours.length; i++) {
            const reasons = this.getDangerReasons(dangerousHours[i]);
            const hasCommonReasons = currentPeriod.reasons.some(r => reasons.includes(r));
            
            if (dangerousHours[i].hour === currentPeriod.end + 1 && hasCommonReasons) {
                currentPeriod.end = dangerousHours[i].hour;
                currentPeriod.reasons = [...new Set([...currentPeriod.reasons, ...reasons])];
            } else {
                periods.push(currentPeriod);
                currentPeriod = { 
                    start: dangerousHours[i].hour, 
                    end: dangerousHours[i].hour,
                    reasons: reasons
                };
            }
        }
        periods.push(currentPeriod);
        
        // Форматирование периодов
        return periods.map(period => ({
            start: `${period.start.toString().padStart(2, '0')}:00`,
            end: `${period.end.toString().padStart(2, '0')}:00`,
            duration: period.end - period.start + 1,
            reasons: period.reasons,
            severity: Math.max(...this.currentForecast.hourly
                .filter(h => h.hour >= period.start && h.hour <= period.end)
                .map(h => h.safetyStatus.level))
        }));
    }

    /**
     * Получение причин опасности для часа
     */
    getDangerReasons(hourData) {
        const reasons = [];
        
        if (hourData.icingRisk.level >= 2) reasons.push('риск обледенения');
        if (hourData.windShear.level >= 2) reasons.push('ветровой сдвиг');
        if (hourData.windGusts > 12) reasons.push('сильные порывы ветра');
        if (hourData.visibility < 3) reasons.push('низкая видимость');
        if (hourData.cape > 1500) reasons.push('грозовая активность');
        if (hourData.precipitation > 2) reasons.push('интенсивные осадки');
        
        return reasons;
    }

    /**
     * Получение статистики по периодам суток
     */
    getDailyPeriodsStats() {
        if (!this.currentForecast) return null;
        
        const periods = {
            night: { start: 0, end: 5, hours: [], label: 'Ночь' },
            morning: { start: 6, end: 11, hours: [], label: 'Утро' },
            day: { start: 12, end: 17, hours: [], label: 'День' },
            evening: { start: 18, end: 23, hours: [], label: 'Вечер' }
        };
        
        // Распределение часов по периодам
        this.currentForecast.hourly.forEach(hour => {
            if (hour.hour >= periods.night.start && hour.hour <= periods.night.end) {
                periods.night.hours.push(hour);
            } else if (hour.hour >= periods.morning.start && hour.hour <= periods.morning.end) {
                periods.morning.hours.push(hour);
            } else if (hour.hour >= periods.day.start && hour.hour <= periods.day.end) {
                periods.day.hours.push(hour);
            } else {
                periods.evening.hours.push(hour);
            }
        });
        
        // Расчет статистики для каждого периода
        Object.keys(periods).forEach(key => {
            const period = periods[key];
            if (period.hours.length === 0) return;
            
            period.avgTemperature = this.calculateAvg(period.hours, 'temperature');
            period.maxWindGusts = Math.max(...period.hours.map(h => h.windGusts));
            period.minVisibility = Math.min(...period.hours.map(h => h.visibility));
            period.totalPrecipitation = period.hours.reduce((sum, h) => sum + h.precipitation, 0);
            period.avgCape = this.calculateAvg(period.hours, 'cape');
            
            // Оценка безопасности периода
            const dangerHours = period.hours.filter(h => h.safetyStatus.level >= 2).length;
            period.safetyLevel = dangerHours > period.hours.length / 2 ? 'danger' : 
                               dangerHours > 0 ? 'warning' : 'safe';
            period.dangerHoursCount = dangerHours;
        });
        
        return periods;
    }

    /**
     * Расчет среднего значения
     */
    calculateAvg(hours, property) {
        return this.dataProcessor.round(
            hours.reduce((sum, h) => sum + h[property], 0) / hours.length,
            property.includes('cape') ? 0 : 1
        );
    }

    /**
     * Получение рекомендаций по времени полета
     */
    getFlightTimeRecommendations() {
        const safePeriods = this.getSafePeriods();
        if (safePeriods.length === 0) {
            return {
                recommended: false,
                message: 'В течение суток нет безопасных периодов для полета',
                bestPeriod: null,
                alternative: 'Рассмотрите перенос полета на другой день'
            };
        }
        
        // Выбор лучшего периода (самый длинный)
        const bestPeriod = safePeriods.reduce((max, period) => 
            period.duration > max.duration ? period : max
        );
        
        // Формирование рекомендаций
        let message = `Рекомендуемое время для полета: ${bestPeriod.start}-${bestPeriod.end}`;
        if (bestPeriod.duration < 3) {
            message += '. Период короткий, планируйте полет с запасом времени.';
        }
        
        return {
            recommended: true,
            message: message,
            bestPeriod: bestPeriod,
            allSafePeriods: safePeriods,
            totalSafeHours: safePeriods.reduce((sum, p) => sum + p.duration, 0)
        };
    }

    /**
     * Экспорт данных в CSV
     */
    exportToCSV(filename = 'hourly_forecast') {
        if (!this.currentForecast) return;
        
        const headers = [
            'Время', 'Темп. (°C)', 'Точка росы (°C)', 'Влажность (%)',
            'Ветер 10м (м/с)', 'Ветер 120м (м/с)', 'Порывы (м/с)',
            'Напр. ветра', 'Видимость (км)', 'Облачность (%)',
            'Осадки (мм)', 'CAPE (J/kg)', 'Риск облед.', 'Статус'
        ];
        
        const rows = this.currentForecast.hourly.map(hour => [
            hour.time,
            hour.temperature,
            hour.dewpoint,
            hour.humidity,
            hour.windSpeed10m,
            hour.windSpeed120m,
            hour.windGusts,
            hour.windDir10mText,
            hour.visibility,
            hour.cloudcover,
            hour.precipitation,
            hour.cape,
            hour.icingRisk.text,
            hour.safetyStatus.text
        ]);
        
        // Формирование CSV
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');
        
        // Скачивание файла
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${this.currentForecast.metadata.date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Получение данных для графиков
     */
    getChartData() {
        if (!this.currentForecast) return null;
        
        const hours = this.currentForecast.hourly.map(h => h.time);
        const temperatures = this.currentForecast.hourly.map(h => h.temperature);
        const windGusts = this.currentForecast.hourly.map(h => h.windGusts);
        const visibilities = this.currentForecast.hourly.map(h => h.visibility);
        const precipitations = this.currentForecast.hourly.map(h => h.precipitation);
        const capeValues = this.currentForecast.hourly.map(h => h.cape);
        const icingRiskLevels = this.currentForecast.hourly.map(h => h.icingRisk.level);
        
        return {
            labels: hours,
            datasets: {
                temperature: temperatures,
                windGusts: windGusts,
                visibility: visibilities,
                precipitation: precipitations,
                cape: capeValues,
                icingRisk: icingRiskLevels
            }
        };
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HourlyForecast;
} else {
    window.HourlyForecast = HourlyForecast;
}