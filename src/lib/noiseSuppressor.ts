/**
 * NoiseSuppressor
 *
 * Wraps an AudioWorklet-based RNNoise pipeline.
 * Usage:
 *   const ns = new NoiseSuppressor();
 *   const processed = await ns.init(rawMicStream);
 *   ns.setBypass(false);   // enable
 *   ns.setBypass(true);    // disable (pass-through)
 *   ns.destroy();          // clean up
 */

export type NSStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export class NoiseSuppressor {
  private ctx:         AudioContext | null        = null;
  private sourceNode:  MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null   = null;
  private destNode:    MediaStreamAudioDestinationNode | null = null;
  private _status:     NSStatus = 'idle';
  private _bypass      = true;
  private _vadProb     = 0;
  private _onStatus:   ((s: NSStatus) => void) | null = null;
  private _onVad:      ((prob: number) => void) | null = null;

  get status()  { return this._status; }
  get vadProb() { return this._vadProb; }

  onStatus(cb: (s: NSStatus) => void) { this._onStatus = cb; }
  onVad(cb: (prob: number) => void)   { this._onVad = cb; }

  private _setStatus(s: NSStatus) {
    this._status = s;
    this._onStatus?.(s);
  }

  /**
   * Set up the full audio processing graph for the given mic stream.
   * Returns a NEW MediaStream whose audio track is the processed output.
   * Falls back to the original stream if AudioWorklet is unsupported.
   */
  async init(micStream: MediaStream): Promise<MediaStream> {
    if (typeof window === 'undefined') return micStream;
    if (!window.AudioContext) {
      this._setStatus('unsupported');
      return micStream;
    }

    this._setStatus('loading');

    try {
      this.ctx = new AudioContext({ sampleRate: 48000 });

      // Register the worklet module
      await this.ctx.audioWorklet.addModule('/worklets/rnnoise-processor.js');

      this.workletNode = new AudioWorkletNode(this.ctx, 'rnnoise-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

      // Send init command — worklet will importScripts() and load WASM
      this.workletNode.port.postMessage({
        type:      'init',
        syncJsUrl: '/worklets/rnnoise-sync.js',
        wasmUrl:   '/rnnoise.wasm',
      });

      this.workletNode.port.onmessage = ({ data }) => {
        if (data.type === 'ready') {
          this._setStatus('ready');
          // Apply the bypass state that was set before ready
          this.workletNode!.port.postMessage({ type: 'bypass', value: this._bypass });
        }
        if (data.type === 'error') {
          console.warn('[NoiseSuppressor] worklet error:', data.message);
          this._setStatus('error');
        }
        if (data.type === 'vad') {
          this._vadProb = data.prob;
          this._onVad?.(data.prob);
        }
      };

      // Build graph: source → worklet → destination
      this.sourceNode = this.ctx.createMediaStreamSource(micStream);
      this.destNode   = this.ctx.createMediaStreamDestination();

      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.destNode);

      // Return the processed stream (keeps original video tracks if any)
      const processedStream = this.destNode.stream;
      // Copy non-audio tracks (e.g., screen video) from original
      micStream.getVideoTracks().forEach(t => processedStream.addTrack(t));

      return processedStream;
    } catch (err) {
      console.warn('[NoiseSuppressor] init failed, falling back:', err);
      this._setStatus('error');
      return micStream;
    }
  }

  /** true = pass-through (no processing), false = denoise active */
  setBypass(bypass: boolean) {
    this._bypass = bypass;
    this.workletNode?.port.postMessage({ type: 'bypass', value: bypass });
  }

  destroy() {
    try {
      this.workletNode?.disconnect();
      this.sourceNode?.disconnect();
      this.destNode?.stream.getTracks().forEach(t => t.stop());
      this.ctx?.close();
    } catch { /* ignore */ }
    this.workletNode = null;
    this.sourceNode  = null;
    this.destNode    = null;
    this.ctx         = null;
    this._setStatus('idle');
  }
}
