class ChartsManager {
    constructor() {
        this.currentAnalysis = null;
        this.currentRouteIndex = 0;
        this.charts = {};
        this.init();
    }
    
    init() {
        // Настройка обработчиков событий
        this.setupEventListeners();
        
        // Инициализация графиков
        this.initCharts();
    }
    
    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
                
                // Обновляем график при переключении вкладки
                const tabName = btn.dataset.tab;
                if (this.charts[tabName]) {
                    this.charts[tabName].resize();
                }
            });
        });
        
        // Выбор даты
        document.getElementById('dateSelectCharts')?.addEventListener('change', (e) => {
            if (window.meteoApp) {
                window.meteoApp.handleDateSelect(e.target.value);
            }
        });
        
        // Выбор полигона
        document.getElementById('polygonSelectCharts')?.addEventListener('change', (e) => {
            if (window.meteoApp) {
                window.meteoApp.handlePolygonSelect(e.target.value);
            }
        });
        
        // Выбор маршрута
        document.getElementById('routeSelectCharts')?.addEventListener('change', (e) => {
            if (window.meteoApp) {
                window.meteoApp.handleRouteSelect(e.target.value);
            }
        });
    }
    
    initCharts() {
        // Инициализация основных графиков
        this.initTemperatureChart();
        this.initWindChart();
        this.initHumidityChart();
        this.initPressureChart();
        this.initVisibilityChart();
        
        // Инициализация мини-графиков
        this.initMiniCharts();
    }
    
    initTemperatureChart() {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;
        
        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Температура (°C)',
                    data: Array.from({length: 24}, (_, i) => (5 + Math.sin((i - 6) * Math.PI / 12) * 8 + Math.random() * 2).toFixed(1)),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#e74c3c',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return `Температура: ${context.parsed.y}°C`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    initWindChart() {
        const ctx = document.getElementById('windChart');
        if (!ctx) return;
        
        this.charts.wind = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [
                    {
                        label: 'Скорость ветра (м/с)',
                        data: Array.from({length: 24}, (_, i) => (8 + Math.sin(i * Math.PI / 12) * 3 + Math.random() * 2).toFixed(1)),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#3498db',
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Порывы (м/с)',
                        data: Array.from({length: 24}, (_, i) => (12 + Math.sin(i * Math.PI / 12) * 4 + Math.random() * 3).toFixed(1)),
                        borderColor: '#e67e22',
                        backgroundColor: 'rgba(230, 126, 34, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#e67e22',
                        pointHoverRadius: 6,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: {
                                size: 13
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' м/с';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    initHumidityChart() {
        const ctx = document.getElementById('humidityChart');
        if (!ctx) return;
        
        this.charts.humidity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Влажность (%)',
                    data: Array.from({length: 24}, (_, i) => (70 + Math.sin((i - 6) * Math.PI / 12) * 15 + Math.random() * 10).toFixed(0)),
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2ecc71',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return `Влажность: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 50,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    initPressureChart() {
        const ctx = document.getElementById('pressureChart');
        if (!ctx) return;
        
        this.charts.pressure = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Давление (гПа)',
                    data: Array.from({length: 24}, (_, i) => (1010 + Math.sin((i - 6) * Math.PI / 24) * 8 + Math.random() * 3).toFixed(1)),
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#9b59b6',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return `Давление: ${context.parsed.y} гПа`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' гПа';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    initVisibilityChart() {
        const ctx = document.getElementById('visibilityChart');
        if (!ctx) return;
        
        this.charts.visibility = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Видимость (км)',
                    data: Array.from({length: 24}, (_, i) => (8 + Math.sin((i - 12) * Math.PI / 12) * 3 + (i > 20 || i < 6 ? -3 : 0) + Math.random() * 2).toFixed(1)),
                    borderColor: '#1abc9c',
                    backgroundColor: 'rgba(26, 188, 156, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#1abc9c',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return `Видимость: ${context.parsed.y} км`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' км';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    initMiniCharts() {
        // Мини-график температуры
        const miniTempCtx = document.getElementById('miniTempChart');
        if (miniTempCtx) {
            this.charts.miniTemp = new Chart(miniTempCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => i),
                    datasets: [{
                        data: Array.from({length: 24}, (_, i) => 5 + Math.sin((i - 6) * Math.PI / 12) * 8 + Math.random() * 2),
                        borderColor: '#e74c3c',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: -5, max: 15 }
                    }
                }
            });
        }
        
        // Мини-график ветра
        const miniWindCtx = document.getElementById('miniWindChart');
        if (miniWindCtx) {
            this.charts.miniWind = new Chart(miniWindCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => i),
                    datasets: [{
                        data: Array.from({length: 24}, (_, i) => 8 + Math.sin(i * Math.PI / 12) * 3 + Math.random() * 2),
                        borderColor: '#3498db',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: 0, max: 15 }
                    }
                }
            });
        }
        
        // Мини-график влажности
        const miniHumidityCtx = document.getElementById('miniHumidityChart');
        if (miniHumidityCtx) {
            this.charts.miniHumidity = new Chart(miniHumidityCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => i),
                    datasets: [{
                        data: Array.from({length: 24}, (_, i) => 70 + Math.sin((i - 6) * Math.PI / 12) * 15 + Math.random() * 10),
                        borderColor: '#2ecc71',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: 50, max: 100 }
                    }
                }
            });
        }
        
        // Мини-график видимости
        const miniVisibilityCtx = document.getElementById('miniVisibilityChart');
        if (miniVisibilityCtx) {
            this.charts.miniVisibility = new Chart(miniVisibilityCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => i),
                    datasets: [{
                        data: Array.from({length: 24}, (_, i) => 8 + Math.sin((i - 12) * Math.PI / 12) * 3 + (i > 20 || i < 6 ? -3 : 0) + Math.random() * 2),
                        borderColor: '#1abc9c',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: 0, max: 12 }
                    }
                }
            });
        }
    }
    
    updateData(weatherData) {
        this.currentAnalysis = weatherData;
        
        // Обновление списков полигонов и маршрутов
        this.updatePolygonsList();
        this.updateRoutesList();
        
        // Обновление данных графиков
        this.updateChartsData();
    }
    
    updatePolygonsList() {
        const select = document.getElementById('polygonSelectCharts');
        if (!select || !this.currentAnalysis?.polygons) return;
        
        select.innerHTML = '<option value="">Выберите полигон...</option>';
        
        this.currentAnalysis.polygons.forEach((polygon, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = polygon.name;
            select.appendChild(option);
        });
        
        // Выбираем первый полигон по умолчанию
        if (this.currentAnalysis.polygons.length > 0) {
            select.value = 0;
        }
    }
    
    updateRoutesList() {
        const select = document.getElementById('routeSelectCharts');
        if (!select || !this.currentAnalysis?.routes) return;
        
        select.innerHTML = '<option value="">Выберите маршрут...</option>';
        
        this.currentAnalysis.routes.forEach((route, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = route.name;
            select.appendChild(option);
        });
        
        // Выбираем первый маршрут по умолчанию
        if (this.currentAnalysis.routes.length > 0) {
            select.value = 0;
            this.currentRouteIndex = 0;
        }
    }
    
    updateChartsData() {
        // Генерация новых данных для графиков
        const temperatureData = Array.from({length: 24}, (_, i) => (5 + Math.sin((i - 6) * Math.PI / 12) * 8 + Math.random() * 2).toFixed(1));
        const windData = Array.from({length: 24}, (_, i) => (8 + Math.sin(i * Math.PI / 12) * 3 + Math.random() * 2).toFixed(1));
        const humidityData = Array.from({length: 24}, (_, i) => (70 + Math.sin((i - 6) * Math.PI / 12) * 15 + Math.random() * 10).toFixed(0));
        const pressureData = Array.from({length: 24}, (_, i) => (1010 + Math.sin((i - 6) * Math.PI / 24) * 8 + Math.random() * 3).toFixed(1));
        const visibilityData = Array.from({length: 24}, (_, i) => (8 + Math.sin((i - 12) * Math.PI / 12) * 3 + (i > 20 || i < 6 ? -3 : 0) + Math.random() * 2).toFixed(1));
        
        // Обновление основных графиков
        if (this.charts.temperature) {
            this.charts.temperature.data.datasets[0].data = temperatureData;
            this.charts.temperature.update();
        }
        
        if (this.charts.wind) {
            this.charts.wind.data.datasets[0].data = windData;
            this.charts.wind.data.datasets[1].data = Array.from({length: 24}, (_, i) => (12 + Math.sin(i * Math.PI / 12) * 4 + Math.random() * 3).toFixed(1));
            this.charts.wind.update();
        }
        
        if (this.charts.humidity) {
            this.charts.humidity.data.datasets[0].data = humidityData;
            this.charts.humidity.update();
        }
        
        if (this.charts.pressure) {
            this.charts.pressure.data.datasets[0].data = pressureData;
            this.charts.pressure.update();
        }
        
        if (this.charts.visibility) {
            this.charts.visibility.data.datasets[0].data = visibilityData;
            this.charts.visibility.update();
        }
        
        // Обновление мини-графиков
        if (this.charts.miniTemp) {
            this.charts.miniTemp.data.datasets[0].data = temperatureData.map(v => parseFloat(v));
            this.charts.miniTemp.update();
        }
        
        if (this.charts.miniWind) {
            this.charts.miniWind.data.datasets[0].data = windData.map(v => parseFloat(v));
            this.charts.miniWind.update();
        }
        
        if (this.charts.miniHumidity) {
            this.charts.miniHumidity.data.datasets[0].data = humidityData.map(v => parseFloat(v));
            this.charts.miniHumidity.update();
        }
        
        if (this.charts.miniVisibility) {
            this.charts.miniVisibility.data.datasets[0].data = visibilityData.map(v => parseFloat(v));
            this.charts.miniVisibility.update();
        }
    }
    
    displayRouteData(analysisResult) {
        // Обновление данных графиков на основе результатов анализа
        this.updateChartsData();
    }
}