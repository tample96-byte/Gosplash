/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from "../types";

export interface PrinterDevice {
  type: "bluetooth" | "usb" | "serial" | "none";
  name: string;
  rawDevice: any;
  characteristic?: any; // Web Bluetooth characteristic
  port?: any;           // Web Serial port
  device?: any;         // WebUSB device
}

// Global active printer state that persists across component re-renders
let activePrinter: PrinterDevice = {
  type: "none",
  name: "Tidak Terhubung",
  rawDevice: null,
};

// Listeners for connection state updates
const connectionListeners = new Set<(device: PrinterDevice) => void>();

export function subscribeToPrinterState(callback: (device: PrinterDevice) => void): () => void {
  connectionListeners.add(callback);
  callback(activePrinter); // Initial invoke
  return () => connectionListeners.delete(callback);
}

function notifyStateChange() {
  connectionListeners.forEach((cb) => cb(activePrinter));
}

export function getActivePrinter(): PrinterDevice {
  return activePrinter;
}

/**
 * Connect to a thermal printer via Web Bluetooth
 */
export async function connectBluetoothPrinter(): Promise<PrinterDevice> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome / Microsoft Edge atau buka di tab baru.");
  }

  try {
    // Bluetooth SPP / Raw data printer UUID is usually raw RFCOMM 1101, or custom 18f0, etc.
    // To be most compatible, we search for standard/common profiles or allow any device with standard services.
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // Common printer service
        "00001101-0000-1000-8000-00805f9b34fb", // Serial Port Profile
        "49535343-fe7d-41aa-8fa6-a1243860b5cd"  // Microchip service
      ]
    });

    if (!device) throw new Error("Pengguna membatalkan penyambungan Bluetooth.");

    const server = await device.gatt?.connect();
    if (!server) throw new Error("Gagal menyambung ke server GATT Bluetooth.");

    // Look for services and write characteristics
    let writeChar: any = null;
    const services = await server.getPrimaryServices();
    
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error("Tidak ditemukan characteristic untuk menulis (write) data pada printer ini.");
    }

    activePrinter = {
      type: "bluetooth",
      name: device.name || "Bluetooth Printer",
      rawDevice: device,
      characteristic: writeChar
    };

    // Auto reconnect/disconnect listener
    device.addEventListener("gattserverdisconnected", () => {
      activePrinter = { type: "none", name: "Tidak Terhubung (Terputus)", rawDevice: null };
      notifyStateChange();
    });

    notifyStateChange();
    return activePrinter;
  } catch (error: any) {
    console.error("Bluetooth connection error:", error);
    throw new Error(error.message || "Gagal menyambung ke Bluetooth Printer.");
  }
}

/**
 * Connect to a thermal printer via Web Serial (Virtual COM Port via USB Cable)
 */
export async function connectSerialPrinter(): Promise<PrinterDevice> {
  const nav = navigator as any;
  if (!nav.serial) {
    throw new Error("Web Serial tidak didukung di browser ini. Gunakan Google Chrome / Microsoft Edge atau buka di tab baru.");
  }

  try {
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 }); // Standard ESC/POS serial printer speed

    activePrinter = {
      type: "serial",
      name: "Printer Serial/Kabel USB",
      rawDevice: port,
      port: port
    };

    notifyStateChange();
    return activePrinter;
  } catch (error: any) {
    console.error("Serial connection error:", error);
    throw new Error(error.message || "Gagal menyambung ke Serial/Kabel Printer.");
  }
}

/**
 * Connect to a thermal printer via WebUSB
 */
export async function connectUsbPrinter(): Promise<PrinterDevice> {
  const nav = navigator as any;
  if (!nav.usb) {
    throw new Error("WebUSB tidak didukung di browser ini. Gunakan Google Chrome / Microsoft Edge atau buka di tab baru.");
  }

  try {
    // Standard Class 7 is Printer Class
    const device = await nav.usb.requestDevice({
      filters: [{ classCode: 7 }] // USB Printer Class
    });

    if (!device) throw new Error("Pengguna membatalkan penyambungan USB.");

    await device.open();
    await device.selectConfiguration(1);

    activePrinter = {
      type: "usb",
      name: device.productName || "USB Printer",
      rawDevice: device,
      device: device
    };

    notifyStateChange();
    return activePrinter;
  } catch (error: any) {
    console.error("USB connection error:", error);
    throw new Error(error.message || "Gagal menyambung ke USB Printer.");
  }
}

/**
 * Disconnect current active printer
 */
export async function disconnectPrinter() {
  try {
    if (activePrinter.type === "bluetooth" && activePrinter.rawDevice?.gatt?.connected) {
      await activePrinter.rawDevice.gatt.disconnect();
    } else if (activePrinter.type === "serial" && activePrinter.port) {
      await activePrinter.port.close();
    } else if (activePrinter.type === "usb" && activePrinter.device) {
      await activePrinter.device.close();
    }
  } catch (e) {
    console.warn("Error during printer disconnect:", e);
  }

  activePrinter = {
    type: "none",
    name: "Tidak Terhubung",
    rawDevice: null
  };
  notifyStateChange();
}

/**
 * Generates raw ESC/POS bytes for thermal printers (58mm default width, 32 chars per line)
 */
export function generateEscPosBytes(tx: Transaction): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const addBytes = (bytes: number[]) => {
    chunks.push(new Uint8Array(bytes));
  };

  const addText = (text: string) => {
    chunks.push(encoder.encode(text));
  };

  // 1. Initialize Printer (ESC @)
  addBytes([0x1B, 0x40]);

  // 2. Centered Logo / Brand Name
  addBytes([0x1B, 0x61, 1]); // Center
  addBytes([0x1D, 0x21, 0x11]); // Double height + double width text
  addText("GOSPLASH\n");
  
  // 3. Normal size but Bold for subtitle (no address)
  addBytes([0x1D, 0x21, 0x00]); // Normal text size
  addBytes([0x1B, 0x45, 1]);    // Bold on
  addText("WATERPARK GOSPLASH\n");
  addBytes([0x1B, 0x45, 0]);    // Bold off
  
  // 4. Separator Line
  addBytes([0x1B, 0x61, 0]); // Left-aligned
  addText("--------------------------------\n");

  // 5. Transaction Details
  const formattedDate = new Date(tx.tanggal).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  addText(`No. Nota : #${tx.id}\n`);
  addText(`Tanggal  : ${formattedDate}\n`);
  addText(`Hari     : ${tx.jenis_hari === "Sabtu-Minggu/Libur" ? "Sabtu-Minggu/Libur" : "Senin-Jumat"}\n`);
  addText("--------------------------------\n");

  // 6. Items Sold
  addText("Tiket Masuk\n");
  const qtyStr = `${tx.jumlah_pengunjung}x Rp ${tx.harga_satuan.toLocaleString("id-ID")}`;
  const totalItem = tx.harga_satuan * tx.jumlah_pengunjung;
  const totalItemStr = `Rp ${totalItem.toLocaleString("id-ID")}`;
  const padLen = 32 - qtyStr.length - totalItemStr.length;
  addText(`${qtyStr}${" ".repeat(padLen > 0 ? padLen : 1)}${totalItemStr}\n`);

  // Discounts
  if (tx.diskon_persen > 0) {
    const diskonLabel = `Diskon (${tx.diskon_persen}%)`;
    const diskonVal = `-Rp ${(totalItem * tx.diskon_persen / 100).toLocaleString("id-ID")}`;
    const padD = 32 - diskonLabel.length - diskonVal.length;
    addText(`${diskonLabel}${" ".repeat(padD > 0 ? padD : 1)}${diskonVal}\n`);
  }

  // Rent Locker
  if (tx.sewa_loker && tx.sewa_loker !== "Tidak") {
    const lokerLabel = `Sewa Loker (${tx.sewa_loker})`;
    const lokerVal = `Rp ${(tx.harga_loker || 0).toLocaleString("id-ID")}`;
    const padL = 32 - lokerLabel.length - lokerVal.length;
    addText(`${lokerLabel}${" ".repeat(padL > 0 ? padL : 1)}${lokerVal}\n`);
  }

  // Rent Cottage
  if (tx.sewa_tempat && tx.sewa_tempat !== "Tidak") {
    const tempatLabel = "Sewa Saung/Tempat";
    const tempatVal = `Rp ${(tx.harga_tempat || 0).toLocaleString("id-ID")}`;
    const padT = 32 - tempatLabel.length - tempatVal.length;
    addText(`${tempatLabel}${" ".repeat(padT > 0 ? padT : 1)}${tempatVal}\n`);
  }

  addText("--------------------------------\n");

  // 7. Total Amount (Bold)
  addBytes([0x1B, 0x45, 1]); // Bold on
  const totalLabel = "TOTAL AKHIR:";
  const totalVal = `Rp ${tx.total_bayar.toLocaleString("id-ID")}`;
  const padTot = 32 - totalLabel.length - totalVal.length;
  addText(`${totalLabel}${" ".repeat(padTot > 0 ? padTot : 1)}${totalVal}\n`);
  addBytes([0x1B, 0x45, 0]); // Bold off

  // Payment Details
  const payLabel = "Metode Bayar:";
  const payVal = tx.metode_pembayaran || "Tunai";
  const padPay = 32 - payLabel.length - payVal.length;
  addText(`${payLabel}${" ".repeat(padPay > 0 ? padPay : 1)}${payVal}\n`);

  if (payVal === "Tunai") {
    const bayarLabel = "Dibayar     :";
    const bayarVal = `Rp ${tx.bayar.toLocaleString("id-ID")}`;
    const padB = 32 - bayarLabel.length - bayarVal.length;
    addText(`${bayarLabel}${" ".repeat(padB > 0 ? padB : 1)}${bayarVal}\n`);

    const kembalianLabel = "Kembalian   :";
    const kembalianVal = `Rp ${tx.kembalian.toLocaleString("id-ID")}`;
    const padK = 32 - kembalianLabel.length - kembalianVal.length;
    addBytes([0x1B, 0x45, 1]); // Bold on
    addText(`${kembalianLabel}${" ".repeat(padK > 0 ? padK : 1)}${kembalianVal}\n`);
    addBytes([0x1B, 0x45, 0]); // Bold off
  }

  addText("--------------------------------\n");

  // 8. Footer Message
  addBytes([0x1B, 0x61, 1]); // Center
  addText("Simpan nota ini sebagai\n");
  addText("bukti sah tanda masuk.\n");
  addText("Selamat menikmati wahana!\n");
  addText("Terima Kasih Atas Kunjungan Anda\n\n");
  
  // Simulated barcode text
  addText(`GS-${tx.id}-${tx.jumlah_pengunjung}\n\n\n\n`);

  // 9. Paper Cut Command (GS V 66 0)
  addBytes([0x1D, 0x56, 66, 0]);

  // Combine chunks into single flat Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Generates raw ESC/POS bytes for a simple printer test page
 */
export function generateTestBytes(): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const addBytes = (bytes: number[]) => {
    chunks.push(new Uint8Array(bytes));
  };

  const addText = (text: string) => {
    chunks.push(encoder.encode(text));
  };

  addBytes([0x1B, 0x40]); // Initialize
  addBytes([0x1B, 0x61, 1]); // Center
  addBytes([0x1D, 0x21, 0x11]); // Double Size
  addText("UJI PRINTER\n");
  addBytes([0x1D, 0x21, 0x00]); // Normal Size
  addText("GOSPLASH TICKETING\n");
  addText("--------------------------------\n");
  addBytes([0x1B, 0x61, 0]); // Left
  addText("Status printer: BERHASIL\n");
  addText(`Sistem waktu  : ${new Date().toLocaleString("id-ID")}\n`);
  addText("Konektivitas  : Sukses Terhubung\n");
  addText("--------------------------------\n");
  addBytes([0x1B, 0x61, 1]); // Center
  addText("Printer Thermal Anda Siap!\n\n\n\n");
  addBytes([0x1D, 0x56, 66, 0]); // Cut

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Send byte payload to active printer
 */
export async function sendBytesToPrinter(bytes: Uint8Array): Promise<boolean> {
  if (activePrinter.type === "none") {
    throw new Error("Tidak ada printer terhubung. Sambungkan printer Bluetooth atau USB/Serial terlebih dahulu.");
  }

  try {
    if (activePrinter.type === "bluetooth") {
      if (!activePrinter.characteristic) throw new Error("Gagal mengakses Bluetooth characteristic.");
      
      // Split into chunks of 20 bytes (standard Web Bluetooth safe payload limit for basic printers)
      const chunkSize = 20;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await activePrinter.characteristic.writeValue(chunk);
        // Add minimal delay for the hardware buffer to catch up
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      return true;
    }

    if (activePrinter.type === "serial") {
      if (!activePrinter.port || !activePrinter.port.writable) {
        throw new Error("Port serial tidak siap atau sudah tertutup.");
      }
      const writer = activePrinter.port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      return true;
    }

    if (activePrinter.type === "usb") {
      if (!activePrinter.device) throw new Error("Perangkat USB tidak siap.");
      
      const device = activePrinter.device;
      let interfaceNumber = 0;
      let endpointNumber = 1;

      // Scan interfaces to find printer class interface and OUT endpoint
      try {
        for (const config of device.configurations) {
          for (const iface of config.interfaces) {
            for (const alt of iface.alternates) {
              if (alt.interfaceClass === 7) { // Printer Class
                interfaceNumber = iface.interfaceNumber;
                for (const ep of alt.endpoints) {
                  if (ep.direction === "out") {
                    endpointNumber = ep.endpointNumber;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Auto-scanned USB endpoints failed, falling back to 0/1:", err);
      }

      await device.claimInterface(interfaceNumber);
      await device.transferOut(endpointNumber, bytes);
      return true;
    }

    return false;
  } catch (err: any) {
    console.error("Printing failed:", err);
    throw new Error(err.message || "Gagal mengirim data cetak ke printer.");
  }
}
