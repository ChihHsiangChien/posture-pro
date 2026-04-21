# Posture Pro: Web Bluetooth (BLE) 通訊技術詳解

本專案的核心特色之一是能透過瀏覽器直接與硬體 (micro:bit) 通訊。這主要依賴 **Web Bluetooth API** 以及 **GATT (Generic Attribute Profile)** 協議。

---

## 1. 核心概念：GATT 階層架構

在低功耗藍牙 (BLE) 的世界裡，通訊是樹狀結構的：

*   **Device (裝置)**：您的 micro:bit。
*   **Service (服務)**：裝置提供的功能群組。例如「電池服務」、「環境感測服務」。本專案使用的是 **Nordic UART Service**。
*   **Characteristic (特徵值)**：服務下的具體數據點。它就像一個可以讀寫的「變數」或「通道」。

---

## 2. 關鍵實作流程

### 第一步：精準搜尋與過濾 (Filtering)
為了避免使用者從一堆藍牙耳機中找 micro:bit，我們使用 `filters`。同時，必須在 `optionalServices` 中聲明我們打算存取的服務 UUID，否則瀏覽器會基於安全理由封鎖存取。

```javascript
const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: "BBC micro:bit" }],
    optionalServices: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"] // UART Service
});
```

### 第二步：建立連線與服務發現
連線成功後，我們必須依序「握手」：
1.  連接到 **GATT Server**。
2.  取得 **Primary Service (主服務)**。
3.  取得 **Characteristic (特徵值)**。

**本專案關鍵點**：micro:bit 的 UART 協議中，`0003` 是 **RX (接收端)**，代表電腦寫入給 micro:bit 的通道。
```javascript
const server = await device.gatt.connect();
const service = await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
const rxChar = await service.getCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
```

### 第三步：穩定的數據寫入
藍牙傳輸非常怕「塞車」。如果前一個封包還沒傳完就傳下一個，會噴出 `GATT operation already in progress` 錯誤。

**解決方案**：
1.  **GATT 鎖定 (Locking)**：使用 `isBusy` 旗標，確保一次只處理一個 `writeValue`。
2.  **確認式寫入**：使用 `writeValueWithResponse`，確保硬體回傳「我收到了」之後才解鎖。
3.  **呼吸時間**：在每次傳輸後強制等待 `200ms`。

---

## 3. 指令集協議 (Protocol)

為了保持簡單且與 USB 序列埠通用，我們定義了純文字協議：
*   發送 `"1\n"`：代表「駝背」，觸發硬體顯示 ❌。
*   發送 `"0\n"`：代表「良好」，觸發硬體顯示 ⭕。

*註：`\n` (換行符號) 是關鍵，它能告訴 micro:bit 一行指令結束了，觸發 `onUartDataReceived` 事件。*

---

## 4. 硬體端的配合 (micro:bit)

在 micro:bit 端，必須開啟 **"No Pairing Required"**。
這會關閉藍牙的加密配對過程，讓瀏覽器這種「無狀態」的客戶端能直接存取 UART 服務。這是開發 Web-to-Hardware 應用時最常被忽略的步驟。

---

## 5. 安全性限制

瀏覽器為了保護使用者隱私，對 BLE 有嚴格限制：
1.  **必須是 HTTPS**：除非是 localhost，否則非安全網址無法存取藍牙。
2.  **使用者手勢 (User Gesture)**：藍牙搜尋必須由使用者的動作觸發（例如點擊按鈕），程式無法在頁面載入時自動搜尋。

---

## 總結

透過 **精準過濾 -> 穩定握手 -> 鎖定式寫入**，我們成功在網頁上實作了如同原生 App 般順暢的硬體連動體驗。
