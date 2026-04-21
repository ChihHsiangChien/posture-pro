/**
 * Charts.js - 修復圖表看不到的問題
 */

export class ChartUI {
    static prChart = null;
    static historyCanvas = null;
    static historyCtx = null;

    static initHistoryChart(canvasId) {
        this.historyCanvas = document.getElementById(canvasId);
        this.historyCtx = this.historyCanvas.getContext('2d');
        // 初始化時先畫一次空的
        this.drawHistory([]);
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
        const labelHeight = 60;
        
        // 確保寬度至少是容器寬度
        const containerWidth = canvas.parentElement.clientWidth || window.innerWidth;
        const neededWidth = log.length * (barWidth + spacing) + 50;
        canvas.width = Math.max(containerWidth, neededWidth);
        canvas.height = 200; 

        // 背景
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 如果沒數據，畫個提示字
        if (log.length === 0) {
            ctx.fillStyle = "#444";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("尚無歷史數據 (每 5 秒紀錄一次)", canvas.width / 2, canvas.height / 2);
            return;
        }

        log.forEach((entry, i) => {
            const x = i * (barWidth + spacing) + 10;
            ctx.fillStyle = entry.status === 1 ? "#ff4444" : "#00ff88";
            const maxH = canvas.height - labelHeight - 20;
            const h = entry.status === 1 ? maxH * 0.8 : maxH * 0.4;
            ctx.fillRect(x, canvas.height - labelHeight - h, barWidth, h);

            if (i % 5 === 0) {
                ctx.fillStyle = "#aaa";
                ctx.font = "11px monospace";
                ctx.save();
                ctx.translate(x + barWidth / 2, canvas.height - labelHeight + 5);
                ctx.rotate(Math.PI / 4);
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                const timeStr = entry.time.replace(/[^\d:]/g, ''); 
                ctx.fillText(timeStr, 0, 0);
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
