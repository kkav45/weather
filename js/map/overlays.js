/**
 * Управление наложениями на карту
 * Включает легенды, информационные панели и элементы управления
 */
class MapOverlaysManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.overlays = new Map();
        this.init();
    }

    init() {
        this.createLegendOverlay();
        this.createInfoOverlay();
        this.createScaleOverlay();
    }

    // Создание легенды карты
    createLegendOverlay() {
        const container = document.createElement('div');
        container.className = 'map-legend';
        container.innerHTML = `
            <div class="legend-header">
                <i class="fas fa-layer-group"></i>
                <span>Легенда слоев</span>
                <button class="legend-toggle" title="Скрыть/показать легенду">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="legend-content">
                <div class="legend-section">
                    <h4>Ветровой профиль</h4>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #3498db;"></span>
                        <span>10м высота</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #9b59b6;"></span>
                        <span>80м высота</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #e74c3c;"></span>
                        <span>120м высота</span>
                    </div>
                </div>
                <div class="legend-section">
                    <h4>Видимость</h4>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(231, 76, 60, 0.7);"></span>
                        <span>&lt;1 км (очень плохая)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(243, 156, 18, 0.7);"></span>
                        <span>1-3 км (плохая)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(241, 196, 15, 0.7);"></span>
                        <span>3-5 км (умеренная)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                        <span>&gt;5 км (хорошая)</span>
                    </div>
                </div>
                <div class="legend-section">
                    <h4>Риск обледенения</h4>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(231, 76, 60, 0.7);"></span>
                        <span>Высокий</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(243, 156, 18, 0.7);"></span>
                        <span>Умеренный</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                        <span>Низкий</span>
                    </div>
                </div>
            </div>
        `;
        
        // Добавление на карту
        this.overlays.set('legend', container);
        document.body.appendChild(container);
        
        // Обработчик переключения видимости
        container.querySelector('.legend-toggle').addEventListener('click', () => {
            const content = container.querySelector('.legend-content');
            const icon = container.querySelector('.legend-toggle i');
            const isHidden = content.style.display === 'none';
            
            content.style.display = isHidden ? 'block' : 'none';
            icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
    }

    // Создание информационной панели
    createInfoOverlay() {
        const container = document.createElement('div');
        container.className = 'map-info-panel';
        container.innerHTML = `
            <div class="info-panel-header">
                <i class="fas fa-info-circle"></i>
                <span>Информация о карте</span>
                <button class="info-panel-close" title="Закрыть">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="info-panel-content">
                <div class="info-item">
                    <span class="info-label">Центр карты:</span>
                    <span class="info-value" id="mapCenterCoords">55.7558°N, 37.6173°E</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Масштаб:</span>
                    <span class="info-value" id="mapScale">1 : 50 000</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Активные слои:</span>
                    <span class="info-value" id="activeLayersCount">2</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Полигонов:</span>
                    <span class="info-value" id="polygonsCount">0</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Маршрутов:</span>
                    <span class="info-value" id="routesCount">0</span>
                </div>
            </div>
            <div class="info-panel-footer">
                <button class="btn-sm btn-primary" id="updateMapInfo">
                    <i class="fas fa-sync-alt"></i> Обновить
                </button>
                <button class="btn-sm btn-outline" id="exportMapScreenshot">
                    <i class="fas fa-image"></i> Скриншот
                </button>
            </div>
        `;
        
        // Добавление на карту
        this.overlays.set('info', container);
        document.body.appendChild(container);
        
        // Настройка обработчиков
        this.setupInfoPanelHandlers();
    }

    setupInfoPanelHandlers() {
        // Обновление информации о карте
        document.getElementById('updateMapInfo')?.addEventListener('click', () => {
            this.updateMapInfo();
        });
        
        // Экспорт скриншота карты
        document.getElementById('exportMapScreenshot')?.addEventListener('click', () => {
            this.mapManager.exportMapAsImage();
        });
        
        // Закрытие панели
        document.querySelector('.info-panel-close')?.addEventListener('click', () => {
            document.querySelector('.map-info-panel').style.display = 'none';
        });
    }

    // Обновление информации о карте
    updateMapInfo() {
        const center = this.mapManager.getMapCenter();
        document.getElementById('mapCenterCoords').textContent = 
            `${center[1].toFixed(4)}°N, ${center[0].toFixed(4)}°E`;
        
        const zoom = this.mapManager.map.getView().getZoom();
        const scale = this.calculateScale(zoom);
        document.getElementById('mapScale').textContent = `1 : ${scale.toLocaleString()}`;
        
        document.getElementById('activeLayersCount').textContent = 
            this.mapManager.app.state.weatherData ? '3+' : '0';
        
        document.getElementById('polygonsCount').textContent = 
            this.mapManager.app.state.polygons?.length || 0;
        
        document.getElementById('routesCount').textContent = 
            this.mapManager.app.state.routes?.length || 0;
    }

    // Расчет масштаба карты
    calculateScale(zoom) {
        // Упрощенный расчет масштаба на основе зума
        // Более точный расчет требует учета разрешения экрана и проекции
        const baseScale = 50000000;
        return Math.round(baseScale / Math.pow(2, zoom));
    }

    // Создание масштабной линейки
    createScaleOverlay() {
        // Масштабная линейка уже добавлена через контролы OpenLayers
        // ol.control.ScaleLine()
    }

    // Показ информационной панели
    showInfoPanel() {
        const panel = this.overlays.get('info');
        if (panel) {
            panel.style.display = 'block';
            this.updateMapInfo();
        }
    }

    // Скрытие информационной панели
    hideInfoPanel() {
        const panel = this.overlays.get('info');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // Переключение видимости легенды
    toggleLegend() {
        const legend = this.overlays.get('legend');
        if (legend) {
            const content = legend.querySelector('.legend-content');
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            
            const icon = legend.querySelector('.legend-toggle i');
            icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        }
    }

    // Обновление легенды на основе активных слоев
    updateLegend() {
        const legend = this.overlays.get('legend');
        if (!legend) return;
        
        const content = legend.querySelector('.legend-content');
        content.innerHTML = '';
        
        // Обновление на основе активных слоев
        const activeLayers = this.mapManager.app.state.activeLayers || [];
        
        if (activeLayers.includes('windProfile')) {
            this.addWindLegend(content);
        }
        
        if (activeLayers.includes('visibility')) {
            this.addVisibilityLegend(content);
        }
        
        if (activeLayers.includes('icingRisk')) {
            this.addIcingLegend(content);
        }
    }

    // Добавление легенды ветра
    addWindLegend(container) {
        const section = document.createElement('div');
        section.className = 'legend-section';
        section.innerHTML = `
            <h4>Ветровой профиль</h4>
            <div class="legend-item">
                <span class="legend-color" style="background: #3498db;"></span>
                <span>10м: слабый</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #2980b9;"></span>
                <span>10м: умеренный</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #1a5276;"></span>
                <span>10м: сильный</span>
            </div>
        `;
        container.appendChild(section);
    }

    // Добавление легенды видимости
    addVisibilityLegend(container) {
        const section = document.createElement('div');
        section.className = 'legend-section';
        section.innerHTML = `
            <h4>Видимость</h4>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(231, 76, 60, 0.7);"></span>
                <span>&lt;1 км</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(243, 156, 18, 0.7);"></span>
                <span>1-3 км</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                <span>&gt;5 км</span>
            </div>
        `;
        container.appendChild(section);
    }

    // Добавление легенды обледенения
    addIcingLegend(container) {
        const section = document.createElement('div');
        section.className = 'legend-section';
        section.innerHTML = `
            <h4>Риск обледенения</h4>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(231, 76, 60, 0.7);"></span>
                <span>Высокий</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(243, 156, 18, 0.7);"></span>
                <span>Умеренный</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                <span>Низкий</span>
            </div>
        `;
        container.appendChild(section);
    }

    // Очистка всех наложений
    clearAllOverlays() {
        this.overlays.forEach((overlay, key) => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        });
        this.overlays.clear();
    }
}