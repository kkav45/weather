// Глобальные переменные для хранения экземпляров графиков
let windProfileChart, tempDewpointChart, visibilityChart, precipitationChart;
let capeChart, safetyWindowChart, gustsChart, pressureChart;
let currentChartData = null;

// Инициализация страницы графиков с проверкой элементов
document.addEventListener('DOMContentLoaded', function() {
    // Проверка, что мы на странице графиков
    if (!document.getElementById('windProfileChart')) {
        console.log('Не страница графиков - инициализация пропущена');
        return;
    }
    
    console.log('📈 Инициализация графиков...');
    
    // Установка текущей даты
    const today = new Date();
    const dateInput = document.getElementById('dateSelect');
    if (dateInput) {
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    const dateDisplay = document.getElementById('currentDateDisplay');
    if (dateDisplay) {
        dateDisplay.textContent = formatDate(today);
    }
    
    // Загрузка списка маршрутов
    loadRoutes();
    
    // Инициализация обработчиков событий
    setupEventListeners();
    
    // Загрузка данных по умолчанию
    loadDefaultData();
});

// Загрузка списка маршрутов
function loadRoutes() {
    // В реальном приложении данные загружаются из хранилища или API
    const routes = [
        { id: 'route1', name: 'Северный обход (42 км)' },
        { id: 'route2', name: 'Южный маршрут (35 км)' },
        { id: 'route3', name: 'Восточный круг (28 км)' }
    ];
    
    const select = document.getElementById('routeSelect');
    if (!select) return;
    
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        select.appendChild(option);
    });
    
    // Выбор первого маршрута по умолчанию
    if (routes.length > 0) {
        select.value = routes[0].id;
        loadChartData(routes[0].id);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Смена маршрута
    const routeSelect = document.getElementById('routeSelect');
    if (routeSelect) {
        routeSelect.addEventListener('change', function(e) {
            if (e.target.value) {
                loadChartData(e.target.value);
            }
        });
    }
    
    // Обновление данных
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const routeId = document.getElementById('routeSelect')?.value;
            if (routeId) {
                loadChartData(routeId);
            }
        });
    }
    
    // Кнопки скачивания графиков
    document.querySelectorAll('[data-action="download"]').forEach(button => {
        button.addEventListener('click', function() {
            const chartId = this.dataset.chart;
            downloadChart(chartId);
        });
    });
    
    // Кнопки полноэкранного режима
    document.querySelectorAll('[data-action="fullscreen"]').forEach(button => {
        button.addEventListener('click', function() {
            const chartId = this.dataset.chart;
            openFullscreenChart(chartId);
        });
    });
    
    // Закрытие полноэкранного режима
    const closeFullscreen = document.getElementById('closeFullscreen');
    if (closeFullscreen) {
        closeFullscreen.addEventListener('click', closeFullscreenChart);
    }
    
    // Скачивание изображения из полноэкранного режима
    const downloadFullscreen = document.getElementById('downloadFullscreen');
    if (downloadFullscreen) {
        downloadFullscreen.addEventListener('click', downloadFullscreenChart);
    }
}

// Загрузка данных для графиков
function loadChartData(routeId) {
    showLoading(true);
    
    // В реальном приложении данные загружаются из API
    setTimeout(() => {
        // Генерация тестовых данных
        currentChartData = generateChartData(routeId);
        
        // Инициализация или обновление графиков
        initCharts();
        
        showLoading(false);
        showNotification('Данные успешно загружены', 'Успех', 'success');
    }, 800);
}

// Генерация тестовых данных для графиков
function generateChartData(routeId) {
    const hours = Array.from({length: 24}, (_, i) => i);
    const now = new Date();
    const baseTemp = routeId === 'route1' ? 3 : routeId === 'route2' ? 5 : 2;
    const baseWind = routeId === 'route1' ? 8 : routeId === 'route2' ? 6 : 10;
    
    return {
        hours: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
        
        // Ветровой профиль
        windSpeed10m: hours.map(h => baseWind + Math.sin(h * Math.PI / 12) * 3 + Math.random() * 2),
        windSpeed80m: hours.map(h => baseWind + 2 + Math.sin(h * Math.PI / 12) * 4 + Math.random() * 2),
        windSpeed120m: hours.map(h => baseWind + 4 + Math.sin(h * Math.PI / 12) * 5 + Math.random() * 3),
        windDir10m: hours.map(h => 270 + Math.sin(h * Math.PI / 12) * 30),
        windDir80m: hours.map(h => 280 + Math.sin(h * Math.PI / 12) * 35),
        windDir120m: hours.map(h => 290 + Math.sin(h * Math.PI / 12) * 40),
        
        // Температура и точка росы
        temperature: hours.map(h => baseTemp + Math.sin((h - 6) * Math.PI / 12) * 8),
        dewpoint: hours.map(h => baseTemp - 2 + Math.sin((h - 6) * Math.PI / 12) * 6),
        
        // Видимость и облачность
        visibility: hours.map(h => {
            const base = 8 + Math.sin((h - 12) * Math.PI / 12) * 3;
            return Math.max(1, Math.min(15, base + (h > 20 || h < 6 ? -3 : 0) + Math.random() * 2));
        }),
        cloudCover: hours.map(h => 30 + Math.sin((h - 12) * Math.PI / 12) * 40 + Math.random() * 20),
        cloudCoverLow: hours.map(h => 20 + Math.sin((h - 12) * Math.PI / 12) * 30 + Math.random() * 15),
        
        // Осадки и риск обледенения
        precipitation: hours.map(h => {
            if (h > 11 && h < 15) return 1.5 + Math.random() * 1;
            return Math.random() * 0.3;
        }),
        icingRisk: hours.map(h => {
            const temp = baseTemp + Math.sin((h - 6) * Math.PI / 12) * 8;
            const precip = h > 11 && h < 15 ? 1.5 : 0;
            if (temp >= 0 && temp <= 5 && precip > 0.5) return 3; // Высокий
            if (temp >= -2 && temp <= 7 && precip > 0.2) return 2; // Умеренный
            return 1; // Низкий
        }),
        
        // Грозовая активность
        cape: hours.map(h => {
            if (h > 13 && h < 18) return 1200 + Math.random() * 800;
            return 300 + Math.random() * 400;
        }),
        
        // Порывы ветра
        windGusts: hours.map(h => baseWind + 4 + Math.sin(h * Math.PI / 12) * 6 + Math.random() * 4),
        
        // Давление
        pressure: hours.map(h => 1010 + Math.sin((h - 6) * Math.PI / 24) * 8 + Math.random() * 3),
        
        // Окно безопасности
        safetyStatus: hours.map(h => {
            if (h < 6 || h > 20) return 0; // Темное время - запрещено
            if (h > 11 && h < 15) return 1; // Опасный период
            if (h > 15 && h < 18) return 2; // Ограниченные условия
            return 3; // Безопасно
        })
    };
}

// Инициализация графиков
function initCharts() {
    if (!currentChartData) return;
    
    createWindProfileChart();
    createTempDewpointChart();
    createVisibilityChart();
    createPrecipitationChart();
    createCapeChart();
    createSafetyWindowChart();
    createGustsChart();
    createPressureChart();
    updateLegends();
}

// Создание графика ветрового профиля
function createWindProfileChart() {
    const ctx = document.getElementById('windProfileChart');
    if (!ctx) return;
    
    if (windProfileChart) {
        windProfileChart.destroy();
    }
    
    windProfileChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentChartData.hours,
            datasets: [
                {
                    label: '10м высота',
                    data: currentChartData.windSpeed10m,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3
                },
                {
                    label: '80м высота',
                    data: currentChartData.windSpeed80m,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3
                },
                {
                    label: '120м высота',
                    data: currentChartData.windSpeed120m,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3
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
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} м/с`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Скорость ветра (м/с)'
                    },
                    min: 0,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Создание графика температуры и точки росы
function createTempDewpointChart() {
    const ctx = document.getElementById('tempDewpointChart');
    if (!ctx) return;
    
    if (tempDewpointChart) {
        tempDewpointChart.destroy();
    }
    
    tempDewpointChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentChartData.hours,
            datasets: [
                {
                    label: 'Температура',
                    data: currentChartData.temperature,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: 'Точка росы',
                    data: currentChartData.dewpoint,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
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
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}°C`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Температура (°C)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Создание графика видимости и облачности
function createVisibilityChart() {
    const ctx = document.getElementById('visibilityChart');
    if (!ctx) return;
    
    if (visibilityChart) {
        visibilityChart.destroy();
    }
    
    visibilityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentChartData.hours,
            datasets: [
                {
                    label: 'Видимость',
                    data: currentChartData.visibility,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Облачность',
                    data: currentChartData.cloudCover,
                    borderColor: '#95a5a6',
                    backgroundColor: 'rgba(149, 165, 166, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y1'
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
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Видимость') {
                                return `Видимость: ${context.parsed.y.toFixed(1)} км`;
                            }
                            return `Облачность: ${context.parsed.y.toFixed(0)}%`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Видимость (км)'
                    },
                    min: 0,
                    max: 15,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    position: 'left'
                },
                y1: {
                    title: {
                        display: true,
                        text: 'Облачность (%)'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    },
                    position: 'right'
                }
            }
        }
    });
}

// Создание графика осадков и риска обледенения
function createPrecipitationChart() {
    const ctx = document.getElementById('precipitationChart');
    if (!ctx) return;
    
    if (precipitationChart) {
        precipitationChart.destroy();
    }
    
    // Цвета для риска обледенения
    const icingColors = currentChartData.icingRisk.map(risk => {
        if (risk === 3) return 'rgba(231, 76, 60, 0.7)'; // Высокий
        if (risk === 2) return 'rgba(243, 156, 18, 0.7)'; // Умеренный
        return 'rgba(46, 204, 113, 0.7)'; // Низкий
    });
    
    precipitationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: currentChartData.hours,
            datasets: [
                {
                    label: 'Осадки (мм)',
                    data: currentChartData.precipitation,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Риск обледенения',
                    data: currentChartData.icingRisk.map(r => r * 10), // Масштабируем для визуализации
                    backgroundColor: icingColors,
                    borderColor: icingColors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1,
                    type: 'line',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1'
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
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Осадки (мм)') {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} мм`;
                            }
                            const riskLevel = currentChartData.icingRisk[context.dataIndex];
                            const riskText = riskLevel === 3 ? 'Высокий' : riskLevel === 2 ? 'Умеренный' : 'Низкий';
                            return `Риск обледенения: ${riskText}`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Осадки (мм)'
                    },
                    min: 0,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    position: 'left'
                },
                y1: {
                    title: {
                        display: true,
                        text: 'Риск обледенения'
                    },
                    min: 0,
                    max: 40,
                    grid: {
                        drawOnChartArea: false
                    },
                    position: 'right',
                    ticks: {
                        callback: function(value) {
                            if (value === 10) return 'Низкий';
                            if (value === 20) return 'Умеренный';
                            if (value === 30) return 'Высокий';
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// Создание графика грозовой активности (CAPE)
function createCapeChart() {
    const ctx = document.getElementById('capeChart');
    if (!ctx) return;
    
    if (capeChart) {
        capeChart.destroy();
    }
    
    // Цвета в зависимости от уровня опасности
    const capeColors = currentChartData.cape.map(cape => {
        if (cape > 2000) return 'rgba(231, 76, 60, 0.7)'; // Красный - очень опасно
        if (cape > 1500) return 'rgba(243, 156, 18, 0.7)'; // Оранжевый - опасно
        if (cape > 1000) return 'rgba(241, 196, 15, 0.7)'; // Желтый - умеренно
        return 'rgba(46, 204, 113, 0.7)'; // Зеленый - безопасно
    });
    
    capeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: currentChartData.hours,
            datasets: [{
                label: 'CAPE (J/kg)',
                data: currentChartData.cape,
                backgroundColor: capeColors,
                borderColor: capeColors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            const cape = context.parsed.y;
                            let risk = 'Низкий';
                            if (cape > 2000) risk = 'Очень высокий';
                            else if (cape > 1500) risk = 'Высокий';
                            else if (cape > 1000) risk = 'Умеренный';
                            
                            return [`CAPE: ${cape.toFixed(0)} J/kg`, `Риск: ${risk}`];
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'CAPE (J/kg)'
                    },
                    min: 0,
                    max: 2500,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 500
                    }
                }
            }
        }
    });
}

// Создание графика окна безопасности
function createSafetyWindowChart() {
    const ctx = document.getElementById('safetyWindowChart');
    if (!ctx) return;
    
    if (safetyWindowChart) {
        safetyWindowChart.destroy();
    }
    
    // Цвета для статусов безопасности
    const statusColors = currentChartData.safetyStatus.map(status => {
        if (status === 0) return 'rgba(231, 76, 60, 0.8)'; // Запрещено - красный
        if (status === 1) return 'rgba(243, 156, 18, 0.8)'; // Опасно - оранжевый
        if (status === 2) return 'rgba(241, 196, 15, 0.8)'; // Ограничено - желтый
        return 'rgba(46, 204, 113, 0.8)'; // Безопасно - зеленый
    });
    
    safetyWindowChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: currentChartData.hours,
            datasets: [{
                label: 'Статус безопасности',
                data: currentChartData.safetyStatus,
                backgroundColor: statusColors,
                borderColor: statusColors.map(c => c.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            const status = context.parsed.y;
                            let statusText = 'Запрещено';
                            if (status === 1) statusText = 'Опасные условия';
                            else if (status === 2) statusText = 'Ограниченные условия';
                            else if (status === 3) statusText = 'Безопасно';
                            
                            return `Статус: ${statusText}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Уровень безопасности'
                    },
                    min: 0,
                    max: 3,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            if (value === 0) return 'Запрещено';
                            if (value === 1) return 'Опасно';
                            if (value === 2) return 'Ограничено';
                            if (value === 3) return 'Безопасно';
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// Создание графика порывов ветра
function createGustsChart() {
    const ctx = document.getElementById('gustsChart');
    if (!ctx) return;
    
    if (gustsChart) {
        gustsChart.destroy();
    }
    
    gustsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentChartData.hours,
            datasets: [{
                label: 'Порывы ветра на 120м',
                data: currentChartData.windGusts,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
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
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            return `Порывы: ${context.parsed.y.toFixed(1)} м/с`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Скорость порывов (м/с)'
                    },
                    min: 0,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 2
                    }
                }
            }
        }
    });
}

// Создание графика давления
function createPressureChart() {
    const ctx = document.getElementById('pressureChart');
    if (!ctx) return;
    
    if (pressureChart) {
        pressureChart.destroy();
    }
    
    pressureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentChartData.hours,
            datasets: [{
                label: 'Атмосферное давление',
                data: currentChartData.pressure,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
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
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            return `Давление: ${context.parsed.y.toFixed(1)} гПа`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (UTC)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Давление (гПа)'
                    },
                    min: 990,
                    max: 1030,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 5
                    }
                }
            }
        }
    });
}

// Обновление легенд графиков
function updateLegends() {
    // Легенда ветрового профиля
    const windLegend = document.getElementById('windProfileLegend');
    if (windLegend) {
        windLegend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: #3498db;"></span>
                <span class="legend-label">10м высота</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #9b59b6;"></span>
                <span class="legend-label">80м высота</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #e74c3c;"></span>
                <span class="legend-label">120м высота</span>
            </div>
        `;
    }
    
    // Легенда температуры
    const tempLegend = document.getElementById('tempDewpointLegend');
    if (tempLegend) {
        tempLegend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: #e74c3c;"></span>
                <span class="legend-label">Температура</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #3498db;"></span>
                <span class="legend-label">Точка росы</span>
            </div>
        `;
    }
    
    // Легенда видимости
    const visibilityLegend = document.getElementById('visibilityLegend');
    if (visibilityLegend) {
        visibilityLegend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                <span class="legend-label">Видимость</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(149, 165, 166, 0.7);"></span>
                <span class="legend-label">Облачность</span>
            </div>
        `;
    }
    
    // Легенда осадков
    const precipLegend = document.getElementById('precipitationLegend');
    if (precipLegend) {
        precipLegend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(52, 152, 219, 0.7);"></span>
                <span class="legend-label">Осадки</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                <span class="legend-label">Низкий риск</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(243, 156, 18, 0.7);"></span>
                <span class="legend-label">Умеренный риск</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(231, 76, 60, 0.7);"></span>
                <span class="legend-label">Высокий риск</span>
            </div>
        `;
    }
    
    // Легенда CAPE
    const capeLegend = document.getElementById('capeLegend');
    if (capeLegend) {
        capeLegend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(46, 204, 113, 0.7);"></span>
                <span class="legend-label">Низкий (<1000)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(241, 196, 15, 0.7);"></span>
                <span class="legend-label">Умеренный (1000-1500)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(243, 156, 18, 0.7);"></span>
                <span class="legend-label">Высокий (1500-2000)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(231, 76, 60, 0.7);"></span>
                <span class="legend-label">Очень высокий (>2000)</span>
            </div>
        `;
    }
    
    // Легенда окна безопасности
    const safetyLegend = document.getElementById('safetyWindowLegend');
    if (safetyLegend) {
        safetyLegend.innerHTML = `
            <div class="legend-item">
                <span class="status-indicator status-danger"></span>
                <span class="legend-label">Запрещено</span>
            </div>
            <div class="legend-item">
                <span class="status-indicator status-warning"></span>
                <span class="legend-label">Опасные условия</span>
            </div>
            <div class="legend-item">
                <span class="status-indicator" style="background: #f1c40f;"></span>
                <span class="legend-label">Ограниченные условия</span>
            </div>
            <div class="legend-item">
                <span class="status-indicator status-safe"></span>
                <span class="legend-label">Безопасно</span>
            </div>
        `;
    }
}

// Скачивание графика как изображения
function downloadChart(chartId) {
    const chart = window[chartId];
    if (!chart) return;
    
    const link = document.createElement('a');
    link.download = `${chartId}_${new Date().toISOString().slice(0,10)}.png`;
    link.href = chart.toBase64Image('image/png', 1);
    link.click();
    
    showNotification(`График сохранен как ${link.download}`, 'Успех', 'success');
}

// Открытие графика в полноэкранном режиме
function openFullscreenChart(chartId) {
    const chart = window[chartId];
    if (!chart) return;
    
    const modal = document.getElementById('fullscreenModal');
    const title = document.getElementById('fullscreenTitle');
    const canvas = document.getElementById('fullscreenCanvas');
    
    // Установка заголовка
    const chartTitles = {
        'windProfileChart': 'Ветровой профиль по высотам',
        'tempDewpointChart': 'Температура и точка росы',
        'visibilityChart': 'Видимость и облачность',
        'precipitationChart': 'Осадки и риск обледенения',
        'capeChart': 'Грозовая активность (CAPE)',
        'safetyWindowChart': 'Окно безопасности полета',
        'gustsChart': 'Порывы ветра на высоте 120м',
        'pressureChart': 'Атмосферное давление'
    };
    
    if (title) title.textContent = chartTitles[chartId] || 'График';
    
    // Создание копии графика для полноэкранного режима
    const ctx = canvas.getContext('2d');
    if (window.fullscreenChartInstance) {
        window.fullscreenChartInstance.destroy();
    }
    
    window.fullscreenChartInstance = new Chart(ctx, {
        type: chart.config.type,
        data: chart.data,
        options: {
            ...chart.options,
            animation: false,
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    if (modal) modal.classList.add('show');
}

// Закрытие полноэкранного режима
function closeFullscreenChart() {
    const modal = document.getElementById('fullscreenModal');
    if (modal) modal.classList.remove('show');
    
    if (window.fullscreenChartInstance) {
        window.fullscreenChartInstance.destroy();
        window.fullscreenChartInstance = null;
    }
}

// Скачивание изображения из полноэкранного режима
function downloadFullscreenChart() {
    if (!window.fullscreenChartInstance) return;
    
    const link = document.createElement('a');
    link.download = `chart_fullscreen_${new Date().toISOString().slice(0,10)}.png`;
    link.href = window.fullscreenChartInstance.toBase64Image('image/png', 1);
    link.click();
    
    showNotification(`График сохранен как ${link.download}`, 'Успех', 'success');
}

// Вспомогательные функции
function showLoading(show) {
    // Реализация индикатора загрузки
    console.log(show ? 'Загрузка...' : 'Загрузка завершена');
}

function showNotification(message, title, type) {
    // Реализация уведомлений (можно использовать существующую функцию из приложения)
    console.log(`[${type}] ${title}: ${message}`);
    
    if (typeof window.meteoApp !== 'undefined' && window.meteoApp.showNotification) {
        window.meteoApp.showNotification(message, title, type);
    }
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function loadDefaultData() {
    const routeSelect = document.getElementById('routeSelect');
    if (routeSelect && routeSelect.value) {
        loadChartData(routeSelect.value);
    }
}