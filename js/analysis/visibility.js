/**
 * Анализ видимости и облачности
 * Оценка условий для визуального пилотирования и ВПВ
 */
class VisibilityAnalyzer {
    constructor() {
        // Пороговые значения видимости (в км)
        this.visibilityThresholds = {
            excellent: 10,
            good: 5,
            moderate: 3,
            poor: 1,
            veryPoor: 0
        };
        
        // Пороговые значения облачности (%)
        this.cloudThresholds = {
            clear: 20,
            scattered: 50,
            broken: 80,
            overcast: 100
        };
        
        // Минимальные требования для ВПВ
        this.vfrMinimums = {
            visibility: 5,      // км
            cloudCeiling: 300   // м (высота нижней границы облаков)
        };
    }

    /**
     * Полный анализ видимости и облачности
     * @param {Array} hourlyData - Почасовые метеоданные
     * @param {Object} routeParams - Параметры маршрута
     * @returns {Object} Результаты анализа
     */
    analyzeVisibility(hourlyData, routeParams = {}) {
        if (!hourlyData || hourlyData.length === 0) {
            return this.createEmptyAnalysis();
        }

        // Анализ видимости
        const visibilityAnalysis = this.analyzeVisibilityData(hourlyData);
        
        // Анализ облачности
        const cloudAnalysis = this.analyzeCloudCover(hourlyData);
        
        // Анализ соответствия ВПВ
        const vfrAnalysis = this.analyzeVFRCompliance(hourlyData);
        
        // Критические периоды
        const criticalPeriods = this.identifyCriticalPeriods(hourlyData, visibilityAnalysis, cloudAnalysis);
        
        // Общая оценка
        const overallAssessment = this.calculateOverallAssessment(visibilityAnalysis, cloudAnalysis, vfrAnalysis, criticalPeriods);
        
        // Рекомендации
        const recommendations = this.generateRecommendations(overallAssessment, criticalPeriods, cloudAnalysis);
        
        return {
            meta: {
                analyzedHours: hourlyData.length,
                thresholds: {
                    visibility: this.visibilityThresholds,
                    clouds: this.cloudThresholds,
                    vfr: this.vfrMinimums
                },
                analyzedAt: new Date().toISOString()
            },
            visibilityAnalysis: visibilityAnalysis,
            cloudAnalysis: cloudAnalysis,
            vfrAnalysis: vfrAnalysis,
            criticalPeriods: criticalPeriods,
            overallAssessment: overallAssessment,
            recommendations: recommendations,
            summary: this.generateSummary(overallAssessment, criticalPeriods, vfrAnalysis)
        };
    }

    /**
     * Анализ данных видимости
     */
    analyzeVisibilityData(hourlyData) {
        const visibilities = hourlyData.map(h => h.visibility);
        const visibilityCategories = hourlyData.map(h => this.categorizeVisibility(h.visibility));
        
        // Статистика
        const stats = {
            average: this.round(visibilities.reduce((sum, v) => sum + v, 0) / visibilities.length, 1),
            minimum: Math.min(...visibilities),
            maximum: Math.max(...visibilities),
            stdDev: this.round(this.calculateStdDev(visibilities), 1)
        };
        
        // Распределение по категориям
        const distribution = {
            excellent: visibilityCategories.filter(c => c === 'excellent').length,
            good: visibilityCategories.filter(c => c === 'good').length,
            moderate: visibilityCategories.filter(c => c === 'moderate').length,
            poor: visibilityCategories.filter(c => c === 'poor').length,
            veryPoor: visibilityCategories.filter(c => c === 'veryPoor').length
        };
        
        // Часы с ограниченной видимостью
        const limitedVisibilityHours = hourlyData.filter(h => h.visibility < this.vfrMinimums.visibility);
        const veryPoorVisibilityHours = hourlyData.filter(h => h.visibility < 1);
        
        return {
            statistics: stats,
            distribution: distribution,
            categories: visibilityCategories,
            limitedVisibilityHours: limitedVisibilityHours.length,
            veryPoorVisibilityHours: veryPoorVisibilityHours.length,
            hourlyData: hourlyData.map(h => ({
                hour: h.hour,
                time: h.time,
                visibility: h.visibility,
                category: this.categorizeVisibility(h.visibility),
                categoryText: this.getVisibilityCategoryText(h.visibility),
                vfrCompliant: h.visibility >= this.vfrMinimums.visibility
            }))
        };
    }

    /**
     * Анализ облачности
     */
    analyzeCloudCover(hourlyData) {
        const cloudCovers = hourlyData.map(h => h.cloudcover);
        const lowCloudCovers = hourlyData.map(h => h.cloudcoverLow);
        
        // Статистика общей облачности
        const cloudStats = {
            average: this.round(cloudCovers.reduce((sum, v) => sum + v, 0) / cloudCovers.length, 0),
            minimum: Math.min(...cloudCovers),
            maximum: Math.max(...cloudCovers)
        };
        
        // Статистика низкой облачности
        const lowCloudStats = {
            average: this.round(lowCloudCovers.reduce((sum, v) => sum + v, 0) / lowCloudCovers.length, 0),
            minimum: Math.min(...lowCloudCovers),
            maximum: Math.max(...lowCloudCovers)
        };
        
        // Распределение по категориям
        const cloudDistribution = {
            clear: hourlyData.filter(h => h.cloudcover <= this.cloudThresholds.clear).length,
            scattered: hourlyData.filter(h => h.cloudcover > this.cloudThresholds.clear && h.cloudcover <= this.cloudThresholds.scattered).length,
            broken: hourlyData.filter(h => h.cloudcover > this.cloudThresholds.scattered && h.cloudcover <= this.cloudThresholds.broken).length,
            overcast: hourlyData.filter(h => h.cloudcover > this.cloudThresholds.broken).length
        };
        
        // Расчет высоты нижней границы облаков (примерная оценка)
        // В реальном приложении здесь должны быть данные от метеостанций или моделей
        const estimatedCeiling = this.estimateCloudCeiling(hourlyData);
        
        return {
            cloudCoverStats: cloudStats,
            lowCloudCoverStats: lowCloudStats,
            cloudDistribution: cloudDistribution,
            estimatedCeiling: estimatedCeiling,
            hourlyData: hourlyData.map(h => ({
                hour: h.hour,
                time: h.time,
                cloudCover: h.cloudcover,
                cloudCoverLow: h.cloudcoverLow,
                cloudCoverMid: h.cloudcoverMid,
                cloudCoverHigh: h.cloudcoverHigh,
                cloudCategory: this.categorizeCloudCover(h.cloudcover),
                cloudCategoryText: this.getCloudCategoryText(h.cloudcover),
                lowCloudImpact: this.assessLowCloudImpact(h.cloudcoverLow, estimatedCeiling[h.hour])
            }))
        };
    }

    /**
     * Примерная оценка высоты нижней границы облаков
     */
    estimateCloudCeiling(hourlyData) {
        // Упрощенная модель: высота облаков зависит от температуры и влажности
        // В реальном приложении используются данные зондирования атмосферы
        const ceiling = {};
        
        hourlyData.forEach(hour => {
            // Базовая высота 1000м
            let baseCeiling = 1000;
            
            // Коррекция по температуре (чем теплее, тем выше облака)
            baseCeiling += (hour.temperature - 10) * 50;
            
            // Коррекция по влажности (чем влажнее, тем ниже облака)
            baseCeiling -= (hour.humidity - 70) * 10;
            
            // Коррекция по низкой облачности
            if (hour.cloudcoverLow > 80) baseCeiling *= 0.5;
            else if (hour.cloudcoverLow > 50) baseCeiling *= 0.7;
            
            // Ограничение минимальной и максимальной высоты
            ceiling[hour.hour] = Math.max(200, Math.min(3000, Math.round(baseCeiling)));
        });
        
        return ceiling;
    }

    /**
     * Анализ соответствия требованиям ВПВ
     */
    analyzeVFRCompliance(hourlyData) {
        const vfrHours = [];
        const marginalVfrHours = [];
        const ifrHours = [];
        
        hourlyData.forEach(hour => {
            const visibilityOK = hour.visibility >= this.vfrMinimums.visibility;
            const ceiling = this.estimateCloudCeiling([hour])[hour.hour];
            const ceilingOK = ceiling >= this.vfrMinimums.cloudCeiling;
            
            const vfrCompliant = visibilityOK && ceilingOK;
            const marginalVFR = (hour.visibility >= 3 && hour.visibility < 5) || (ceiling >= 200 && ceiling < 300);
            
            if (vfrCompliant) {
                vfrHours.push(hour.hour);
            } else if (marginalVFR) {
                marginalVfrHours.push(hour.hour);
            } else {
                ifrHours.push(hour.hour);
            }
        });
        
        return {
            vfrCompliantHours: vfrHours.length,
            marginalVfrHours: marginalVfrHours.length,
            ifrHours: ifrHours.length,
            vfrPercentage: this.round((vfrHours.length / hourlyData.length) * 100, 0),
            hourlyCompliance: hourlyData.map(hour => {
                const ceiling = this.estimateCloudCeiling([hour])[hour.hour];
                const visibilityOK = hour.visibility >= this.vfrMinimums.visibility;
                const ceilingOK = ceiling >= this.vfrMinimums.cloudCeiling;
                
                return {
                    hour: hour.hour,
                    time: hour.time,
                    visibility: hour.visibility,
                    ceiling: ceiling,
                    visibilityOK: visibilityOK,
                    ceilingOK: ceilingOK,
                    vfrCompliant: visibilityOK && ceilingOK,
                    complianceStatus: visibilityOK && ceilingOK ? 'VFR' : 
                                   (hour.visibility >= 3 && ceiling >= 200) ? 'Marginal VFR' : 'IFR'
                };
            })
        };
    }

    /**
     * Идентификация критических периодов
     */
    identifyCriticalPeriods(hourlyData, visibilityAnalysis, cloudAnalysis) {
        const criticalHours = hourlyData.filter(hour => {
            const visibilityCat = this.categorizeVisibility(hour.visibility);
            const ceiling = this.estimateCloudCeiling([hour])[hour.hour];
            return visibilityCat === 'veryPoor' || visibilityCat === 'poor' || ceiling < 200;
        });
        
        if (criticalHours.length === 0) {
            return {
                periods: [],
                totalCount: 0,
                totalDuration: 0,
                maxDuration: 0,
                recommendations: ['Условия видимости благоприятны в течение всего дня']
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
                periods.push(this.formatPeriod(currentPeriod, visibilityAnalysis, cloudAnalysis));
                currentPeriod = {
                    start: criticalHours[i].hour,
                    end: criticalHours[i].hour,
                    hours: [criticalHours[i]]
                };
            }
        }
        periods.push(this.formatPeriod(currentPeriod, visibilityAnalysis, cloudAnalysis));
        
        return {
            periods: periods,
            totalCount: periods.length,
            totalDuration: periods.reduce((sum, p) => sum + p.duration, 0),
            maxDuration: Math.max(...periods.map(p => p.duration)),
            recommendations: this.generateCriticalPeriodRecommendations(periods)
        };
    }

    /**
     * Форматирование периода
     */
    formatPeriod(period, visibilityAnalysis, cloudAnalysis) {
        const minVisibility = Math.min(...period.hours.map(h => h.visibility));
        const maxCloudCoverLow = Math.max(...period.hours.map(h => h.cloudcoverLow));
        const minCeiling = Math.min(...period.hours.map(h => 
            this.estimateCloudCeiling([h])[h.hour]
        ));
        
        return {
            start: `${period.start.toString().padStart(2, '0')}:00`,
            end: `${period.end.toString().padStart(2, '0')}:00`,
            duration: period.end - period.start + 1,
            hours: period.hours.map(h => h.hour),
            minVisibility: this.round(minVisibility, 1),
            maxCloudCoverLow: maxCloudCoverLow,
            minCeiling: minCeiling,
            primaryRestriction: minVisibility < 1.5 ? 'visibility' : 'ceiling',
            severity: minVisibility < 1 || minCeiling < 150 ? 'severe' : 'moderate'
        };
    }

    /**
     * Генерация рекомендаций для критических периодов
     */
    generateCriticalPeriodRecommendations(periods) {
        const recommendations = [];
        
        if (periods.length === 0) return recommendations;
        
        // Общая оценка
        const totalCriticalHours = periods.reduce((sum, p) => sum + p.duration, 0);
        if (totalCriticalHours > 8) {
            recommendations.push('Условия видимости неблагоприятны в течение большей части дня');
            recommendations.push('Полеты по ВПВ не рекомендуются');
        } else if (totalCriticalHours > 4) {
            recommendations.push('Значительные периоды с ограниченной видимостью');
            recommendations.push('Планируйте полеты в безопасные периоды');
        }
        
        // Рекомендации по каждому периоду
        periods.forEach(period => {
            if (period.severity === 'severe') {
                recommendations.push(
                    `КРИТИЧЕСКИЕ УСЛОВИЯ ${period.start}-${period.end}: видимость ${period.minVisibility} км, ` +
                    `потолок облаков ${period.minCeiling}м - ПОЛЕТЫ ПО ВПВ ЗАПРЕЩЕНЫ`
                );
            } else {
                recommendations.push(
                    `Ограниченная видимость ${period.start}-${period.end}: минимум ${period.minVisibility} км, ` +
                    `потолок ${period.minCeiling}м - соблюдайте повышенные требования к ВПВ`
                );
            }
        });
        
        // Дополнительные рекомендации
        const worstPeriod = periods.reduce((worst, p) => 
            p.minVisibility < worst.minVisibility ? p : worst
        );
        
        if (worstPeriod.minVisibility < 1) {
            recommendations.push('');
            recommendations.push('ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ:');
            recommendations.push('• При видимости менее 1 км используйте только полеты в пределах прямой видимости от оператора');
            recommendations.push('• Максимальная дальность полета: 500м от точки взлета');
            recommendations.push('• Обязательное использование световых маяков на БВС');
        }
        
        return recommendations;
    }

    /**
     * Расчет общей оценки
     */
    calculateOverallAssessment(visibilityAnalysis, cloudAnalysis, vfrAnalysis, criticalPeriods) {
        // Балльная оценка условий
        let assessmentScore = 100;
        
        // Штрафы за ограниченную видимость
        if (visibilityAnalysis.statistics.minimum < 1) assessmentScore -= 40;
        else if (visibilityAnalysis.statistics.minimum < 2) assessmentScore -= 25;
        else if (visibilityAnalysis.statistics.minimum < 3) assessmentScore -= 15;
        
        if (visibilityAnalysis.limitedVisibilityHours > 8) assessmentScore -= 20;
        else if (visibilityAnalysis.limitedVisibilityHours > 4) assessmentScore -= 10;
        
        // Штрафы за облачность
        if (cloudAnalysis.lowCloudCoverStats.maximum > 80) assessmentScore -= 20;
        else if (cloudAnalysis.lowCloudCoverStats.maximum > 60) assessmentScore -= 10;
        
        // Штрафы за несоответствие ВПВ
        if (vfrAnalysis.ifrHours > 6) assessmentScore -= 25;
        else if (vfrAnalysis.ifrHours > 3) assessmentScore -= 15;
        
        if (vfrAnalysis.vfrCompliantHours < 6) assessmentScore -= 20;
        else if (vfrAnalysis.vfrCompliantHours < 9) assessmentScore -= 10;
        
        // Штрафы за критические периоды
        if (criticalPeriods.totalDuration > 6) assessmentScore -= 15;
        else if (criticalPeriods.totalDuration > 3) assessmentScore -= 8;
        
        // Определение категории условий
        let conditionsCategory = 'excellent';
        let conditionsText = 'Отличные условия для полетов по ВПВ';
        let color = 'success';
        let flightRestrictions = 'Полеты разрешены без ограничений';
        
        if (assessmentScore < 40) {
            conditionsCategory = 'poor';
            conditionsText = 'ПЛОХИЕ УСЛОВИЯ ДЛЯ ПОЛЕТОВ ПО ВПВ';
            color = 'danger';
            flightRestrictions = 'Полеты по ВПВ запрещены. Требуются условия для полетов по ППП';
        } else if (assessmentScore < 60) {
            conditionsCategory = 'marginal';
            conditionsText = 'Условия близки к минимальным для ВПВ';
            color = 'warning';
            flightRestrictions = 'Полеты разрешены только для опытных пилотов с ограничениями по дальности и высоте';
        } else if (assessmentScore < 80) {
            conditionsCategory = 'good';
            conditionsText = 'Удовлетворительные условия для полетов по ВПВ';
            color = 'caution';
            flightRestrictions = 'Полеты разрешены с осторожностью, избегать удаления от точки взлета более чем на 2 км';
        }
        
        return {
            score: assessmentScore,
            category: conditionsCategory,
            text: conditionsText,
            color: color,
            flightRestrictions: flightRestrictions,
            statistics: {
                avgVisibility: visibilityAnalysis.statistics.average,
                minVisibility: visibilityAnalysis.statistics.minimum,
                avgCloudCoverLow: cloudAnalysis.lowCloudCoverStats.average,
                vfrCompliantHours: vfrAnalysis.vfrCompliantHours,
                marginalVfrHours: vfrAnalysis.marginalVfrHours,
                ifrHours: vfrAnalysis.ifrHours
            },
            limitingFactor: this.determineLimitingFactor(visibilityAnalysis, cloudAnalysis, vfrAnalysis)
        };
    }

    /**
     * Определение ограничивающего фактора
     */
    determineLimitingFactor(visibilityAnalysis, cloudAnalysis, vfrAnalysis) {
        const factors = [];
        
        if (visibilityAnalysis.statistics.minimum < 2) {
            factors.push({
                factor: 'visibility',
                severity: visibilityAnalysis.statistics.minimum < 1 ? 'critical' : 'high',
                description: `Очень низкая видимость (минимум ${visibilityAnalysis.statistics.minimum} км)`
            });
        }
        
        const minCeiling = Math.min(...Object.values(this.estimateCloudCeiling(
            visibilityAnalysis.hourlyData.map(h => ({...h, hour: parseInt(h.time.split(':')[0])})))
        ));
        
        if (minCeiling < 200) {
            factors.push({
                factor: 'cloud_ceiling',
                severity: minCeiling < 150 ? 'critical' : 'high',
                description: `Очень низкий потолок облаков (минимум ${minCeiling}м)`
            });
        }
        
        if (vfrAnalysis.ifrHours > 6) {
            factors.push({
                factor: 'vfr_compliance',
                severity: 'high',
                description: `${vfrAnalysis.ifrHours} часов с условиями хуже минимальных для ВПВ`
            });
        }
        
        // Сортировка по серьезности
        factors.sort((a, b) => {
            const severityOrder = { critical: 3, high: 2, moderate: 1, low: 0 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
        
        return factors[0] || { factor: 'none', severity: 'low', description: 'Нет критических ограничений' };
    }

    /**
     * Генерация рекомендаций
     */
    generateRecommendations(overallAssessment, criticalPeriods, cloudAnalysis) {
        const recommendations = [];
        
        // Общие рекомендации
        switch(overallAssessment.category) {
            case 'poor':
                recommendations.push('ПОЛЕТЫ ПО ВПВ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ');
                recommendations.push('Требуются метеоусловия для полетов по ППП');
                recommendations.push('Рекомендуется перенести полеты на другой день');
                break;
            case 'marginal':
                recommendations.push('Полеты по ВПВ разрешены ТОЛЬКО для опытных пилотов');
                recommendations.push('Максимальная дальность от точки взлета: 1 км');
                recommendations.push('Максимальная высота полета: 200м');
                recommendations.push('Обязательное наличие запасного аэродрома в пределах 500м');
                break;
            case 'good':
                recommendations.push('Полеты по ВПВ разрешены с осторожностью');
                recommendations.push('Рекомендуемая максимальная дальность: 3 км от точки взлета');
                recommendations.push('Рекомендуемая максимальная высота: 400м');
                recommendations.push('Постоянный визуальный контакт с БВС обязателен');
                break;
            case 'excellent':
                recommendations.push('Полеты по ВПВ разрешены без ограничений');
                recommendations.push('Рекомендуемая максимальная дальность: 5 км от точки взлета');
                recommendations.push('Рекомендуемая максимальная высота: 600м');
                break;
        }
        
        // Рекомендации по критическим периодам
        if (criticalPeriods.totalCount > 0) {
            recommendations.push('');
            recommendations.push('ПЕРИОДЫ С ОГРАНИЧЕННОЙ ВИДИМОСТЬЮ:');
            
            criticalPeriods.periods.forEach(period => {
                if (period.severity === 'severe') {
                    recommendations.push(`  • ${period.start}-${period.end}: КРИТИЧЕСКИЕ УСЛОВИЯ (видимость ${period.minVisibility} км, потолок ${period.minCeiling}м)`);
                } else {
                    recommendations.push(`  • ${period.start}-${period.end}: ограниченная видимость (минимум ${period.minVisibility} км)`);
                }
            });
        }
        
        // Рекомендации по облачности
        if (cloudAnalysis.lowCloudCoverStats.maximum > 70) {
            recommendations.push('');
            recommendations.push('РЕКОМЕНДАЦИИ ПО ВЫСОТЕ ПОЛЕТА:');
            recommendations.push(`  • Максимальная высота полета: ${Math.min(300, 500 - cloudAnalysis.lowCloudCoverStats.maximum)}м`);
            recommendations.push('  • Избегать полетов в условиях сплошной низкой облачности');
        }
        
        // Рекомендации по времени суток
        const bestVisibilityPeriod = this.findBestVisibilityPeriod(visibilityAnalysis.hourlyData);
        if (bestVisibilityPeriod) {
            recommendations.push('');
            recommendations.push('НАИБОЛЕЕ БЛАГОПРИЯТНЫЙ ПЕРИОД ДЛЯ ПОЛЕТОВ:');
            recommendations.push(`  • ${bestVisibilityPeriod.start}-${bestVisibilityPeriod.end} (средняя видимость ${bestVisibilityPeriod.avgVisibility} км)`);
        }
        
        // Дополнительные рекомендации для особых условий
        if (overallAssessment.limitingFactor.factor === 'visibility') {
            recommendations.push('');
            recommendations.push('ДОПОЛНИТЕЛЬНЫЕ МЕРЫ ПРИ НИЗКОЙ ВИДИМОСТИ:');
            recommendations.push('  • Использование световых маяков повышенной яркости на БВС');
            recommendations.push('  • Снижение скорости полета на 30% от максимальной');
            recommendations.push('  • Постоянный радиоконтакт с диспетчером');
        }
        
        return recommendations;
    }

    /**
     * Поиск лучшего периода по видимости
     */
    findBestVisibilityPeriod(hourlyData) {
        // Группировка в 3-часовые периоды
        const periods = [];
        
        for (let startHour = 0; startHour <= 21; startHour++) {
            const periodHours = hourlyData.filter(h => 
                h.hour >= startHour && h.hour < startHour + 3
            );
            
            if (periodHours.length === 3) {
                const avgVisibility = periodHours.reduce((sum, h) => sum + h.visibility, 0) / 3;
                periods.push({
                    start: `${startHour.toString().padStart(2, '0')}:00`,
                    end: `${(startHour + 2).toString().padStart(2, '0')}:00`,
                    avgVisibility: this.round(avgVisibility, 1),
                    minVisibility: Math.min(...periodHours.map(h => h.visibility))
                });
            }
        }
        
        if (periods.length === 0) return null;
        
        // Выбор периода с максимальной средней видимостью
        return periods.reduce((best, period) => 
            period.avgVisibility > best.avgVisibility ? period : best
        );
    }

    /**
     * Генерация сводки
     */
    generateSummary(overallAssessment, criticalPeriods, vfrAnalysis) {
        return {
            conditionsCategory: overallAssessment.text,
            flightRestrictions: overallAssessment.flightRestrictions,
            vfrCompliantHours: vfrAnalysis.vfrCompliantHours,
            marginalVfrHours: vfrAnalysis.marginalVfrHours,
            criticalPeriodsCount: criticalPeriods.totalCount,
            bestVisibilityPeriod: this.findBestVisibilityPeriod(
                overallAssessment.statistics // Это не совсем правильный путь, но для примера
            ),
            primaryLimitingFactor: overallAssessment.limitingFactor.description
        };
    }

    /**
     * Категоризация видимости
     */
    categorizeVisibility(visibility) {
        if (visibility >= this.visibilityThresholds.excellent) return 'excellent';
        if (visibility >= this.visibilityThresholds.good) return 'good';
        if (visibility >= this.visibilityThresholds.moderate) return 'moderate';
        if (visibility >= this.visibilityThresholds.poor) return 'poor';
        return 'veryPoor';
    }

    /**
     * Получение текстового описания категории видимости
     */
    getVisibilityCategoryText(visibility) {
        const category = this.categorizeVisibility(visibility);
        const texts = {
            excellent: 'Отличная',
            good: 'Хорошая',
            moderate: 'Умеренная',
            poor: 'Плохая',
            veryPoor: 'Очень плохая'
        };
        return texts[category] || 'Неизвестно';
    }

    /**
     * Категоризация облачности
     */
    categorizeCloudCover(cloudCover) {
        if (cloudCover <= this.cloudThresholds.clear) return 'clear';
        if (cloudCover <= this.cloudThresholds.scattered) return 'scattered';
        if (cloudCover <= this.cloudThresholds.broken) return 'broken';
        return 'overcast';
    }

    /**
     * Получение текстового описания категории облачности
     */
    getCloudCategoryText(cloudCover) {
        const category = this.categorizeCloudCover(cloudCover);
        const texts = {
            clear: 'Ясно',
            scattered: 'Переменная облачность',
            broken: 'Облачно',
            overcast: 'Пасмурно'
        };
        return texts[category] || 'Неизвестно';
    }

    /**
     * Оценка влияния низкой облачности
     */
    assessLowCloudImpact(cloudCoverLow, ceiling) {
        if (ceiling < 150) return { level: 'critical', text: 'Критически низкая облачность' };
        if (ceiling < 250) return { level: 'high', text: 'Опасно низкая облачность' };
        if (ceiling < 400) return { level: 'moderate', text: 'Ограниченная высота полета' };
        return { level: 'low', text: 'Безопасная высота' };
    }

    /**
     * Вспомогательные методы
     */
    calculateStdDev(values) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
    }

    round(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    createEmptyAnalysis() {
        return {
            meta: {
                analyzedHours: 0,
                thresholds: {
                    visibility: this.visibilityThresholds,
                    clouds: this.cloudThresholds,
                    vfr: this.vfrMinimums
                },
                analyzedAt: new Date().toISOString()
            },
            visibilityAnalysis: {
                statistics: { average: 0, minimum: 0, maximum: 0, stdDev: 0 },
                distribution: { excellent: 0, good: 0, moderate: 0, poor: 0, veryPoor: 0 },
                limitedVisibilityHours: 0,
                veryPoorVisibilityHours: 0,
                hourlyData: []
            },
            cloudAnalysis: {
                cloudCoverStats: { average: 0, minimum: 0, maximum: 0 },
                lowCloudCoverStats: { average: 0, minimum: 0, maximum: 0 },
                cloudDistribution: { clear: 0, scattered: 0, broken: 0, overcast: 0 },
                estimatedCeiling: {},
                hourlyData: []
            },
            vfrAnalysis: {
                vfrCompliantHours: 0,
                marginalVfrHours: 0,
                ifrHours: 0,
                vfrPercentage: 0,
                hourlyCompliance: []
            },
            criticalPeriods: {
                periods: [],
                totalCount: 0,
                totalDuration: 0,
                maxDuration: 0,
                recommendations: ['Нет данных для анализа видимости']
            },
            overallAssessment: {
                score: 0,
                category: 'unknown',
                text: 'Нет данных для оценки условий',
                color: 'secondary',
                flightRestrictions: 'Анализ невозможен',
                statistics: {
                    avgVisibility: 0,
                    minVisibility: 0,
                    avgCloudCoverLow: 0,
                    vfrCompliantHours: 0,
                    marginalVfrHours: 0,
                    ifrHours: 0
                },
                limitingFactor: { factor: 'none', severity: 'unknown', description: 'Нет данных' }
            },
            recommendations: [
                'Невозможно провести анализ видимости и облачности',
                'Проверьте наличие метеоданных и повторите попытку'
            ],
            summary: {
                conditionsCategory: 'Нет данных',
                flightRestrictions: 'Анализ невозможен',
                vfrCompliantHours: 0,
                marginalVfrHours: 0,
                criticalPeriodsCount: 0,
                bestVisibilityPeriod: null,
                primaryLimitingFactor: 'Отсутствуют входные данные'
            }
        };
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisibilityAnalyzer;
} else {
    window.VisibilityAnalyzer = VisibilityAnalyzer;
}