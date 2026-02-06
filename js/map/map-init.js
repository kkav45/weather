/**
 * Инициализация карты OpenLayers 7.4.0 с функционалом рисования
 * Полностью исправлен для совместимости с новым API и сохранения объектов
 */
class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.sources = {
            base: new ol.source.OSM(),
            polygons: new ol.source.Vector(),
            routes: new ol.source.Vector(),
            analysis: new ol.source.Vector(),
            weatherLayers: new ol.source.Vector(),
            drawing: new ol.source.Vector() // Источник для рисования
        };
        this.layers = {};
        this.interactions = {
            draw: null,
            modify: null,
            select: null
        };
        this.drawingMode = null; // 'polygon', 'route', или null
        this.drawnFeatures = []; // Массив нарисованных объектов
        this.init();
    }

    init() {
        console.log('🗺️ Инициализация карты OpenLayers 7.4.0...');
        
        // Создание карты (с ожиданием загрузки контейнера)
        this.createMap();
        
        // Добавление базовых слоев
        this.addBaseLayers();
        
        // Настройка взаимодействий
        this.setupInteractions();
        
        // Настройка обработчиков событий
        this.setupEventListeners();
        
        // Загрузка сохраненных объектов
        this.loadSavedObjects();
        
        console.log('✅ Карта успешно инициализирована');
    }

    createMap() {
        // Проверка, что OpenLayers загружен
        if (typeof ol === 'undefined' || typeof ol.Map === 'undefined') {
            console.error('❌ OpenLayers не загружен! Проверьте подключение библиотеки.');
            console.error('Текущий статус ol:', typeof ol);
            return;
        }

        // Ждем, пока контейнер получит размеры
        const waitForMapContainer = () => {
            const container = document.getElementById('map');
            if (!container) {
                console.error('❌ Контейнер карты #map не найден!');
                return;
            }
            
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                initMap();
            } else {
                console.warn('⚠️ Контейнер карты имеет нулевые размеры. Повторная попытка через 100мс...');
                setTimeout(waitForMapContainer, 100);
            }
        };

        const initMap = () => {
            // СОЗДАЕМ КОНТРОЛЫ ВРУЧНУЮ
            const controls = [
                new ol.control.Attribution({ collapsible: false }),
                new ol.control.Zoom(),
                new ol.control.Rotate(),
                new ol.control.ScaleLine(),
                new ol.control.ZoomSlider(),
                new ol.control.FullScreen()
            ];

            // СОЗДАЕМ КАРТУ
            this.map = new ol.Map({
                target: 'map',
                layers: [],
                view: new ol.View({
                    center: ol.proj.fromLonLat([37.6173, 55.7558]), // Москва
                    zoom: 9,
                    maxZoom: 19,
                    minZoom: 3
                }),
                controls: controls
            });
            
            // Обновление размера карты
            this.map.updateSize();
            
            // Обновление размера при изменении окна
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    if (this.map) {
                        this.map.updateSize();
                    }
                }, 100);
            });
            
            // Сохранение ссылки на карту
            this.app.state.map = this.map;
            
            console.log('✅ Карта успешно инициализирована');
        };

        // Начинаем ожидание
        waitForMapContainer();
    }

    addBaseLayers() {
        // Базовый слой OpenStreetMap
        this.layers.base = new ol.layer.Tile({
            source: this.sources.base,
            title: 'OpenStreetMap'
        });
        this.map.addLayer(this.layers.base);
        
        // Слой полигонов
        this.layers.polygons = new ol.layer.Vector({
            source: this.sources.polygons,
            style: this.createPolygonStyle.bind(this),
            title: 'Полигоны'
        });
        this.map.addLayer(this.layers.polygons);
        
        // Слой маршрутов
        this.layers.routes = new ol.layer.Vector({
            source: this.sources.routes,
            style: this.createRouteStyle.bind(this),
            title: 'Маршруты'
        });
        this.map.addLayer(this.layers.routes);
        
        // Слой анализа
        this.layers.analysis = new ol.layer.Vector({
            source: this.sources.analysis,
            style: this.createAnalysisStyle.bind(this),
            title: 'Точки анализа'
        });
        this.map.addLayer(this.layers.analysis);
        
        // Слой метеоданных
        this.layers.weather = new ol.layer.Vector({
            source: this.sources.weatherLayers,
            style: this.createWeatherStyle.bind(this),
            title: 'Метеослой',
            visible: false
        });
        this.map.addLayer(this.layers.weather);
        
        // Слой для рисования
        this.layers.drawing = new ol.layer.Vector({
            source: this.sources.drawing,
            style: this.createDrawingStyle.bind(this),
            title: 'Рисование'
        });
        this.map.addLayer(this.layers.drawing);
    }

    setupInteractions() {
        // Интеракция выделения (для существующих объектов)
        this.interactions.select = new ol.interaction.Select({
            layers: [this.layers.polygons, this.layers.routes],
            style: this.createSelectStyle.bind(this)
        });
        this.map.addInteraction(this.interactions.select);
        
        // Обработчик выделения
        this.interactions.select.on('select', (e) => {
            this.handleFeatureSelect(e);
        });
    }

    setupEventListeners() {
        // Обработчик клика по карте
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });
        
        // Обработчик движения мыши
        this.map.on('pointermove', (e) => {
            this.handlePointerMove(e);
        });
        
        // Обработчики кнопок рисования
        const drawPolygonBtn = document.getElementById('drawPolygonBtn');
        const drawRouteBtn = document.getElementById('drawRouteBtn');
        const clearDrawingBtn = document.getElementById('clearDrawingBtn');
        const exportKMLBtn = document.getElementById('exportKMLBtn');
        
        if (drawPolygonBtn) {
            drawPolygonBtn.addEventListener('click', () => this.startDrawing('polygon'));
        }
        
        if (drawRouteBtn) {
            drawRouteBtn.addEventListener('click', () => this.startDrawing('route'));
        }
        
        if (clearDrawingBtn) {
            clearDrawingBtn.addEventListener('click', () => this.clearDrawing());
        }
        
        if (exportKMLBtn) {
            exportKMLBtn.addEventListener('click', () => this.exportDrawingToKML());
        }
    }

    // ======================
    // ФУНКЦИИ РИСОВАНИЯ
    // ======================

    startDrawing(type) {
        // Остановка текущего режима рисования
        this.stopDrawing();
        
        // Установка режима рисования
        this.drawingMode = type;
        
        // Обновление статуса
        const statusEl = document.getElementById('drawingStatus');
        if (statusEl) {
            statusEl.textContent = type === 'polygon' 
                ? 'Кликайте на карту для создания точек полигона. Двойной клик для завершения.' 
                : 'Кликайте на карту для создания точек маршрута. Двойной клик для завершения.';
            statusEl.style.borderColor = type === 'polygon' ? '#3498db' : '#2ecc71';
        }
        
        // Активация кнопок
        const clearBtn = document.getElementById('clearDrawingBtn');
        const exportBtn = document.getElementById('exportKMLBtn');
        if (clearBtn) clearBtn.disabled = false;
        if (exportBtn) exportBtn.disabled = false;
        
        // Создание интеракции рисования
        const geometryType = type === 'polygon' ? 'Polygon' : 'LineString';
        
        this.interactions.draw = new ol.interaction.Draw({
            source: this.sources.drawing,
            type: geometryType,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: type === 'polygon' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(46, 204, 113, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: type === 'polygon' ? '#3498db' : '#2ecc71',
                    width: 3
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#fff'
                    }),
                    stroke: new ol.style.Stroke({
                        color: type === 'polygon' ? '#3498db' : '#2ecc71',
                        width: 2
                    })
                })
            })
        });
        
        this.map.addInteraction(this.interactions.draw);
        
        // Обработчик завершения рисования
        this.interactions.draw.on('drawend', (event) => {
            const feature = event.feature;
            feature.set('type', type);
            
            // Генерация уникального имени на основе количества объектов
            const existingObjects = this.drawnFeatures.filter(f => f.get('type') === type);
            const count = existingObjects.length + 1;
            const name = type === 'polygon' ? `Полигон ${count}` : `Маршрут ${count}`;
            
            feature.set('name', name);
            feature.set('userDrawn', true);
            feature.setId(name); // Устанавливаем уникальный ID
            
            this.drawnFeatures.push(feature);
            
            console.log(`✅ Добавлен ${type}: ${name}. Всего объектов: ${this.drawnFeatures.length}`);
            
            // Добавление объекта в интерфейс левой панели
            if (window.meteoApp && typeof window.meteoApp.addDrawnObjectToUI === 'function') {
                window.meteoApp.addDrawnObjectToUI(feature);
            } else {
                console.warn('⚠️ meteoApp.addDrawnObjectToUI не найден, объект не добавлен в интерфейс');
            }
            
            // Показать уведомление
            if (window.meteoApp) {
                window.meteoApp.showNotification(
                    `${type === 'polygon' ? 'Полигон' : 'Маршрут'} "${name}" добавлен`,
                    'Успех',
                    'success'
                );
            }
            
            // Обновить статус
            const statusEl = document.getElementById('drawingStatus');
            if (statusEl) {
                statusEl.textContent = 'Рисование завершено. Нарисуйте еще объект или нажмите "Анализировать".';
            }
        });
        
        // Показать инструкции
        const instructionsEl = document.getElementById('drawingInstructions');
        if (instructionsEl) {
            instructionsEl.style.display = 'block';
            instructionsEl.textContent = type === 'polygon' 
                ? 'Кликайте на карту для создания точек. Двойной клик для завершения полигона.'
                : 'Кликайте на карту для создания точек маршрута. Двойной клик для завершения.';
        }
    }

    stopDrawing() {
        // Удаление интеракции рисования
        if (this.interactions.draw) {
            this.map.removeInteraction(this.interactions.draw);
            this.interactions.draw = null;
        }
        
        this.drawingMode = null;
        
        // Скрыть инструкции
        const instructionsEl = document.getElementById('drawingInstructions');
        if (instructionsEl) {
            instructionsEl.style.display = 'none';
        }
    }

    clearDrawing() {
        // Очистка источника рисования
        this.sources.drawing.clear();
        this.drawnFeatures = [];
        
        // Остановка рисования
        this.stopDrawing();
        
        // Деактивация кнопок
        const clearBtn = document.getElementById('clearDrawingBtn');
        const exportBtn = document.getElementById('exportKMLBtn');
        if (clearBtn) clearBtn.disabled = true;
        if (exportBtn) exportBtn.disabled = true;
        
        // Очистка списков в интерфейсе
        const polygonsList = document.getElementById('polygonsList');
        const routesList = document.getElementById('routesList');
        
        if (polygonsList) {
            polygonsList.innerHTML = `
                <p style="text-align: center; color: #6c757d; padding: 20px; font-size: 14px;">
                    <i class="fas fa-info-circle"></i><br>Нет полигонов<br>
                    <span style="font-size: 13px; display: block; margin-top: 8px;">
                        Нарисуйте полигон
                    </span>
                </p>
            `;
        }
        
        if (routesList) {
            routesList.innerHTML = `
                <p style="text-align: center; color: #6c757d; padding: 20px; font-size: 14px;">
                    <i class="fas fa-info-circle"></i><br>Нет маршрутов<br>
                    <span style="font-size: 13px; display: block; margin-top: 8px;">
                        Нарисуйте маршрут
                    </span>
                </p>
            `;
        }
        
        // Обновление статуса
        const statusEl = document.getElementById('drawingStatus');
        if (statusEl) {
            statusEl.textContent = 'Выберите инструмент рисования';
            statusEl.style.borderColor = '#0088cc';
        }
        
        // Показать уведомление
        if (window.meteoApp) {
            window.meteoApp.showNotification('Все рисунки очищены', 'Очистка', 'info');
        }
        
        // Сохранение состояния
        if (window.meteoApp) {
            window.meteoApp.state.drawnObjects = [];
            window.meteoApp.saveDrawnObjectsToLocalStorage();
        }
    }

    exportDrawingToKML() {
        if (this.drawnFeatures.length === 0) {
            if (window.meteoApp) {
                window.meteoApp.showNotification('Нет нарисованных объектов для экспорта', 'Экспорт', 'warning');
            }
            return;
        }
        
        // Создание формата KML
        const format = new ol.format.KML({
            extractStyles: true,
            writeStyles: true
        });
        
        // Создание векторного слоя для экспорта
        const vectorSource = new ol.source.Vector({
            features: this.drawnFeatures
        });
        
        // Экспорт в KML
        const kmlString = format.writeFeatures(vectorSource.getFeatures(), {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });
        
        // Создание и скачивание файла
        const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing_${new Date().toISOString().slice(0,10)}.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Показать уведомление
        if (window.meteoApp) {
            window.meteoApp.showNotification(`Экспортировано ${this.drawnFeatures.length} объектов`, 'Экспорт завершен', 'success');
        }
    }

    // ======================
    // СТИЛИ ДЛЯ РИСОВАНИЯ (ИСПРАВЛЕНО)
    // ======================

    createDrawingStyle(feature) {
        const type = feature.get('type') || 'polygon';
        const isPolygon = type === 'polygon';
        
        return new ol.style.Style({
            fill: new ol.style.Fill({
                color: isPolygon ? 'rgba(52, 152, 219, 0.2)' : 'rgba(46, 204, 113, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: isPolygon ? '#3498db' : '#2ecc71',
                width: 3
            }),
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: '#fff'
                }),
                stroke: new ol.style.Stroke({
                    color: isPolygon ? '#3498db' : '#2ecc71',
                    width: 2
                })
            }),
            text: new ol.style.Text({
                text: feature.get('name') || (isPolygon ? 'Полигон' : 'Маршрут'),
                font: '14px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#000' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
                offsetY: -15
            })
        });
    }

    // ======================
    // ОСТАЛЬНЫЕ МЕТОДЫ
    // ======================

    // Стили для полигонов
    createPolygonStyle(feature) {
        const name = feature.get('name') || 'Полигон';
        const isSelected = this.interactions.select.getFeatures().getArray().includes(feature);
        const isUserDrawn = feature.get('userDrawn');
        
        // Определение цвета на основе индекса
        const polygons = this.app.state.polygons || [];
        const index = polygons.findIndex(p => 
            p.name === name && 
            (p.userDrawn === undefined || p.userDrawn === isUserDrawn)
        );
        
        const colors = ['#3498db', '#9b59b6', '#1abc9c', '#e74c3c', '#f39c12', '#2ecc71'];
        const color = colors[index % colors.length];
        
        return new ol.style.Style({
            fill: new ol.style.Fill({
                color: isSelected ? `${color}44` : `${color}22`
            }),
            stroke: new ol.style.Stroke({
                color: isSelected ? color : `${color}cc`,
                width: isUserDrawn ? 4 : 3
            }),
            text: new ol.style.Text({
                text: name.substring(0, 20),
                font: '14px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#000' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
                offsetY: -15
            })
        });
    }

    // Стили для маршрутов
    createRouteStyle(feature) {
        const name = feature.get('name') || 'Маршрут';
        const isSelected = this.interactions.select.getFeatures().getArray().includes(feature);
        const isUserDrawn = feature.get('userDrawn');
        
        // Определение цвета
        const routes = this.app.state.routes || [];
        const index = routes.findIndex(r => 
            r.name === name && 
            (r.userDrawn === undefined || r.userDrawn === isUserDrawn)
        );
        
        const colors = ['#27ae60', '#2ecc71', '#16a085', '#2980b9', '#8e44ad', '#d35400'];
        const color = colors[index % colors.length];
        
        return new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: isSelected ? color : `${color}cc`,
                width: isUserDrawn ? 5 : 4
            }),
            text: new ol.style.Text({
                text: name.substring(0, 20),
                font: '14px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#000' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
                offsetY: -15
            })
        });
    }

    // Стиль для выделенных объектов
    createSelectStyle(feature) {
        const baseStyle = this.map.getLayers().getArray()
            .find(layer => layer.getSource() === feature.getLayer().getSource())
            .getStyleFunction()(feature);
        
        // Создание копии стиля с усиленной обводкой
        if (Array.isArray(baseStyle)) {
            return baseStyle.map(style => this.enhanceStyle(style));
        }
        return this.enhanceStyle(baseStyle);
    }

    enhanceStyle(style) {
        const stroke = style.getStroke();
        if (stroke) {
            const enhancedStroke = new ol.style.Stroke({
                color: '#ffcc00',
                width: stroke.getWidth() + 4,
                lineDash: [10, 10]
            });
            return new ol.style.Style({
                stroke: enhancedStroke,
                fill: style.getFill(),
                text: style.getText()
            });
        }
        return style;
    }

    // Стиль для точек анализа
    createAnalysisStyle(feature) {
        const type = feature.get('type');
        let color, radius, text;
        
        switch(type) {
            case 'start':
                color = '#27ae60';
                radius = 8;
                text = '🛫';
                break;
            case 'end':
                color = '#e74c3c';
                radius = 8;
                text = '🛬';
                break;
            case 'warning':
                color = '#f39c12';
                radius = 6;
                text = '⚠️';
                break;
            case 'icing':
                color = '#3498db';
                radius = 6;
                text = '❄️';
                break;
            default:
                color = '#95a5a6';
                radius = 4;
                text = '';
        }
        
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: color }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            }),
            text: text ? new ol.style.Text({
                text: text,
                font: '16px Arial, sans-serif',
                offsetY: -15
            }) : undefined
        });
    }

    // Стиль для метеослоев
    createWeatherStyle(feature) {
        const type = feature.get('type');
        let color, radius, text;
        
        switch(type) {
            case 'wind':
                color = '#3498db';
                radius = 6;
                text = '🌬️';
                break;
            case 'visibility':
                color = '#9b59b6';
                radius = 6;
                text = '👁️';
                break;
            case 'icing':
                color = '#2ecc71';
                radius = 6;
                text = '❄️';
                break;
            case 'precipitation':
                color = '#3498db';
                radius = 6;
                text = '🌧️';
                break;
            default:
                color = '#95a5a6';
                radius = 4;
                text = '';
        }
        
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: `${color}88` }),
                stroke: new ol.style.Stroke({ color: color, width: 2 })
            }),
            text: text ? new ol.style.Text({
                text: text,
                font: '16px Arial, sans-serif',
                offsetY: -15
            }) : undefined
        });
    }

    // Обработчик клика по карте
    handleMapClick(event) {
        const coordinate = ol.proj.toLonLat(event.coordinate);
        
        // Проверка, кликнули ли по объекту
        const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
            return feature;
        });
        
        if (feature) {
            // Клик по объекту
            this.showFeatureInfo(feature, coordinate);
        } else if (!this.drawingMode) {
            // Клик по пустому месту карты (только если не в режиме рисования)
            if (typeof window.meteoApp !== 'undefined') {
                window.meteoApp.showNotification(
                    `Координаты: ${coordinate[1].toFixed(4)}°N, ${coordinate[0].toFixed(4)}°E`,
                    'Координаты',
                    'info'
                );
            }
        }
    }

    // Показ информации об объекте
    showFeatureInfo(feature, coordinate) {
        const name = feature.get('name') || 'Безымянный объект';
        const type = feature.get('geometry').getType();
        
        let message = `Выбран ${type === 'Polygon' ? 'полигон' : 'маршрут'}: ${name}`;
        
        if (type === 'Polygon') {
            const area = this.calculatePolygonArea(feature.getGeometry());
            message += `\nПлощадь: ${area.toFixed(2)} км²`;
        } else if (type === 'LineString') {
            const length = this.calculateRouteLength(feature.getGeometry());
            message += `\nДлина: ${length.toFixed(2)} км`;
        }
        
        if (typeof window.meteoApp !== 'undefined') {
            window.meteoApp.showNotification(message, 'Информация об объекте', 'info');
        }
    }

    // Обработчик движения мыши
    handlePointerMove(event) {
        const element = this.map.getTargetElement();
        const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
            return feature;
        });
        
        if (feature && feature.get('name')) {
            element.style.cursor = 'pointer';
        } else {
            element.style.cursor = this.drawingMode ? 'crosshair' : '';
        }
    }

    // Обработчик выделения объекта
    handleFeatureSelect(event) {
        const selectedFeatures = event.target.getFeatures();
        
        if (selectedFeatures.getLength() > 0) {
            const feature = selectedFeatures.item(0);
            const name = feature.get('name');
            const type = feature.get('geometry').getType();
            
            if (type === 'Polygon') {
                // Поиск полигона в состоянии приложения
                const polygon = this.app.state.polygons.find(p => p.name === name);
                if (polygon) {
                    this.app.state.selectedPolygon = polygon;
                    if (typeof window.meteoApp !== 'undefined') {
                        window.meteoApp.showNotification(`Выбран полигон: ${name}`, 'Полигон выбран', 'success');
                    }
                    
                    // Обновление интерфейса
                    this.updatePolygonSelectionInUI(polygon.id);
                }
            }
        }
    }

    // Обновление выделения полигона в интерфейсе
    updatePolygonSelectionInUI(polygonId) {
        // Убираем выделение со всех элементов
        document.querySelectorAll('#polygonsList .kml-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Выделяем нужный элемент
        const selectedItem = document.querySelector(`#polygonsList .kml-item[data-id="${polygonId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
    }

    // Загрузка сохраненных объектов
    loadSavedObjects() {
        // Загрузка полигонов
        if (this.app.state.polygons && this.app.state.polygons.length > 0) {
            this.app.state.polygons.forEach(polygon => {
                this.addPolygonToMap(polygon);
            });
        }
        
        // Загрузка маршрутов
        if (this.app.state.routes && this.app.state.routes.length > 0) {
            this.app.state.routes.forEach(route => {
                this.addRouteToMap(route);
            });
        }
        
        // Автоматическое позиционирование карты
        this.autoFitMap();
    }

    // Добавление полигона на карту
    addPolygonToMap(polygon) {
        if (polygon.type !== 'polygon' || polygon.coordinates.length < 3) return;
        
        // Замыкание полигона, если необходимо
        let coords = [...polygon.coordinates];
        if (coords[0][0] !== coords[coords.length-1][0] || 
            coords[0][1] !== coords[coords.length-1][1]) {
            coords.push([...coords[0]]);
        }
        
        const feature = new ol.Feature({
            geometry: new ol.geom.Polygon([coords.map(c => ol.proj.fromLonLat(c))]),
            name: polygon.name,
            userDrawn: polygon.userDrawn || false
        });
        
        this.sources.polygons.addFeature(feature);
    }

    // Добавление маршрута на карту
    addRouteToMap(route) {
        if (route.type !== 'linestring' || route.coordinates.length < 2) return;
        
        const feature = new ol.Feature({
            geometry: new ol.geom.LineString(
                route.coordinates.map(c => ol.proj.fromLonLat(c))
            ),
            name: route.name,
            userDrawn: route.userDrawn || false
        });
        
        this.sources.routes.addFeature(feature);
    }

    // Расчет площади полигона в км²
    calculatePolygonArea(geometry) {
        const area = ol.sphere.getArea(geometry);
        return area / 1000000; // в км²
    }

    // Расчет длины маршрута в км
    calculateRouteLength(geometry) {
        const length = ol.sphere.getLength(geometry);
        return length / 1000; // в км
    }

    // Автоматическое позиционирование карты
    autoFitMap() {
        // Проверка, что карта существует и имеет размеры
        if (!this.map || !this.map.getTargetElement()) {
            console.warn('⚠️ Карта не готова для авто-позиционирования');
            return;
        }
        
        // Проверка размеров контейнера
        const container = this.map.getTargetElement();
        const containerRect = container.getBoundingClientRect();
        
        if (containerRect.width <= 0 || containerRect.height <= 0) {
            console.warn('⚠️ Контейнер карты имеет нулевые размеры. Повторная попытка через 500мс...');
            setTimeout(() => this.autoFitMap(), 500);
            return;
        }
        
        const features = [
            ...this.sources.polygons.getFeatures(),
            ...this.sources.routes.getFeatures(),
            ...this.sources.drawing.getFeatures() // Добавляем нарисованные объекты
        ];
        
        if (features.length > 0) {
            const extent = ol.extent.boundingExtent(
                features.map(f => f.getGeometry().getExtent())
            );
            
            // Обновление размера перед подгонкой
            this.map.updateSize();
            
            this.map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                maxZoom: 14
            });
        } else {
            // Если нет объектов, центрируем на Москве
            this.map.getView().animate({
                center: ol.proj.fromLonLat([37.6173, 55.7558]),
                zoom: 9,
                duration: 1000
            });
        }
    }

    // Добавление точки анализа на карту
    addAnalysisPoint(coordinate, type, properties = {}) {
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coordinate)),
            type: type,
            ...properties
        });
        
        this.sources.analysis.addFeature(feature);
        return feature;
    }

    // Очистка слоя анализа
    clearAnalysisLayer() {
        this.sources.analysis.clear();
    }

    // Переключение видимости метеослоя
    toggleWeatherLayer(visible) {
        if (this.layers.weather) {
            this.layers.weather.setVisible(visible);
        }
    }

    // Добавление метеоданных на карту
    addWeatherData(data) {
        this.clearWeatherLayer();
        
        // Добавление точек ветрового профиля
        if (data.windProfile) {
            data.windProfile.forEach(point => {
                this.addWeatherPoint(
                    [point.lon, point.lat],
                    'wind',
                    { 
                        windSpeed: point.speed,
                        windDirection: point.direction,
                        altitude: point.altitude
                    }
                );
            });
        }
        
        // Добавление точек видимости
        if (data.visibility) {
            data.visibility.forEach(point => {
                this.addWeatherPoint(
                    [point.lon, point.lat],
                    'visibility',
                    { visibility: point.value }
                );
            });
        }
        
        // Добавление точек риска обледенения
        if (data.icingRisk) {
            data.icingRisk.forEach(point => {
                if (point.riskLevel > 1) { // Только умеренный и высокий риск
                    this.addWeatherPoint(
                        [point.lon, point.lat],
                        'icing',
                        { riskLevel: point.riskLevel }
                    );
                }
            });
        }
    }

    // Добавление точки метеоданных
    addWeatherPoint(coordinate, type, properties) {
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coordinate)),
            type: type,
            ...properties
        });
        
        this.sources.weatherLayers.addFeature(feature);
    }

    // Очистка метеослоя
    clearWeatherLayer() {
        this.sources.weatherLayers.clear();
    }

    // Получение текущего центра карты
    getMapCenter() {
        const center = this.map.getView().getCenter();
        return ol.proj.toLonLat(center);
    }

    // Установка центра карты
    setMapCenter(lat, lon, zoom = 9) {
        this.map.getView().animate({
            center: ol.proj.fromLonLat([lon, lat]),
            zoom: zoom,
            duration: 1000
        });
    }

    // Экспорт карты как изображения
    exportMapAsImage(filename = 'map_export') {
        this.map.once('rendercomplete', () => {
            const mapCanvas = document.createElement('canvas');
            const size = this.map.getSize();
            mapCanvas.width = size[0];
            mapCanvas.height = size[1];
            
            const mapContext = mapCanvas.getContext('2d');
            Array.prototype.forEach.call(
                document.querySelectorAll('.ol-layer canvas'),
                canvas => {
                    if (canvas.width > 0) {
                        const opacity = canvas.parentNode.style.opacity;
                        mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
                        const transform = canvas.style.transform;
                        const scale = transform
                            ? Number(transform.match(/scale\(([^\)]+)\)/)[1])
                            : 1;
                        const image = new Image(canvas.width, canvas.height);
                        image.src = canvas.toDataURL();
                        mapContext.drawImage(
                            image,
                            0,
                            0,
                            canvas.width,
                            canvas.height,
                            0,
                            0,
                            canvas.width / scale,
                            canvas.height / scale
                        );
                    }
                }
            );
            
            // Скачивание изображения
            mapCanvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}_${new Date().toISOString().slice(0,10)}.png`;
                a.click();
                URL.revokeObjectURL(url);
                
                if (typeof window.meteoApp !== 'undefined') {
                    window.meteoApp.showNotification('Карта успешно экспортирована', 'Экспорт', 'success');
                }
            });
        });
        
        this.map.renderSync();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
} else {
    window.MapManager = MapManager;
}