# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 核心功能
(略...)

## 硬體端設定 (micro:bit) - UART 模式

請使用 [MakeCode](https://makecode.microbit.org/) 並在 **JavaScript 模式** 下貼入以下代碼。

此代碼同時支援 **USB 連線** 與 **藍牙連線**，兩者使用相同的指令集 (`1`: 駝背, `0`: 正常)。

```javascript
// 1. 初始化：啟動藍牙 UART 服務與序列埠
bluetooth.startUartService()
serial.redirectToUSB()
basic.showString("U") // U 代表 UART 模式已就緒

// 2. 處理 藍牙 (BLE) 傳來的數據
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let data = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    processCommand(data.trim())
})

// 3. 處理 USB (Serial) 傳來的數據
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let data = serial.readString().trim()
    processCommand(data)
})

// 4. 統一處理邏輯
function processCommand(cmd: string) {
    if (cmd == "1") {
        basic.showIcon(IconNames.No) // 顯示 X
    } else if (cmd == "0") {
        basic.showIcon(IconNames.Yes) // 顯示 O
    }
}
```

### 重要：MakeCode 藍牙設定
1. 在 MakeCode 點擊右上角 **齒輪 (設定)** -> **專案設定**。
2. 勾選 **"No Pairing Required: Anyone can connect via Bluetooth"**。
3. 重新燒錄 `.hex` 檔。

(其餘內容略...)
