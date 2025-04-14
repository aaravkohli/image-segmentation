document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone-file');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    let thresholdChart = null;
    let contrastChart = null;
    let histogramChart = null;
    let comparisonChart = null;
    let currentImageData = null;
    let previousImageData = null;

    // Handle file selection
    dropzone.addEventListener('change', handleFileUpload);

    // Handle drag and drop
    const dropArea = dropzone.parentElement;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropArea.classList.add('border-blue-500');
    }

    function unhighlight(e) {
        dropArea.classList.remove('border-blue-500');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFile(file);
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        handleFile(file);
    }

    function handleFile(file) {
        if (!file) return;

        // Show loading spinner
        loading.classList.remove('hidden');
        results.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            previousImageData = currentImageData;
            currentImageData = data;
            updateResults(data);
            updateComparison();
            // Update export buttons after comparison update
            addExportButtons();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while processing the image.');
        })
        .finally(() => {
            loading.classList.add('hidden');
        });
    }

    function updateResults(data) {
        // Update images
        document.getElementById('original-image').src = `/static/uploads/${data.original_image}`;
        document.getElementById('backtracking-image').src = `/static/uploads/${data.backtracking_image}`;
        document.getElementById('otsu-image').src = `/static/uploads/${data.otsu_image}`;

        // Update histogram analysis
        updateHistogramAnalysis(data.histogram_analysis);

        // Update backtracking analysis
        updateBacktrackingAnalysis(data.backtracking_analysis);

        // Update Otsu analysis
        updateOtsuAnalysis(data.otsu_analysis);

        // Add export buttons immediately
        addExportButtons();

        // Show results
        results.classList.remove('hidden');
    }

    function updateHistogramAnalysis(analysis) {
        // Update metrics
        document.getElementById('histogram-mean').textContent = analysis.mean.toFixed(2);
        document.getElementById('histogram-std').textContent = analysis.std_dev.toFixed(2);
        document.getElementById('histogram-peaks').textContent = analysis.peaks.join(', ');
        document.getElementById('histogram-valleys').textContent = analysis.valleys.join(', ');

        // Update histogram chart
        const ctx = document.getElementById('histogram-chart').getContext('2d');
        
        if (histogramChart) {
            histogramChart.destroy();
        }

        histogramChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 256}, (_, i) => i),
                datasets: [{
                    label: 'Pixel Intensity Distribution',
                    data: analysis.histogram,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Image Histogram'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Intensity ${context.label}: ${context.raw} pixels`;
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x'
                        },
                        pan: {
                            enabled: true,
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Pixel Count'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Intensity Value'
                        }
                    }
                }
            }
        });
    }

    function updateBacktrackingAnalysis(analysis) {
        // Update metrics
        document.getElementById('final-threshold').textContent = 
            analysis.final_threshold.toFixed(2);
        document.getElementById('best-contrast').textContent = 
            analysis.best_contrast.toFixed(2);
        document.getElementById('foreground-ratio').textContent = 
            (analysis.metrics_history[0].foreground_ratio * 100).toFixed(1) + '%';

        // Update threshold chart
        const thresholdCtx = document.getElementById('threshold-chart').getContext('2d');
        
        if (thresholdChart) {
            thresholdChart.destroy();
        }

        thresholdChart = new Chart(thresholdCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: analysis.thresholds.length}, (_, i) => i + 1),
                datasets: [{
                    label: 'Threshold Progression',
                    data: analysis.thresholds,
                    borderColor: 'rgb(59, 130, 246)',
                    tension: 0.1,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Threshold Values Over Iterations'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Iteration ${context.label}: ${context.raw.toFixed(2)}`;
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 255,
                        title: {
                            display: true,
                            text: 'Threshold Value'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Iteration'
                        }
                    }
                }
            }
        });

        // Update contrast chart
        const contrastCtx = document.getElementById('contrast-chart').getContext('2d');
        
        if (contrastChart) {
            contrastChart.destroy();
        }

        contrastChart = new Chart(contrastCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: analysis.contrasts.length}, (_, i) => i + 1),
                datasets: [{
                    label: 'Contrast Progression',
                    data: analysis.contrasts,
                    borderColor: 'rgb(34, 197, 94)',
                    tension: 0.1,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Contrast Values Over Iterations'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Iteration ${context.label}: ${context.raw.toFixed(4)}`;
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Contrast Value'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Iteration'
                        }
                    }
                }
            }
        });
    }

    function updateOtsuAnalysis(analysis) {
        const metrics = analysis.metrics;
        document.getElementById('otsu-fg-homogeneity').textContent = 
            (metrics.foreground_homogeneity * 100).toFixed(1) + '%';
        document.getElementById('otsu-bg-homogeneity').textContent = 
            (metrics.background_homogeneity * 100).toFixed(1) + '%';
        document.getElementById('otsu-edge-strength').textContent = 
            (metrics.edge_strength * 100).toFixed(1) + '%';
        document.getElementById('otsu-foreground-ratio').textContent = 
            (metrics.foreground_ratio * 100).toFixed(1) + '%';
    }

    function updateComparison() {
        if (!previousImageData || !currentImageData) return;

        const comparisonCtx = document.getElementById('comparison-chart').getContext('2d');
        
        if (comparisonChart) {
            comparisonChart.destroy();
        }

        const metrics = [
            {
                name: 'Mean Intensity',
                current: currentImageData.histogram_analysis.mean,
                previous: previousImageData.histogram_analysis.mean,
                unit: '',
                description: 'Average pixel intensity value'
            },
            {
                name: 'Standard Deviation',
                current: currentImageData.histogram_analysis.std_dev,
                previous: previousImageData.histogram_analysis.std_dev,
                unit: '',
                description: 'Spread of pixel intensities'
            },
            {
                name: 'Foreground Ratio',
                current: currentImageData.otsu_analysis.metrics.foreground_ratio * 100,
                previous: previousImageData.otsu_analysis.metrics.foreground_ratio * 100,
                unit: '%',
                description: 'Percentage of pixels in foreground'
            },
            {
                name: 'Edge Strength',
                current: currentImageData.otsu_analysis.metrics.edge_strength * 100,
                previous: previousImageData.otsu_analysis.metrics.edge_strength * 100,
                unit: '%',
                description: 'Strength of edges in the image'
            },
            {
                name: 'Foreground Homogeneity',
                current: currentImageData.otsu_analysis.metrics.foreground_homogeneity * 100,
                previous: previousImageData.otsu_analysis.metrics.foreground_homogeneity * 100,
                unit: '%',
                description: 'Uniformity of foreground pixels'
            },
            {
                name: 'Background Homogeneity',
                current: currentImageData.otsu_analysis.metrics.background_homogeneity * 100,
                previous: previousImageData.otsu_analysis.metrics.background_homogeneity * 100,
                unit: '%',
                description: 'Uniformity of background pixels'
            },
            {
                name: 'Contrast Score',
                current: currentImageData.backtracking_analysis.best_contrast,
                previous: previousImageData.backtracking_analysis.best_contrast,
                unit: '',
                description: 'Overall contrast between foreground and background'
            }
        ];

        comparisonChart = new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: metrics.map(m => m.name),
                datasets: [
                    {
                        label: 'Previous Image',
                        data: metrics.map(m => m.previous),
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    },
                    {
                        label: 'Current Image',
                        data: metrics.map(m => m.current),
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Image Comparison'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const metric = metrics[context.dataIndex];
                                const value = context.raw;
                                const diff = context.datasetIndex === 0 ? 
                                    ((value - metrics[context.dataIndex].current) / metrics[context.dataIndex].current * 100).toFixed(1) :
                                    ((value - metrics[context.dataIndex].previous) / metrics[context.dataIndex].previous * 100).toFixed(1);
                                
                                return [
                                    `${context.dataset.label}: ${value.toFixed(2)}${metric.unit}`,
                                    `Difference: ${diff}%`,
                                    `Description: ${metric.description}`
                                ];
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'y'
                        },
                        pan: {
                            enabled: true,
                            mode: 'y'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });

        // Add export buttons
        addExportButtons();
    }

    function addExportButtons() {
        const exportContainer = document.getElementById('export-buttons');
        if (!exportContainer) return;

        // Base export buttons that are always shown
        let buttonsHTML = `
            <div class="flex space-x-4">
                <button onclick="exportChart('histogram-chart')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Export Histogram
                </button>
                <button onclick="exportChart('threshold-chart')" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                    Export Threshold
                </button>
                <button onclick="exportChart('contrast-chart')" class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
                    Export Contrast
                </button>
        `;

        // Add comparison export button only if we have two images to compare
        if (previousImageData && currentImageData) {
            buttonsHTML += `
                <button onclick="exportChart('comparison-chart')" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Export Comparison
                </button>
            `;
        }

        buttonsHTML += `</div>`;
        exportContainer.innerHTML = buttonsHTML;
    }

    // Add export function to window object
    window.exportChart = function(chartId) {
        const chart = getChartInstance(chartId);
        if (!chart) return;

        const link = document.createElement('a');
        link.download = `${chartId}-${new Date().toISOString()}.png`;
        link.href = chart.toBase64Image();
        link.click();
    };

    function getChartInstance(chartId) {
        switch(chartId) {
            case 'histogram-chart': return histogramChart;
            case 'threshold-chart': return thresholdChart;
            case 'contrast-chart': return contrastChart;
            case 'comparison-chart': return comparisonChart;
            default: return null;
        }
    }
}); 