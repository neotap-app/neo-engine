import type { Capability } from './types';

export interface PointerEventData {
  x: number;
  y: number;
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  inside: boolean;
}

export interface WheelEventData {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

export interface KeyEventData {
  key: string;
  code: string;
  repeat: boolean;
}

export interface IInput extends Capability {
  onPointerDown(listener: (event: PointerEventData) => void): void;
  offPointerDown(listener: (event: PointerEventData) => void): void;
  onPointerMove(listener: (event: PointerEventData) => void): void;
  offPointerMove(listener: (event: PointerEventData) => void): void;
  onPointerUp(listener: (event: PointerEventData) => void): void;
  offPointerUp(listener: (event: PointerEventData) => void): void;
  onPointerCancel(listener: (event: PointerEventData) => void): void;
  offPointerCancel(listener: (event: PointerEventData) => void): void;
  onWheel(listener: (event: WheelEventData) => void): void;
  offWheel(listener: (event: WheelEventData) => void): void;
  onKeyDown(listener: (event: KeyEventData) => void): void;
  offKeyDown(listener: (event: KeyEventData) => void): void;
  onKeyUp(listener: (event: KeyEventData) => void): void;
  offKeyUp(listener: (event: KeyEventData) => void): void;
}

export function createNoopInput(): IInput {
  return {
    name: 'input',
    available: false,
    onPointerDown: () => undefined,
    offPointerDown: () => undefined,
    onPointerMove: () => undefined,
    offPointerMove: () => undefined,
    onPointerUp: () => undefined,
    offPointerUp: () => undefined,
    onPointerCancel: () => undefined,
    offPointerCancel: () => undefined,
    onWheel: () => undefined,
    offWheel: () => undefined,
    onKeyDown: () => undefined,
    offKeyDown: () => undefined,
    onKeyUp: () => undefined,
    offKeyUp: () => undefined,
  };
}
