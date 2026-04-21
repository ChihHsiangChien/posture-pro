# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 核心功能

### 1. 離線偵測 (PWA)
*   **本地模型化**：MediaPipe 資源本地化，支援 GitHub Pages 完全離線執行。
*   **無依賴建構**：採用純 HTML/JS (ESM) 架構。

### 2. 信心分數計算 (Scorer)
系統透過夾角分數 ($S_A$) 與高度分數 ($S_H$) 的融合來判定姿勢。

### 3. 硬體聯動 (Communicator)
*   **Web Bluetooth**：連線 micro:bit UART。
*   **Web Serial (USB)**：序列埠通訊。

---

## 硬體端設定 (micro:bit) - 雙方案選擇

請根據您的使用情境，在 [MakeCode](https://makecode.microbit.org/) 中貼入對應的代碼。

### 方案 A：藍牙連線模式 (直接無線監控)
*適合手邊只有 1 台 micro:bit，且希望透過藍牙無線與電腦連線時使用。*

```javascript
// 1. 初始化藍牙 UART 服務
bluetooth.startUartService()
basic.showString("P") // Pending (等待連線)

// 2. 當藍牙連線成功
bluetooth.onBluetoothConnected(function () {
    basic.showString("C") // Connected (已連線)
})

// 3. 處理來自瀏覽器的藍牙指令
bluetooth.onUartDataReceived("\n", function () {
    let cmd = bluetooth.uartReadUntil("\n")
    if (cmd.includes("1")) {
        basic.showIcon(IconNames.No) // 駝背顯示 X
    } else if (cmd.includes("0")) {
        basic.showIcon(IconNames.Yes) // 正常顯示 O
    }
})

// 4. 當藍牙斷線
bluetooth.onBluetoothDisconnected(function () {
    basic.clearScreen()
    basic.showString("P")
})
```
*註：需在專案設定中勾選 "No Pairing Required"。*

---

### 方案 B：廣播發送模式 (1 對多群發)
*適合電腦接 1 台 micro:bit 當「發射器」，並讓其他多台 micro:bit 當「接收器」配戴在身上時使用。*

**發射器代碼 (接電腦 USB)：**
```javascript
radio.setGroup(1) // 群組編號
serial.redirectToUSB()
basic.showString("S") // Sender (發送器)

serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = serial.readString().trim()
    if (cmd == "1") {
        radio.sendNumber(1) // 廣播 1 代表駝背
        basic.showIcon(IconNames.No)
    } else if (cmd == "0") {
        radio.sendNumber(0) // 廣播 0 代表正常
        basic.showIcon(IconNames.Yes)
    }
    basic.pause(200)
    basic.clearScreen()
})
```

**接收器代碼 (配戴者身上)：**
```javascript
radio.setGroup(1)
radio.onReceivedNumber(function (receivedNumber) {
    if (receivedNumber == 1) {
        basic.showIcon(IconNames.No)
    } else {
        basic.showIcon(IconNames.Yes)
    }
})
```

---

## 實驗數據格式 (CSV)
匯出的 `Experiment_Detailed_Report.csv` 包含基礎標籤、幾何特徵、模型信心度與關鍵點座標。

## 快速啟動
```bash
python3 -m http.server 8000
```
