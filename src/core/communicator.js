/**
 * Communicator.js - 增加 API 安全檢查
 */

export class Communicator {
    constructor() {
        this.bleDevice = null;
        this.uartCharacteristic = null;
        this.port = null;
        this.writer = null;

        this.UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        this.UART_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
        this.onDisconnected = null;
    }

    async connectBle() {
        // 安全檢查
        if (!navigator.bluetooth) {
            const msg = "您的瀏覽器或連線環境 (非 HTTPS) 不支援 Web Bluetooth API。";
            console.error(msg);
            throw new Error(msg);
        }

        try {
            console.log("正在啟動藍牙搜尋...");
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
        } catch (err) {
            console.error("BLE 連線失敗:", err);
            throw err;
        }
    }

    async connectUsb() {
        if (!navigator.serial) {
            throw new Error("您的瀏覽器不支援 Web Serial (USB) API。");
        }
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            this.writer = this.port.writable.getWriter();
            return "USB 已連線";
        } catch (err) {
            throw err;
        }
    }

    async notify(isSlouching) {
        const cmd = isSlouching ? "1\n" : "0\n";
        const encoder = new TextEncoder();
        if (this.uartCharacteristic) {
            try { await this.uartCharacteristic.writeValue(encoder.encode(cmd)); } catch (e) {}
        }
        if (this.writer) {
            try { await this.writer.write(encoder.encode(cmd)); } catch (e) {}
        }
    }
}
