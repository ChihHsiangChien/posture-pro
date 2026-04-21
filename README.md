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
*   **融合邏輯**：取 $\max(S_A, S_H)$ 作為最終信心值。

### 3. 硬體聯動 (Communicator)
*   **Web Bluetooth**：支援連線 micro:bit，即時顯示 ❌ (駝背) 或 ⭕ (正常)。
*   **Web Serial (USB)**：支援序列埠通訊，傳送 `1` 或 `0` 給外部裝置。

### 4. 監控與評估
*   **即時監控**：支援攝影機切換、特徵點顯示/隱藏、音效提示與一鍵校正。
*   **歷史圖表**：每 5 秒紀錄一次狀態，底部 Canvas 顯示帶有時間戳記 (Timestamp) 的歷史紀錄。
*   **批次測試**：支援自動解析檔名標籤（如 `A_Hoodie_Bad_001.jpg`），並繪製 PR 曲線。

### 5. 實驗數據採集 (Evaluator)
系統在批次處理後可匯出完整的 CSV 實驗報告，包含基礎維度、幾何維度、模型信心度與關鍵點座標。

## 硬體端設定 (micro:bit)

請使用 [MakeCode](https://makecode.microbit.org/) 並貼入以下 JavaScript 代碼，確保硬體能接收指令：

```javascript
// 啟動 LED 與 序列埠 服務
bluetooth.startLEDService()
serial.redirectToUSB()
basic.showString("P") // Ready

// 處理 USB 序列埠指令 (1: 駝背, 0: 正常)
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = serial.readString().trim()
    if (cmd == "1") {
        basic.showIcon(IconNames.No)
    } else if (cmd == "0") {
        basic.showIcon(IconNames.Yes)
    }
})

// 藍牙指令會由內建 LED 服務自動處理，不需額外邏輯
```

### 重要：MakeCode 藍牙設定
1. 點擊 **專案設定 (Project Settings)**。
2. 勾選 **"No Pairing Required: Anyone can connect via Bluetooth"**。
3. 重新燒錄 `.hex` 檔至 micro:bit。

## 實驗規範
為確保批次評估能正確解析數據，請遵循以下命名規範：
`受試者_情境_標籤_編號.jpg`
*   **標籤**：必須包含 `bad` 或 `pos` 代表駝背 (1)，其餘視為正常 (0)。
*   範例：`A_Hoodie_Bad_001.jpg` -> 受試者 A, 情境 Hoodie, 標籤 1。

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
開啟 `http://localhost:8000` 進行測試。
