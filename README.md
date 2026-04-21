# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控、硬體聯動與定量數據分析。

## 核心功能

### 1. 離線偵測 (PWA)
*   **本地資源化**：MediaPipe 資源（WASM, .task 模型）完全本地化，不依賴 CDN。
*   **離線執行**：透過 Service Worker 快取，支援 GitHub Pages 無網路環境執行。
*   **自動更新**：具備 Cache Busting 機制，確保使用者獲取最新代碼。

### 2. 人體工學判斷原理 (綜合信心值)
系統透過以下特徵融合算法計算信心值 (0.0~1.0)：
*   **軀幹角度分數 ($S_A$)**：計算 **耳-肩-臀** 的夾角。180° (直立) 映射為 0.0，150° (駝背) 映射為 1.0。
*   **眼耳高度分數 ($S_H$)**：監控「烏龜頸」現象。計算 **眼中心與耳中心** 的垂直位移，並以兩耳間距（臉部比例）進行正規化，確保不受距離影響。
*   **MAX 融合邏輯**：$\text{Final Score} = \max(S_A, S_H)$。只要背彎了或頭低了任一項觸發，系統即視為姿勢不良。

### 3. 硬體聯動 (Communicator)
*   **Web Bluetooth (UART)**：無線連線 micro:bit，具備 GATT 傳輸鎖定機制防止指令衝突。
*   **Web Serial (USB)**：支援序列埠通訊。
*   **狀態同步**：連線後立即向硬體同步當前狀態。

### 4. 監控與評估
*   **即時畫面**：可切換前後鏡頭、顯示/隱藏特徵點、音效提示與一鍵校正。
*   **趨勢圖表**：底部自動繪製帶有 **時間戳記 (Timestamp)** 的 24 小時歷史長條圖。

---

## 硬體端設定 (micro:bit) - 雙方案選擇

### 方案 A：藍牙連線模式 (直接無線監控)
*適合 1 台 micro:bit 無線監控。需在專案設定中勾選 "No Pairing Required"。*

```javascript
// 代表 Pending (等待連線)
// 2. 當藍牙連線成功
bluetooth.onBluetoothConnected(function () {
    // 代表 Connected
    basic.showString("C")
})
// 4. 當藍牙斷線
bluetooth.onBluetoothDisconnected(function () {
    basic.clearScreen()
    basic.showString("P")
})
// 3. 處理來自 Chrome 的藍牙指令
bluetooth.onUartDataReceived("\n", function () {
    // 讀取直到換行符號，並直接進行判斷
    cmd = bluetooth.uartReadUntil("\n")
    if (cmd.includes("1")) {
        // 偵測到駝背 (Slouching) -> 顯示 X
        basic.showIcon(IconNames.No)
    } else if (cmd.includes("0")) {
        // 姿勢正常 -> 顯示 O
        basic.showIcon(IconNames.Yes)
    }
})
let cmd = ""
// 1. 初始化藍牙 UART 服務
bluetooth.startUartService()
// 代表 Pending (等待連線)
basic.showString("P")
```

---

### 方案 B：廣播發送模式 (1 對多群發)
*電腦接一台 micro:bit 當「發射器 (Sender)」，多台配戴在身上當「接收器 (Receiver)」。*

**發射器 (Sender) - 接電腦 USB：**
```javascript
// Sender
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = serial.readString().trim()
    if (cmd == "1") {
        // 廣播數字 1 (代表駝背)
        radio.sendNumber(1)
        basic.showIcon(IconNames.No)
    } else if (cmd == "0") {
        // 廣播數字 0 (代表正常)
        radio.sendNumber(0)
        basic.showIcon(IconNames.Yes)
    }
    basic.pause(200)
    basic.clearScreen()
})
// 設定廣播群組 (0-255)，所有機器要一致
radio.setGroup(1)
serial.redirectToUSB()
// Sender
basic.showString("S")
```

**接收器 (Receiver) - 配戴者身上：**
```javascript
radio.setGroup(1)
basic.showString("R")
radio.onReceivedNumber(function (receivedNumber) {
    if (receivedNumber == 1) {
        basic.showIcon(IconNames.No)
    } else {
        basic.showIcon(IconNames.Yes)
    }
})
```

---

## 實驗驗證與數據格式

### Python 驗證工具
開發者可使用 `tools/evaluator.py` 進行大規模數據集測試：
```bash
python3 tools/evaluator.py --dir ./my_test_images --out report.csv
```

### CSV 數據維度
匯出的實驗報告包含：
*   **Metadata**: FileName, Truth, Subject, Scenario。
*   **Features**: Angle (夾角), HeightDiff (眼耳高度比)。
*   **Model**: Shoulder_Vis (肩膀可見度), ConfidenceScore (最終分數)。
*   **Debug**: 核心關鍵點的 JSON 座標。

---

## 快速啟動
使用任何靜態伺服器開啟此目錄即可（必須使用 **HTTPS** 或 **localhost** 才能使用攝影機與藍牙）：
```bash
python3 -m http.server 8000
```
