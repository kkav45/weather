/**
 * Анализ риска обледенения
 * Оценка условий для образования обледенения на БВС
 */
class IcingRiskAnalyzer {
    constructor() {
        // Пороговые значения для обледенения
        this.icingThresholds = {
            temperature: { min: -10, max: 5 },   // °C
            humidity: 80,                         // %
            precipitation: 0.2,                   // мм/ч
            liquidWaterContent: 0.1               // г/м³ (расчетный)
        };
        
        // Весовые коэффициенты для расчета риска
        this.weights = {
            temperature: 0.4,
            humidity: 0.25,
            precipitation: 0.2,
            cloudType: 0.15
        };
    }

    /**
     * Полный анализ риска обледенения
     * @param {Array} hourlyData - Почасовые метеоданные
     * @param {Object} routeParams - Параметры маршрута
     * @returns {Object} Результаты анализа
     */
    analyzeIcingRisk(hourlyData, routeParams = {}) {
        if (!hourlyData || hourlyData.length === 0) {
            return this.createEmptyAnalysis();
        }

        // Расчет риска для каждого часа
        const hourlyRisk = hourlyData.map(hour => this.calculateHourlyIcingRisk(hour));
        
        // Идентификация критических периодов
        const criticalPeriods = this.identifyCriticalPeriods(hourlyRisk);
        
        // Анализ по периодам суток
        const dailyPeriodsAnalysis = this.analyzeDailyPeriods(hourlyRisk);
        
        // Общая оценка риска
        const overallRisk = this.calculateOverallRisk(hourlyRisk, criticalPeriods);
        
        // Рекомендации
        const recommendations = this.generateRecommendations(overallRisk, criticalPeriods, hourlyData);
        
        return {
            meta: {
                analyzedHours: hourlyData.length,
                thresholds: this.icingThresholds,
                analyzedAt: new Date().toISOString()
            },
            hourlyRisk: hourlyRisk,
            criticalPeriods: criticalPeriods,
            dailyPeriodsAnalysis: dailyPeriodsAnalysis,
            overallRisk: overallRisk,
            recommendations: recommendations,
            summary: this.generateSummary(overallRisk, criticalPeriods)
        };
    }

    /**
     * Расчет риска обледенения для конкретного часа
     */
    calculateHourlyIcingRisk(hourData) {
        const { temperature, dewpoint, humidity, precipitation, cloudcoverLow, freezingLevel } = hourData;
        
        // Проверка базовых условий
        const temperatureInRange = temperature >= this.icingThresholds.temperature.min && 
                                   temperature <= this.icingThresholds.temperature.max;
        
        const highHumidity = humidity >= this.icingThresholds.humidity;
        const precipitationPresent = precipitation >= this.icingThresholds.precipitation;
        
        // Расчет индекса риска (0-100)
        let riskIndex = 0;
        let riskFactors = [];
        
        // Влияние температуры (максимум при 0°C)
        if (temperatureInRange) {
            const tempFactor = 1 - Math.abs(temperature) / 10; // Максимум при 0°C
            riskIndex += tempFactor * 40 * this.weights.temperature;
            riskFactors.push({
                factor: 'temperature',
                value: temperature,
                contribution: tempFactor * 40 * this.weights.temperature,
                description: `Температура ${temperature}°C благоприятна для обледенения`
            });
        }
        
        // Влияние влажности
        if (highHumidity) {
            const humidityFactor = (humidity - 80) / 20; // 0-1 шкала
            riskIndex += humidityFactor * 25 * this.weights.humidity;
            riskFactors.push({
                factor: 'humidity',
                value: humidity,
                contribution: humidityFactor * 25 * this.weights.humidity,
                description: `Высокая влажность ${humidity}% способствует обледенению`
            });
        }
        
        // Влияние осадков
        if (precipitationPresent) {
            const precipFactor = Math.min(precipitation / 2, 1); // Насыщение при 2 мм/ч
            riskIndex += precipFactor * 20 * this.weights.precipitation;
            riskFactors.push({
                factor: 'precipitation',
                value: precipitation,
                contribution: precipFactor * 20 * this.weights.precipitation,
                description: `Осадки ${precipitation} мм/ч увеличивают риск обледенения`
            });
        }
        
        // Влияние низкой облачности
        if (cloudcoverLow > 50 && temperature < 5) {
            const cloudFactor = cloudcoverLow / 100;
            riskIndex += cloudFactor * 15 * this.weights.cloudType;
            riskFactors.push({
                factor: 'cloud_cover',
                value: cloudcoverLow,
                contribution: cloudFactor * 15 * this.weights.cloudType,
                description: `Низкая облачность ${cloudcoverLow}% создает условия для обледенения`
            });
        }
        
        // Проверка уровня замерзания
        if (freezingLevel < 500 && temperature > -5) {
            riskIndex += 10; // Дополнительный риск при низком уровне замерзания
            riskFactors.push({
                factor: 'freezing_level',
                value: freezingLevel,
                contribution: 10,
                description: `Низкий уровень замерзания (${freezingLevel}м) увеличивает риск`
            });
        }
        
        // Определение уровня риска
        let riskLevel = 0;
        let riskText = 'Нет риска';
        let color = 'success';
        
        if (riskIndex >= 70) {
            riskLevel = 3;
            riskText = 'Высокий';
            color = 'danger';
        } else if (riskIndex >= 40) {
            riskLevel = 2;
            riskText = 'Умеренный';
            color = 'warning';
        } else if (riskIndex >= 20) {
            riskLevel = 1;
            riskText = 'Низкий';
            color = 'caution';
        }
        
        // Особые условия для обледенения
        let icingType = 'none';
        let icingDescription = 'Обледенение маловероятно';
        
        if (riskLevel >= 2 && precipitationPresent && temperature > 0 && temperature < 3) {
            icingType = 'clear_ice';
            icingDescription = 'Опасность прозрачного обледенения (гололед)';
        } else if (riskLevel >= 2 && temperature < 0 && cloudcoverLow > 60) {
            icingType = 'rime_ice';
            icingDescription = 'Опасность изморози';
        } else if (riskLevel >= 3 && precipitationPresent && temperature < 0) {
            icingType = 'mixed_ice';
            icingDescription = 'Опасность смешанного обледенения';
        }
        
        return {
            hour: hourData.hour,
            time: hourData.time,
            temperature: temperature,
            dewpoint: dewpoint,
            humidity: humidity,
            precipitation: precipitation,
            cloudcoverLow: cloudcoverLow,
            freezingLevel: freezingLevel,
            riskIndex: this.round(riskIndex, 1),
            riskLevel: riskLevel,
            riskText: riskText,
            riskColor: color,
            riskFactors: riskFactors,
            icingType: icingType,
            icingDescription: icingDescription,
            conditions: this.getConditionsText(temperatureInRange, highHumidity, precipitationPresent)
        };
    }

    /**
     * Получение текста условий
     */
    getConditionsText(tempInRange, highHumidity, precipPresent) {
        const conditions = [];
        if (!tempInRange) conditions.push('температура вне опасного диапазона');
        if (!highHumidity) conditions.push('низкая влажность');
        if (!precipPresent) conditions.push('отсутствие осадков');
        
        if (conditions.length === 0) return 'благоприятные условия для обледенения';
        if (conditions.length === 3) return 'неблагоприятные условия для обледенения';
        
        return `не ${conditions.join(', ')}`;
    }

    /**
     * Идентификация критических периодов
     */
    identifyCriticalPeriods(hourlyRisk) {
        const criticalHours = hourlyRisk.filter(h => h.riskLevel >= 2);
        
        if (criticalHours.length === 0) {
            return {
                periods: [],
                totalCount: 0,
                totalDuration: 0,
                maxDuration: 0,
                maxRiskIndex: 0,
                recommendations: ['Риск обледенения в течение суток не превышает безопасных значений']
            };
        }
        
        // Группировка в периоды
        const periods = [];
        let currentPeriod = {
            start: criticalHours[0].hour,
            end: criticalHours[0].hour,
            hours: [criticalHours[0]]
        };
        
        for (let i = 1; i < criticalHours.length; i++) {
            if (criticalHours[i].hour === currentPeriod.end + 1) {
                currentPeriod.end = criticalHours[i].hour;
                currentPeriod.hours.push(criticalHours[i]);
            } else {
                periods.push(this.formatPeriod(currentPeriod));
                currentPeriod = {
                    start: criticalHours[i].hour,
                    end: criticalHours[i].hour,
                    hours: [criticalHours[i]]
                };
            }
        }
        periods.push(this.formatPeriod(currentPeriod));
        
        // Сортировка по максимальному риску
        periods.sort((a, b) => b.maxRiskIndex - a.maxRiskIndex);
        
        return {
            periods: periods,
            totalCount: periods.length,
            totalDuration: periods.reduce((sum, p) => sum + p.duration, 0),
            maxDuration: Math.max(...periods.map(p => p.duration)),
            maxRiskIndex: Math.max(...criticalHours.map(h => h.riskIndex)),
            recommendations: this.generatePeriodRecommendations(periods)
        };
    }

    /**
     * Форматирование периода
     */
    formatPeriod(period) {
        return {
            start: `${period.start.toString().padStart(2, '0')}:00`,
            end: `${period.end.toString().padStart(2, '0')}:00`,
            duration: period.end - period.start + 1,
            hours: period.hours.map(h => h.hour),
            maxRiskIndex: Math.max(...period.hours.map(h => h.riskIndex)),
            avgRiskIndex: this.round(
                period.hours.reduce((sum, h) => sum + h.riskIndex, 0) / period.hours.length,
                1
            ),
            maxRiskLevel: Math.max(...period.hours.map(h => h.riskLevel)),
            predominantIcingType: this.getPredominantIcingType(period.hours),
            conditionsSummary: this.getPeriodConditionsSummary(period.hours)
        };
    }

    /**
     * Получение преобладающего типа обледенения
     */
    getPredominantIcingType(hours) {
        const typeCounts = { clear_ice: 0, rime_ice: 0, mixed_ice: 0, none: 0 };
        hours.forEach(h => {
            typeCounts[h.icingType] = (typeCounts[h.icingType] || 0) + 1;
        });
        
        let maxType = 'none';
        let maxCount = 0;
        
        Object.entries(typeCounts).forEach(([type, count]) => {
            if (count > maxCount && type !== 'none') {
                maxCount = count;
                maxType = type;
            }
        });
        
        const typeDescriptions = {
            clear_ice: 'Прозрачное обледенение',
            rime_ice: 'Изморозь',
            mixed_ice: 'Смешанное обледенение',
            none: 'Без обледенения'
        };
        
        return typeDescriptions[maxType];
    }

    /**
     * Сводка условий для периода
     */
    getPeriodConditionsSummary(hours) {
        const avgTemp = this.round(
            hours.reduce((sum, h) => sum + h.temperature, 0) / hours.length,
            1
        );
        const avgHumidity = this.round(
            hours.reduce((sum, h) => sum + h.humidity, 0) / hours.length,
            0
        );
        const totalPrecip = this.round(
            hours.reduce((sum, h) => sum + h.precipitation, 0),
            1
        );
        
        return `Средняя температура: ${avgTemp}°C, влажность: ${avgHumidity}%, осадки: ${totalPrecip} мм`;
    }

    /**
     * Генерация рекомендаций для периодов
     */
    generatePeriodRecommendations(periods) {
        const recommendations = [];
        
        if (periods.length === 0) return recommendations;
        
        // Общая оценка
        const totalCriticalHours = periods.reduce((sum, p) => sum + p.duration, 0);
        if (totalCriticalHours > 6) {
            recommendations.push('Риск обледенения сохраняется в течение большей части дня');
            recommendations.push('Полеты в этот день не рекомендуются');
        } else if (totalCriticalHours > 3) {
            recommendations.push('Значительные периоды с умеренным и высоким риском обледенения');
            recommendations.push('Планируйте полеты вне критических периодов');
        }
        
        // Рекомендации по каждому периоду
        periods.forEach(period => {
            if (period.maxRiskLevel === 3) {
                recommendations.push(
                    `ВЫСОКИЙ РИСК ОБЛЕДЕНЕНИЯ ${period.start}-${period.end}: полеты запрещены`
                );
                recommendations.push(
                    `Тип обледенения: ${period.predominantIcingType}. ${period.conditionsSummary}`
                );
            } else if (period.avgRiskIndex > 50) {
                recommendations.push(
                    `Умеренный риск обледенения ${period.start}-${period.end} (${period.avgRiskIndex} баллов)`
                );
                recommendations.push(
                    `Рекомендуется избегать полетов в облаках и осадках в этот период`
                );
            }
        });
        
        // Дополнительные рекомендации
        const maxRiskPeriod = periods.reduce((max, p) => 
            p.maxRiskIndex > max.maxRiskIndex ? p : max
        );
        
        if (maxRiskPeriod.maxRiskIndex > 75) {
            recommendations.push('Максимальный риск обледенения превышает 75 баллов');
            recommendations.push('Требуется принудительное оттаивание БВС после каждого полета');
        }
        
        return recommendations;
    }

    /**
     * Анализ по периодам суток
     */
    analyzeDailyPeriods(hourlyRisk) {
        const periods = {
            night: { hours: [], label: 'Ночь (00:00-05:00)' },
            morning: { hours: [], label: 'Утро (06:00-11:00)' },
            day: { hours: [], label: 'День (12:00-17:00)' },
            evening: { hours: [], label: 'Вечер (18:00-23:00)' }
        };
        
        // Распределение по периодам
        hourlyRisk.forEach(hour => {
            if (hour.hour >= 0 && hour.hour <= 5) periods.night.hours.push(hour);
            else if (hour.hour >= 6 && hour.hour <= 11) periods.morning.hours.push(hour);
            else if (hour.hour >= 12 && hour.hour <= 17) periods.day.hours.push(hour);
            else periods.evening.hours.push(hour);
        });
        
        // Анализ каждого периода
        Object.keys(periods).forEach(key => {
            const period = periods[key];
            if (period.hours.length === 0) return;
            
            const riskLevels = period.hours.map(h => h.riskLevel);
            const riskIndexes = period.hours.map(h => h.riskIndex);
            
            period.avgRiskIndex = this.round(
                riskIndexes.reduce((sum, val) => sum + val, 0) / riskIndexes.length,
                1
            );
            period.maxRiskIndex = Math.max(...riskIndexes);
            period.highRiskHours = riskLevels.filter(l => l >= 2).length;
            period.criticalRiskHours = riskLevels.filter(l => l === 3).length;
            
            // Определение уровня риска периода
            if (period.criticalRiskHours > period.hours.length * 0.3) {
                period.periodRiskLevel = 3;
                period.periodRiskText = 'Критический';
            } else if (period.highRiskHours > period.hours.length * 0.4) {
                period.periodRiskLevel = 2;
                period.periodRiskText = 'Высокий';
            } else if (period.avgRiskIndex > 30) {
                period.periodRiskLevel = 1;
                period.periodRiskText = 'Умеренный';
            } else {
                period.periodRiskLevel = 0;
                period.periodRiskText = 'Низкий';
            }
        });
        
        return periods;
    }

    /**
     * Расчет общего риска
     */
    calculateOverallRisk(hourlyRisk, criticalPeriods) {
        const riskIndexes = hourlyRisk.map(h => h.riskIndex);
        const riskLevels = hourlyRisk.map(h => h.riskLevel);
        
        const avgRiskIndex = this.round(
            riskIndexes.reduce((sum, val) => sum + val, 0) / riskIndexes.length,
            1
        );
        const maxRiskIndex = Math.max(...riskIndexes);
        const highRiskHours = riskLevels.filter(l => l >= 2).length;
        const criticalRiskHours = riskLevels.filter(l => l === 3).length;
        
        // Балльная оценка
        let riskScore = 0;
        
        if (maxRiskIndex > 75) riskScore += 35;
        else if (maxRiskIndex > 60) riskScore += 25;
        else if (maxRiskIndex > 45) riskScore += 15;
        
        if (criticalRiskHours > 2) riskScore += 30;
        else if (criticalRiskHours > 0) riskScore += 15;
        
        if (highRiskHours > 4) riskScore += 25;
        else if (highRiskHours > 2) riskScore += 15;
        
        if (criticalPeriods.totalDuration > 4) riskScore += 10;
        
        // Определение уровня риска
        let riskLevel = 'low';
        let riskText = 'Низкий риск обледенения';
        let color = 'success';
        let flightRestriction = 'Полеты разрешены без ограничений';
        
        if (riskScore >= 70) {
            riskLevel = 'critical';
            riskText = 'КРИТИЧЕСКИЙ РИСК ОБЛЕДЕНЕНИЯ';
            color = 'danger';
            flightRestriction = 'ПОЛЕТЫ ЗАПРЕЩЕНЫ';
        } else if (riskScore >= 50) {
            riskLevel = 'high';
            riskText = 'Высокий риск обледенения';
            color = 'warning';
            flightRestriction = 'Полеты разрешены только для оснащенных системой противообледенения БВС';
        } else if (riskScore >= 30) {
            riskLevel = 'moderate';
            riskText = 'Умеренный риск обледенения';
            color = 'caution';
            flightRestriction = 'Полеты разрешены с осторожностью, избегать длительного пребывания в облаках';
        }
        
        return {
            score: riskScore,
            level: riskLevel,
            text: riskText,
            color: color,
            flightRestriction: flightRestriction,
            statistics: {
                avgRiskIndex: avgRiskIndex,
                maxRiskIndex: maxRiskIndex,
                highRiskHours: highRiskHours,
                criticalRiskHours: criticalRiskHours,
                safeHours: hourlyRisk.length - highRiskHours
            },
            criticalFactors: this.identifyCriticalFactors(hourlyRisk)
        };
    }

    /**
     * Идентификация критических факторов
     */
    identifyCriticalFactors(hourlyRisk) {
        const factors = [];
        const criticalHours = hourlyRisk.filter(h => h.riskLevel === 3);
        
        if (criticalHours.length > 0) {
            // Анализ доминирующих факторов
            const factorCounts = { temperature: 0, humidity: 0, precipitation: 0, cloud_cover: 0 };
            
            criticalHours.forEach(hour => {
                hour.riskFactors.forEach(factor => {
                    if (factor.contribution > 5) {
                        factorCounts[factor.factor] = (factorCounts[factor.factor] || 0) + 1;
                    }
                });
            });
            
            // Определение ключевых факторов
            if (factorCounts.temperature > criticalHours.length * 0.5) {
                factors.push({
                    factor: 'temperature',
                    description: 'Температура в критическом диапазоне (0..+3°C) является основным фактором риска'
                });
            }
            
            if (factorCounts.precipitation > criticalHours.length * 0.4) {
                factors.push({
                    factor: 'precipitation',
                    description: 'Наличие осадков значительно увеличивает риск прозрачного обледенения'
                });
            }
            
            if (factorCounts.humidity > criticalHours.length * 0.6) {
                factors.push({
                    factor: 'humidity',
                    description: 'Постоянно высокая влажность (>85%) создает благоприятные условия для обледенения'
                });
            }
        }
        
        return factors;
    }

    /**
     * Генерация рекомендаций
     */
    generateRecommendations(overallRisk, criticalPeriods, hourlyData) {
        const recommendations = [];
        
        // Общие рекомендации в зависимости от уровня риска
        switch(overallRisk.level) {
            case 'critical':
                recommendations.push('ПОЛЕТЫ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ из-за критического риска обледенения');
                recommendations.push('Рекомендуется перенести полеты на другой день');
                break;
            case 'high':
                recommendations.push('Полеты разрешены ТОЛЬКО для БВС, оснащенных системой противообледенения');
                recommendations.push('Максимальная продолжительность полета: 30 минут');
                recommendations.push('Обязательное наземное оттаивание после каждого полета');
                break;
            case 'moderate':
                recommendations.push('Полеты разрешены с ограничениями');
                recommendations.push('Избегать полетов в облаках и осадках');
                recommendations.push('Максимальная высота полета: 300м (ниже уровня замерзания)');
                recommendations.push('Регулярный визуальный контроль состояния БВС');
                break;
            case 'low':
                recommendations.push('Полеты разрешены без ограничений');
                recommendations.push('Рекомендуется визуальный контроль перед посадкой');
                break;
        }
        
        // Рекомендации по критическим периодам
        if (criticalPeriods.totalCount > 0) {
            recommendations.push('');
            recommendations.push('КРИТИЧЕСКИЕ ПЕРИОДЫ ДЛЯ ПОЛЕТОВ:');
            
            criticalPeriods.periods.forEach(period => {
                if (period.maxRiskLevel === 3) {
                    recommendations.push(`  • ${period.start}-${period.end}: ПОЛЕТЫ ЗАПРЕЩЕНЫ (${period.predominantIcingType})`);
                } else if (period.maxRiskLevel === 2) {
                    recommendations.push(`  • ${period.start}-${period.end}: Полеты с особой осторожностью`);
                }
            });
        }
        
        // Рекомендации по высоте
        const freezingLevels = hourlyData.map(h => h.freezingLevel);
        const minFreezingLevel = Math.min(...freezingLevels);
        
        if (minFreezingLevel < 800) {
            recommendations.push('');
            recommendations.push('РЕКОМЕНДАЦИИ ПО ВЫСОТЕ:');
            recommendations.push(`  • Максимальная высота полета: ${Math.min(500, minFreezingLevel - 200)}м (минимум на 200м ниже уровня замерзания)`);
        }
        
        // Рекомендации по времени суток
        const dailyPeriods = this.analyzeDailyPeriods(hourlyRisk);
        const safestPeriod = Object.values(dailyPeriods).reduce((safest, period) => {
            if (!period.periodRiskLevel) return safest;
            if (!safest || period.periodRiskLevel < safest.periodRiskLevel) return period;
            if (period.periodRiskLevel === safest.periodRiskLevel && period.avgRiskIndex < safest.avgRiskIndex) return period;
            return safest;
        });
        
        if (safestPeriod && safestPeriod.periodRiskLevel < 2) {
            recommendations.push('');
            recommendations.push('НАИБОЛЕЕ БЕЗОПАСНЫЙ ПЕРИОД ДЛЯ ПОЛЕТОВ:');
            recommendations.push(`  • ${safestPeriod.label} (средний риск: ${safestPeriod.avgRiskIndex} баллов)`);
        }
        
        return recommendations;
    }

    /**
     * Генерация сводки
     */
    generateSummary(overallRisk, criticalPeriods) {
        return {
            riskLevel: overallRisk.text,
            flightRestriction: overallRisk.flightRestriction,
            criticalPeriodsCount: criticalPeriods.totalCount,
            maxRiskIndex: overallRisk.statistics.maxRiskIndex,
            safeFlightHours: overallRisk.statistics.safeHours,
            primaryConcern: this.getPrimaryConcern(overallRisk, criticalPeriods)
        };
    }

    /**
     * Определение главной проблемы
     */
    getPrimaryConcern(overallRisk, criticalPeriods) {
        if (overallRisk.level === 'critical') {
            return 'Критический риск обледенения делает полеты невозможными';
        }
        
        if (criticalPeriods.maxDuration > 3) {
            return `Продолжительные периоды (${criticalPeriods.maxDuration}+ часов) с высоким риском обледенения`;
        }
        
        if (overallRisk.statistics.criticalRiskHours > 2) {
            return `${overallRisk.statistics.criticalRiskHours} часов с критическим риском обледенения`;
        }
        
        if (overallRisk.statistics.maxRiskIndex > 70) {
            return `Максимальный риск обледенения превышает 70 баллов`;
        }
        
        return 'Риск обледенения в пределах допустимых значений';
    }

    /**
     * Вспомогательные методы
     */
    round(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    createEmptyAnalysis() {
        return {
            meta: {
                analyzedHours: 0,
                thresholds: this.icingThresholds,
                analyzedAt: new Date().toISOString()
            },
            hourlyRisk: [],
            criticalPeriods: {
                periods: [],
                totalCount: 0,
                totalDuration: 0,
                maxDuration: 0,
                maxRiskIndex: 0,
                recommendations: ['Нет данных для анализа риска обледенения']
            },
            dailyPeriodsAnalysis: {},
            overallRisk: {
                score: 0,
                level: 'unknown',
                text: 'Нет данных для оценки риска',
                color: 'secondary',
                flightRestriction: 'Невозможно определить ограничения',
                statistics: {
                    avgRiskIndex: 0,
                    maxRiskIndex: 0,
                    highRiskHours: 0,
                    criticalRiskHours: 0,
                    safeHours: 0
                },
                criticalFactors: []
            },
            recommendations: [
                'Невозможно провести анализ риска обледенения',
                'Проверьте наличие метеоданных и повторите попытку'
            ],
            summary: {
                riskLevel: 'Нет данных',
                flightRestriction: 'Анализ невозможен',
                criticalPeriodsCount: 0,
                maxRiskIndex: 0,
                safeFlightHours: 0,
                primaryConcern: 'Отсутствуют входные данные для анализа'
            }
        };
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IcingRiskAnalyzer;
} else {
    window.IcingRiskAnalyzer = IcingRiskAnalyzer;
}