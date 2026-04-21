/**
 * Communicator.js - 解決 GATT operation already in progress 錯誤
 */

export class Communicator {
    constructor() {
        this.bleDevice = null;
        this.uartCharacteristic = null;
        this.port = null;
        this.writer = null;
        this.isWriting = false; // 傳輸鎖定

        this.UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        this.UART_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
        this.onDisconnected = null;
    }

    async connectBle() {
        if (!navigator.bluetooth) throw new Error("環境不支援 Web Bluetooth");
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
            console.log("✅ BLE UART 連線成功");
            return "BLE 已連線";
        } catch (err) { throw err; }
    }

    async connectUsb() {
        if (!navigator.serial) throw new Error("環境不支援 Web Serial");
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            this.writer = this.port.writable.getWriter();
            return "USB 已連線";
        } catch (err) { throw err; }
    }

    async notify(isSlouching) {
        // 如果正在傳輸中，跳過此指令，避免 GATT 錯誤
        if (this.isWriting) return;

        const cmd = isSlouching ? "1\n" : "0\n";
        const encoder = new TextEncoder();
        const data = encoder.encode(cmd);

        if (this.uartCharacteristic) {
            try {
                this.isWriting = true;
                // 使用 writeValue 即可，較能避免長時間佔用
                await this.uartCharacteristic.writeValue(data);
                console.log("📤 BLE 發送成功:", isSlouching ? "1" : "0");
            } catch (err) {
                console.warn("BLE 傳送失敗:", err.message);
            } finally {
                // 無論成功失敗，0.1秒後解除鎖定，允許下一次傳送
                setTimeout(() => { this.isWriting = false; }, 100);
            }
        }
        
        if (this.writer) {
            try {
                await this.writer.write(data);
                console.log("📤 USB 發送成功:", isSlouching ? "1" : "0");
            } catch (err) { console.warn("USB 傳送失敗:", err); }
        }
    }
}
