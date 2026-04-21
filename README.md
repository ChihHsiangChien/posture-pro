# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 核心功能

### 1. 離線偵測 (PWA)
*   **本地模型化**：所有 MediaPipe 資源（WASM, .task 模型）均存放於 `/models`，由 Service Worker 快取，支援 GitHub Pages 完全離線執行。
*   **無依賴建構**：採用純 HTML/JS (ESM) 架構，不需 npm/vite。

### 2. 信心分數計算 (Scorer)
系統透過以下特徵融合計算一個 0.0 到 1.0 的信心值：
*   **角度分數 ($S_A$)**：計算耳-肩-臀夾角，將 $150^\circ$ 至 $180^\circ$ 線性映射為機率值。
*   **高度分數 ($S_H$)**：監控眼耳高度差，偵測低頭動作，並以耳距（臉部比例）進行正規化。
*   **融合邏輯**：取 $\max(S_A, S_H)$ 作為最終信心值，以此對抗單一特徵失效（如帽 T 遮擋）。

### 3. 硬體聯動 (Communicator)
*   **Web Bluetooth**：連線 micro:bit，即時顯示 ❌ 或 ⭕。包含斷線自動重連提示。
*   **Web Serial (USB)**：序列埠通訊，傳送 `1` 或 `0`。
*   **狀態同步**：連線成功後會立刻向硬體同步當前的姿勢狀態。

### 4. 監控與評估
*   **即時監控**：支援攝影機切換、特徵點 (Landmarks) 顯示切換、音效提示與一鍵校正。
*   **歷史圖表**：底部 Canvas 顯示帶有 **時間戳記 (Timestamp)** 的長條圖，每 5 秒紀錄一次。
*   **批次測試**：自動解析檔名標籤（如 `A_Hoodie_Bad_001.jpg`），匯出高維度 CSV 報告。

## 硬體端設定 (micro:bit) - UART 模式

使用 [MakeCode](https://makecode.microbit.org/) JavaScript 模式貼入：

```javascript
// 當藍牙連線成功時顯示 C
bluetooth.onBluetoothConnected(function () {
    basic.showString("C")
})

// 接收來自 Web Bluetooth (UART) 的資料
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    // 讀取字串並去空格
    let cmd = bluetooth.uartReadString().trim()
    if (cmd == "1") {
        basic.showIcon(IconNames.No) // 駝背顯示 X
    } else if (cmd == "0") {
        basic.showIcon(IconNames.Yes) // 正常顯示 O
    }
})

// 接收來自 USB (Serial) 的資料
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = serial.readString().trim()
    if (cmd == "1") {
        basic.showIcon(IconNames.No)
    } else if (cmd == "0") {
        basic.showIcon(IconNames.Yes)
    }
})

// 啟動 UART 服務
bluetooth.startUartService()
serial.redirectToUSB()
basic.showString("P") // Ready
```
*註：需在專案設定中開啟 "No Pairing Required"。*

## 實驗數據格式 (CSV)
匯出的 `Experiment_Detailed_Report.csv` 包含：
*   **FileName / Truth / Subject / Scenario**: 實驗標籤資訊。
*   **Angle / HeightDiff**: 原始幾何特徵值。
*   **Shoulder_Vis**: 肩膀關鍵點的 MediaPipe 信心度（用於錯誤分析）。
*   **ConfidenceScore**: 系統判定的最終分數（用於 PR 曲線繪製）。
*   **Keypoints**: 所有核心關鍵點的 (x, y, z) 座標。

## 快速啟動
```bash
python3 -m http.server 8000
```
開啟 `http://localhost:8000` 即可使用。
