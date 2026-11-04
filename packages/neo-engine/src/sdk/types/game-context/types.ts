export interface ICanvas {
  width: number;
  height: number;
  getContext(contextId: string, options?: unknown): unknown;
  remove?(): void;
}

export type FrameRequest = (callback: () => void) => number;
export type FrameCancel = (handle: number) => void;

export interface CanvasHost {
  appendChild(node: unknown): unknown;
}

export interface CapabilityBindings {
  canvas: ICanvas;
  game?: unknown;
}

export interface Capability {
  readonly name: string;
  readonly available: boolean;
  bind?(bindings: CapabilityBindings): void;
  dispose?(): void;
}
