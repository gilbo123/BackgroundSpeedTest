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
        downloadTrend: 'rgba(56, 189, 248, 0.35)',
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
        setText('stat-ping', lastTest.ping != null ? fmtPing(lastTest.ping) : '—');
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
        var ds = {
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
        return ds;
    }

    // Faint moving-average trend line over the download speeds, so the
    // overall trend is easy to read against the noisy raw samples.
    function movingAverage(values, window) {
        var out = [];
        for (var i = 0; i < values.length; i++) {
            var start = Math.max(0, i - window + 1);
            var sum = 0;
            var count = 0;
            for (var j = start; j <= i; j++) {
                if (values[j] != null) { sum += values[j]; count++; }
            }
            out.push(count ? sum / count : null);
        }
        return out;
    }

    function trendDataSet() {
        var ds = makeDataset('Download trend (Mbps)', 'y-speed', COLORS.downloadTrend, null);
        ds.borderWidth = 2.5;   // a fraction wider than the base lines
        ds.borderDash = [5, 5];
        ds.tension = 0;        // straight (linear) segments, no bezier smoothing
        ds.pointRadius = 0;
        ds.pointHoverRadius = 0;
        return ds;
    }

    /* ---------- Brush zoom (drag on the plot to zoom into ~1h resolution) ---------- */

    // Zoom is stored as a time range (unix seconds) into the unzoomed data,
    // so a 60s background refresh re-maps the same range onto fresh samples.
    var zoomState = { active: false, startTs: 0, endTs: 0 };
    var fullData = null; // last API payload for the current view, unzoomed

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    // Hour-resolution label: HH:MM, prefixed with the day when the date
    // rolls over between consecutive points ("28 Sep 00:05").
    function hiResLabel(k, tsArray) {
        var d = new Date(tsArray[k] * 1000);
        var hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        if (k > 0) {
            var p = new Date(tsArray[k - 1] * 1000);
            if (p.getDate() === d.getDate() && p.getMonth() === d.getMonth()) { return hm; }
        }
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + hm;
    }

    function zoomRange(data) {
        var n = data.ts.length;
        if (!zoomState.active || n === 0) { return { i0: 0, i1: Math.max(n - 1, 0), hiRes: false }; }
        var i0 = 0, i1 = n - 1, found = false, j, k;
        for (k = 0; k < n; k++) { if (data.ts[k] >= zoomState.startTs) { i0 = k; found = true; break; } }
        if (!found) { i0 = n - 1; }
        for (j = n - 1; j >= 0; j--) { if (data.ts[j] <= zoomState.endTs) { i1 = j; break; } }
        if (i1 - i0 < 1) { return { i0: 0, i1: Math.max(n - 1, 0), hiRes: false }; }
        return { i0: i0, i1: i1, hiRes: true };
    }

    function updateZoomHint() {
        var hint = document.getElementById('zoom-hint');
        if (hint) { hint.hidden = !zoomState.active; }
    }

    // Selection rectangle drawn while the mouse button is held down, and
    // keeps the tooltip suppressed for the duration of a brush drag
    // (no button pressed = normal tooltip, button pressed = selection tool).
    var brushPlugin = {
        id: 'bgtZoomBrush',
        afterEvent: function (chart, args) {
            if (chart.$bgtDragging && (args.event.type === 'mousemove' || args.event.type === 'mouseout')) {
                chart.tooltip.setActiveElements([], {});
                args.changed = true;
            }
        },
        afterDatasetsDraw: function (chart) {
            var b = chart.$bgtBrush;
            if (!b) { return; }
            var area = chart.chartArea;
            var c = chart.ctx;
            var left = Math.max(area.left, Math.min(b.x0, b.x1));
            var right = Math.min(area.right, Math.max(b.x0, b.x1));
            var height = area.bottom - area.top;
            c.save();
            c.beginPath();
            c.rect(area.left, area.top, area.right - area.left, height);
            c.clip();
            c.fillStyle = 'rgba(56, 189, 248, 0.14)';
            c.fillRect(left, area.top, right - left, height);
            c.fillStyle = 'rgba(56, 189, 248, 0.8)';
            c.fillRect(left, area.top, 1, height);
            c.fillRect(right - 1, area.top, 1, height);
            c.restore();
        }
    };

    var ctx = document.getElementById('combinedChart').getContext('2d');

    var combinedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                makeDataset('Download (Mbps)', 'y-speed', COLORS.download, COLORS.downloadFill),
                trendDataSet(),
                makeDataset('Upload (Mbps)', 'y-speed', COLORS.upload, COLORS.uploadFill),
                makeDataset('Ping (ms)', 'y-ping', COLORS.ping, null)
            ]
        },
        plugins: [brushPlugin],
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
                        font: { size: 12, weight: '500' },
                        generateLabels: function (chart) {
                            var items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            // De-emphasize the trend line in the legend
                            for (var i = 0; i < items.length; i++) {
                                if (chart.data.datasets[items[i].datasetIndex] &&
                                    String(chart.data.datasets[items[i].datasetIndex].label).indexOf('trend') >= 0) {
                                    items[i].textColor = 'rgba(147, 161, 184, 0.6)';
                                    items[i].pointStyle = 'line';
                                }
                            }
                            return items;
                        }
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
                            if (item.dataset.label.indexOf('trend') >= 0) { return null; }
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

    /* ---------- Data loading (zoom-aware) ---------- */

    function applyChartData(data) {
        // The full dataset is always kept unzoomed; the visible slice is
        // derived from zoomState so a background refresh re-maps the exact
        // same time range onto fresh samples.
        fullData = data;
        var range = zoomRange(data);
        var slice = function (arr) {
            return range.hiRes ? arr.slice(range.i0, range.i1 + 1) : arr;
        };
        combinedChart.data.labels = range.hiRes
            ? data.ts.slice(range.i0, range.i1 + 1).map(function (t, i) { return hiResLabel(range.i0 + i, data.ts); })
            : data.dates;
        combinedChart.data.datasets[0].data = slice(data.downloads);
        // Faint trend line: rolling average of the full downloads first, then
        // slice — so the trend near the edges of the zoomed range is based
        // on real neighbours, not just visible samples.
        var trendWindow = Math.max(3, Math.min(25, Math.round(data.downloads.length * 0.02)));
        combinedChart.data.datasets[1].data = slice(movingAverage(data.downloads, trendWindow));
        combinedChart.data.datasets[2].data = slice(data.uploads);
        combinedChart.data.datasets[3].data = slice(data.pings);
        combinedChart.update('none'); // no animation flicker on refresh

        fillStatCards(data.last_test);

        var days = (typeof data.days === 'number') ? data.days : 0;
        setText('days-range', subtitleFor(days));
        if (zoomState.active) {
            setStatusPill('live', hiResLabel(range.i0, data.ts) + ' – ' + hiResLabel(range.i1, data.ts));
        } else {
            setStatusPill('live', data.dates[0] + ' – ' + data.dates[data.dates.length - 1]);
        }
        updateZoomHint();
    }

    async function refreshData() {
        try {
            var res = await fetch('/api/data?view=' + encodeURIComponent(currentView), { cache: 'no-store' });
            if (!res.ok) { throw new Error('HTTP ' + res.status); }
            var data = await res.json();

            var hasData = Array.isArray(data.dates) && data.dates.length > 0;
            if (hasData) {
                applyChartData(data);
            } else {
                fullData = null;
                fillStatCards(null);
                setStatusPill(null, 'No data yet — waiting for the first test…');
            }
        } catch (err) {
            console.error('Failed to load speed test data:', err);
            setStatusPill('error', 'Connection error — will retry');
        }
    }

    /* ---------- Brush zoom: drag on the plot to select a range ---------- */

    var MIN_BRUSH_PX = 8; // ignore near-clicks; keep accidental tooltip taps clean

    function canvasXY(evt) {
        var area = combinedChart.chartArea;
        if (!area) { return null; }
        var rect = combinedChart.canvas.getBoundingClientRect();
        var x = evt.clientX - rect.left;
        var y = evt.clientY - rect.top;
        if (x < area.left || x > area.right || y < area.top || y > area.bottom) { return null; }
        return { x: x, y: y };
    }

    function xToTs(x) {
        // Linear interpolation over the visible (possibly sliced) samples to
        // recover a unix-second range into the unzoomed data.
        var n = combinedChart.data.labels.length;
        if (!fullData || !n) { return null; }
        var range = zoomRange(fullData);
        var x0 = combinedChart.scales.x.getPixelForValue(0);
        var x1 = combinedChart.scales.x.getPixelForValue(n - 1);
        if (x1 === x0) { return fullData.ts[range.i0]; }
        var frac = (x - x0) / (x1 - x0);
        var idx = range.i0 + frac * (range.i1 - range.i0);
        idx = Math.max(range.i0, Math.min(range.i1, idx));
        var a = Math.floor(idx), b = Math.ceil(idx);
        if (a === b) { return fullData.ts[a]; }
        return fullData.ts[a] + (idx - a) * (fullData.ts[b] - fullData.ts[a]);
    }

    combinedChart.canvas.style.cursor = 'crosshair';

    combinedChart.canvas.addEventListener('mousedown', function (evt) {
        if (evt.button !== 0) { return; }
        if (!fullData) { return; }
        var p = canvasXY(evt);
        if (!p) { return; }
        combinedChart.$bgtDragging = true;
        combinedChart.$bgtBrush = { x0: p.x, x1: p.x };
        combinedChart.render();
    });

    window.addEventListener('mousemove', function (evt) {
        var chart = combinedChart;
        if (!chart.$bgtDragging) { return; }
        var p = canvasXY(evt);
        if (p) { chart.$bgtBrush.x1 = p.x; }
        chart.render();
    });

    window.addEventListener('mouseup', function () {
        var chart = combinedChart;
        if (!chart.$bgtDragging) { return; }
        chart.$bgtDragging = false;
        var b = chart.$bgtBrush;
        chart.$bgtBrush = null;
        if (!b || Math.abs(b.x1 - b.x0) < MIN_BRUSH_PX) { chart.render(); return; } // treat as a click/tooltip

        var tsA = xToTs(Math.min(b.x0, b.x1));
        var tsB = xToTs(Math.max(b.x0, b.x1));
        if (tsA == null || tsB == null || tsB - tsA < 120) { chart.render(); return; }
        zoomState = { active: true, startTs: Math.min(tsA, tsB), endTs: Math.max(tsA, tsB) };
        if (fullData) { applyChartData(fullData); } else { refreshData(); }
        chart.render();
    });

    /* ---------- Zoom reset ---------- */

    function clearZoom() {
        if (!zoomState.active) { return; }
        zoomState = { active: false, startTs: 0, endTs: 0 };
        if (fullData) { applyChartData(fullData); }
    }

    /* ---------- View toggle (Day / Week / Month / Year = unzoom) ---------- */

    var toggleButtons = Array.prototype.slice.call(document.querySelectorAll('.view-toggle button'));

    function setActiveButton(view) {
        toggleButtons.forEach(function (btn) {
            btn.setAttribute('aria-pressed', String(btn.getAttribute('data-view') === view));
        });
    }

    toggleButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var view = btn.getAttribute('data-view');
            if (!view) { return; }

            // Clicking any view button always unzooms, per UX spec.
            clearZoom();

            if (view === currentView) { return; } // already the right window: unzoom alone is sufficient
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
