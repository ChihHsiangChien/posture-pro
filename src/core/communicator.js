/**
 * Communicator.js - 精準搜尋 micro:bit 與 穩定傳輸版
 */

export class Communicator {
    constructor() {
        this.bleDevice = null;
        this.uartCharacteristic = null;
        this.port = null;
        this.writer = null;
        
        this.isBusy = false;
        this.lastSentState = null;
        
        // micro:bit UART Service UUIDs
        this.UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        this.UART_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
        this.onDisconnected = null;
    }

    async connectBle() {
        if (!navigator.bluetooth) throw new Error("不支援藍牙");
        
        try {
            console.log("正在精準搜尋 micro:bit...");
            // 修正：只搜尋 micro:bit 並明確要求 UART 服務
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
            
            // 等待一下下讓 GATT 服務探索完成 (重要)
            await new Promise(r => setTimeout(r, 500));

            const service = await server.getPrimaryService(this.UART_SERVICE_UUID);
            this.uartCharacteristic = await service.getCharacteristic(this.UART_RX_CHAR_UUID);
            
            this.lastSentState = null; // 重置狀態強制同步
            console.log("✅ micro:bit (BLE) 連線成功");
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
            if (this.uartCharacteristic) {
                // 使用 writeValueWithResponse 比 writeValue 更穩定
                await this.uartCharacteristic.writeValueWithResponse(data);
                this.lastSentState = isSlouching;
                console.log("📤 BLE 發送:", cmd.trim());
            }
            if (this.writer) {
                await this.writer.write(data);
                this.lastSentState = isSlouching;
            }
        } catch (err) {
            console.warn("傳送失敗 (GATT 忙碌或權限問題):", err.message);
        } finally {
            // 增加呼吸時間到 200ms 確保 micro:bit 處理完畢
            setTimeout(() => { this.isBusy = false; }, 200);
        }
    }
}
