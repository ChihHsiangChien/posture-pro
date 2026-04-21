# Posture Pro: 離線模型資源指南 (Models Guide)

本專案將所有 AI 辨識所需的二進位資源本地化，存放在 `/models` 目錄中。這確保了系統可以在無網路環境下（透過 PWA 技術）完美運作。

## 1. 檔案清單與用途說明

| 檔案名稱 | 類型 | 核心用途 | 是否必要 |
| :--- | :--- | :--- | :--- |
| **`pose_landmarker.task`** | 模型檔 | **最核心的檔案**。包含經過訓練的 AI 神經網路權重，負責計算人體 33 個關鍵點。 | **是** |
| **`vision_bundle.js`** | 腳本 | MediaPipe Tasks Vision 的主入口 JS。提供給網頁呼叫的 API 介面（如 `PoseLandmarker`）。 | **是** |
| **`vision_wasm_internal.js`** | 橋接 | WASM 的載入器。負責在瀏覽器中啟動與管理高效能的 WASM 運算環境。 | **是** |
| **`vision_wasm_internal.wasm`** | 二進位 | **SIMD 版本**。針對現代處理器優化的運算核心，是系統跑得流暢的關鍵。 | **是** |
| **`vision_wasm_nosimd_internal.js`** | 橋接 | 非 SIMD 版本的載入器。作為老舊瀏覽器或特定環境的相容性備援。 | **建議** |
| **`vision_wasm_nosimd_internal.wasm`** | 二進位 | **非 SIMD 版本**。雖然速度較慢，但能確保在不支援 SIMD 的舊裝置上不當機。 | **建議** |

---

## 2. 為什麼需要這麼多檔案？

MediaPipe 採用了 **「分層加載」** 策略：

1.  **JS 層 (`vision_bundle.js`)**：負責與您的 `main.js` 溝通。
2.  **WASM 層 (`vision_wasm_internal.wasm`)**：將影像運算下放到接近硬體的底層執行，以達到 30+ FPS 的即時偵測。
3.  **模型層 (`pose_landmarker.task`)**：純粹的數學權重，由 WASM 引擎讀取並分析。

## 3. 關於 SIMD 與非 SIMD

系統在啟動時，`FilesetResolver` 會自動檢測使用者的電腦是否支援 **SIMD** (單指令多數據流)：
*   **支援**：載入 `vision_wasm_internal.wasm`（極快）。
*   **不支援**：載入 `vision_wasm_nosimd_internal.wasm`（確保能跑）。
這就是為什麼這兩套檔案通常成對出現。

## 4. 清理建議 (Redundant Files)

在先前的下載過程中，產生了以下多餘或損毀的檔案，**可以安全刪除**：
*   `vision_bundle.wasm` (大小僅 85 bytes，通常是下載錯誤產生的無效檔)
*   `vision_bundle_nosimd.wasm` (大小為 0 bytes，無意義)

---

## 5. 如何更新模型？

若未來 MediaPipe 發布了更準確的模型，您只需將新的 `.task` 檔案放入此目錄，並在 `src/core/detector.js` 中修改指向的檔名即可。
