import { Component, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { VoiceService } from './voice-service';

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

  constructor(private voice: VoiceService) {}

  private append(msg: string) { this.log.update(s => s + '\n' + msg); }

  async start() {
    this.recording.set(true);
    await this.voice.start((text) => {
      this.transcript.set(text);
      this.append('📝 ' + text);
      //TODO comunicação Serial Arduino
    });
    this.append('🎙️ Gravando…');
  }

  async stop() {
    this.voice.stop();
    this.recording.set(false);
  }

}
