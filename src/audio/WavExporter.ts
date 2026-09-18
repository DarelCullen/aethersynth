// Offline Audio Exporter: Renders sequence to 16-bit 44.1kHz Stereo WAV file

import { DrumEngine } from './DrumEngine';
import { PluginChain } from './PluginChain';

export class WavExporter {
  public static async exportLoopToWav(
    bpm: number,
    bars: number,
    drumEngine: DrumEngine,
    pluginChain: PluginChain
  ): Promise<Blob> {
    const sampleRate = 44100;
    const secondsPerBeat = 60.0 / bpm;
    const duration = bars * 4 * secondsPerBeat;
    const length = Math.ceil(sampleRate * duration);

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // Create duplicate offline drum engine & plugin rack
    const offlineDrums = new DrumEngine(offlineCtx as unknown as AudioContext);
    const offlineRack = new PluginChain(offlineCtx as unknown as AudioContext);

    // Copy parameters and state
    offlineRack.state = JSON.parse(JSON.stringify(pluginChain.state));
    offlineRack.applyAllParams();

    offlineDrums.tracks = JSON.parse(JSON.stringify(drumEngine.tracks));
    offlineDrums.pads = JSON.parse(JSON.stringify(drumEngine.pads));

    // Connect offline drums -> offline rack -> offline destination
    offlineDrums.outputNode.connect(offlineRack.inputNode);
    offlineRack.outputNode.connect(offlineCtx.destination);

    // Schedule all steps over the bars
    const totalSteps = bars * 16;
    const secondsPer16th = secondsPerBeat / 4;

    for (let step = 0; step < totalSteps; step++) {
      const step16 = step % 16;
      const stepTime = step * secondsPer16th;

      // Check active drum tracks
      offlineDrums.tracks.forEach((track) => {
        if (!track.muted && track.steps[step16]?.active) {
          const velocity = track.steps[step16].velocity;
          offlineDrums.triggerPad(track.padId, velocity, stepTime);
        }
      });
    }

    // Render audio
    const renderedBuffer = await offlineCtx.startRendering();

    // Encode to WAV
    return WavExporter.audioBufferToWav(renderedBuffer);
  }

  public static audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // RIFF chunk descriptor
    WavExporter.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    WavExporter.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    WavExporter.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitDepth, true); // BitsPerSample

    // data sub-chunk
    WavExporter.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave channels & write 16-bit PCM samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        // Clamp sample to [-1, 1]
        sample = Math.max(-1, Math.min(1, sample));
        // Convert to 16-bit signed integer
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  public static triggerDownload(blob: Blob, filename: string = 'Resonance_Studio_Solaris_Drift.wav') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
