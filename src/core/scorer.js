/**
 * Scorer.js - 特徵融合與信心分數計算
 */

export class PostureScorer {
    /**
     * 計算角度
     */
    static getAngle(a, b, c) {
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const cb = { x: c.x - b.x, y: c.y - b.y };
        const dot = ab.x * cb.x + ab.y * cb.y;
        const abLen = Math.hypot(ab.x, ab.y);
        const cbLen = Math.hypot(cb.x, cb.y);
        const angle = Math.acos(dot / (abLen * cbLen)) * (180 / Math.PI);
        return isNaN(angle) ? 180 : angle;
    }

    /**
     * 基於 MediaPipe 的 Landmarkers 計算信心分數 (0.0 ~ 1.0)
     */
    static calculateScore(landmarks) {
        if (!landmarks || landmarks.length === 0) return 0;

        const kps = landmarks[0]; // 只取第一個偵測到的姿勢
        
        // 1. 角度分數 (S_A)
        // 使用 耳朵 (7/8)、肩膀 (11/12) 與 臀部 (23/24) 的中心點
        const head = this.getMidPoint(kps[7], kps[8]); // 耳中心
        const shoulder = this.getMidPoint(kps[11], kps[12]); // 肩中心
        const hip = this.getMidPoint(kps[23], kps[24]); // 臀中心
        
        const angle = this.getAngle(head, shoulder, hip);
        // 線性映射: 180 -> 0.0, 150 -> 1.0
        let s_a = (180 - angle) / (180 - 150);
        s_a = Math.max(0, Math.min(1, s_a));

        // 2. 高度分數 (S_H)
        // 眼耳高度差正規化
        const eyeY = (kps[1].y + kps[2].y) / 2; // 眼中心 Y
        const earY = (kps[7].y + kps[8].y) / 2; // 耳中心 Y
        const faceScale = Math.abs(kps[7].x - kps[8].x) || 0.1; // 耳距作為臉部比例尺
        
        // 當眼睛低於耳朵越多，駝背機率越高
        let diff = (eyeY - earY) / faceScale;
        let s_h = diff * 5; // 線性縮放，此係數可隨測試動態調整
        s_h = Math.max(0, Math.min(1, s_h));

        // 3. 融合算法
        const finalScore = Math.max(s_a, s_h);

        return {
            score: finalScore,
            angle: angle,
            s_a: s_a,
            s_h: s_h
        };
    }

    static getMidPoint(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }
}
