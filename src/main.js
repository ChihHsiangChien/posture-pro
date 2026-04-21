/**
 * Main.js - 修復按鈕失效與鏡頭切換
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
const camera = new CameraUI('output-canvas');

// 狀態變數
let currentFacingMode = "user";
let threshold = 0.5;
let postureLog = [];
let lastCalculatedScore = 0;
let isCurrentSlouching = false;
let slouchEMA = 0;
const smoothingAlpha = 0.3;

// --- 1. 立即綁定按鈕 (不等待模型初始化) ---

// 導覽切換
const switchTab = (sectionId, navId) => {
    document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.getElementById(navId).classList.add('active');
};
document.getElementById('nav-live').onclick = () => switchTab('camera-section', 'nav-live');
document.getElementById('nav-batch').onclick = () => switchTab('batch-section', 'nav-batch');

// micro:bit 連線
document.getElementById('connectBle').onclick = async () => {
    try {
        const s = await comms.connectBle();
        document.getElementById('conn-status').innerText = "狀態: " + s;
        document.getElementById('conn-status').style.color = "#00ff88";
        // 連線後立即同步一次狀態 (使用 force=true)
        await comms.notify(isCurrentSlouching, true);
    } catch (e) { alert("BLE 失敗: " + e.message); }
};
document.getElementById('connectUsb').onclick = async () => {
    try {
        const s = await comms.connectUsb();
        document.getElementById('conn-status').innerText = "狀態: " + s;
        document.getElementById('conn-status').style.color = "#00ff88";
        // 連線後立即同步一次狀態 (使用 force=true)
        await comms.notify(isCurrentSlouching, true);
    } catch (e) { alert("USB 失敗: " + e.message); }
};

// 鏡頭切換
document.getElementById('switchCamera').onclick = async () => {
    currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
    console.log("切換為:", currentFacingMode);
    await camera.start(currentFacingMode);
};

// 校正與重設
document.getElementById('calibrateBtn').onclick = () => {
    threshold = Math.min(0.95, lastCalculatedScore + 0.05);
    document.getElementById('threshold-slider').value = threshold;
    document.getElementById('threshold-val').innerText = threshold.toFixed(2);
    alert("校正新門檻: " + threshold.toFixed(2));
};
document.getElementById('resetThresholdBtn').onclick = () => {
    threshold = 0.5;
    document.getElementById('threshold-slider').value = 0.5;
    document.getElementById('threshold-val').innerText = "0.50";
};
document.getElementById('threshold-slider').oninput = (e) => {
    threshold = parseFloat(e.target.value);
    document.getElementById('threshold-val').innerText = threshold.toFixed(2);
};

// 下載與清除
document.getElementById('downloadCsv').onclick = () => {
    if (postureLog.length === 0) return alert("無紀錄");
    let csv = "Time,Status,Score\n";
    postureLog.forEach(e => csv += `${e.time},${e.status},${e.score}\n`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = "report.csv"; a.click();
};
document.getElementById('clearLog').onclick = () => { postureLog = []; ChartUI.drawHistory([]); };

// --- 2. 系統初始化與偵測迴圈 ---

async function init() {
    const loadingText = document.getElementById('loading-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
        // 階段 1: 攝影機
        loadingText.innerText = "正在啟動攝影機...";
        await camera.start(currentFacingMode);
        ChartUI.initHistoryChart('history-canvas');

        // 階段 2: 模型
        loadingText.innerText = "正在載入 AI 模型 (約需數秒)...";
        await detector.init();
        
        // 階段 3: 完成
        loadingText.innerText = "完成！";
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }, 500);

        console.log("系統已就緒");

        const detectLoop = async () => {
            try {
                // 使用 camera.video 確保永遠指向當前啟用的攝影機
                const results = await detector.detect(camera.video, performance.now());
                const landmarks = (results && results.landmarks) ? results.landmarks : null;
                const showLandmarks = document.getElementById('showLandmarks').checked;

                if (landmarks && landmarks.length > 0) {
                    const scoreData = PostureScorer.calculateScore(landmarks);
                    lastCalculatedScore = scoreData.score;
                    slouchEMA = scoreData.score * smoothingAlpha + slouchEMA * (1 - smoothingAlpha);
                    const isSlouchingNow = slouchEMA >= threshold;

                    if (isSlouchingNow !== isCurrentSlouching) {
                        isCurrentSlouching = isSlouchingNow;
                        await comms.notify(isCurrentSlouching);
                    }
                    document.getElementById('angle-score').innerText = scoreData.angle.toFixed(1) + "°";
                    document.getElementById('total-confidence').innerText = scoreData.score.toFixed(2);
                    document.getElementById('posture-status').innerText = isCurrentSlouching ? "❌ 駝背中" : "✅ 姿勢良好";
                }
                camera.draw(landmarks, isCurrentSlouching, showLandmarks);
            } catch (e) { console.error(e); }
            requestAnimationFrame(detectLoop);
        };
        detectLoop();
    } catch (err) { alert("啟動失敗: " + err.message); }
}

// 啟動
init();
