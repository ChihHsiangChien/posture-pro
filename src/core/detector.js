/**
 * Detector.js - 姿態辨識模型載入與 locateFile 邏輯
 */

// 改為從本地載入 SDK，以確保 100% 離線運作
import { PoseLandmarker, FilesetResolver } from "../../models/vision_bundle.js";

export class PoseDetector {
    constructor() {
        this.landmarker = null;
    }

    async init() {
        // FilesetResolver：告知模型如何尋找 WASM 與其它二進位檔
        const vision = await FilesetResolver.forVisionTasks(
            "./models" // 指向包含 vision_wasm_internal.js 的目錄
        );

        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `./models/pose_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        console.log("PoseLandmarker Initialized (Local Offline Mode)");
        return this.landmarker;
    }

    async detect(videoElement, timestamp) {
        if (!this.landmarker) return null;
        return this.landmarker.detectForVideo(videoElement, timestamp);
    }
}
