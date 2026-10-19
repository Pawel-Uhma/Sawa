/** The part of sherpa-onnx-node (CommonJS, no types) the local voice uses. */
declare module "sherpa-onnx-node" {
  type OfflineTtsConfig = {
    model: {
      vits: { model: string; tokens: string; dataDir: string };
      numThreads?: number;
      provider?: "cpu";
    };
    maxNumSentences?: number;
  };
  class OfflineTts {
    static createAsync(config: OfflineTtsConfig): Promise<OfflineTts>;
    readonly sampleRate: number;
    generateAsync(request: {
      text: string;
      sid: number;
      speed: number;
    }): Promise<{ samples: Float32Array; sampleRate: number }>;
  }
  const sherpa: { OfflineTts: typeof OfflineTts };
  export default sherpa;
}
