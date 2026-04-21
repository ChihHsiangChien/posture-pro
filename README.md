# Posture Pro - 姿態辨識 PWA 與性能評估系統

這是一個基於 MediaPipe Pose Landmarker 的現代化 Web 應用程式，旨在實現 100% 離線姿態監控與硬體聯動。

## 核心功能

### 1. 離線偵測 (PWA)
所有 MediaPipe 資源皆本地化，支援 GitHub Pages 完全離線執行，具備自動更新與快取控制機制。

### 2. 人體工學判斷原理 (綜合信心值)
系統不採用單一判斷，而是透過兩項關鍵指標的 **MAX 融合算法** 計算信心值 (0.0~1.0)：

*   **軀幹角度分數 ($S_A$)**：監控背部彎曲程度。
    *   計算 **耳-肩-臀** 的夾角。180° 代表端正 (0.0)，150° 代表駝背 (1.0)。
*   **眼耳高度分數 ($S_H$)**：監控「低頭」與「烏龜頸」現象。
    *   計算 **眼睛與耳朵的垂直位移**，並以耳距（臉部比例）進行正規化，確保不受距離鏡頭遠近影響。
*   **融合邏輯**：$\text{Final Score} = \max(S_A, S_H)$。
    *   只要「背彎了」或「頭低了」任一項特徵觸發，系統即視為姿勢不良。

### 3. 硬體聯動
*   **Web Bluetooth (UART)**：無線連線 micro:bit，具備 GATT 鎖定機制確保傳輸不卡死。
*   **Web Serial (USB)**：序列埠同步支援。

### 4. 數據監控
*   **動態門檻 (T)**：使用者可調整 $T$ 值來決定系統的靈敏度。
*   **歷史紀錄**：自動繪製帶有時間戳記的 24H 姿勢趨勢圖。

---

## 硬體端設定 (micro:bit) - 雙方案選擇

### 方案 A：藍牙連線模式 (直接無線監控)
```javascript
bluetooth.onBluetoothConnected(() => basic.showString("C"))
bluetooth.onUartDataReceived("\n", () => {
    let cmd = bluetooth.uartReadUntil("\n")
    if (cmd.includes("1")) basic.showIcon(IconNames.No)
    else if (cmd.includes("0")) basic.showIcon(IconNames.Yes)
})
bluetooth.startUartService()
basic.showString("P")
```

### 方案 B：廣播發送模式 (1 對多群發)
適合由一台 micro:bit 接電腦當發射器，多台配戴在身上當接收器（代碼詳見 EVALUATION.md 或過往紀錄）。

---

## 快速啟動
1. 確保使用 **HTTPS** 或 **localhost** 開啟。
2. 點擊「連接 micro:bit」。
3. 坐姿端正後點擊「校正標準姿勢」以自動設定門檻。

## 系統驗證
開發者可使用 `tools/evaluator.py` 進行大規模數據集測試，詳細說明請見 [EVALUATION.md](./EVALUATION.md)。
