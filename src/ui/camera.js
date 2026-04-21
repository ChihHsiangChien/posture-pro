/**
 * Camera.js - 修正特徵點繪製邏輯
 */

export class CameraUI {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('muted', '');
        this.video.muted = true;
    }

    async start() {
        return new Promise(async (resolve, reject) => {
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                resolve(this.video);
            };
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: false
                });
                this.video.srcObject = stream;
                await this.video.play();
                setTimeout(() => {
                    if (this.video.videoWidth > 0) {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                        resolve(this.video);
                    }
                }, 2000);
            } catch (err) { reject(err); }
        });
    }

    draw(landmarks, isSlouching, showLandmarks = true) {
        if (this.canvas.width === 0) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. 繪製原始影像
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // 2. 繪製特徵點
        if (showLandmarks && landmarks && landmarks.length > 0) {
            const kps = landmarks[0]; // MediaPipe 傳回的是正規化座標 (0~1)
            const color = isSlouching ? '#ff4444' : '#00ff88';

            // 繪製所有偵測到的點
            kps.forEach((kp, index) => {
                // 放寬可見度限制，或如果沒有 visibility 屬性則預設顯示
                const visibility = kp.visibility !== undefined ? kp.visibility : 1.0;
                if (visibility > 0.3) {
                    const x = kp.x * this.canvas.width;
                    const y = kp.y * this.canvas.height;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    this.ctx.fillStyle = color;
                    this.ctx.fill();
                    
                    // 偵錯用：可以暫時顯示索引
                    // this.ctx.fillStyle = "white";
                    // this.ctx.fillText(index, x, y);
                }
            });
            
            // 繪製肩膀連線 (11: 左肩, 12: 右肩)
            if (kps[11] && kps[12]) {
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(kps[11].x * this.canvas.width, kps[11].y * this.canvas.height);
                this.ctx.lineTo(kps[12].x * this.canvas.width, kps[12].y * this.canvas.height);
                this.ctx.stroke();
            }
        }

        // 3. UI 狀態標註
        const statusColor = isSlouching ? '#ff4444' : '#00ff88';
        this.ctx.fillStyle = statusColor;
        this.ctx.font = "bold 30px sans-serif";
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = "black";
        this.ctx.fillText(isSlouching ? "❌ 駝背中" : "✅ 良好", 20, 50);
        this.ctx.shadowBlur = 0;
    }
}
