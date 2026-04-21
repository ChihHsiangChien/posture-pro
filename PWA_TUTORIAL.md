# Posture Pro: PWA 技術實作教學

Progressive Web App (PWA) 是讓網頁具備「離線運作」、「可安裝性」與「流暢更新」的核心技術。在本專案中，我們不僅實作了基礎 PWA，還針對 **MediaPipe 大型模型檔案** 進行了特殊的離線優化。

---

## 1. PWA 的三大支柱

在本專案中，您可以看到以下三個關鍵組件：

### A. 網頁資訊資訊檔 (`manifest.json`)
這是讓您的網頁能被「安裝」到手機或桌面的關鍵。
*   **名稱與圖示**：定義了 App 在主畫面上的顯示名稱 (`PosturePro`) 與圖示。
*   **啟動模式**：`"display": "standalone"` 讓網頁開啟時沒有網址列，看起來像原生 App。
*   **主題顏色**：`"theme_color": "#00ff88"` 定義了手機狀態列的顏色。

### B. 服務工作線程 (`sw.js`)
Service Worker 是 PWA 的大腦，它像是一個位於瀏覽器與網路之間的「代理伺服器」。
*   **預快取 (Pre-caching)**：在 `install` 階段，系統會自動下載 `models/` 下的所有大型 WASM 與模型檔。
*   **攔截請求 (Intercepting)**：即使在沒網路時，`fetch` 事件也會從 `caches` 中抓取檔案，實現 100% 離線執行。

### C. 安全安全性連線 (HTTPS)
所有 PWA 功能（包括攝影機、藍牙與 Service Worker）都強制要求在 **HTTPS** 環境下運作，這是瀏覽器的安全底線。

---

## 2. 進階：大型模型離線化

通常 MediaPipe 會從 CDN 下載 20MB+ 的模型，這在離線時會失敗。我們做了以下處置：

1.  **本地化儲存**：將 `.wasm` 與 `.task` 檔案下載至 `/models` 目錄。
2.  **FilesetResolver 指向**：在 `detector.js` 中使用 `FilesetResolver.forVisionTasks("./models")` 強制瀏覽器只尋找本地資源。
3.  **快取同步**：將這些檔案列入 `sw.js` 的 `ASSETS` 清單中，確保安裝時一次就定位。

---

## 3. 強制更新機制 (Force Update)

網頁更新最怕「舊版快取清不掉」。本專案使用了 **Cache Busting** 技術：

### 在 `sw.js` 中：
```javascript
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 發現新版時，立刻踢掉舊版
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // 立刻接管所有分頁
});
```

### 在 `index.html` 中：
引入腳本時加上版本號：
```html
<script src="src/main.js?v=1.0.1"></script>
```

---

## 4. App 圖示自動化轉換流程

為了確保 PWA 在不同裝置上的圖示解析度一致且邊緣平滑，本專案採用 **向量繪圖 (SVG) 轉 點陣圖 (PNG)** 的工作流。

### 製作流程
1.  **設計 SVG**：使用向量工具設計 `icon.svg`。優點是無論放大多少倍都不會失真。
2.  **高品質轉換**：利用開源向量工具 **Inkscape** 透過命令行進行精準渲染，避免手動縮放造成的失真。

### 自動化命令範例
您可以透過以下命令快速產出 PWA 規格的圖示：
```bash
# 產出 512x512 高解析圖示 (啟動畫面使用)
inkscape icon.svg --export-type=png --export-filename=icon-512.png -w 512 -h 512

# 產出 192x192 標準圖示 (主畫面圖示使用)
inkscape icon.svg --export-type=png --export-filename=icon-192.png -w 192 -h 192
```

---

## 5. 如何驗證 PWA 狀態？

1.  **開啟 Chrome 開發者工具 (F12)**。
2.  切換到 **Application (應用程式)** 標籤。
3.  點擊 **Service Workers**：確認是否有一個正在運行的 Worker。
4.  點擊 **Manifest**：確認圖示與啟動設定是否正確。
5.  **測試離線**：勾選「Offline」模式，重新整理網頁，如果畫面依然能啟動攝影機並偵測，代表離線化成功！

---

## 5. 如何安裝？

*   **電腦端**：點擊網址列右側出現的「安裝」圖示（正方形帶箭頭）。
*   **手機端 (Android/Chrome)**：點擊「加入主畫面」。
*   **手機端 (iOS/Safari)**：點擊「分享」按鈕，選擇「加入主畫面」。

安裝後，**Posture Pro** 將會出現在您的 App 清單中，啟動速度極快且支援完全離線使用！
