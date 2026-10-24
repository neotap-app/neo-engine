export interface CapabilityBindings {
  canvas: HTMLCanvasElement;
  game?: unknown;
}

export interface Capability {
  readonly name: string;
  readonly available: boolean;
  bind?(bindings: CapabilityBindings): void;
  dispose?(): void;
}
