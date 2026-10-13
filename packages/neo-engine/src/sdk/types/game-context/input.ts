import type { Capability } from './types';

export interface PointerEventData {
  x: number;
  y: number;
}

export interface IInput extends Capability {
  onPointerDown(listener: (event: PointerEventData) => void): void;
  onPointerMove(listener: (event: PointerEventData) => void): void;
  onPointerUp(listener: (event: PointerEventData) => void): void;
}

export function createNoopInput(): IInput {
  return {
    name: 'input',
    available: false,
    onPointerDown: () => undefined,
    onPointerMove: () => undefined,
    onPointerUp: () => undefined,
  };
}
