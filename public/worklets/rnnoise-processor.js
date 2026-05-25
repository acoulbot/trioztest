/**
 * RNNoise AudioWorklet Processor
 *
 * Web Audio delivers 128-sample chunks; RNNoise needs 480-sample frames.
 * We buffer 480 samples, denoise, drain results back in 128-sample pieces.
 * All buffers are pre-allocated — no GC during processing.
 *
 * Scaling: WebAudio [-1..1] ↔ RNNoise float as int16 range [-32768..32767].
 */

const FRAME   = 480;
const SCALE   = 32768;
const BUF_LEN = 4096;            // power of 2, must be > FRAME * 2
const BUF_MASK = BUF_LEN - 1;    // 4095 — safe for bitwise AND wrapping

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this._bypass = true;
    this._ready  = false;
    this._mod    = null;
    this._state  = 0;
    this._inPtr  = 0;
    this._outPtr = 0;
    this._inView  = null;
    this._outView = null;
    this._vadProb = 0;

    // Ring buffers — power-of-2 size for correct bitwise wrapping
    this._inQueue  = new Float32Array(BUF_LEN);
    this._outQueue = new Float32Array(BUF_LEN);
    this._inHead  = 0; this._inTail  = 0;
    this._outHead = 0; this._outTail = 0;

    this.port.onmessage = ({ data }) => {
      switch (data.type) {
        case 'bypass': this._bypass = data.value; break;
        case 'init':   this._load(data.syncJsUrl, data.wasmUrl); break;
      }
    };
  }

  async _load(syncJsUrl, wasmUrl) {
    try {
      importScripts(syncJsUrl);            // exposes createRNNWasmModuleSync global
      const mod = await createRNNWasmModuleSync({ locateFile: () => wasmUrl });
      await mod.ready;
      this._mod = mod;

      // Allocate one frame in WASM heap (float32 = 4 bytes/sample)
      this._inPtr  = mod._malloc(FRAME * 4);
      this._outPtr = mod._malloc(FRAME * 4);
      this._inView  = mod.HEAPF32.subarray(this._inPtr  >>> 2, (this._inPtr  >>> 2) + FRAME);
      this._outView = mod.HEAPF32.subarray(this._outPtr >>> 2, (this._outPtr >>> 2) + FRAME);

      this._state  = mod._rnnoise_create();
      this._ready  = true;
      this._bypass = false;
      this.port.postMessage({ type: 'ready' });
    } catch (err) {
      this.port.postMessage({ type: 'error', message: String(err) });
    }
  }

  process(inputs, outputs) {
    const src = inputs[0]?.[0];
    const dst = outputs[0]?.[0];
    if (!src || !dst) return true;

    // ── BYPASS ───────────────────────────────────────────────────────────
    if (this._bypass || !this._ready) {
      dst.set(src);
      return true;
    }

    const chunk = src.length; // 128

    // ── ENQUEUE INPUT (scale to int16 range) ─────────────────────────────
    for (let i = 0; i < chunk; i++) {
      this._inQueue[this._inTail++ & BUF_MASK] = src[i] * SCALE;
    }

    // ── PROCESS COMPLETE 480-SAMPLE FRAMES ───────────────────────────────
    while ((this._inTail - this._inHead) >= FRAME) {
      for (let i = 0; i < FRAME; i++) {
        this._inView[i] = this._inQueue[this._inHead++ & BUF_MASK];
      }

      this._vadProb = this._mod._rnnoise_process_frame(
        this._state, this._outPtr, this._inPtr
      );

      for (let i = 0; i < FRAME; i++) {
        this._outQueue[this._outTail++ & BUF_MASK] = this._outView[i];
      }
    }

    // ── DRAIN OUTPUT (scale back to [-1..1]) ──────────────────────────────
    const outAvail = this._outTail - this._outHead;
    if (outAvail >= chunk) {
      for (let i = 0; i < chunk; i++) {
        dst[i] = this._outQueue[this._outHead++ & BUF_MASK] / SCALE;
      }
    } else {
      // Not enough processed samples yet — output silence to avoid glitch
      dst.fill(0);
    }

    // Periodically report VAD probability to the main thread
    if (Math.random() < 0.04) {   // ~every 25 chunks ≈ every 83 ms
      this.port.postMessage({ type: 'vad', prob: this._vadProb });
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);
