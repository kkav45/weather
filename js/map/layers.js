/**
 * Управление слоями карты
 * Включает/выключает различные слои визуализации метеоданных
 */
class MapLayersManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.activeLayers = new Set();
        this.layerConfigs = this.initLayerConfigs();
    }

    initLayerConfigs() {
        return {
            windProfile: {
                name: 'Ветровой профиль',
                description: 'Скорость и направление ветра на разных высотах',
                color: '#3498db',
                visible: true,
                zIndex: 10
            },
            visibility: {
                name: 'Видимость',
                description: 'Зоны с различной видимостью',
                color: '#9b59b6',
                visible: true,
                zIndex: 9
            },
            icingRisk: {
                name: 'Риск обледенения',
                description: 'Зоны повышенного риска обледенения',
                color: '#2ecc71',
                visible: false,
                zIndex: 8
            },
            precipitation: {
                name: 'Осадки',
                description: 'Интенсивность осадков',
                color: '#3498db',
                visible: false,
                zIndex: 7
            },
            thunderstorm: {
                name: 'Грозовая активность',
                description: 'Зоны повышенной грозовой активности (CAPE)',
                color: '#e74c3c',
                visible: false,
                zIndex: 6
            },
            temperature: {
                name: 'Температура',
                description: 'Температурный профиль',
                color: '#e67e22',
                visible: false,
                zIndex: 5
            }
        };
    }

    // Переключение видимости слоя
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
        
        console.log(`Слой ${layerName} ${visible ? 'включен' : 'выключен'}`);
    }

    // Показ слоя
    showLayer(layerName) {
        const config = this.layerConfigs[layerName];
        
        switch(layerName) {
            case 'windProfile':
                this.showWindProfileLayer();
                break;
            case 'visibility':
                this.showVisibilityLayer();
                break;
            case 'icingRisk':
                this.showIcingRiskLayer();
                break;
            case 'precipitation':
                this.showPrecipitationLayer();
                break;
            case 'thunderstorm':
                this.showThunderstormLayer();
                break;
            case 'temperature':
                this.showTemperatureLayer();
                break;
        }
    }

    // Скрытие слоя
    hideLayer(layerName) {
        // Очистка соответствующих данных с карты
        switch(layerName) {
            case 'windProfile':
            case 'visibility':
            case 'icingRisk':
            case 'precipitation':
            case 'thunderstorm':
            case 'temperature':
                // Все метеоданные хранятся в одном источнике
                // Для полной очистки нужно фильтровать по типу
                this.mapManager.clearWeatherLayer();
                // Перерисовка активных слоев
                this.redrawActiveLayers();
                break;
        }
    }

    // Перерисовка активных слоев
    redrawActiveLayers() {
        this.activeLayers.forEach(layerName => {
            this.showLayer(layerName);
        });
    }

    // Показ слоя ветрового профиля
    showWindProfileLayer() {
        // Получение данных о ветре для текущего маршрута
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) return;
        
        // Добавление точек ветрового профиля
        weatherData.hourly.forEach(hourData => {
            // Создание визуализации для разных высот
            [10, 80, 120].forEach(altitude => {
                const windSpeed = hourData[`windSpeed${altitude}m`];
                const windDir = hourData[`windDir${altitude}m`];
                
                if (windSpeed && windDir) {
                    // Расчет координат для стрелки ветра
                    // (в реальном приложении здесь будет интерполяция по маршруту)
                    const center = this.mapManager.getMapCenter();
                    
                    this.mapManager.addWeatherPoint(
                        [center[0] + Math.random() * 0.1 - 0.05, center[1] + Math.random() * 0.1 - 0.05],
                        'wind',
                        {
                            windSpeed: parseFloat(windSpeed),
                            windDirection: parseFloat(windDir),
                            altitude: altitude,
                            time: hourData.time
                        }
                    );
                }
            });
        });
    }

    // Показ слоя видимости
    showVisibilityLayer() {
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) return;
        
        // Создание цветовых зон для видимости
        const visibilityRanges = [
            { min: 0, max: 1, color: 'rgba(231, 76, 60, 0.7)', label: 'Очень плохая' },
            { min: 1, max: 3, color: 'rgba(243, 156, 18, 0.7)', label: 'Плохая' },
            { min: 3, max: 5, color: 'rgba(241, 196, 15, 0.7)', label: 'Умеренная' },
            { min: 5, max: 10, color: 'rgba(46, 204, 113, 0.7)', label: 'Хорошая' },
            { min: 10, max: 999, color: 'rgba(46, 204, 113, 0.3)', label: 'Отличная' }
        ];
        
        // Добавление зон на карту
        weatherData.hourly.forEach(hourData => {
            const visibility = parseFloat(hourData.visibility);
            const range = visibilityRanges.find(r => visibility >= r.min && visibility < r.max);
            
            if (range) {
                const center = this.mapManager.getMapCenter();
                this.mapManager.addWeatherPoint(
                    [center[0] + Math.random() * 0.1 - 0.05, center[1] + Math.random() * 0.1 - 0.05],
                    'visibility',
                    {
                        visibility: visibility,
                        color: range.color,
                        label: range.label,
                        time: hourData.time
                    }
                );
            }
        });
    }

    // Показ слоя риска обледенения
    showIcingRiskLayer() {
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) return;
        
        weatherData.hourly.forEach(hourData => {
            if (hourData.icingRisk && hourData.icingRisk.level >= 2) {
                const center = this.mapManager.getMapCenter();
                this.mapManager.addWeatherPoint(
                    [center[0] + Math.random() * 0.1 - 0.05, center[1] + Math.random() * 0.1 - 0.05],
                    'icing',
                    {
                        riskLevel: hourData.icingRisk.level,
                        riskText: hourData.icingRisk.text,
                        temperature: parseFloat(hourData.temperature),
                        humidity: parseFloat(hourData.humidity),
                        precipitation: parseFloat(hourData.precipitation),
                        time: hourData.time
                    }
                );
            }
        });
    }

    // Показ слоя осадков
    showPrecipitationLayer() {
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) return;
        
        weatherData.hourly.forEach(hourData => {
            const precipitation = parseFloat(hourData.precipitation);
            if (precipitation > 0.5) {
                const center = this.mapManager.getMapCenter();
                this.mapManager.addWeatherPoint(
                    [center[0] + Math.random() * 0.1 - 0.05, center[1] + Math.random() * 0.1 - 0.05],
                    'precipitation',
                    {
                        precipitation: precipitation,
                        rain: parseFloat(hourData.rain),
                        snowfall: parseFloat(hourData.snowfall),
                        type: this.getPrecipitationType(hourData),
                        time: hourData.time
                    }
                );
            }
        });
    }

    // Показ слоя грозовой активности
    showThunderstormLayer() {
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) return;
        
        weatherData.hourly.forEach(hourData => {
            const cape = parseFloat(hourData.cape);
            if (cape > 1000) {
                const center = this.mapManager.getMapCenter();
                this.mapManager.addWeatherPoint(
                    [center[0] + Math.random() * 0.1 - 0.05, center[1] + Math.random() * 0.1 - 0.05],
                    'thunderstorm',
                    {
                        cape: cape,
                        riskLevel: cape > 2000 ? 'high' : cape > 1500 ? 'medium' : 'low',
                        time: hourData.time
                    }
                );
            }
        });
    }

    // Показ слоя температуры
    showTemperatureLayer() {
        const weatherData = this.mapManager.app.state.weatherData;
        if (!weatherData || !weatherData.hourly) return;
        
        // Цветовые диапазоны температур
        const tempRanges = [
            { min: -50, max: -10, color: 'rgba(52, 152, 219, 0.7)', label: 'Очень холодно' },
            { min: -10, max: 0, color: 'rgba(41, 128, 185, 0.7)', label: 'Холодно' },
            { min: 0, max: 10, color: 'rgba(52, 152, 219, 0.7)', label: 'Прохладно' },
            { min: 10, max: 20, color: 'rgba(46, 204, 113, 0.7)', label: 'Умеренно' },
            { min: 20, max: 30, color: 'rgba(241, 196, 15, 0.7)', label: 'Тепло' },
            { min: 30, max: 50, color: 'rgba(231, 76, 60, 0.7)', label: 'Жарко' }
        ];
        
        weatherData.hourly.forEach(hourData => {
            const temperature = parseFloat(hourData.temperature);
            const range = tempRanges.find(r => temperature >= r.min && temperature < r.max);
            
            if (range) {
                const center = this.mapManager.getMapCenter();
                this.mapManager.addWeatherPoint(
                    [center[0] + Math.random() * 0.1 - 0.05, center[1] + Math.random() * 0.1 - 0.05],
                    'temperature',
                    {
                        temperature: temperature,
                        color: range.color,
                        label: range.label,
                        time: hourData.time
                    }
                );
            }
        });
    }

    // Определение типа осадков
    getPrecipitationType(hourData) {
        const rain = parseFloat(hourData.rain);
        const snowfall = parseFloat(hourData.snowfall);
        const temp = parseFloat(hourData.temperature);
        
        if (snowfall > 0.1 && temp < 1) return 'snow';
        if (rain > 0.1 && temp > 0) return 'rain';
        if (rain > 0.1 && snowfall > 0.1) return 'sleet';
        return 'none';
    }

    // Получение конфигурации слоя
    getLayerConfig(layerName) {
        return this.layerConfigs[layerName];
    }

    // Получение всех активных слоев
    getActiveLayers() {
        return Array.from(this.activeLayers);
    }

    // Установка всех слоев
    setAllLayers(visible) {
        Object.keys(this.layerConfigs).forEach(layerName => {
            this.toggleLayer(layerName, visible);
        });
    }

    // Сохранение состояния слоев
    saveLayerState() {
        const state = {};
        Object.keys(this.layerConfigs).forEach(layerName => {
            state[layerName] = this.layerConfigs[layerName].visible;
        });
        this.mapManager.app.saveToLocalStorage('mapLayersState', state);
    }

    // Загрузка состояния слоев
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