# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 硬體端設定 (micro:bit) - UART 模式

請使用 [MakeCode](https://makecode.microbit.org/) 並貼入以下代碼進行測試。此版本包含了笑臉反饋以確認連線成功。

```javascript
// 當藍牙連線成功時，立刻顯示笑臉
bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Happy)
})

// 接收資料邏輯
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let cmd = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)).trim()
    
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

bluetooth.startUartService()
serial.redirectToUSB()
basic.showString("P") // Ready
```
*註：需在專案設定中開啟 "No Pairing Required"。*

## 目錄結構與啟動
(略...)
