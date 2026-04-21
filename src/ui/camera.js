/**
 * Camera.js - 增加切換鏡頭支援
 */

export class CameraUI {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('muted', '');
        this.video.muted = true;
        this.stream = null;
    }

    async start(facingMode = "user") {
        // 如果已經有串流在執行，先停止它
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        return new Promise(async (resolve, reject) => {
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                resolve(this.video);
            };

            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        width: { ideal: 640 }, 
                        height: { ideal: 480 },
                        facingMode: facingMode 
                    },
                    audio: false
                });
                this.video.srcObject = this.stream;
                await this.video.play();
                
                // 備援方案
                setTimeout(() => {
                    if (this.video.videoWidth > 0) {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                        resolve(this.video);
                    }
                }, 2000);
            } catch (err) { 
                console.error("啟動攝影機失敗:", err);
                reject(err); 
            }
        });
    }

    draw(landmarks, isSlouching, showLandmarks = true) {
        if (this.canvas.width === 0) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        if (showLandmarks && landmarks && landmarks.length > 0) {
            const kps = landmarks[0];
            const color = isSlouching ? '#ff4444' : '#00ff88';
            if (kps[11] && kps[12]) this.drawLine(kps[11], kps[12], color, 3);
            kps.forEach((kp) => {
                if ((kp.visibility || 1.0) > 0.3) {
                    this.ctx.beginPath();
                    this.ctx.arc(kp.x * this.canvas.width, kp.y * this.canvas.height, 4, 0, 2 * Math.PI);
                    this.ctx.fillStyle = color;
                    this.ctx.fill();
                }
            });
        }

        const statusColor = isSlouching ? '#ff4444' : '#00ff88';
        this.ctx.fillStyle = statusColor;
        this.ctx.font = "bold 30px sans-serif";
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = "black";
        this.ctx.fillText(isSlouching ? "❌ 駝背中" : "✅ 姿勢良好", 20, 50);
        this.ctx.shadowBlur = 0;
    }

    drawLine(p1, p2, color, width) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x * this.canvas.width, p1.y * this.canvas.height);
        this.ctx.lineTo(p2.x * this.canvas.width, p2.y * this.canvas.height);
        this.ctx.stroke();
    }
}
