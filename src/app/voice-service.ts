import { Injectable } from "@angular/core";

// type Transformers = typeof import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2");
type TFModule = any;

const TF_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";


@Injectable({ providedIn: "root" })
export class VoiceService {
  // private tf?: any;
  private transcriber: any;
  private mediaRecorder?: MediaRecorder;
  private chunks: Blob[] = [];
  loading = false;

  private async loadTF(): Promise<TFModule> {
    // if (!this.tf) {
    //   this.tf =  await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2");
    //   this.tf.env.backends.onnx.wasm.numThreads = 1;
    // }
    // return this.tf!;

    const mod = await await import(/* @vite-ignore */ TF_URL);

    return mod as TFModule;
  }

  async initTranscriber() {
    if (this.transcriber) return;
    this.loading = true;
    const { pipeline, env } = await this.loadTF();
    env.backends.onnx.wasm.numThreads = 1;

    try {
      this.transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", { device: "wasm" });
    } catch {
      this.transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", { device: "webgpu" });
    } finally {
      this.loading = false;
    }
  }

  async start(onText: (text: string) => void) {
    await this.initTranscriber();
    const raw = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true
      }
    });

    // Filtrar graves
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(raw);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 100;
    const dst = ctx.createMediaStreamDestination();
    src.connect(hp).connect(dst);

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(dst.stream, { mimeType: "audio/webm;codecs=opus" });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = async () => {
      const blob = new Blob(this.chunks, { type: this.chunks[0]?.type || "audio/webm" });
      const { pcm, sampleRate } = await this.blobToFloat32Mono(blob);
      const { pcm16k } = await this.resampleTo16k(pcm, sampleRate);
      const out = await this.transcriber(pcm16k, {
        sampling_rate: 16000,
        task: "transcribe",
        language: "pt",
        temperature: 0,
        without_timestamps: true,
        chunk_length_s: 10,
        stride_length_s: 2
      });
      onText((out?.text || "").trim());
    };
    this.mediaRecorder.start();
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  // --- utils: Blob -> Float32 mono
  private async blobToFloat32Mono(blob: Blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const n = audioBuffer.numberOfChannels;
    if (n === 1) return { pcm: audioBuffer.getChannelData(0), sampleRate: audioBuffer.sampleRate };
    const len = audioBuffer.length;
    const mono = new Float32Array(len);
    for (let ch = 0; ch < n; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < len; i++) mono[i] += data[i] / n;
    }
    return { pcm: mono, sampleRate: audioBuffer.sampleRate };
  }

  // --- utils: resample → 16kHz
  private async resampleTo16k(pcm: Float32Array<ArrayBuffer>, fromRate: number) {
    if (fromRate === 16000) return { pcm16k: pcm, sampleRate: 16000 };
    const duration = pcm.length / fromRate;
    const offline = new OfflineAudioContext(1, Math.ceil(16000 * duration), 16000);
    const buffer = offline.createBuffer(1, pcm.length, fromRate);
    buffer.copyToChannel(pcm, 0);
    const src = offline.createBufferSource();
    src.buffer = buffer; src.connect(offline.destination); src.start();
    const rendered = await offline.startRendering();
    return { pcm16k: rendered.getChannelData(0), sampleRate: 16000 };
  }
}
