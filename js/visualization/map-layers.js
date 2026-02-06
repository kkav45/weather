/**
 * Управление визуальными слоями карты
 * Создание и настройка слоев для отображения метеоданных на карте
 */
class MapLayersVisualizer {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.activeLayers = new Set();
        this.layerStyles = this.initLayerStyles();
        this.layerConfigs = this.initLayerConfigs();
    }

    /**
     * Инициализация стилей для слоев
     */
    initLayerStyles() {
        return {
            // Стиль для точек ветрового профиля
            windPoint: (feature) => {
                const windSpeed = feature.get('windSpeed') || 0;
                const windDirection = feature.get('windDirection') || 0;
                const altitude = feature.get('altitude') || 10;
                
                // Цвет в зависимости от высоты
                let color;
                if (altitude === 10) color = 'rgba(52, 152, 219, 0.8)';
                else if (altitude === 80) color = 'rgba(155, 89, 182, 0.8)';
                else color = 'rgba(231, 76, 60, 0.8)';
                
                // Размер в зависимости от скорости ветра
                const radius = Math.min(4 + windSpeed / 3, 12);
                
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        fill: new ol.style.Fill({ color: color }),
                        stroke: new ol.style.Stroke({ 
                            color: '#fff', 
                            width: 2 
                        })
                    }),
                    text: new ol.style.Text({
                        text: this.getWindArrow(windDirection),
                        font: '16px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
                        offsetY: -radius - 5
                    })
                });
            },
            
            // Стиль для зон видимости
            visibilityZone: (feature) => {
                const visibility = feature.get('visibility') || 10;
                const category = feature.get('category') || 'excellent';
                
                // Цвет в зависимости от категории видимости
                let color;
                switch(category) {
                    case 'excellent': color = 'rgba(46, 204, 113, 0.3)'; break;
                    case 'good': color = 'rgba(46, 204, 113, 0.2)'; break;
                    case 'moderate': color = 'rgba(241, 196, 15, 0.3)'; break;
                    case 'poor': color = 'rgba(243, 156, 18, 0.4)'; break;
                    case 'veryPoor': color = 'rgba(231, 76, 60, 0.5)'; break;
                    default: color = 'rgba(149, 165, 166, 0.2)';
                }
                
                return new ol.style.Style({
                    fill: new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({ 
                        color: this.getCategoryColor(category), 
                        width: 2 
                    }),
                    text: new ol.style.Text({
                        text: `${visibility} км`,
                        font: '12px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                        offsetY: 15
                    })
                });
            },
            
            // Стиль для зон риска обледенения
            icingZone: (feature) => {
                const riskLevel = feature.get('riskLevel') || 0;
                const temperature = feature.get('temperature') || 0;
                
                // Цвет в зависимости от уровня риска
                let color, radius;
                switch(riskLevel) {
                    case 3: 
                        color = 'rgba(231, 76, 60, 0.7)';
                        radius = 12;
                        break;
                    case 2: 
                        color = 'rgba(243, 156, 18, 0.6)';
                        radius = 10;
                        break;
                    case 1: 
                        color = 'rgba(241, 196, 15, 0.5)';
                        radius = 8;
                        break;
                    default: 
                        color = 'rgba(46, 204, 113, 0.3)';
                        radius = 6;
                }
                
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        fill: new ol.style.Fill({ color: color }),
                        stroke: new ol.style.Stroke({ 
                            color: this.getRiskColor(riskLevel), 
                            width: 2 
                        })
                    }),
                    text: new ol.style.Text({
                        text: '❄️',
                        font: '16px Arial',
                        offsetY: -radius - 5
                    })
                });
            },
            
            // Стиль для изолиний осадков
            precipitationContour: (feature) => {
                const precipitation = feature.get('precipitation') || 0;
                const level = this.getPrecipitationLevel(precipitation);
                
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: this.getPrecipitationColor(level),
                        width: level === 3 ? 4 : level === 2 ? 3 : 2,
                        lineDash: level === 1 ? [5, 5] : []
                    }),
                    text: new ol.style.Text({
                        text: `${precipitation} мм`,
                        font: '11px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                        placement: 'line'
                    })
                });
            },
            
            // Стиль для зон грозовой активности
            thunderstormZone: (feature) => {
                const cape = feature.get('cape') || 0;
                const riskLevel = cape > 2000 ? 3 : cape > 1500 ? 2 : cape > 1000 ? 1 : 0;
                
                let color, radius;
                switch(riskLevel) {
                    case 3: 
                        color = 'rgba(155, 89, 182, 0.7)';
                        radius = 15;
                        break;
                    case 2: 
                        color = 'rgba(142, 68, 173, 0.6)';
                        radius = 12;
                        break;
                    case 1: 
                        color = 'rgba(111, 84, 159, 0.5)';
                        radius = 10;
                        break;
                    default: 
                        color = 'rgba(149, 165, 166, 0.3)';
                        radius = 8;
                }
                
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        fill: new ol.style.Fill({ color: color }),
                        stroke: new ol.style.Stroke({ 
                            color: this.getCAPEColor(cape), 
                            width: 2 
                        })
                    }),
                    text: new ol.style.Text({
                        text: '⚡',
                        font: '18px Arial',
                        offsetY: -radius - 5
                    })
                });
            },
            
            // Стиль для температурных зон
            temperatureZone: (feature) => {
                const temperature = feature.get('temperature') || 0;
                const color = this.getTemperatureColor(temperature);
                
                return new ol.style.Style({
                    fill: new ol.style.Fill({ 
                        color: color.replace(')', ', 0.3)') 
                    }),
                    stroke: new ol.style.Stroke({ 
                        color: color, 
                        width: 2 
                    }),
                    text: new ol.style.Text({
                        text: `${temperature}°C`,
                        font: '12px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                    })
                });
            }
        };
    }

    /**
     * Инициализация конфигурации слоев
     */
    initLayerConfigs() {
        return {
            windProfile: {
                name: 'Ветровой профиль',
                description: 'Скорость и направление ветра на высотах 10м, 80м, 120м',
                visible: true,
                zIndex: 10,
                type: 'vector',
                style: this.layerStyles.windPoint
            },
            visibility: {
                name: 'Видимость',
                description: 'Зоны с различной видимостью (км)',
                visible: true,
                zIndex: 9,
                type: 'vector',
                style: this.layerStyles.visibilityZone
            },
            icingRisk: {
                name: 'Риск обледенения',
                description: 'Зоны повышенного риска обледенения',
                visible: false,
                zIndex: 8,
                type: 'vector',
                style: this.layerStyles.icingZone
            },
            precipitation: {
                name: 'Осадки',
                description: 'Интенсивность осадков (мм/ч)',
                visible: false,
                zIndex: 7,
                type: 'vector',
                style: this.layerStyles.precipitationContour
            },
            thunderstorm: {
                name: 'Грозовая активность',
                description: 'Зоны повышенной грозовой активности (CAPE)',
                visible: false,
                zIndex: 6,
                type: 'vector',
                style: this.layerStyles.thunderstormZone
            },
            temperature: {
                name: 'Температура',
                description: 'Температурные зоны (°C)',
                visible: false,
                zIndex: 5,
                type: 'vector',
                style: this.layerStyles.temperatureZone
            }
        };
    }

    /**
     * Переключение видимости слоя
     */
    toggleLayer(layerName, visible) {
        if (!this.layerConfigs[layerName]) {
            console.warn(`Неизвестный слой: ${layerName}`);
            return;
        }
        
        this.layerConfigs[layerName].visible = visible;
        
        if (visible) {
            this.activeLayers.add(layerName);
            this.showLayer(layerName);
        } else {
            this.activeLayers.delete(layerName);
            this.hideLayer(layerName);
        }
        
        console.log(`Слой "${layerName}" ${visible ? 'включен' : 'выключен'}`);
        this.mapManager.app.logEvent('layer_toggled', { layer: layerName, visible });
    }

    /**
     * Показ слоя на карте
     */
    showLayer(layerName) {
        const config = this.layerConfigs[layerName];
        
        // Очистка предыдущих данных слоя
        this.clearLayer(layerName);
        
        // Получение метеоданных
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) {
            console.warn(`Нет метеоданных для отображения слоя ${layerName}`);
            return;
        }
        
        // Отображение данных в зависимости от типа слоя
        switch(layerName) {
            case 'windProfile':
                this.showWindProfileLayer(weatherData);
                break;
            case 'visibility':
                this.showVisibilityLayer(weatherData);
                break;
            case 'icingRisk':
                this.showIcingRiskLayer(weatherData);
                break;
            case 'precipitation':
                this.showPrecipitationLayer(weatherData);
                break;
            case 'thunderstorm':
                this.showThunderstormLayer(weatherData);
                break;
            case 'temperature':
                this.showTemperatureLayer(weatherData);
                break;
        }
    }

    /**
     * Скрытие слоя
     */
    hideLayer(layerName) {
        this.clearLayer(layerName);
    }

    /**
     * Очистка данных слоя
     */
    clearLayer(layerName) {
        // Очистка источника данных для слоя
        const source = this.mapManager.sources.weatherLayers;
        if (!source) return;
        
        // Удаление только объектов, относящихся к этому слою
        const featuresToRemove = [];
        source.getFeatures().forEach(feature => {
            if (feature.get('layer') === layerName) {
                featuresToRemove.push(feature);
            }
        });
        
        featuresToRemove.forEach(feature => {
            source.removeFeature(feature);
        });
    }

    /**
     * Отображение слоя ветрового профиля
     */
    showWindProfileLayer(weatherData) {
        const center = this.mapManager.getMapCenter();
        const source = this.mapManager.sources.weatherLayers;
        
        // Создание точек для разных высот и временных периодов
        weatherData.hourly.forEach((hourData, index) => {
            // Пропускаем каждый второй час для уменьшения загруженности
            if (index % 2 !== 0) return;
            
            [10, 80, 120].forEach(altitude => {
                const windSpeedKey = `windSpeed${altitude}m`;
                const windDirKey = `windDir${altitude}m`;
                
                if (hourData[windSpeedKey] !== undefined && hourData[windDirKey] !== undefined) {
                    // Смещение точки для визуального разделения высот
                    const offset = (altitude === 10) ? -0.02 : (altitude === 80) ? 0 : 0.02;
                    
                    const feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([
                            center[0] + offset + (Math.random() - 0.5) * 0.01,
                            center[1] + (Math.random() - 0.5) * 0.01
                        ])),
                        layer: 'windProfile',
                        windSpeed: parseFloat(hourData[windSpeedKey]),
                        windDirection: parseFloat(hourData[windDirKey]),
                        altitude: altitude,
                        time: hourData.time,
                        temperature: parseFloat(hourData.temperature)
                    });
                    
                    source.addFeature(feature);
                }
            });
        });
    }

    /**
     * Отображение слоя видимости
     */
    showVisibilityLayer(weatherData) {
        const center = this.mapManager.getMapCenter();
        const source = this.mapManager.sources.weatherLayers;
        
        // Создание зон видимости
        weatherData.hourly.forEach((hourData, index) => {
            if (index % 3 !== 0) return; // Каждый третий час
            
            const visibility = parseFloat(hourData.visibility);
            const category = this.categorizeVisibility(visibility);
            
            // Создание полигона зоны видимости
            const radius = Math.max(0.03, visibility / 50); // Радиус зависит от видимости
            const circle = this.createCircle(center[0], center[1], radius);
            
            const feature = new ol.Feature({
                geometry: new ol.geom.Polygon([circle]),
                layer: 'visibility',
                visibility: visibility,
                category: category,
                time: hourData.time
            });
            
            source.addFeature(feature);
        });
    }

    /**
     * Отображение слоя риска обледенения
     */
    showIcingRiskLayer(weatherData) {
        const center = this.mapManager.getMapCenter();
        const source = this.mapManager.sources.weatherLayers;
        
        // Создание точек риска обледенения
        weatherData.hourly.forEach((hourData, index) => {
            if (hourData.icingRisk.level < 2) return; // Только умеренный и высокий риск
            
            // Смещение для визуального разделения
            const offset = (index % 4) * 0.015 - 0.03;
            
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([
                    center[0] + offset,
                    center[1] + (Math.random() - 0.5) * 0.02
                ])),
                layer: 'icingRisk',
                riskLevel: hourData.icingRisk.level,
                temperature: parseFloat(hourData.temperature),
                humidity: parseFloat(hourData.humidity),
                precipitation: parseFloat(hourData.precipitation),
                time: hourData.time
            });
            
            source.addFeature(feature);
        });
    }

    /**
     * Отображение слоя осадков
     */
    showPrecipitationLayer(weatherData) {
        const center = this.mapManager.getMapCenter();
        const source = this.mapManager.sources.weatherLayers;
        
        // Создание изолиний осадков
        weatherData.hourly.forEach((hourData, index) => {
            if (hourData.precipitation < 0.5) return; // Пропускаем малые осадки
            
            const precipitation = parseFloat(hourData.precipitation);
            const level = this.getPrecipitationLevel(precipitation);
            
            // Создание контура осадков
            const radius = 0.03 + precipitation / 20;
            const circle = this.createCircle(center[0], center[1], radius);
            
            const feature = new ol.Feature({
                geometry: new ol.geom.LineString(circle),
                layer: 'precipitation',
                precipitation: precipitation,
                level: level,
                time: hourData.time
            });
            
            source.addFeature(feature);
        });
    }

    /**
     * Отображение слоя грозовой активности
     */
    showThunderstormLayer(weatherData) {
        const center = this.mapManager.getMapCenter();
        const source = this.mapManager.sources.weatherLayers;
        
        // Создание зон грозовой активности
        weatherData.hourly.forEach((hourData, index) => {
            const cape = parseFloat(hourData.cape);
            if (cape < 1000) return; // Пропускаем низкую активность
            
            // Смещение для визуального разделения
            const offset = (index % 3) * 0.02 - 0.02;
            
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([
                    center[0] + offset,
                    center[1] + (Math.random() - 0.5) * 0.02
                ])),
                layer: 'thunderstorm',
                cape: cape,
                riskLevel: cape > 2000 ? 3 : cape > 1500 ? 2 : 1,
                time: hourData.time
            });
            
            source.addFeature(feature);
        });
    }

    /**
     * Отображение слоя температуры
     */
    showTemperatureLayer(weatherData) {
        const center = this.mapManager.getMapCenter();
        const source = this.mapManager.sources.weatherLayers;
        
        // Создание температурных зон
        weatherData.hourly.forEach((hourData, index) => {
            if (index % 4 !== 0) return; // Каждый четвертый час
            
            const temperature = parseFloat(hourData.temperature);
            
            // Создание полигона температурной зоны
            const radius = 0.04;
            const circle = this.createCircle(center[0], center[1], radius);
            
            const feature = new ol.Feature({
                geometry: new ol.geom.Polygon([circle]),
                layer: 'temperature',
                temperature: temperature,
                time: hourData.time
            });
            
            source.addFeature(feature);
        });
    }

    /**
     * Вспомогательные методы
     */
    
    /**
     * Создание круга (полигона) для отображения на карте
     */
    createCircle(centerLon, centerLat, radius, points = 32) {
        const coords = [];
        for (let i = 0; i <= points; i++) {
            const angle = (i * 2 * Math.PI) / points;
            const lon = centerLon + radius * Math.cos(angle);
            const lat = centerLat + radius * Math.sin(angle);
            coords.push([lon, lat]);
        }
        return coords;
    }
    
    /**
     * Категоризация видимости
     */
    categorizeVisibility(visibility) {
        if (visibility >= 10) return 'excellent';
        if (visibility >= 5) return 'good';
        if (visibility >= 3) return 'moderate';
        if (visibility >= 1) return 'poor';
        return 'veryPoor';
    }
    
    /**
     * Получение цвета для категории видимости
     */
    getCategoryColor(category) {
        const colors = {
            excellent: '#2ecc71',
            good: '#27ae60',
            moderate: '#f1c40f',
            poor: '#e67e22',
            veryPoor: '#e74c3c'
        };
        return colors[category] || '#95a5a6';
    }
    
    /**
     * Получение цвета для уровня риска обледенения
     */
    getRiskColor(level) {
        const colors = {
            3: '#c0392b',
            2: '#d35400',
            1: '#f39c12',
            0: '#27ae60'
        };
        return colors[level] || '#95a5a6';
    }
    
    /**
     * Получение уровня осадков
     */
    getPrecipitationLevel(precipitation) {
        if (precipitation >= 5) return 3;
        if (precipitation >= 2) return 2;
        if (precipitation >= 0.5) return 1;
        return 0;
    }
    
    /**
     * Получение цвета для осадков
     */
    getPrecipitationColor(level) {
        const colors = {
            3: '#2980b9',
            2: '#3498db',
            1: '#29b6f6'
        };
        return colors[level] || '#bdc3c7';
    }
    
    /**
     * Получение цвета для CAPE
     */
    getCAPEColor(cape) {
        if (cape > 2000) return '#8e44ad';
        if (cape > 1500) return '#9b59b6';
        if (cape > 1000) return '#6c757d';
        return '#95a5a6';
    }
    
    /**
     * Получение цвета для температуры
     */
    getTemperatureColor(temperature) {
        if (temperature < -10) return '#2c3e50';
        if (temperature < 0) return '#3498db';
        if (temperature < 10) return '#27ae60';
        if (temperature < 20) return '#f1c40f';
        if (temperature < 30) return '#e67e22';
        return '#e74c3c';
    }
    
    /**
     * Получение символа стрелки ветра
     */
    getWindArrow(direction) {
        // Преобразование направления в символ стрелки
        const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
        const index = Math.round(direction / 45) % 8;
        return directions[index];
    }
    
    /**
     * Получение всех активных слоев
     */
    getActiveLayers() {
        return Array.from(this.activeLayers);
    }
    
    /**
     * Установка всех слоев
     */
    setAllLayers(visible) {
        Object.keys(this.layerConfigs).forEach(layerName => {
            this.toggleLayer(layerName, visible);
        });
    }
    
    /**
     * Сохранение состояния слоев
     */
    saveLayerState() {
        const state = {};
        Object.keys(this.layerConfigs).forEach(layerName => {
            state[layerName] = this.layerConfigs[layerName].visible;
        });
        this.mapManager.app.saveToLocalStorage('mapLayersState', state);
    }
    
    /**
     * Загрузка состояния слоев
     */
    loadLayerState() {
        const state = this.mapManager.app.loadFromLocalStorage('mapLayersState');
        if (state) {
            Object.keys(state).forEach(layerName => {
                if (this.layerConfigs[layerName] !== undefined) {
                    this.toggleLayer(layerName, state[layerName]);
                }
            });
        }
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapLayersVisualizer;
} else {
    window.MapLayersVisualizer = MapLayersVisualizer;
}