/**
 * Communicator.js - 隊列化傳輸 (徹底解決 GATT 衝突)
 */

export class Communicator {
    constructor() {
        this.bleDevice = null;
        this.uartCharacteristic = null;
        this.port = null;
        this.writer = null;
        
        this.isBusy = false;
        this.lastSentState = null; // 紀錄上次成功發送的狀態，避免重複發送
        
        this.UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        this.UART_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
        this.onDisconnected = null;
    }

    async connectBle() {
        if (!navigator.bluetooth) throw new Error("不支援藍牙");
        try {
            this.bleDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true, 
                optionalServices: [this.UART_SERVICE_UUID]
            });
            this.bleDevice.addEventListener('gattserverdisconnected', () => {
                this.uartCharacteristic = null;
                if (this.onDisconnected) this.onDisconnected("BLE");
            });
            const server = await this.bleDevice.gatt.connect();
            const service = await server.getPrimaryService(this.UART_SERVICE_UUID);
            this.uartCharacteristic = await service.getCharacteristic(this.UART_RX_CHAR_UUID);
            return "BLE 已連線";
        } catch (err) { throw err; }
    }

    async connectUsb() {
        if (!navigator.serial) throw new Error("不支援 USB");
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            this.writer = this.port.writable.getWriter();
            return "USB 已連線";
        } catch (err) { throw err; }
    }

    /**
     * 強力通知函數：具備防抖與隊列鎖定
     */
    async notify(isSlouching) {
        // 1. 如果狀態沒變，且不是強制發送，則跳過
        if (this.lastSentState === isSlouching) return;
        
        // 2. 如果藍牙正忙，則跳過此幀（反正下一幀還會再嘗試）
        if (this.isBusy) return;

        const cmd = isSlouching ? "1\n" : "0\n";
        const encoder = new TextEncoder();
        const data = encoder.encode(cmd);

        this.isBusy = true;

        try {
            // BLE 傳輸
            if (this.uartCharacteristic) {
                await this.uartCharacteristic.writeValue(data);
                console.log("📤 BLE 傳送:", isSlouching ? "1" : "0");
                this.lastSentState = isSlouching;
            }
            
            // USB 傳送
            if (this.writer) {
                await this.writer.write(data);
                this.lastSentState = isSlouching;
            }
        } catch (err) {
            console.warn("傳送失敗:", err.message);
        } finally {
            // 強制等待 150ms 呼吸時間，micro:bit 處理 UART 需要時間
            setTimeout(() => {
                this.isBusy = false;
            }, 150);
        }
    }
}
