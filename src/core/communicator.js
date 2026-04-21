/**
 * Communicator.js - 處理 micro:bit BLE 與 Web Serial (USB) 通訊
 */

export class Communicator {
    constructor() {
        this.bleDevice = null;
        this.ledCharacteristic = null;
        this.port = null;
        this.writer = null;
        
        // micro:bit LED 矩陣服務 UUID
        this.LED_SERVICE_UUID = "e95dd91d-251d-470a-a062-fa1922dfa9a8";
        this.LED_MATRIX_CHAR_UUID = "e95d7b77-251d-470a-a062-fa1922dfa9a8";
        
        // 圖形定義 (⭕ 與 ❌)
        this.circlePattern = new Uint8Array([0x0e, 0x11, 0x11, 0x11, 0x0e]);
        this.crossPattern = new Uint8Array([0x11, 0x0a, 0x04, 0x0a, 0x11]);
    }

    async connectBle() {
        try {
            this.bleDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: "BBC micro:bit" }],
                optionalServices: [this.LED_SERVICE_UUID]
            });
            const server = await this.bleDevice.gatt.connect();
            const service = await server.getPrimaryService(this.LED_SERVICE_UUID);
            this.ledCharacteristic = await service.getCharacteristic(this.LED_MATRIX_CHAR_UUID);
            console.log("✅ BLE 已連線");
            return "BLE 已連線";
        } catch (err) {
            console.error("BLE 連線失敗", err);
            throw err;
        }
    }

    async connectUsb() {
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            this.writer = this.port.writable.getWriter();
            console.log("✅ USB 已連線");
            return "USB 已連線";
        } catch (err) {
            console.error("USB 連線失敗", err);
            throw err;
        }
    }

    async notify(isSlouching) {
        // BLE 通知
        if (this.ledCharacteristic) {
            try {
                await this.ledCharacteristic.writeValue(isSlouching ? this.crossPattern : this.circlePattern);
            } catch (err) { console.warn("BLE 傳送失敗", err); }
        }
        
        // USB 通知
        if (this.writer) {
            try {
                const encoder = new TextEncoder();
                await this.writer.write(encoder.encode(isSlouching ? "1\n" : "0\n"));
            } catch (err) { console.warn("USB 傳送失敗", err); }
        }
    }
}
