# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 核心功能

### 1. 離線偵測 (PWA)
*   **本地模型化**：所有 MediaPipe 資源（WASM, .task 模型）均存放於 `/models`，由 Service Worker 快取，支援 GitHub Pages 完全離線執行。
*   **無依賴建構**：採用純 HTML/JS (ESM) 架構，不需 npm/vite 即可運行。

### 2. 信心分數計算 (Scorer)
系統透過以下特徵融合計算一個 0.0 到 1.0 的信心值：
*   **角度分數 ($S_A$)**：計算耳-肩-臀夾角，將 $150^\circ$ 至 $180^\circ$ 線性映射為機率值。
*   **高度分數 ($S_H$)**：監控眼耳高度差，偵測低頭或縮頭動作，並以臉部比例（耳距）進行正規化。
*   **融合邏輯**：取 $\max(S_A, S_H)$ 作為最終信心值，以此對抗單一特徵失效（如帽 T 遮擋）。

### 3. 硬體聯動 (Communicator)
*   **Web Bluetooth**：支援連線 micro:bit UART。具備 **GATT 傳輸鎖定** 機制，防止指令衝突。
*   **Web Serial (USB)**：支援序列埠通訊，傳送 `1` 或 `0` 給外部裝置。
*   **狀態同步**：連線成功後會立刻向硬體同步當前的姿勢狀態。

### 4. 監控與評估
*   **即時監控**：支援攝影機切換、特徵點 (Landmarks) 顯示切換、音效提示與一鍵校正。
*   **歷史圖表**：底部 Canvas 顯示帶有 **時間戳記 (Timestamp)** 的長條圖，每 5 秒紀錄一次。
*   **批次測試**：自動解析檔名標籤（如 `A_Hoodie_Bad_001.jpg`），匯出高維度 CSV 報告（含角度、高度差、關鍵點座標、模型信心度）。

## 硬體端設定 (micro:bit) - UART 模式

請使用 [MakeCode](https://makecode.microbit.org/) 並貼入以下代碼進行測試。此版本包含了笑臉反饋以確認連線成功。

```javascript
// 當藍牙連線成功時，立刻顯示笑臉
bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Happy)
})

// 接收來自 Web Bluetooth (UART) 的資料
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)).trim()
    
    // 使用 includes 確保即使有雜訊也能識別指令
    if (cmd.includes("1")) {
        basic.showIcon(IconNames.No) // 顯示 X
    } else if (cmd.includes("0")) {
        basic.showIcon(IconNames.Yes) // 顯示 O
    }
})

// 接收來自 USB 的資料 (同步支援)
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = serial.readString().trim()
    if (cmd.includes("1")) {
        basic.showIcon(IconNames.No)
    } else if (cmd.includes("0")) {
        basic.showIcon(IconNames.Yes)
    }
})

// 啟動服務
bluetooth.startUartService()
serial.redirectToUSB()
basic.showString("P") // Ready
```
*註：需在專案設定中開啟 "No Pairing Required"。*

## 實驗數據格式 (CSV)
匯出的 `Experiment_Detailed_Report.csv` 包含：
*   **FileName / Truth / Subject / Scenario**: 實驗標籤資訊。
*   **Angle / HeightDiff**: 原始幾何特徵值。
*   **Shoulder_Vis**: 肩膀關鍵點的 MediaPipe 信心度。
*   **ConfidenceScore**: 系統判定的最終分數。
*   **Keypoints**: 所有核心關鍵點的 (x, y, z) 座標。

## 目錄結構
```text
/hunchback
├── /models          # MediaPipe SDK, WASM, 姿態模型檔
├── /src
│   ├── /core        # 核心邏輯 (偵測、分數計算、硬體通訊、評估)
│   ├── /ui          # 介面繪製 (攝影機 Canvas, 歷史圖表)
│   └── main.js      # 應用程式中控
├── index.html       # UI 佈局
├── sw.js            # PWA 快取邏輯
└── manifest.json    # PWA 安裝資訊
```

## 快速啟動
使用任何靜態伺服器開啟此目錄即可：
```bash
python3 -m http.server 8000
```
