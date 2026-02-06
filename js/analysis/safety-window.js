/**
 * Модуль расчета окна безопасности полета
 * Определяет оптимальные временные интервалы для полета
 */
class SafetyWindowCalculator {
    constructor() {
        this.cruiseSpeed = 69; // км/ч - крейсерская скорость БВС
        this.minSafeAltitude = 200; // м - минимальная безопасная высота
        this.maxSafeAltitude = 800; // м - максимальная безопасная высота
    }

    /**
     * Расчет окна безопасности для маршрута
     * @param {number} routeLength - Длина маршрута в км
     * @param {Object} weatherData - Метеоданные
     * @param {Object} routeParams - Параметры маршрута
     * @returns {Object} Окно безопасности
     */
    calculateSafetyWindow(routeLength, weatherData, routeParams = {}) {
        const {
            maxWindSpeed = 15,
            minVisibility = 3,
            maxIcingRisk = 2,
            maxCape = 1500,
            requireDaylight = true
        } = routeParams;
        
        const hourly = weatherData.hourly;
        const daily = weatherData.daily;
        
        // Расчет светлого времени (восход +45 мин, закат -45 мин)
        const daylightStart = this.parseHour(daily.sunrise) + 0.75;
        const daylightEnd = this.parseHour(daily.sunset) - 0.75;
        const daylightDuration = daylightEnd - daylightStart;
        
        // Фильтрация безопасных часов
        const safeHours = hourly.filter(hour => {
            // Проверка светлого времени
            if (requireDaylight) {
                const hourFloat = hour.hour + hour.minute / 60;
                if (hourFloat < daylightStart || hourFloat > daylightEnd) {
                    return false;
                }
            }
            
            // Проверка метеоусловий
            return (
                hour.windGusts <= maxWindSpeed &&
                hour.visibility >= minVisibility &&
                hour.icingRisk.level <= maxIcingRisk &&
                hour.cape <= maxCape &&
                hour.safetyStatus.level < 2
            );
        });
        
        if (safeHours.length === 0) {
            return this.createNoSafeWindowResult(daylightStart, daylightEnd, daylightDuration);
        }
        
        // Группировка в непрерывные периоды
        const safePeriods = this.groupHoursIntoPeriods(safeHours);
        
        // Расчет временных параметров полета
        const flightTimes = this.calculateFlightTimes(routeLength, safeHours);
        
        // Определение оптимального времени старта
        const optimalStart = this.calculateOptimalStartTime(
            safePeriods, 
            flightTimes.minFlightTime, 
            flightTimes.maxFlightTime
        );
        
        // Учет термической активности
        const thermalAdjustment = this.calculateThermalAdjustment(
            optimalStart, 
            daylightStart, 
            daylightEnd,
            weatherData
        );
        
        // Формирование результата
        return {
            // Временные параметры
            daylightStart: this.formatHour(daylightStart),
            daylightEnd: this.formatHour(daylightEnd),
            daylightDuration: this.round(daylightDuration, 2),
            
            // Параметры полета
            minFlightTime: this.round(flightTimes.minFlightTime, 0),
            maxFlightTime: this.round(flightTimes.maxFlightTime, 0),
            avgFlightTime: this.round(flightTimes.avgFlightTime, 0),
            
            // Окна безопасности
            safePeriods: safePeriods,
            optimalStartTime: this.formatHour(optimalStart),
            adjustedStartTime: this.formatHour(thermalAdjustment.adjustedTime),
            thermalAdjusted: thermalAdjustment.adjusted,
            
            // Статусы и предупреждения
            fitsInDaylight: flightTimes.maxFlightTime <= daylightDuration * 60,
            thermalRisk: thermalAdjustment.risk,
            windowStatus: this.calculateWindowStatus(
                safePeriods, 
                flightTimes, 
                daylightDuration,
                thermalAdjustment
            ),
            
            // Дополнительная информация
            totalSafeHours: safeHours.length,
            maxContinuousPeriod: Math.max(...safePeriods.map(p => p.duration)),
            routeLength: routeLength,
            cruiseSpeed: this.cruiseSpeed
        };
    }

    /**
     * Расчет времени полета
     */
    calculateFlightTimes(routeLength, safeHours) {
        // Расчет скорости ветра для безопасных часов
        const avgTailwind = safeHours.reduce((sum, h) => sum + Math.max(0, h.windSpeed120m * 0.8), 0) / safeHours.length;
        const avgHeadwind = safeHours.reduce((sum, h) => sum + Math.max(0, h.windSpeed120m * 0.8), 0) / safeHours.length;
        
        // Минимальное время (попутный ветер)
        const minSpeed = this.cruiseSpeed + avgTailwind;
        const minFlightTime = (routeLength / minSpeed) * 60;
        
        // Максимальное время (встречный ветер)
        const maxSpeed = Math.max(this.cruiseSpeed - avgHeadwind, 30); // Минимум 30 км/ч
        const maxFlightTime = (routeLength / maxSpeed) * 60;
        
        // Среднее время
        const avgFlightTime = (minFlightTime + maxFlightTime) / 2;
        
        return {
            minFlightTime: minFlightTime,
            maxFlightTime: maxFlightTime,
            avgFlightTime: avgFlightTime
        };
    }

    /**
     * Группировка часов в периоды
     */
    groupHoursIntoPeriods(hours) {
        if (hours.length === 0) return [];
        
        const periods = [];
        let currentPeriod = { 
            start: hours[0].hour, 
            end: hours[0].hour, 
            hours: [hours[0]] 
        };
        
        for (let i = 1; i < hours.length; i++) {
            if (hours[i].hour === currentPeriod.end + 1) {
                currentPeriod.end = hours[i].hour;
                currentPeriod.hours.push(hours[i]);
            } else {
                periods.push(this.formatPeriod(currentPeriod));
                currentPeriod = { 
                    start: hours[i].hour, 
                    end: hours[i].hour, 
                    hours: [hours[i]] 
                };
            }
        }
        periods.push(this.formatPeriod(currentPeriod));
        
        return periods;
    }

    /**
     * Форматирование периода
     */
    formatPeriod(period) {
        return {
            start: this.formatHour(period.start),
            end: this.formatHour(period.end),
            duration: period.end - period.start + 1,
            hours: period.hours.map(h => h.hour)
        };
    }

    /**
     * Расчет оптимального времени старта
     */
    calculateOptimalStartTime(periods, minFlightTime, maxFlightTime) {
        if (periods.length === 0) return 12; // Полдень по умолчанию
        
        // Выбор самого длинного периода
        const longestPeriod = periods.reduce((max, p) => 
            p.duration > max.duration ? p : max
        );
        
        // Расчет середины периода с учетом времени полета
        const periodStart = this.parseHour(longestPeriod.start);
        const periodEnd = this.parseHour(longestPeriod.end) + 1; // Включая последний час
        const periodDuration = periodEnd - periodStart;
        
        // Оптимальное время - середина периода с запасом на полет
        const buffer = Math.max(maxFlightTime / 60, 1); // Минимум 1 час запаса
        const optimalTime = periodStart + (periodDuration - buffer) / 2;
        
        return Math.min(Math.max(optimalTime, periodStart), periodEnd - buffer);
    }

    /**
     * Учет термической активности
     */
    calculateThermalAdjustment(optimalTime, daylightStart, daylightEnd, weatherData) {
        // Термическая активность: восход + 2 часа до восход + 5 часов
        const thermalStart = this.parseHour(weatherData.daily.sunrise) + 2;
        const thermalEnd = thermalStart + 3;
        
        const inThermalWindow = optimalTime >= thermalStart && optimalTime <= thermalEnd;
        const hasStrongWinds = weatherData.hourly.some(h => 
            h.hour >= thermalStart && h.hour <= thermalEnd && h.windGusts > 8
        );
        
        let adjustedTime = optimalTime;
        let adjusted = false;
        let risk = 'none';
        
        if (inThermalWindow && hasStrongWinds) {
            risk = 'thermal_turbulence';
            
            // Предложение альтернативного времени
            if (daylightStart + 1 < thermalStart) {
                // Раньше термического окна
                adjustedTime = thermalStart - 0.5;
                adjusted = true;
            } else if (thermalEnd + 1 < daylightEnd) {
                // Позже термического окна
                adjustedTime = thermalEnd + 0.5;
                adjusted = true;
            }
        }
        
        return {
            adjustedTime: adjustedTime,
            adjusted: adjusted,
            risk: risk,
            thermalWindow: {
                start: this.formatHour(thermalStart),
                end: this.formatHour(thermalEnd)
            }
        };
    }

    /**
     * Расчет статуса окна
     */
    calculateWindowStatus(periods, flightTimes, daylightDuration, thermalAdjustment) {
        const maxFlightTimeHours = flightTimes.maxFlightTime / 60;
        
        // Проверка вместимости в светлое время
        if (maxFlightTimeHours > daylightDuration * 0.95) {
            return {
                level: 'critical',
                text: 'МАРШРУТ НЕ ПОМЕЩАЕТСЯ В СВЕТЛОЕ ВРЕМЯ',
                color: 'danger'
            };
        }
        
        if (maxFlightTimeHours > daylightDuration * 0.8) {
            return {
                level: 'warning',
                text: 'МАРШРУТ ЗАНИМАЕТ БОЛЕЕ 80% СВЕТЛОГО ВРЕМЕНИ',
                color: 'warning'
            };
        }
        
        // Проверка термической активности
        if (thermalAdjustment.risk === 'thermal_turbulence') {
            return {
                level: 'warning',
                text: 'ПОВЫШЕННЫЙ РИСК ТЕРМИЧЕСКОЙ ТУРБУЛЕНТНОСТИ',
                color: 'warning'
            };
        }
        
        // Проверка достаточности безопасных периодов
        const totalSafeDuration = periods.reduce((sum, p) => sum + p.duration, 0);
        if (totalSafeDuration < 3) {
            return {
                level: 'warning',
                text: 'НЕДОСТАТОЧНО БЕЗОПАСНЫХ ПЕРИОДОВ ДЛЯ ПОЛЕТА',
                color: 'warning'
            };
        }
        
        return {
            level: 'optimal',
            text: 'ОКНО БЕЗОПАСНОСТИ ОПТИМАЛЬНОЕ',
            color: 'success'
        };
    }

    /**
     * Создание результата при отсутствии безопасного окна
     */
    createNoSafeWindowResult(daylightStart, daylightEnd, daylightDuration) {
        return {
            daylightStart: this.formatHour(daylightStart),
            daylightEnd: this.formatHour(daylightEnd),
            daylightDuration: this.round(daylightDuration, 2),
            minFlightTime: 0,
            maxFlightTime: 0,
            avgFlightTime: 0,
            safePeriods: [],
            optimalStartTime: null,
            adjustedStartTime: null,
            thermalAdjusted: false,
            fitsInDaylight: false,
            thermalRisk: 'none',
            windowStatus: {
                level: 'critical',
                text: 'НЕТ БЕЗОПАСНЫХ ПЕРИОДОВ ДЛЯ ПОЛЕТА',
                color: 'danger'
            },
            totalSafeHours: 0,
            maxContinuousPeriod: 0,
            routeLength: 0,
            cruiseSpeed: this.cruiseSpeed
        };
    }

    // Вспомогательные методы

    /**
     * Парсинг часа из строки
     */
    parseHour(timeString) {
        if (typeof timeString === 'number') return timeString;
        const parts = timeString.split(':');
        return parseInt(parts[0]) + (parseInt(parts[1] || 0) / 60);
    }

    /**
     * Форматирование часа в строку
     */
    formatHour(hour) {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    /**
     * Округление числа
     */
    round(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Генерация рекомендаций на основе окна безопасности
     */
    generateRecommendations(safetyWindow) {
        const recommendations = [];
        
        if (safetyWindow.windowStatus.level === 'critical') {
            recommendations.push('ПОЛЕТ ЗАПРЕЩЕН: нет безопасных периодов для полета');
            recommendations.push('Рекомендуется перенести полет на другой день');
            return recommendations;
        }
        
        if (safetyWindow.thermalRisk === 'thermal_turbulence') {
            recommendations.push(`Избегать полетов в период термической активности: ${safetyWindow.thermalWindow.start}-${safetyWindow.thermalWindow.end}`);
            if (safetyWindow.thermalAdjusted) {
                recommendations.push(`Рекомендуемое время старта: ${safetyWindow.adjustedStartTime}`);
            }
        }
        
        recommendations.push(`Оптимальное время старта: ${safetyWindow.optimalStartTime}`);
        recommendations.push(`Ожидаемая продолжительность полета: ${safetyWindow.minFlightTime}-${safetyWindow.maxFlightTime} минут`);
        
        if (!safetyWindow.fitsInDaylight) {
            recommendations.push('ВНИМАНИЕ: маршрут не помещается в светлое время суток');
            recommendations.push('Рассмотрите сокращение маршрута или перенос на период с большим световым днем');
        }
        
        // Рекомендации по запасу времени
        const safeBuffer = safetyWindow.maxContinuousPeriod - safetyWindow.maxFlightTime / 60;
        if (safeBuffer < 1) {
            recommendations.push('Минимальный запас времени - планируйте полет точно по расписанию');
        } else if (safeBuffer < 2) {
            recommendations.push('Рекомендуется иметь запас времени 1-2 часа на непредвиденные ситуации');
        }
        
        return recommendations;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafetyWindowCalculator;
} else {
    window.SafetyWindowCalculator = SafetyWindowCalculator;
}