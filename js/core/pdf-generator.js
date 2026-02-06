/**
 * Генератор PDF отчетов
 * Создает профессиональные отчеты о метеоусловиях для полетов БВС
 */
class PDFGenerator {
    constructor(app) {
        this.app = app;
        this.reportTemplate = null;
        this.currentReportData = null;
    }

    // Инициализация формы генератора отчетов
    initForm() {
        // Загрузка списка маршрутов в форму
        const routeSelect = document.getElementById('reportRoute');
        if (routeSelect && this.app.state.routes.length > 0) {
            routeSelect.innerHTML = '<option value="">Выберите маршрут</option>';
            this.app.state.routes.forEach(route => {
                const option = document.createElement('option');
                option.value = route.id;
                option.textContent = route.name;
                routeSelect.appendChild(option);
            });
            
            // Установка сохраненного маршрута по умолчанию
            if (this.app.state.settings.defaultRoute) {
                routeSelect.value = this.app.state.settings.defaultRoute;
            }
        }
        
        // Установка текущей даты
        const dateInput = document.getElementById('reportDate');
        if (dateInput) {
            dateInput.value = this.app.state.currentDate;
        }
        
        // Настройка обработчиков кнопок
        this.setupFormEventListeners();
    }

    setupFormEventListeners() {
        // Кнопка "Далее" на шаге 1
        const nextToStep2 = document.getElementById('nextToStep2');
        if (nextToStep2) {
            nextToStep2.addEventListener('click', () => this.validateAndNextStep(1));
        }
        
        // Кнопки навигации по шагам
        document.querySelectorAll('.step-actions .btn-secondary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const step = parseInt(e.target.closest('.generator-step').id.replace('step', ''));
                this.prevStep(step);
            });
        });
        
        document.querySelectorAll('.step-actions .btn-primary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const step = parseInt(e.target.closest('.generator-step').id.replace('step', ''));
                this.validateAndNextStep(step);
            });
        });
        
        // Кнопка генерации предпросмотра
        const generatePreviewBtn = document.getElementById('generatePreview');
        if (generatePreviewBtn) {
            generatePreviewBtn.addEventListener('click', () => this.generatePreview());
        }
        
        // Кнопки скачивания
        const downloadPdfBtn = document.getElementById('downloadPdf');
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => this.generateAndDownloadPdf());
        }
        
        const downloadDocxBtn = document.getElementById('downloadDocx');
        if (downloadDocxBtn) {
            downloadDocxBtn.addEventListener('click', () => this.downloadDocx());
        }
    }

    validateAndNextStep(currentStep) {
        if (currentStep === 1 && !this.validateStep1()) {
            this.app.showNotification('Пожалуйста, заполните все обязательные поля', 'Ошибка', 'error');
            return;
        }
        
        this.nextStep(currentStep);
    }

    validateStep1() {
        const route = document.getElementById('reportRoute')?.value;
        const date = document.getElementById('reportDate')?.value;
        return route && date;
    }

    nextStep(currentStep) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        document.getElementById(`step${currentStep + 1}`).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    prevStep(currentStep) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        document.getElementById(`step${currentStep - 1}`).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Генерация предпросмотра отчета
    async generatePreview() {
        const previewContainer = document.getElementById('reportPreview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = `
            <div class="loading-preview">
                <i class="fas fa-spinner fa-spin fa-3x"></i>
                <p>Генерация предпросмотра отчета...</p>
            </div>
        `;
        
        try {
            // Сбор данных для отчета
            this.currentReportData = await this.collectReportData();
            
            // Генерация HTML предпросмотра
            const previewHtml = this.generatePreviewHtml();
            previewContainer.innerHTML = previewHtml;
            
            this.app.showNotification('Предпросмотр отчета успешно сгенерирован', 'Успех', 'success');
            this.app.logEvent('report_preview_generated');
            
        } catch (error) {
            console.error('Ошибка генерации предпросмотра:', error);
            previewContainer.innerHTML = `
                <div class="preview-error">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <p>Ошибка при генерации предпросмотра</p>
                    <button class="btn-primary" onclick="window.meteoApp.pdfGenerator.generatePreview()">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                </div>
            `;
            this.app.showNotification('Ошибка при генерации предпросмотра', 'Ошибка', 'error');
        }
    }

    // Сбор данных для отчета
    async collectReportData() {
        const routeId = document.getElementById('reportRoute').value;
        const date = document.getElementById('reportDate').value;
        const pilotName = document.getElementById('pilotName').value || 'Не указан';
        const organization = document.getElementById('organization').value || 'Не указана';
        
        // Загрузка метеоданных
        let weatherData = null;
        try {
            weatherData = await this.app.dataManager.loadRouteData(routeId, date);
        } catch (error) {
            console.error('Ошибка загрузки метеоданных:', error);
            // Использование резервных данных
            weatherData = this.app.dataManager.getFallbackWeatherData(date);
        }
        
        // Получение информации о маршруте
        const route = this.app.state.routes.find(r => r.id === routeId);
        const routeLength = route ? this.calculateRouteLength(route.coordinates) : 0;
        
        return {
            metadata: {
                routeId: routeId,
                routeName: route ? route.name : 'Неизвестный маршрут',
                routeLength: routeLength.toFixed(1),
                date: date,
                formattedDate: this.formatDate(new Date(date)),
                pilotName: pilotName,
                organization: organization,
                generatedAt: new Date().toISOString()
            },
            weatherData: weatherData,
            analysis: this.analyzeRouteSafety(weatherData, routeLength),
            recommendations: this.generateRecommendations(weatherData, routeLength),
            warnings: this.generateWarnings(weatherData)
        };
    }

    // Анализ безопасности маршрута
    analyzeRouteSafety(weatherData, routeLength) {
        const summary = weatherData.summary;
        const hourly = weatherData.hourly;
        
        // Расчет максимальной допустимой дальности
        let maxDistance = 40; // базовое значение
        if (summary.maxWindGusts > 12) maxDistance = 25;
        if (summary.maxWindGusts > 15) maxDistance = 15;
        if (summary.minVisibility < 3) maxDistance = Math.min(maxDistance, 20);
        
        // Определение критических периодов
        const criticalPeriods = hourly
            .filter(h => h.safetyStatus.level >= 2)
            .map(h => h.time);
        
        // Определение статуса
        let status = 'safe';
        let rating = summary.overallSafety.rating;
        
        if (summary.overallSafety.level >= 2) {
            status = 'danger';
            rating = Math.max(30, rating - 20);
        } else if (summary.overallSafety.level === 1) {
            status = 'warning';
            rating = Math.max(60, rating - 10);
        }
        
        // Расчет окна безопасности
        const safeHours = hourly.filter(h => h.safetyStatus.level === 0);
        const safetyWindow = safeHours.length > 0 
            ? `${safeHours[0].time} - ${safeHours[safeHours.length - 1].time}`
            : 'Нет безопасного окна';
        
        return {
            status: status,
            rating: rating,
            safetyWindow: safetyWindow,
            maxDistance: maxDistance,
            flightHeight: this.recommendFlightHeight(weatherData),
            criticalPeriods: criticalPeriods,
            windRisk: this.assessWindRisk(summary.maxWindGusts),
            visibilityRisk: this.assessVisibilityRisk(summary.minVisibility),
            icingRisk: this.assessIcingRisk(hourly)
        };
    }

    // Генерация рекомендаций
    generateRecommendations(weatherData, routeLength) {
        const analysis = this.analyzeRouteSafety(weatherData, routeLength);
        const recommendations = [];
        
        if (analysis.status === 'safe') {
            recommendations.push('Полет разрешен без ограничений');
            recommendations.push(`Рекомендуемая высота полета: ${analysis.flightHeight}`);
            recommendations.push(`Максимальная дальность: ${analysis.maxDistance} км`);
            recommendations.push(`Безопасное окно для полета: ${analysis.safetyWindow}`);
        } else if (analysis.status === 'warning') {
            recommendations.push('Полет разрешен с ограничениями');
            recommendations.push(`Максимальная дальность: ${analysis.maxDistance} км от точки взлета`);
            recommendations.push(`Высота полета: ${analysis.flightHeight}`);
            recommendations.push('Точка принятия решения: 15 км от базы');
            recommendations.push('Обязательная посадка при видимости <2 км или порывах >12 м/с');
            
            if (analysis.criticalPeriods.length > 0) {
                recommendations.push(`Избегать полетов в период: ${analysis.criticalPeriods.join(', ')}`);
            }
        } else {
            recommendations.push('ПОЛЕТ ЗАПРЕЩЕН по метеоусловиям');
            recommendations.push('Рекомендуется перенести полет на другой день или выбрать альтернативный маршрут');
            
            if (analysis.windRisk.level >= 2) {
                recommendations.push(`Высокий риск из-за сильных порывов ветра до ${analysis.windRisk.value} м/с`);
            }
            if (analysis.icingRisk.level >= 2) {
                recommendations.push('Высокий риск обледенения в определенные периоды времени');
            }
        }
        
        return recommendations;
    }

    // Генерация предупреждений
    generateWarnings(weatherData) {
        const warnings = [];
        const summary = weatherData.summary;
        const hourly = weatherData.hourly;
        
        // Проверка ветра
        if (summary.maxWindGusts > 12) {
            warnings.push(`Сильные порывы ветра до ${summary.maxWindGusts} м/с на высоте 120м`);
        }
        
        // Проверка видимости
        if (summary.minVisibility < 3) {
            warnings.push(`Ограничение видимости до ${summary.minVisibility} км в период осадков`);
        }
        
        // Проверка обледенения
        const highIcingHours = hourly.filter(h => h.icingRisk.level >= 2);
        if (highIcingHours.length > 0) {
            const periods = [...new Set(highIcingHours.map(h => h.time.split(':')[0]))].join(', ');
            warnings.push(`Повышенный риск обледенения в период ${periods}:00-${parseInt(periods.split(', ')[periods.split(', ').length - 1]) + 1}:00`);
        }
        
        // Проверка грозовой активности
        const highCapeHours = hourly.filter(h => h.cape > 1500);
        if (highCapeHours.length > 0) {
            warnings.push(`Повышенная грозовая активность (CAPE до ${Math.max(...hourly.map(h => h.cape))} J/kg)`);
        }
        
        if (warnings.length === 0) {
            warnings.push('Метеоусловия благоприятны для полета. Рекомендуется стандартный мониторинг погоды.');
        }
        
        return warnings;
    }

    // Генерация HTML предпросмотра
    generatePreviewHtml() {
        if (!this.currentReportData) return '<p>Нет данных для отображения</p>';
        
        const { metadata, weatherData, analysis, recommendations, warnings } = this.currentReportData;
        const summary = weatherData.summary;
        const daily = weatherData.daily;
        
        return `
            <div class="report-preview">
                <div class="report-header">
                    <h1>ОТЧЕТ ПО МЕТЕОАНАЛИЗУ</h1>
                    <h2>Беспилотного воздушного судна</h2>
                    <div class="report-meta">
                        <div class="meta-item">
                            <strong>Дата анализа:</strong> ${metadata.formattedDate}
                        </div>
                        <div class="meta-item">
                            <strong>Маршрут:</strong> ${metadata.routeName} (${metadata.routeLength} км)
                        </div>
                        <div class="meta-item">
                            <strong>Организация:</strong> ${metadata.organization}
                        </div>
                        <div class="meta-item">
                            <strong>Пилот:</strong> ${metadata.pilotName}
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3><i class="fas fa-chart-line"></i> Ключевые метеопараметры</h3>
                    <div class="weather-grid">
                        <div class="weather-item">
                            <div class="item-icon"><i class="fas fa-temperature-low"></i></div>
                            <div class="item-value">${summary.averageTemperature}°C</div>
                            <div class="item-label">Средняя температура</div>
                        </div>
                        <div class="weather-item">
                            <div class="item-icon"><i class="fas fa-wind"></i></div>
                            <div class="item-value">${summary.maxWindGusts} м/с</div>
                            <div class="item-label">Макс. порывы ветра</div>
                        </div>
                        <div class="weather-item">
                            <div class="item-icon"><i class="fas fa-tint"></i></div>
                            <div class="item-value">${Math.max(...weatherData.hourly.map(h => h.humidity))}%</div>
                            <div class="item-label">Макс. влажность</div>
                        </div>
                        <div class="weather-item">
                            <div class="item-icon"><i class="fas fa-eye"></i></div>
                            <div class="item-value">${summary.minVisibility} км</div>
                            <div class="item-label">Мин. видимость</div>
                        </div>
                        <div class="weather-item">
                            <div class="item-icon"><i class="fas fa-cloud-rain"></i></div>
                            <div class="item-value">${summary.totalPrecipitation} мм</div>
                            <div class="item-label">Осадки за сутки</div>
                        </div>
                        <div class="weather-item">
                            <div class="item-icon"><i class="fas fa-sun"></i></div>
                            <div class="item-value">${daily.sunrise} - ${daily.sunset}</div>
                            <div class="item-label">Восход - закат</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3><i class="fas fa-shield-alt"></i> Результаты анализа безопасности</h3>
                    <div class="analysis-card ${analysis.status}">
                        <div class="card-header">
                            <span class="status-badge ${analysis.status}">
                                ${analysis.status === 'safe' ? 'БЕЗОПАСНО' : 
                                  analysis.status === 'warning' ? 'ЕСТЬ ОГРАНИЧЕНИЯ' : 'ПОЛЕТ ЗАПРЕЩЕН'}
                            </span>
                            <span class="rating">${analysis.rating} баллов</span>
                        </div>
                        <div class="card-body">
                            <div class="analysis-row">
                                <span class="row-label">Окно безопасности:</span>
                                <span class="row-value">${analysis.safetyWindow} UTC</span>
                            </div>
                            <div class="analysis-row">
                                <span class="row-label">Макс. дальность полета:</span>
                                <span class="row-value">${analysis.maxDistance} км</span>
                            </div>
                            <div class="analysis-row">
                                <span class="row-label">Рекомендуемая высота:</span>
                                <span class="row-value">${analysis.flightHeight}</span>
                            </div>
                            ${analysis.criticalPeriods.length > 0 ? `
                            <div class="analysis-row critical">
                                <span class="row-label">Критические периоды:</span>
                                <span class="row-value">${analysis.criticalPeriods.join(', ')}</span>
                            </div>
                            ` : ''}
                            <div class="analysis-row">
                                <span class="row-label">Риск ветра:</span>
                                <span class="row-value ${analysis.windRisk.level >= 2 ? 'warning' : ''}">
                                    ${analysis.windRisk.text}
                                </span>
                            </div>
                            <div class="analysis-row">
                                <span class="row-label">Риск обледенения:</span>
                                <span class="row-value ${analysis.icingRisk.level >= 2 ? 'warning' : ''}">
                                    ${analysis.icingRisk.text}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h3><i class="fas fa-check-circle"></i> Рекомендации</h3>
                    <ul class="recommendations-list">
                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>

                <div class="report-section">
                    <h3><i class="fas fa-exclamation-triangle"></i> Предупреждения</h3>
                    <ul class="warnings-list">
                        ${warnings.map(warn => `<li>${warn}</li>`).join('')}
                    </ul>
                </div>

                <div class="report-footer">
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div class="signature-label">Подпись пилота</div>
                        <div class="signature-name">${metadata.pilotName}</div>
                    </div>
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div class="signature-label">Дата</div>
                        <div class="signature-date">${metadata.formattedDate}</div>
                    </div>
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div class="signature-label">М.П.</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Генерация и скачивание PDF
    async generateAndDownloadPdf() {
        if (!this.currentReportData) {
            this.app.showNotification('Сначала сгенерируйте предпросмотр отчета', 'Ошибка', 'warning');
            return;
        }
        
        // Показ модального окна прогресса
        this.showProgressModal(true);
        
        try {
            // Имитация прогресса
            await this.updateProgress(10, 'Подготовка данных...', 'dataStatus', 'processing');
            await this.delay(300);
            
            await this.updateProgress(30, 'Формирование структуры отчета...', 'mapStatus', 'processing');
            await this.delay(400);
            
            await this.updateProgress(60, 'Генерация содержимого...', 'chartsStatus', 'processing');
            await this.delay(500);
            
            await this.updateProgress(85, 'Сборка PDF документа...', 'pdfStatus', 'processing');
            await this.delay(600);
            
            // Создание PDF
            const pdf = await this.createPdfDocument();
            
            // Скачивание файла
            const fileName = `meteo_report_${this.currentReportData.metadata.routeName.replace(/\s+/g, '_')}_${this.currentReportData.metadata.date}.pdf`;
            pdf.save(fileName);
            
            await this.updateProgress(100, 'Готово!', 'pdfStatus', 'completed');
            
            // Закрытие модального окна через 1 секунду
            setTimeout(() => {
                this.showProgressModal(false);
            }, 1000);
            
            this.app.showNotification('Отчет успешно сгенерирован и скачан!', 'Успех', 'success');
            this.app.logEvent('pdf_report_generated', { 
                route: this.currentReportData.metadata.routeName,
                date: this.currentReportData.metadata.date
            });
            
        } catch (error) {
            console.error('Ошибка генерации PDF:', error);
            this.updateProgress(0, 'Ошибка генерации', 'pdfStatus', 'error');
            this.app.showNotification('Ошибка при генерации отчета', 'Ошибка', 'error');
        }
    }

    // Создание PDF документа
    async createPdfDocument() {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPos = 20;
        
        // Заголовок отчета
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ОТЧЕТ ПО МЕТЕОАНАЛИЗУ', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        pdf.setFontSize(14);
        pdf.text('Беспилотного воздушного судна', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        // Метаданные
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const { metadata, weatherData, analysis, recommendations, warnings } = this.currentReportData;
        const summary = weatherData.summary;
        const daily = weatherData.daily;
        
        const metaLines = [
            `Дата анализа: ${metadata.formattedDate}`,
            `Маршрут: ${metadata.routeName} (${metadata.routeLength} км)`,
            `Организация: ${metadata.organization}`,
            `Пилот: ${metadata.pilotName}`,
            `Восход/закат: ${daily.sunrise} - ${daily.sunset} UTC`,
            `Светлое время: ${this.calculateDaylightHours(daily.sunrise, daily.sunset)}`
        ];
        
        metaLines.forEach(line => {
            if (yPos > pageHeight - 30) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(line, 20, yPos);
            yPos += 7;
        });
        yPos += 10;
        
        // Ключевые метеопараметры
        if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
        }
        
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Ключевые метеопараметры:', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const weatherItems = [
            `Средняя температура: ${summary.averageTemperature}°C`,
            `Максимальные порывы ветра: ${summary.maxWindGusts} м/с`,
            `Минимальная видимость: ${summary.minVisibility} км`,
            `Осадки за сутки: ${summary.totalPrecipitation} мм`,
            `Максимальная влажность: ${Math.max(...weatherData.hourly.map(h => h.humidity))}%`,
            `Индекс грозовой активности (CAPE): до ${Math.max(...weatherData.hourly.map(h => h.cape))} J/kg`
        ];
        
        weatherItems.forEach((item, index) => {
            if (yPos > pageHeight - 30) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(item, 25 + (index % 2) * 80, yPos + Math.floor(index / 2) * 7);
        });
        
        yPos += Math.ceil(weatherItems.length / 2) * 7 + 15;
        
        // Результаты анализа
        if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
        }
        
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Результаты анализа безопасности:', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        // Статус и рейтинг
        const statusText = analysis.status === 'safe' ? 'БЕЗОПАСНО' : 
                          analysis.status === 'warning' ? 'ЕСТЬ ОГРАНИЧЕНИЯ' : 'ПОЛЕТ ЗАПРЕЩЕН';
        
        // Цветная рамка для статуса
        pdf.setFillColor(analysis.status === 'safe' ? 200 : analysis.status === 'warning' ? 255 : 255,
                        analysis.status === 'safe' ? 255 : analysis.status === 'warning' ? 240 : 200,
                        analysis.status === 'safe' ? 200 : analysis.status === 'warning' ? 200 : 200);
        pdf.rect(20, yPos, pageWidth - 40, 45, 'F');
        
        pdf.text(`Статус: ${statusText}`, 25, yPos + 8);
        pdf.text(`Рейтинг безопасности: ${analysis.rating} баллов`, 25, yPos + 15);
        pdf.text(`Окно безопасности: ${analysis.safetyWindow} UTC`, 25, yPos + 22);
        pdf.text(`Максимальная дальность полета: ${analysis.maxDistance} км`, 25, yPos + 29);
        pdf.text(`Рекомендуемая высота полета: ${analysis.flightHeight}`, 25, yPos + 36);
        yPos += 55;
        
        // Критические периоды
        if (analysis.criticalPeriods.length > 0) {
            if (yPos > pageHeight - 20) {
                pdf.addPage();
                yPos = 20;
            }
            
            pdf.text(`Критические периоды: ${analysis.criticalPeriods.join(', ')}`, 25, yPos);
            yPos += 10;
        }
        
        // Рекомендации
        if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
        }
        
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Рекомендации:', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        recommendations.forEach(rec => {
            if (yPos > pageHeight - 20) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(`• ${rec}`, 25, yPos);
            yPos += 7;
        });
        yPos += 10;
        
        // Предупреждения
        if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
        }
        
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Предупреждения:', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        warnings.forEach(warn => {
            if (yPos > pageHeight - 20) {
                pdf.addPage();
                yPos = 20;
            }
            pdf.text(`⚠ ${warn}`, 25, yPos);
            yPos += 7;
        });
        yPos += 20;
        
        // Подпись
        if (yPos > pageHeight - 50) {
            pdf.addPage();
            yPos = 20;
        }
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Подпись ответственного лица:', 20, yPos);
        pdf.line(20, yPos + 5, 100, yPos + 5);
        yPos += 15;
        
        pdf.text(`ФИО: ${metadata.pilotName}`, 20, yPos);
        yPos += 7;
        
        pdf.text(`Дата: ${metadata.formattedDate}`, 20, yPos);
        yPos += 15;
        
        pdf.text('М.П.', 20, yPos);
        
        // Добавление колонтитула на все страницы
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Отчет по метеоанализу БВС | Маршрут: ${metadata.routeName} | Дата: ${metadata.date}`, 
                    pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
        
        return pdf;
    }

    // Вспомогательные методы
    calculateRouteLength(coordinates) {
        if (coordinates.length < 2) return 0;
        
        let totalLength = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            totalLength += this.calculateDistance(
                coordinates[i][1], coordinates[i][0],
                coordinates[i+1][1], coordinates[i+1][0]
            );
        }
        return totalLength;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в км
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    recommendFlightHeight(weatherData) {
        const lowClouds = Math.min(...weatherData.hourly.map(h => h.cloudcoverLow));
        if (lowClouds > 60) return '200-300 м (ниже низкой облачности)';
        if (lowClouds > 30) return '300-500 м';
        return '400-600 м (оптимальная высота)';
    }

    assessWindRisk(maxGusts) {
        if (maxGusts > 15) return { level: 3, text: 'Критический (полет запрещен)', value: maxGusts };
        if (maxGusts > 12) return { level: 2, text: 'Высокий (ограничения по дальности)', value: maxGusts };
        if (maxGusts > 8) return { level: 1, text: 'Умеренный', value: maxGusts };
        return { level: 0, text: 'Низкий', value: maxGusts };
    }

    assessVisibilityRisk(minVisibility) {
        if (minVisibility < 1.5) return { level: 3, text: 'Критическая' };
        if (minVisibility < 3) return { level: 2, text: 'Плохая' };
        if (minVisibility < 5) return { level: 1, text: 'Умеренная' };
        return { level: 0, text: 'Хорошая' };
    }

    assessIcingRisk(hourlyData) {
        const highRiskHours = hourlyData.filter(h => h.icingRisk.level >= 2).length;
        if (highRiskHours > 4) return { level: 3, text: 'Высокий риск обледенения' };
        if (highRiskHours > 2) return { level: 2, text: 'Умеренный риск обледенения' };
        if (highRiskHours > 0) return { level: 1, text: 'Низкий риск обледенения' };
        return { level: 0, text: 'Риск обледенения отсутствует' };
    }

    calculateDaylightHours(sunrise, sunset) {
        const start = parseInt(sunrise.split(':')[0]) + parseInt(sunrise.split(':')[1]) / 60;
        const end = parseInt(sunset.split(':')[0]) + parseInt(sunset.split(':')[1]) / 60;
        const hours = Math.floor(end - start);
        const minutes = Math.round((end - start - hours) * 60);
        return `${hours}ч ${minutes}м`;
    }

    formatDate(date) {
        return date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showProgressModal(show) {
        const modal = document.getElementById('progressModal');
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
            if (show) {
                modal.classList.add('show');
                // Сброс статусов
                document.querySelectorAll('.status').forEach(el => {
                    el.textContent = 'В ожидании...';
                    el.className = 'status pending';
                });
                document.getElementById('generationProgress').style.width = '0%';
            } else {
                modal.classList.remove('show');
            }
        }
    }

    async updateProgress(percent, message, elementId, statusClass) {
        const progressElement = document.getElementById('generationProgress');
        const statusElement = document.getElementById('progressStatus');
        
        if (progressElement) progressElement.style.width = `${percent}%`;
        if (statusElement) statusElement.textContent = message;
        
        if (elementId && statusClass) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = message;
                element.className = `status ${statusClass}`;
            }
        }
        
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    downloadDocx() {
        this.app.showNotification('Экспорт в .docx будет доступен в следующей версии', 'Информация', 'info');
    }
}