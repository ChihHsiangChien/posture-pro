/**
 * Communicator.js - 修正 RX UUID 與通訊邏輯
 */

export class Communicator {
    constructor() {
        this.bleDevice = null;
        this.uartCharacteristic = null;
        this.port = null;
        this.writer = null;
        
        this.isBusy = false;
        this.lastSentState = null;
        
        // Nordic UART Service UUIDs
        this.UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        // 修正：RX 特徵值 (PC 寫入 micro:bit) 應為 0003
        this.UART_RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
        
        this.onDisconnected = null;
    }

    async connectBle() {
        if (!navigator.bluetooth) throw new Error("不支援藍牙");
        
        try {
            console.log("正在精準搜尋 micro:bit...");
            this.bleDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: "BBC micro:bit" },
                    { namePrefix: "micro:bit" }
                ],
                optionalServices: [this.UART_SERVICE_UUID]
            });

            this.bleDevice.addEventListener('gattserverdisconnected', () => {
                this.uartCharacteristic = null;
                this.isBusy = false;
                if (this.onDisconnected) this.onDisconnected("BLE");
            });

            const server = await this.bleDevice.gatt.connect();
            console.log("GATT 已連線，正在探索服務...");

            // 等待 500ms 確保服務穩定
            await new Promise(r => setTimeout(r, 500));

            const service = await server.getPrimaryService(this.UART_SERVICE_UUID);
            this.uartCharacteristic = await service.getCharacteristic(this.UART_RX_CHAR_UUID);
            
            this.lastSentState = null;
            console.log("✅ micro:bit (BLE RX: 0003) 已就緒");
            return "BLE 已連線";
        } catch (err) {
            console.error("BLE 連線失敗:", err);
            throw err;
        }
    }

    async connectUsb() {
        if (!navigator.serial) throw new Error("不支援 USB");
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            this.writer = this.port.writable.getWriter();
            this.lastSentState = null;
            console.log("✅ micro:bit (USB) 已就緒");
            return "USB 已連線";
        } catch (err) { throw err; }
    }

    async notify(isSlouching, force = false) {
        if (this.isBusy) return;
        if (!force && this.lastSentState === isSlouching) return;

        const cmd = isSlouching ? "1\n" : "0\n";
        const encoder = new TextEncoder();
        const data = encoder.encode(cmd);

        this.isBusy = true;

        try {
            // 優先使用 BLE，若無則使用 USB
            if (this.uartCharacteristic) {
                await this.uartCharacteristic.writeValueWithResponse(data);
                console.log("📤 BLE 發送:", cmd.trim());
            } else if (this.writer) {
                await this.writer.write(data);
                console.log("📤 USB 發送:", cmd.trim());
            }
            this.lastSentState = isSlouching;
        } catch (err) {
            console.warn("傳送失敗:", err.message);
        } finally {
            // 增加呼吸時間至 250ms
            setTimeout(() => { this.isBusy = false; }, 250);
        }
    }
}
