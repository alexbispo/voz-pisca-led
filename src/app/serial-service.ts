import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SerialService {
  private writer?: WritableStreamDefaultWriter<Uint8Array>;

  async connect() {
    // @ts-ignore: Tipos do Web Serial estão no DOM
    const port: SerialPort = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    this.writer = port.writable!.getWriter();

    // leitura de logs do Arduino
    const dec = new TextDecoderStream();
    port.readable!.pipeTo(dec.writable);
    const reader = dec.readable.getReader();
    (async ()=> {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) console.log("[Arduino]", value.trim());
      }
    })();
  }

  async sendLine(s: string) {
    if (!this.writer) throw new Error("Conecte na portal serial primeiro");
    const data = new TextEncoder().encode(s.trim() + "\n");
    await this.writer.write(data);
  }

}
