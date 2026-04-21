/**
 * Main.js - 系統整合與中控邏輯 (完整版)
 */

import { PoseDetector } from './core/detector.js';
import { PostureScorer } from './core/scorer.js';
import { Evaluator } from './core/evaluator.js';
import { Communicator } from './core/communicator.js';
import { CameraUI } from './ui/camera.js';
import { ChartUI } from './ui/charts.js';

const detector = new PoseDetector();
const evaluator = new Evaluator();
const comms = new Communicator();
let camera;

// 系統全域變數
let threshold = 0.5;
let postureLog = [];
let lastCalculatedScore = 0;
let isCurrentSlouching = false;
let smoothingAlpha = 0.3;
let slouchEMA = 0;

// --- 註冊 PWA Service Worker ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.error('SW Register Failed', err));
}

// --- 初始化應用程式 ---
async function init() {
    console.log("正在啟動系統...");
    try {
        await detector.init();
        camera = new CameraUI('output-canvas');
        const video = await camera.start();
        ChartUI.initHistoryChart('history-canvas');

        console.log("偵測迴圈啟動...");

        async function detectLoop() {
            try {
                const results = await detector.detect(video, performance.now());
                let landmarks = (results && results.landmarks) ? results.landmarks : null;
                
                let isSlouchingNow = false;
                let scoreData = { score: 0, angle: 180 };

                if (landmarks && landmarks.length > 0) {
                    scoreData = PostureScorer.calculateScore(landmarks);
                    lastCalculatedScore = scoreData.score;
                    
                    // EMA 平滑化邏輯
                    slouchEMA = scoreData.score * smoothingAlpha + slouchEMA * (1 - smoothingAlpha);
                    isSlouchingNow = slouchEMA >= threshold;

                    // 狀態改變時的觸發動作
                    if (isSlouchingNow !== isCurrentSlouching) {
                        isCurrentSlouching = isSlouchingNow;
                        comms.notify(isCurrentSlouching);
                        if (isCurrentSlouching && document.getElementById('enableAudio').checked) {
                            playBeep();
                        }
                        console.log("姿勢狀態改變:", isCurrentSlouching ? "駝背" : "良好");
                    }

                    // 更新文字 UI
                    document.getElementById('angle-score').innerText = scoreData.angle.toFixed(1) + "°";
                    document.getElementById('total-confidence').innerText = scoreData.score.toFixed(2);
                    const statusEl = document.getElementById('posture-status');
                    statusEl.innerText = isCurrentSlouching ? "❌ 駝背中" : "✅ 姿勢良好";
                    statusEl.className = isCurrentSlouching ? "score-bad" : "score-good";
                } else {
                    document.getElementById('posture-status').innerText = "等待偵測...";
                    document.getElementById('posture-status').className = "";
                }

                // 繪製畫面
                const showLandmarks = document.getElementById('showLandmarks').checked;
                camera.draw(landmarks, isCurrentSlouching, showLandmarks);

            } catch (err) {
                console.error("偵測過程錯誤:", err);
            }
            requestAnimationFrame(detectLoop);
        }
        detectLoop();

    } catch (err) {
        console.error("初始化失敗:", err);
        alert("系統啟動失敗，請檢查攝影機權限與 Console 日誌。");
    }
}

// --- 定時紀錄數據 (每 5 秒) ---
setInterval(() => {
    if (detector.landmarker) {
        postureLog.push({
            time: new Date().toLocaleTimeString(),
            status: isCurrentSlouching ? 1 : 0,
            score: lastCalculatedScore
        });
        ChartUI.drawHistory(postureLog);
    }
}, 5000);

// --- 事件綁定：導覽與切換 ---
function switchTab(sectionId, navId) {
    document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.getElementById(navId).classList.add('active');
}

document.getElementById('nav-live').onclick = () => switchTab('camera-section', 'nav-live');
document.getElementById('nav-batch').onclick = () => switchTab('batch-section', 'nav-batch');

// --- 事件綁定：micro:bit 連線 ---
document.getElementById('connectBle').onclick = async () => {
    try {
        const status = await comms.connectBle();
        document.getElementById('conn-status').innerText = "狀態: " + status;
        document.getElementById('conn-status').style.color = "#00ff88";
    } catch (err) {
        alert("BLE 連線失敗: " + err.message);
    }
};

document.getElementById('connectUsb').onclick = async () => {
    try {
        const status = await comms.connectUsb();
        document.getElementById('conn-status').innerText = "狀態: " + status;
        document.getElementById('conn-status').style.color = "#00ff88";
    } catch (err) {
        alert("USB 連線失敗: " + err.message);
    }
};

// --- 事件綁定：校正與控制 ---
document.getElementById('calibrateBtn').onclick = () => {
    // 將當前姿勢的信心值作為基準，增加 0.05 緩衝
    threshold = Math.min(0.95, lastCalculatedScore + 0.05);
    document.getElementById('threshold-slider').value = threshold;
    document.getElementById('threshold-val').innerText = threshold.toFixed(2);
    alert(`校正成功！\n目前姿勢得分: ${lastCalculatedScore.toFixed(2)}\n已設定新門檻為: ${threshold.toFixed(2)}`);
};

document.getElementById('resetThresholdBtn').onclick = () => {
    threshold = 0.5;
    document.getElementById('threshold-slider').value = 0.5;
    document.getElementById('threshold-val').innerText = "0.50";
    alert("門檻已重設為 0.50");
};

document.getElementById('threshold-slider').oninput = (e) => {
    threshold = parseFloat(e.target.value);
    document.getElementById('threshold-val').innerText = threshold.toFixed(2);
};

document.getElementById('clearLog').onclick = () => {
    if (confirm("確定要清除所有紀錄嗎？")) {
        postureLog = [];
        ChartUI.drawHistory(postureLog);
    }
};

document.getElementById('downloadCsv').onclick = () => {
    if (postureLog.length === 0) return alert("尚無紀錄可匯出");
    let csv = "Time,Status,Score\n";
    postureLog.forEach(e => {
        csv += `${e.time},${e.status === 1 ? "Slouching" : "Good"},${e.score.toFixed(3)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PostureReport_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// --- 事件綁定：批次評估 ---
document.getElementById('run-batch').onclick = async () => {
    const input = document.getElementById('batch-input');
    const files = input.files;
    if (files.length === 0) return alert("請先選擇圖片檔案");

    evaluator.clear();
    document.getElementById('results-area').style.display = 'block';
    document.getElementById('downloadBatchCsv').style.display = 'none';
    
    const metricsBody = document.getElementById('metrics-body');
    metricsBody.innerHTML = "<tr><td colspan='4'>處理中...</td></tr>";

    for (const file of files) {
        try {
            const meta = evaluator.parseFileName(file.name);
            const bitmap = await createImageBitmap(file);
            const results = await detector.landmarker.detect(bitmap);
            
            if (results && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                const scoreData = PostureScorer.calculateScore(results.landmarks);
                
                // 採集詳細數據
                evaluator.addRecord({
                    fileName: file.name,
                    truth: meta.label,
                    subject: meta.subject,
                    scenario: meta.scenario,
                    angle: scoreData.angle,
                    heightDiff: scoreData.s_h, // 使用 scorer 計算出的眼耳差指標
                    shoulderVis: (landmarks[11].visibility + landmarks[12].visibility) / 2,
                    confidenceScore: scoreData.score,
                    keypoints: {
                        nose: landmarks[0],
                        l_ear: landmarks[7], r_ear: landmarks[8],
                        l_shoulder: landmarks[11], r_shoulder: landmarks[12],
                        l_hip: landmarks[23], r_hip: landmarks[24]
                    }
                });
            }
        } catch (err) {
            console.error(`處理檔案 ${file.name} 失敗:`, err);
        }
    }

    const metrics = evaluator.calculateMetrics();
    ChartUI.drawPRCurve('pr-curve-chart', metrics);
    document.getElementById('downloadBatchCsv').style.display = 'inline-block';
    
    // 渲染表格
    metricsBody.innerHTML = '';
    [0.2, 0.5, 0.8].forEach(t => {
        const m = metrics.find(item => Math.abs(item.threshold - t) < 0.012) || metrics[Math.floor(t*50)];
        const tr = `<tr>
            <td>${m.threshold.toFixed(1)}</td>
            <td>${(m.precision * 100).toFixed(1)}%</td>
            <td>${(m.recall * 100).toFixed(1)}%</td>
            <td>${m.f1.toFixed(3)}</td>
        </tr>`;
        metricsBody.innerHTML += tr;
    });
};

document.getElementById('downloadBatchCsv').onclick = () => {
    const csv = evaluator.toCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Experiment_Detailed_Report_${new Date().getTime()}.csv`;
    a.click();
};

// --- 工具函數：發出嗶聲 ---
function playBeep() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.warn("音效播放受限:", e);
    }
}

// 啟動系統
init();
