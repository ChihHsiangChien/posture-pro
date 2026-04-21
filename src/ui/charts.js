/**
 * Charts.js - 加入時間戳記顯示
 */

export class ChartUI {
    static prChart = null;
    static historyCanvas = null;
    static historyCtx = null;

    static initHistoryChart(canvasId) {
        this.historyCanvas = document.getElementById(canvasId);
        this.historyCtx = this.historyCanvas.getContext('2d');
    }

    static drawPRCurve(canvasId, metrics) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const data = metrics.map(m => ({ x: m.recall, y: m.precision }));
        if (this.prChart) this.prChart.destroy();
        this.prChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'PR 曲線',
                    data: data,
                    showLine: true,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.2)'
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Recall' }, min: 0, max: 1 },
                    y: { title: { display: true, text: 'Precision' }, min: 0, max: 1 }
                }
            }
        });
    }

    static drawHistory(log) {
        if (!this.historyCtx) return;
        const ctx = this.historyCtx;
        const canvas = this.historyCanvas;
        
        const spacing = 4;
        const barWidth = 15;
        const labelHeight = 30; // 留空間給時間標籤
        
        canvas.width = Math.max(window.innerWidth * 0.9, log.length * (barWidth + spacing));
        
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        log.forEach((entry, i) => {
            const x = i * (barWidth + spacing);
            
            // 繪製長條
            ctx.fillStyle = entry.status === 1 ? "#ff4444" : "#00ff88";
            const h = entry.status === 1 ? (canvas.height - labelHeight) * 0.8 : (canvas.height - labelHeight) * 0.4;
            ctx.fillRect(x, canvas.height - labelHeight - h, barWidth, h);

            // 繪製時間標籤 (每 5 筆資料畫一個，避免擁擠)
            if (i % 5 === 0) {
                ctx.fillStyle = "#888";
                ctx.font = "10px sans-serif";
                ctx.save();
                ctx.translate(x, canvas.height - labelHeight + 10);
                ctx.rotate(Math.PI / 4); // 旋轉 45 度
                ctx.fillText(entry.time, 0, 0);
                ctx.restore();
            }
        });

        this.updateStats(log);
    }

    static updateStats(log) {
        const total = log.length;
        if (total === 0) return;
        const bad = log.filter(e => e.status === 1).length;
        const good = total - bad;
        const ratio = ((bad / total) * 100).toFixed(1);

        document.getElementById('goodCount').innerText = good;
        document.getElementById('badCount').innerText = bad;
        document.getElementById('totalCount').innerText = total;
        document.getElementById('badRatio').innerText = ratio + "%";
    }
}
