/**
 * Communicator.js - 增加連線穩定性與 Debug Log
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
            
            console.log("✅ BLE UART 已連線");
            return "BLE 已連線";
        } catch (err) {
            console.error("BLE 連線錯誤:", err);
            throw err;
        }
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
        const cmd = isSlouching ? "1\n" : "0\n";
        const encoder = new TextEncoder();
        const data = encoder.encode(cmd);

        if (this.uartCharacteristic) {
            try {
                // 使用 writeValueWithResponse 確保數據確實送達
                if (this.uartCharacteristic.writeValueWithResponse) {
                    await this.uartCharacteristic.writeValueWithResponse(data);
                } else {
                    await this.uartCharacteristic.writeValue(data);
                }
                console.log("📤 BLE 已發送:", isSlouching ? "1" : "0");
            } catch (err) { 
                console.warn("BLE 傳送失敗:", err); 
            }
        }
        
        if (this.writer) {
            try {
                await this.writer.write(data);
                console.log("📤 USB 已發送:", isSlouching ? "1" : "0");
            } catch (err) { console.warn("USB 傳送失敗:", err); }
        }
    }
}
