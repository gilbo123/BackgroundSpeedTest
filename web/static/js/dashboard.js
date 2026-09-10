/* Background Speed Test dashboard — Chart.js v4, modern dark theme.
 * Loads chart data from /api/data, fills the stat cards, and refreshes
 * in place every 60s without a page reload.
 */
(function () {
    'use strict';

    var REFRESH_INTERVAL_MS = 60 * 1000;
    var STALE_AFTER_MS = 15 * 60 * 1000; // dim metric values if the last test is older than this

    var VIEWS = ['day', 'week', 'month', 'year'];
    var VIEW_KEY = 'bgt_view';
    var currentView = (function () {
        try { return localStorage.getItem(VIEW_KEY) || 'month'; } catch (e) { return 'month'; }
    })();

    function subtitleFor(days) {
        if (days <= 1)      { return 'Download, upload and latency over the past 24 hours'; }
        if (days <= 7)      { return 'Download, upload and latency over the past week'; }
        if (days <= 31)     { return 'Download, upload and latency over the past 30 days'; }
        return 'Download, upload and latency over the past year';
    }

    var COLORS = {
        download: 'rgba(56, 189, 248, 1)',
        downloadFill: 'rgba(56, 189, 248, 0.10)',
        upload: 'rgba(52, 211, 153, 1)',
        uploadFill: 'rgba(52, 211, 153, 0.08)',
        ping: 'rgba(251, 191, 36, 0.85)',
        grid: 'rgba(148, 163, 184, 0.10)',
        tick: '#93a1b8',
        tooltipBg: 'rgba(11, 16, 23, 0.92)',
        tooltipBorder: 'rgba(148, 163, 184, 0.28)',
        tooltipText: '#e6ecf5'
    };

    var MONO_FONT = { family: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace' };

    /* ---------- Formatting ---------- */

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) { el.textContent = value; }
    }

    function fmtMBps(v) {
        if (v == null || v === 0) { return '0'; }
        return v >= 100 ? Math.round(v).toString() : v.toFixed(1);
    }

    function fmtPing(v) {
        if (v == null) { return '0'; }
        return v >= 50 ? Math.round(v).toString() : v.toFixed(1);
    }

    /* ---------- Stat cards ---------- */

    function setStatCardsStale(stale) {
        ['stat-download', 'stat-upload', 'stat-ping', 'stat-time'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.classList.toggle('is-stale', stale); }
        });
    }

    function fillStatCards(lastTest) {
        if (!lastTest) {
            setText('stat-download', '—');
            setText('stat-upload', '—');
            setText('stat-ping', '—');
            setText('stat-time', 'no data yet');
            setStatCardsStale(false);
            return;
        }
        setText('stat-download', fmtMBps(lastTest.download));
        setText('stat-upload', fmtMBps(lastTest.upload));
        setText('stat-ping', fmtPing(lastTest.ping));
        setText('stat-time', lastTest.time || lastTest.date);
        // Dim the values if the newest sample is well over 15 minutes old
        if (typeof lastTest.ts === 'number') {
            setStatCardsStale(Date.now() - lastTest.ts * 1000 > STALE_AFTER_MS);
        }
    }

    /* ---------- Status pill ---------- */

    function setStatusPill(state, text) {
        var pill = document.querySelector('.status-pill');
        setText('status-text', text);
        if (!pill) { return; }
        pill.classList.remove('is-live', 'is-error');
        if (state) { pill.classList.add('is-' + state); }
    }

    /* ---------- Chart (Chart.js v4) ---------- */

    function makeDataset(label, axis, color, fill) {
        return {
            label: label,
            data: [],
            borderColor: color,
            backgroundColor: fill || 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: '#0b1017',
            pointHoverBorderWidth: 2,
            tension: 0.35,
            yAxisID: axis,
            fill: fill !== null
        };
    }

    var ctx = document.getElementById('combinedChart').getContext('2d');

    var combinedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                makeDataset('Download (Mbps)', 'y-speed', COLORS.download, COLORS.downloadFill),
                makeDataset('Upload (Mbps)', 'y-speed', COLORS.upload, COLORS.uploadFill),
                makeDataset('Ping (ms)', 'y-ping', COLORS.ping, null)
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: COLORS.tick,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 7,
                        boxHeight: 7,
                        padding: 18,
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    backgroundColor: COLORS.tooltipBg,
                    borderColor: COLORS.tooltipBorder,
                    borderWidth: 1,
                    titleColor: COLORS.tooltipText,
                    bodyColor: COLORS.tooltipText,
                    padding: 12,
                    cornerRadius: 8,
                    bodyFont: { family: MONO_FONT.family, size: 12 },
                    titleFont: { size: 12, weight: '600' },
                    callbacks: {
                        label: function (item) {
                            var v = item.parsed.y;
                            var text = item.dataset.label.indexOf('Ping') >= 0 ? fmtPing(v) : fmtMBps(v);
                            var name = item.dataset.label.replace(' (Mbps)', '').replace(' (ms)', '');
                            return ' ' + name + ': ' + text;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: COLORS.grid },
                    ticks: {
                        color: COLORS.tick,
                        autoSkip: true,
                        maxTicksLimit: 18,
                        rotation: 45,
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 11 }
                    }
                },
                'y-speed': {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    grid: { color: COLORS.grid },
                    border: { display: false },
                    ticks: {
                        color: COLORS.tick,
                        font: MONO_FONT,
                        maxTicksLimit: 7
                    },
                    title: {
                        display: true,
                        text: 'Mbps',
                        color: COLORS.tick,
                        font: { size: 11, weight: '500' }
                    }
                },
                'y-ping': {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    border: { display: false },
                    ticks: {
                        color: COLORS.tick,
                        font: MONO_FONT,
                        maxTicksLimit: 7
                    },
                    title: {
                        display: true,
                        text: 'ms',
                        color: COLORS.tick,
                        font: { size: 11, weight: '500' }
                    }
                }
            }
        }
    });

    /* ---------- Data loading ---------- */

    async function refreshData() {
        try {
            var res = await fetch('/api/data?view=' + encodeURIComponent(currentView), { cache: 'no-store' });
            if (!res.ok) { throw new Error('HTTP ' + res.status); }
            var data = await res.json();

            var hasData = Array.isArray(data.dates) && data.dates.length > 0;

            if (hasData) {
                combinedChart.data.labels = data.dates;
                combinedChart.data.datasets[0].data = data.downloads;
                combinedChart.data.datasets[1].data = data.uploads;
                combinedChart.data.datasets[2].data = data.pings;
                combinedChart.update('none'); // no animation flicker on refresh

                fillStatCards(data.last_test);

                var days = (typeof data.days === 'number') ? data.days : 0;
                setText('days-range', subtitleFor(days));
                setStatusPill('live', data.dates[0] + ' – ' + data.dates[data.dates.length - 1]);
            } else {
                fillStatCards(null);
                setStatusPill(null, 'No data yet — waiting for the first test…');
            }
        } catch (err) {
            console.error('Failed to load speed test data:', err);
            setStatusPill('error', 'Connection error — will retry');
        }
    }

    /* ---------- View toggle (Day / Week / Month / Year) ---------- */

    var toggleButtons = Array.prototype.slice.call(document.querySelectorAll('.view-toggle button'));

    function setActiveButton(view) {
        toggleButtons.forEach(function (btn) {
            btn.setAttribute('aria-pressed', String(btn.getAttribute('data-view') === view));
        });
    }

    toggleButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var view = btn.getAttribute('data-view');
            if (!view || view === currentView) { return; }
            currentView = view;
            try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* ignore */ }
            setActiveButton(view);
            // Optimistic subtitle until the fetch resolves
            setText('days-range', subtitleFor({ day: 1, week: 7, month: 30, year: 366 }[view]));
            refreshData();
        });
    });

    // Reflect a previously chosen view (from localStorage) before first load
    setActiveButton(currentView);
    setText('days-range', subtitleFor({ day: 1, week: 7, month: 30, year: 366 }[currentView]));

    refreshData();
    setInterval(refreshData, REFRESH_INTERVAL_MS);
})();
