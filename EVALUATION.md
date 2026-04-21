# Posture Pro 系統驗證與效能評估指南

本文件說明如何使用 `tools/evaluator.py` 腳本進行大規模影格驗證，以及系統判定的詳細數學邏輯。

## 1. 驗證工具概述

`evaluator.py` 是一個基於 Python 的批次處理工具，旨在模擬網頁端的判定邏輯，對預先標註好的圖片資料夾進行自動化分析，並產出定量研究報告。

### 環境需求
- Python 3.8+
- OpenCV, MediaPipe, Pandas, TQDM

### 執行方式
```bash
python3 tools/evaluator.py --dir [圖片資料夾路徑] --out [報告檔名.csv]
```

## 2. 標註規範與數據解析

系統會根據圖片檔名自動提取 Metadata，請遵循以下格式命名影格：
`受試者ID_情境標籤_判定標籤_編號.jpg`

- **判定標籤**：若檔名包含 `bad` 或 `pos`，`Truth` 值將標記為 `1` (駝背)；否則為 `0` (正常)。
- **範例**：`A_Hoodie_Bad_001.jpg` -> `Subject: A`, `Scenario: Hoodie`, `Truth: 1`。

## 3. 核心算法邏輯 (與網頁同步)

系統輸出的 `ConfidenceScore` ($0 \sim 1$) 是基於以下兩項指標的融合：

### A. 角度分數 ($S_A$)
1. **點位**：耳中心 (耳朵中點)、肩中心、臀中心。
2. **計算**：計算三點構成的夾角 $\theta$。
3. **映射**：
   - $\theta \ge 180^\circ$：$S_A = 0$
   - $\theta \le 150^\circ$：$S_A = 1$
   - 線性公式：$S_A = \frac{180 - \theta}{30}$

### B. 高度分數 ($S_H$)
1. **點位**：眼中心 (Y)、耳中心 (Y)。
2. **計算**：垂直高度差 $D_y = Eye_Y - Ear_Y$。
3. **正規化**：以兩耳水平距離 $W_{face}$ 作為比例尺，消除距離鏡頭遠近的影響。
4. **公式**：$S_H = \text{clamp}(\frac{D_y}{W_{face}} \times 5, 0, 1)$

### C. 融合信心值
$$FinalScore = \max(S_A, S_H)$$
*使用 $\max$ 確保任一特徵被觸發時（如低頭或彎腰）都能有效輸出高信心值。*

## 4. 輸出數據維度說明

CSV 報告包含以下欄位：
- **FileName**: 原始檔名。
- **Truth**: 人工標註的地面真值。
- **Angle**: 原始夾角數值（度）。
- **HeightDiff**: 正規化後的眼耳高度指標。
- **Shoulder_Vis**: 肩膀關鍵點的可見度平均值 (MediaPipe 提供)。
- **ConfidenceScore**: 最終信心分數（用於繪製 PR 曲線的基準）。
- **Keypoints_JSON**: 鼻、肩、耳的 (x, y) 座標，可用於重建模型失敗場景。

## 5. 數據分析建議

拿到報告後，您可以進行以下分析：
1. **PR 曲線分析**：計算不同門檻 $T$ 下的 Precision 與 Recall。
2. **情境對比**：過濾 `Scenario` 欄位，比較「帽 T」與「一般服裝」下的 `Shoulder_Vis` 差異。
3. **錯誤回溯**：篩選 `Truth=1` 且 `ConfidenceScore` 低的影格，觀察 `Keypoints` 判斷是否出錯。
