import { Component, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { VoiceService } from './voice-service';
import { SerialService } from './serial-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('PISCA um LED com a "FORÇA" da VOZ!');
  protected transcript = signal<string>('');
  protected log = signal<string>('pronto.');
  protected recording = signal<boolean>(false);
  protected loading = computed(() => this.voice.loading);

  constructor(private voice: VoiceService, private serial: SerialService) {}

  private append(msg: string) { this.log.update(s => s + '\n' + msg); }

  async start() {
    this.recording.set(true);
    await this.voice.start((text) => {
      this.transcript.set(text);
      this.append('📝 ' + text);

      const cmd = this.textToCmd(text);
      if (cmd) {
        this.serial.sendLine(cmd).then(() => this.append('Enviado comando para o Arduino: ' + cmd))
          .catch(e => this.append('Erro ao enviar comando para o Arduino: ' + (e?.message || e)))
      } else {
        this.append("Comando não entendido. Tente novamente!");
      }
      this.recording.set(false);
    });
    this.append('🎙️ Gravando…');
  }

  async stop() {
    this.voice.stop();
    this.recording.set(false);
  }

  async connectSerial() {
    try {
      await this.serial.connect();
      this.append("✅ Serial conectada.");
    } catch (e:any) {
      this.append("Falaha serail: " + (e?.message || e));
    }
  }

  private textToCmd(text = ""): 'ON'|'OFF'|null {
    const t = text.toLowerCase();
    if (/\b(liga|ligar|acender|ativar|leg)\b/.test(t) || /\bacend(e|er)\b/.test(t)) return 'ON';
    if (/\b(ol|olá|oi|hello)\b/.test(t) || /\bacend(e|er)\b/.test(t)) return 'ON';
    if (/\b(desliga|desligar|apagar|desativar)\b/.test(t) || /\bapag(a|ar)\b/.test(t)) return 'OFF';
    if (/\b(bye|tchau|até)\b/.test(t) || /\bapag(a|ar)\b/.test(t)) return 'OFF';
    return null;
  }

}
