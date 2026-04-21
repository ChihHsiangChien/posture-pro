# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 核心功能

### 1. 離線偵測 (PWA)
*   **本地模型化**：所有 MediaPipe 資源均存放於 `/models`，由 Service Worker 快取。
*   **無依賴建構**：採用純 HTML/JS (ESM) 架構。

### 2. 信心分數計算 (Scorer)
系統透過夾角分數 ($S_A$) 與高度分數 ($S_H$) 的融合 ($\max$) 來判定姿勢，有效對抗遮擋。

### 3. 硬體聯動 (Communicator)
*   **Web Bluetooth**：連線 micro:bit UART。
*   **Web Serial (USB)**：序列埠通訊。
*   **狀態同步**：連線成功後立即同步狀態。

## 硬體端設定 (micro:bit) - UART 模式

請使用 [MakeCode](https://makecode.microbit.org/) 並貼入以下代碼：

```javascript
// 當藍牙連線成功時顯示 C
bluetooth.onBluetoothConnected(function () {
    basic.showString("C")
})

// 接收來自 Web Bluetooth (UART) 的資料
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    // 讀取直到換行符號並去除空格
    let cmd = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)).trim()
    if (cmd == "1") {
        basic.showIcon(IconNames.No)
    } else if (cmd == "0") {
        basic.showIcon(IconNames.Yes)
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

// 啟動服務
bluetooth.startUartService()
serial.redirectToUSB()
basic.showString("P") // Ready
```
*註：需在專案設定中開啟 "No Pairing Required"。*

## 實驗數據格式 (CSV)
匯出的 CSV 包含基礎標籤、原始幾何特徵 (Angle/HeightDiff)、模型信心度 (Visibility) 與關鍵點座標。

## 快速啟動
```bash
python3 -m http.server 8000
```
