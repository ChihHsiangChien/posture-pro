import cv2
import mediapipe as mp
import pandas as pd
import numpy as np
import os
import json
import math
from tqdm import tqdm

# 初始化 MediaPipe
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

def get_angle(a, b, c):
    """計算三點夾角 (a, b 為起終點，b 為頂點)"""
    ang = math.degrees(
        math.atan2(c[1]-b[1], c[0]-b[0]) - math.atan2(a[1]-b[1], a[0]-b[0])
    )
    return abs(ang) if abs(ang) <= 180 else 360 - abs(ang)

def calculate_score(landmarks):
    """
    與網頁版同步的信心分數計算法
    """
    # 索引定義: 7/8 耳, 11/12 肩, 23/24 臀, 1/2 眼
    # 注意: MediaPipe Python 的 landmarks 是清單物件
    def get_pt(idx): return [landmarks[idx].x, landmarks[idx].y, landmarks[idx].z]
    
    # 1. 角度分數 (S_A)
    # 取中點
    head = [(landmarks[7].x + landmarks[8].x)/2, (landmarks[7].y + landmarks[8].y)/2]
    shoulder = [(landmarks[11].x + landmarks[12].x)/2, (landmarks[11].y + landmarks[12].y)/2]
    hip = [(landmarks[23].x + landmarks[24].x)/2, (landmarks[23].y + landmarks[24].y)/2]
    
    angle = get_angle(head, shoulder, hip)
    # 映射 180->0, 150->1
    s_a = (180 - angle) / 30.0
    s_a = max(0, min(1, s_a))
    
    # 2. 高度分數 (S_H)
    eye_y = (landmarks[1].y + landmarks[2].y) / 2
    ear_y = (landmarks[7].y + landmarks[8].y) / 2
    face_scale = abs(landmarks[7].x - landmarks[8].x) or 0.1
    
    diff = (eye_y - ear_y) / face_scale
    s_h = diff * 5.0
    s_h = max(0, min(1, s_h))
    
    # 3. 融合
    final_score = max(s_a, s_h)
    
    return {
        "score": final_score,
        "angle": angle,
        "s_a": s_a,
        "s_h": s_h,
        "shoulder_vis": (landmarks[11].visibility + landmarks[12].visibility) / 2
    }

def process_directory(input_dir, output_csv):
    results = []
    files = [f for f in os.listdir(input_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    print(f"開始處理目錄: {input_dir} (共 {len(files)} 張圖片)")
    
    for filename in tqdm(files):
        # 解析檔名: Subject_Scenario_Label_Index.jpg
        parts = filename.split('.')[0].split('_')
        truth = 1 if ('bad' in filename.lower() or 'pos' in filename.lower()) else 0
        subject = parts[0] if len(parts) > 0 else "Unknown"
        scenario = parts[1] if len(parts) > 1 else "Default"
        
        path = os.path.join(input_dir, filename)
        image = cv2.imread(path)
        if image is None: continue
        
        # 轉換為 RGB 供 MediaPipe 使用
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        res = pose.process(image_rgb)
        
        if res.pose_landmarks:
            metrics = calculate_score(res.pose_landmarks.landmark)
            
            # 蒐集關鍵座標供 Debug
            kps = {
                "nose": [res.pose_landmarks.landmark[0].x, res.pose_landmarks.landmark[0].y],
                "shoulder_l": [res.pose_landmarks.landmark[11].x, res.pose_landmarks.landmark[11].y],
                "shoulder_r": [res.pose_landmarks.landmark[12].x, res.pose_landmarks.landmark[12].y]
            }
            
            results.append({
                "FileName": filename,
                "Truth": truth,
                "Subject": subject,
                "Scenario": scenario,
                "Angle": metrics["angle"],
                "HeightDiff": metrics["s_h"],
                "Shoulder_Vis": metrics["shoulder_vis"],
                "ConfidenceScore": metrics["score"],
                "Keypoints_JSON": json.dumps(kps)
            })
    
    df = pd.DataFrame(results)
    df.to_csv(output_csv, index=False)
    print(f"✅ 評估完成！報告已儲存至: {output_csv}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Posture Pro 系統驗證腳本")
    parser.add_argument("--dir", type=str, required=True, help="圖片資料夾路據")
    parser.add_argument("--out", type=str, default="validation_report.csv", help="輸出 CSV 檔名")
    
    args = parser.parse_args()
    process_directory(args.dir, args.out)
