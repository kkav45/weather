/**
 * Анализ ветрового профиля
 * Оценка сдвига ветра и его влияния на безопасность полета
 */
class WindProfileAnalyzer {
    constructor() {
        this.criticalShearThresholds = {
            direction: 30,  // градусов
            speed: 5       // м/с
        };
        
        this.altitudeLevels = {
            surface: 10,
            low: 80,
            high: 120
        };
    }

    /**
     * Полный анализ ветрового профиля
     * @param {Array} hourlyData - Почасовые метеоданные
     * @returns {Object} Результаты анализа
     */
    analyzeWindProfile(hourlyData) {
        if (!hourlyData || hourlyData.length === 0) {
            return this.createEmptyAnalysis();
        }

        // Расчет статистики по высотам
        const surfaceStats = this.calculateAltitudeStats(hourlyData, '10m');
        const lowAltitudeStats = this.calculateAltitudeStats(hourlyData, '80m');
        const highAltitudeStats = this.calculateAltitudeStats(hourlyData, '120m');
        
        // Анализ сдвига ветра
        const shearAnalysis = this.analyzeWindShear(hourlyData);
        
        // Определение критических периодов
        const criticalPeriods = this.identifyCriticalPeriods(hourlyData, shearAnalysis);
        
        // Рекомендации по высоте полета
        const altitudeRecommendations = this.recommendFlightAltitudes(hourlyData, shearAnalysis);
        
        // Общая оценка риска
        const overallRisk = this.calculateOverallRisk(shearAnalysis, criticalPeriods);
        
        return {
            meta: {
                analyzedHours: hourlyData.length,
                altitudeLevels: this.altitudeLevels,
                analyzedAt: new Date().toISOString()
            },
            statistics: {
                surface: surfaceStats,
                lowAltitude: lowAltitudeStats,
                highAltitude: highAltitudeStats
            },
            shearAnalysis: shearAnalysis,
            criticalPeriods: criticalPeriods,
            altitudeRecommendations: altitudeRecommendations,
            overallRisk: overallRisk,
            summary: this.generateSummary(overallRisk, criticalPeriods, altitudeRecommendations)
        };
    }

    /**
     * Расчет статистики для конкретной высоты
     */
    calculateAltitudeStats(hourlyData, altitude) {
        const speedKey = `windSpeed${altitude}`;
        const dirKey = `windDir${altitude}`;
        
        const speeds = hourlyData.map(h => h[speedKey]);
        const directions = hourlyData.map(h => h[dirKey]);
        
        return {
            altitude: parseInt(altitude),
            avgSpeed: this.round(this.calculateAverage(speeds), 1),
            maxSpeed: Math.max(...speeds),
            minSpeed: Math.min(...speeds),
            avgDirection: this.round(this.calculateAverage(directions), 0),
            predominantDirection: this.getWindDirection(this.calculateAverage(directions)),
            speedStdDev: this.round(this.calculateStdDev(speeds), 1),
            directionStdDev: this.round(this.calculateStdDev(directions), 0)
        };
    }

    /**
     * Анализ сдвига ветра между высотами
     */
    analyzeWindShear(hourlyData) {
        const shearData = hourlyData.map(hour => {
            // Сдвиг между 10м и 120м
            const dirDiff10to120 = Math.abs(hour.windDir120m - hour.windDir10m);
            const speedDiff10to120 = Math.abs(hour.windSpeed120m - hour.windSpeed10m);
            
            // Сдвиг между 10м и 80м
            const dirDiff10to80 = Math.abs(hour.windDir80m - hour.windDir10m);
            const speedDiff10to80 = Math.abs(hour.windSpeed80m - hour.windSpeed10m);
            
            // Сдвиг между 80м и 120м
            const dirDiff80to120 = Math.abs(hour.windDir120m - hour.windDir80m);
            const speedDiff80to120 = Math.abs(hour.windSpeed120m - hour.windSpeed80m);
            
            // Определение уровня риска
            const riskLevel = this.calculateShearRiskLevel(
                Math.max(dirDiff10to120, dirDiff10to80, dirDiff80to120),
                Math.max(speedDiff10to120, speedDiff10to80, speedDiff80to120)
            );
            
            return {
                hour: hour.hour,
                time: hour.time,
                dirDiff10to120: this.round(dirDiff10to120, 0),
                speedDiff10to120: this.round(speedDiff10to120, 1),
                dirDiff10to80: this.round(dirDiff10to80, 0),
                speedDiff10to80: this.round(speedDiff10to80, 1),
                dirDiff80to120: this.round(dirDiff80to120, 0),
                speedDiff80to120: this.round(speedDiff80to120, 1),
                maxDirDiff: Math.max(dirDiff10to120, dirDiff10to80, dirDiff80to120),
                maxSpeedDiff: Math.max(speedDiff10to120, speedDiff10to80, speedDiff80to120),
                riskLevel: riskLevel,
                riskText: this.getRiskText(riskLevel)
            };
        });
        
        // Расчет общей статистики сдвига
        const allDirDiffs = shearData.map(s => s.maxDirDiff);
        const allSpeedDiffs = shearData.map(s => s.maxSpeedDiff);
        const riskLevels = shearData.map(s => s.riskLevel);
        
        return {
            hourlyData: shearData,
            statistics: {
                avgDirDiff: this.round(this.calculateAverage(allDirDiffs), 0),
                maxDirDiff: Math.max(...allDirDiffs),
                avgSpeedDiff: this.round(this.calculateAverage(allSpeedDiffs), 1),
                maxSpeedDiff: Math.max(...allSpeedDiffs),
                highRiskHours: riskLevels.filter(l => l >= 2).length,
                criticalRiskHours: riskLevels.filter(l => l === 3).length
            },
            riskDistribution: this.calculateRiskDistribution(riskLevels)
        };
    }

    /**
     * Выявление критических периодов
     */
    identifyCriticalPeriods(hourlyData, shearAnalysis) {
        const criticalHours = shearAnalysis.hourlyData.filter(s => s.riskLevel >= 2);
        
        if (criticalHours.length === 0) {
            return {
                periods: [],
                totalCount: 0,
                totalDuration: 0,
                maxDuration: 0,
                recommendations: ['Ветровой сдвиг в безопасных пределах на протяжении всего дня']
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
        
        // Формирование рекомендаций
        const recommendations = this.generateCriticalPeriodRecommendations(periods, hourlyData);
        
        return {
            periods: periods,
            totalCount: periods.length,
            totalDuration: periods.reduce((sum, p) => sum + p.duration, 0),
            maxDuration: Math.max(...periods.map(p => p.duration)),
            recommendations: recommendations
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
            maxRiskLevel: Math.max(...period.hours.map(h => h.riskLevel)),
            avgDirDiff: this.round(
                period.hours.reduce((sum, h) => sum + h.maxDirDiff, 0) / period.hours.length,
                0
            ),
            avgSpeedDiff: this.round(
                period.hours.reduce((sum, h) => sum + h.maxSpeedDiff, 0) / period.hours.length,
                1
            )
        };
    }

    /**
     * Рекомендации по высоте полета
     */
    recommendFlightAltitudes(hourlyData, shearAnalysis) {
        // Анализ стабильности ветра на разных высотах
        const surfaceStability = this.calculateStabilityIndex(
            hourlyData.map(h => h.windSpeed10m),
            hourlyData.map(h => h.windDir10m)
        );
        
        const lowAltitudeStability = this.calculateStabilityIndex(
            hourlyData.map(h => h.windSpeed80m),
            hourlyData.map(h => h.windDir80m)
        );
        
        const highAltitudeStability = this.calculateStabilityIndex(
            hourlyData.map(h => h.windSpeed120m),
            hourlyData.map(h => h.windDir120m)
        );
        
        // Определение оптимальной высоты
        let optimalAltitude = 80; // По умолчанию - средняя высота
        let stabilityScores = [
            { altitude: 10, score: surfaceStability },
            { altitude: 80, score: lowAltitudeStability },
            { altitude: 120, score: highAltitudeStability }
        ];
        
        // Сортировка по стабильности (чем выше значение, тем стабильнее)
        stabilityScores.sort((a, b) => b.score - a.score);
        optimalAltitude = stabilityScores[0].altitude;
        
        // Проверка критических значений на оптимальной высоте
        const criticalHours = hourlyData.filter(h => {
            const speed = h[`windSpeed${optimalAltitude}m`];
            return speed > 15 || (h.windGusts > 12 && optimalAltitude === 120);
        });
        
        let altitudeRecommendation = `Рекомендуемая высота полета: ${optimalAltitude}м`;
        let restrictions = [];
        
        if (criticalHours.length > 0) {
            altitudeRecommendation = `Ограниченная рекомендация для высоты ${optimalAltitude}м`;
            restrictions.push(`Избегать высоты ${optimalAltitude}м в период ${criticalHours[0].time}-${criticalHours[criticalHours.length-1].time} из-за сильного ветра`);
        }
        
        // Дополнительные рекомендации
        const additionalRecommendations = [];
        
        if (highAltitudeStability < 0.5) {
            additionalRecommendations.push('Высота 120м не рекомендуется из-за сильной турбулентности');
        }
        
        if (surfaceStability > 0.8 && lowAltitudeStability > 0.7) {
            additionalRecommendations.push('Безопасно выполнять полеты на высотах 10-80м');
        }
        
        return {
            optimalAltitude: optimalAltitude,
            stabilityIndex: {
                surface: this.round(surfaceStability, 2),
                lowAltitude: this.round(lowAltitudeStability, 2),
                highAltitude: this.round(highAltitudeStability, 2)
            },
            altitudeRecommendation: altitudeRecommendation,
            restrictions: restrictions,
            additionalRecommendations: additionalRecommendations,
            warnings: this.generateAltitudeWarnings(hourlyData, optimalAltitude)
        };
    }

    /**
     * Расчет индекса стабильности ветра
     */
    calculateStabilityIndex(speeds, directions) {
        // Стабильность определяется как обратная величина вариативности
        const speedVariation = this.calculateVariation(speeds);
        const directionVariation = this.calculateVariation(directions);
        
        // Нормализация (0-1), где 1 - максимально стабильно
        const normalizedSpeedStability = 1 / (1 + speedVariation);
        const normalizedDirStability = 1 / (1 + directionVariation * 0.1); // Направление менее критично
        
        // Комбинированный индекс
        return (normalizedSpeedStability * 0.7 + normalizedDirStability * 0.3);
    }

    /**
     * Расчет вариации (коэффициент вариации)
     */
    calculateVariation(values) {
        const avg = this.calculateAverage(values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        return Math.sqrt(variance) / avg;
    }

    /**
     * Расчет общего риска
     */
    calculateOverallRisk(shearAnalysis, criticalPeriods) {
        const stats = shearAnalysis.statistics;
        const riskPoints = 0;
        
        // Балльная оценка риска
        let riskScore = 0;
        
        // Сдвиг направления
        if (stats.maxDirDiff > 40) riskScore += 30;
        else if (stats.maxDirDiff > 30) riskScore += 20;
        else if (stats.maxDirDiff > 20) riskScore += 10;
        
        // Сдвиг скорости
        if (stats.maxSpeedDiff > 6) riskScore += 30;
        else if (stats.maxSpeedDiff > 4) riskScore += 20;
        else if (stats.maxSpeedDiff > 2) riskScore += 10;
        
        // Количество критических часов
        if (stats.criticalRiskHours > 3) riskScore += 25;
        else if (stats.criticalRiskHours > 0) riskScore += 15;
        
        if (stats.highRiskHours > 6) riskScore += 20;
        else if (stats.highRiskHours > 3) riskScore += 10;
        
        // Длительность критических периодов
        if (criticalPeriods.maxDuration > 3) riskScore += 15;
        else if (criticalPeriods.maxDuration > 1) riskScore += 5;
        
        // Определение уровня риска
        let riskLevel = 'low';
        let riskText = 'Низкий риск ветрового сдвига';
        let color = 'success';
        
        if (riskScore >= 60) {
            riskLevel = 'critical';
            riskText = 'КРИТИЧЕСКИЙ РИСК ВЕТРОВОГО СДВИГА';
            color = 'danger';
        } else if (riskScore >= 40) {
            riskLevel = 'high';
            riskText = 'Высокий риск ветрового сдвига';
            color = 'warning';
        } else if (riskScore >= 25) {
            riskLevel = 'moderate';
            riskText = 'Умеренный риск ветрового сдвига';
            color = 'caution';
        }
        
        return {
            score: riskScore,
            level: riskLevel,
            text: riskText,
            color: color,
            contributingFactors: this.identifyRiskFactors(stats, criticalPeriods)
        };
    }

    /**
     * Определение факторов риска
     */
    identifyRiskFactors(stats, criticalPeriods) {
        const factors = [];
        
        if (stats.maxDirDiff > 30) {
            factors.push({
                factor: 'direction_shear',
                severity: stats.maxDirDiff > 40 ? 'critical' : 'high',
                description: `Максимальный сдвиг направления ${stats.maxDirDiff}° превышает безопасный порог`
            });
        }
        
        if (stats.maxSpeedDiff > 4) {
            factors.push({
                factor: 'speed_shear',
                severity: stats.maxSpeedDiff > 6 ? 'critical' : 'high',
                description: `Максимальный сдвиг скорости ${stats.maxSpeedDiff} м/с создает риск турбулентности`
            });
        }
        
        if (stats.criticalRiskHours > 0) {
            factors.push({
                factor: 'critical_hours',
                severity: stats.criticalRiskHours > 3 ? 'high' : 'moderate',
                description: `${stats.criticalRiskHours} часов с критическим уровнем сдвига ветра`
            });
        }
        
        if (criticalPeriods.totalDuration > 4) {
            factors.push({
                factor: 'extended_periods',
                severity: criticalPeriods.totalDuration > 6 ? 'high' : 'moderate',
                description: `Продолжительные периоды (${criticalPeriods.totalDuration} часов) с опасным сдвигом ветра`
            });
        }
        
        return factors;
    }

    /**
     * Генерация сводки
     */
    generateSummary(overallRisk, criticalPeriods, altitudeRecommendations) {
        const summary = {
            riskAssessment: overallRisk.text,
            flightRestrictions: [],
            recommendations: []
        };
        
        // Ограничения полетов
        if (overallRisk.level === 'critical') {
            summary.flightRestrictions.push('ПОЛЕТЫ ЗАПРЕЩЕНЫ на всех высотах из-за критического ветрового сдвига');
        } else if (overallRisk.level === 'high') {
            summary.flightRestrictions.push('Полеты разрешены только для опытных пилотов с ограничениями по высоте');
            summary.flightRestrictions.push('Максимальная высота полета: 80м');
        } else if (overallRisk.level === 'moderate') {
            summary.flightRestrictions.push('Полеты разрешены с осторожностью');
            summary.flightRestrictions.push('Рекомендуется избегать высоты 120м в критические периоды');
        }
        
        // Рекомендации
        summary.recommendations.push(altitudeRecommendations.altitudeRecommendation);
        
        if (criticalPeriods.totalCount > 0) {
            summary.recommendations.push(
                `Избегать полетов на высоте 120м в периоды: ${criticalPeriods.periods.map(p => `${p.start}-${p.end}`).join(', ')}`
            );
        }
        
        summary.recommendations.push(...altitudeRecommendations.additionalRecommendations);
        
        return summary;
    }

    /**
     * Генерация рекомендаций для критических периодов
     */
    generateCriticalPeriodRecommendations(periods, hourlyData) {
        if (periods.length === 0) return [];
        
        const recommendations = [];
        
        // Общая рекомендация
        const totalCriticalHours = periods.reduce((sum, p) => sum + p.duration, 0);
        if (totalCriticalHours > 6) {
            recommendations.push('Ветровой сдвиг представляет серьезную угрозу в течение большей части дня');
            recommendations.push('Рассмотрите перенос полета на другой день');
        } else if (totalCriticalHours > 3) {
            recommendations.push('Значительные периоды с опасным ветровым сдвигом');
            recommendations.push('Планируйте полеты вне критических периодов');
        }
        
        // Рекомендации по каждому периоду
        periods.forEach(period => {
            if (period.maxRiskLevel === 3) {
                recommendations.push(
                    `КРИТИЧЕСКИЙ СДВИГ ВЕТРА ${period.start}-${period.end}: полеты запрещены на всех высотах`
                );
            } else if (period.avgDirDiff > 30) {
                recommendations.push(
                    `Сильный сдвиг направления (${period.avgDirDiff}°) ${period.start}-${period.end}: ограничить высоту до 80м`
                );
            } else if (period.avgSpeedDiff > 4) {
                recommendations.push(
                    `Сильный сдвиг скорости (${period.avgSpeedDiff} м/с) ${period.start}-${period.end}: избегать высоты 120м`
                );
            }
        });
        
        // Дополнительные рекомендации
        const maxGusts = Math.max(...hourlyData.map(h => h.windGusts));
        if (maxGusts > 15) {
            recommendations.push(`Максимальные порывы ветра до ${maxGusts} м/с создают дополнительный риск`);
            recommendations.push('Требуется особая осторожность при взлете и посадке');
        }
        
        return recommendations;
    }

    /**
     * Генерация предупреждений по высоте
     */
    generateAltitudeWarnings(hourlyData, optimalAltitude) {
        const warnings = [];
        
        // Проверка порывов ветра на оптимальной высоте
        const gustsKey = optimalAltitude === 120 ? 'windGusts' : `windSpeed${optimalAltitude}m`;
        const maxGusts = Math.max(...hourlyData.map(h => h[gustsKey]));
        
        if (maxGusts > 12) {
            warnings.push({
                level: 'warning',
                text: `Порывы ветра до ${maxGusts.toFixed(1)} м/с на высоте ${optimalAltitude}м могут создать сложности при управлении`
            });
        }
        
        // Проверка сдвига на оптимальной высоте
        const criticalShearHours = hourlyData.filter(h => {
            const dirDiff = Math.abs(h.windDir120m - h.windDir10m);
            const speedDiff = Math.abs(h.windSpeed120m - h.windSpeed10m);
            return dirDiff > 30 || speedDiff > 5;
        });
        
        if (criticalShearHours.length > 0) {
            warnings.push({
                level: 'warning',
                text: `Критический ветровой сдвиг в ${criticalShearHours.length} часов может повлиять на стабильность на высоте ${optimalAltitude}м`
            });
        }
        
        return warnings;
    }

    /**
     * Расчет уровня риска сдвига
     */
    calculateShearRiskLevel(dirDiff, speedDiff) {
        if (dirDiff > 40 || speedDiff > 6) return 3; // Критический
        if (dirDiff > 25 || speedDiff > 4) return 2; // Высокий
        if (dirDiff > 15 || speedDiff > 2) return 1; // Умеренный
        return 0; // Низкий
    }

    /**
     * Получение текстового описания риска
     */
    getRiskText(level) {
        const texts = {
            0: 'Низкий',
            1: 'Умеренный',
            2: 'Высокий',
            3: 'Критический'
        };
        return texts[level] || 'Неизвестно';
    }

    /**
     * Расчет распределения риска
     */
    calculateRiskDistribution(riskLevels) {
        const distribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
        riskLevels.forEach(level => {
            distribution[level] = (distribution[level] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Вспомогательные методы
     */
    calculateAverage(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateStdDev(values) {
        const avg = this.calculateAverage(values);
        return Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
    }

    round(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    getWindDirection(degrees) {
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        return directions[Math.round(degrees / 45) % 8];
    }

    createEmptyAnalysis() {
        return {
            meta: {
                analyzedHours: 0,
                altitudeLevels: this.altitudeLevels,
                analyzedAt: new Date().toISOString()
            },
            statistics: {
                surface: this.createEmptyStats(10),
                lowAltitude: this.createEmptyStats(80),
                highAltitude: this.createEmptyStats(120)
            },
            shearAnalysis: {
                hourlyData: [],
                statistics: {
                    avgDirDiff: 0,
                    maxDirDiff: 0,
                    avgSpeedDiff: 0,
                    maxSpeedDiff: 0,
                    highRiskHours: 0,
                    criticalRiskHours: 0
                },
                riskDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 }
            },
            criticalPeriods: {
                periods: [],
                totalCount: 0,
                totalDuration: 0,
                maxDuration: 0,
                recommendations: ['Нет данных для анализа']
            },
            altitudeRecommendations: {
                optimalAltitude: 80,
                stabilityIndex: { surface: 0, lowAltitude: 0, highAltitude: 0 },
                altitudeRecommendation: 'Нет данных для рекомендаций',
                restrictions: [],
                additionalRecommendations: [],
                warnings: []
            },
            overallRisk: {
                score: 0,
                level: 'unknown',
                text: 'Нет данных для оценки риска',
                color: 'secondary',
                contributingFactors: []
            },
            summary: {
                riskAssessment: 'Нет данных',
                flightRestrictions: ['Невозможно провести анализ - отсутствуют метеоданные'],
                recommendations: ['Проверьте подключение к сервису погоды и повторите попытку']
            }
        };
    }

    createEmptyStats(altitude) {
        return {
            altitude: altitude,
            avgSpeed: 0,
            maxSpeed: 0,
            minSpeed: 0,
            avgDirection: 0,
            predominantDirection: 'Н/Д',
            speedStdDev: 0,
            directionStdDev: 0
        };
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WindProfileAnalyzer;
} else {
    window.WindProfileAnalyzer = WindProfileAnalyzer;
}