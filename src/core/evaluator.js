/**
 * Evaluator.js - 實驗數據評估引擎
 */

export class Evaluator {
    constructor() {
        this.records = []; // 存放所有細節數據
    }

    addRecord(data) {
        this.records.push(data);
    }

    clear() {
        this.records = [];
    }

    /**
     * 解析檔名邏輯: Subject_Scenario_Label_Index.jpg
     * 例如: A_Hoodie_Bad_001.jpg
     */
    parseFileName(fileName) {
        const name = fileName.split('.')[0];
        const parts = name.split('_');
        
        return {
            fileName: fileName,
            subject: parts[0] || 'Unknown',
            scenario: parts[1] || 'Default',
            label: (name.toLowerCase().includes('bad') || name.toLowerCase().includes('pos')) ? 1 : 0
        };
    }

    /**
     * 計算 PR 曲線數據
     */
    calculateMetrics() {
        const metrics = [];
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const threshold = i / steps;
            let tp = 0, fp = 0, fn = 0, tn = 0;

            this.records.forEach(r => {
                const y_pred = r.confidenceScore >= threshold ? 1 : 0;
                if (r.truth === 1 && y_pred === 1) tp++;
                if (r.truth === 0 && y_pred === 1) fp++;
                if (r.truth === 1 && y_pred === 0) fn++;
                if (r.truth === 0 && y_pred === 0) tn++;
            });

            const precision = tp / (tp + fp) || 0;
            const recall = tp / (tp + fn) || 0;
            const f1 = (2 * precision * recall) / (precision + recall) || 0;
            metrics.push({ threshold, precision, recall, f1 });
        }
        return metrics;
    }

    /**
     * 產出完整實驗 CSV 字串
     */
    toCSV() {
        if (this.records.length === 0) return "";
        
        const headers = ["FileName", "Truth", "Subject", "Scenario", "Angle", "HeightDiff", "Shoulder_Vis", "ConfidenceScore", "Keypoints"];
        const rows = this.records.map(r => [
            r.fileName,
            r.truth,
            r.subject,
            r.scenario,
            r.angle.toFixed(2),
            r.heightDiff.toFixed(2),
            r.shoulderVis.toFixed(2),
            r.confidenceScore.toFixed(4),
            `"${JSON.stringify(r.keypoints).replace(/"/g, '""')}"`
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}
