/**
 * Main.js - 系統整合與中控邏輯 (輕量化版)
 */

import { PoseDetector } from './core/detector.js';
import { PostureScorer } from './core/scorer.js';
import { Communicator } from './core/communicator.js';
import { CameraUI } from './ui/camera.js';
import { ChartUI } from './ui/charts.js';

const detector = new PoseDetector();
const comms = new Communicator();
const camera = new CameraUI('output-canvas');

// 系統狀態
let currentFacingMode = "user";
let threshold = 0.5;
let postureLog = [];
let lastCalculatedScore = 0;
let isCurrentSlouching = false;
let slouchEMA = 0;
const smoothingAlpha = 0.3;

// --- 註冊 PWA Service Worker ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registered'));
}

// --- 立即綁定按鈕 (不等待模型初始化) ---

// micro:bit 連線
document.getElementById('connectBle').onclick = async () => {
    try {
        const s = await comms.connectBle();
        document.getElementById('conn-status').innerText = "狀態: " + s;
        document.getElementById('conn-status').style.color = "#00ff88";
        await comms.notify(isCurrentSlouching, true);
    } catch (e) { alert("BLE 失敗: " + e.message); }
};

document.getElementById('connectUsb').onclick = async () => {
    try {
        const s = await comms.connectUsb();
        document.getElementById('conn-status').innerText = "狀態: " + s;
        document.getElementById('conn-status').style.color = "#00ff88";
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

// 下載與清除紀錄
document.getElementById('downloadCsv').onclick = () => {
    if (postureLog.length === 0) return alert("尚無紀錄");
    let csv = "Time,Status,Score\n";
    postureLog.forEach(e => {
        csv += `${e.time},${e.status === 1 ? "Bad" : "Good"},${e.score.toFixed(3)}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `posture_report_${new Date().getTime()}.csv`;
    a.click();
};

document.getElementById('clearLog').onclick = () => {
    if (confirm("確定要清除所有紀錄嗎？")) {
        postureLog = [];
        ChartUI.drawHistory(postureLog);
    }
};

// --- 系統初始化與偵測迴圈 ---

async function init() {
    const loadingText = document.getElementById('loading-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
        loadingText.innerText = "正在啟動攝影機...";
        await camera.start(currentFacingMode);
        ChartUI.initHistoryChart('history-canvas');

        loadingText.innerText = "正在載入 AI 模型 (約需數秒)...";
        await detector.init();
        
        loadingText.innerText = "完成！";
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }, 500);

        const detectLoop = async () => {
            try {
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
                        if (isCurrentSlouching && document.getElementById('enableAudio').checked) {
                            playBeep();
                        }
                    }

                    document.getElementById('angle-score').innerText = scoreData.angle.toFixed(1) + "°";
                    document.getElementById('total-confidence').innerText = scoreData.score.toFixed(2);
                    document.getElementById('posture-status').innerText = isCurrentSlouching ? "❌ 駝背中" : "✅ 姿勢良好";
                    document.getElementById('posture-status').className = isCurrentSlouching ? "score-bad" : "score-good";
                } else {
                    document.getElementById('posture-status').innerText = "等待偵測...";
                    document.getElementById('posture-status').className = "";
                }
                camera.draw(landmarks, isCurrentSlouching, showLandmarks);
            } catch (e) { console.error(e); }
            requestAnimationFrame(detectLoop);
        };
        detectLoop();
    } catch (err) { alert("啟動失敗: " + err.message); }
}

// 定時紀錄
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

function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
}

init();
