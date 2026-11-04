import type { CapabilityBindings, ICanvas } from '../../types/game-context/types';
import type {
  IInput,
  KeyEventData,
  PointerEventData,
  WheelEventData,
} from '../../types/game-context/input';

export interface H5InputOptions {
  target?: HTMLElement | null;
}

type PointerType = 'down' | 'move' | 'up' | 'cancel';
type PointerListener = (event: PointerEventData) => void;
type WheelListener = (event: WheelEventData) => void;
type KeyListener = (event: KeyEventData) => void;

const addListener = <T>(listeners: T[], listener: T) => {
  if (!listeners.includes(listener)) {
    listeners.push(listener);
  }
};

const removeListener = <T>(listeners: T[], listener: T) => {
  const index = listeners.indexOf(listener);
  if (index >= 0) {
    listeners.splice(index, 1);
  }
};

export function createH5Input(options: H5InputOptions = {}): IInput {
  const pointerListeners: Record<PointerType, PointerListener[]> = {
    down: [],
    move: [],
    up: [],
    cancel: [],
  };
  const wheelListeners: WheelListener[] = [];
  const keyDownListeners: KeyListener[] = [];
  const keyUpListeners: KeyListener[] = [];

  let target: HTMLElement | null = null;
  let canvas: ICanvas | null = null;
  let keyTarget: Window | null = null;

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const rect = target?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : canvas?.width ?? 0;
    const height = rect && rect.height > 0 ? rect.height : canvas?.height ?? 0;
    const scaleX = canvas && width > 0 ? canvas.width / width : 1;
    const scaleY = canvas && height > 0 ? canvas.height / height : 1;
    const inside = rect
      ? clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      : true;
    return {
      x: (clientX - (rect?.left ?? 0)) * scaleX,
      y: (clientY - (rect?.top ?? 0)) * scaleY,
      inside,
    };
  };

  const toPointer = (event: PointerEvent): PointerEventData => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    return {
      x: point.x,
      y: point.y,
      pointerId: event.pointerId,
      pointerType: event.pointerType || 'mouse',
      isPrimary: event.isPrimary,
      inside: point.inside,
    };
  };

  const emitPointer = (type: PointerType) => (event: PointerEvent) => {
    const data = toPointer(event);
    pointerListeners[type].slice().forEach((fn) => fn(data));
  };

  const emitWheel = (event: WheelEvent) => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    const data: WheelEventData = {
      x: point.x,
      y: point.y,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
    };
    wheelListeners.slice().forEach((fn) => fn(data));
  };

  const toKey = (event: KeyboardEvent): KeyEventData => ({
    key: event.key,
    code: event.code,
    repeat: event.repeat,
  });

  const emitKeyDown = (event: KeyboardEvent) => {
    const data = toKey(event);
    keyDownListeners.slice().forEach((fn) => fn(data));
  };

  const emitKeyUp = (event: KeyboardEvent) => {
    const data = toKey(event);
    keyUpListeners.slice().forEach((fn) => fn(data));
  };

  const handlers = {
    down: emitPointer('down'),
    move: emitPointer('move'),
    up: emitPointer('up'),
    cancel: emitPointer('cancel'),
  };

  const unbind = () => {
    if (target) {
      target.removeEventListener('pointerdown', handlers.down);
      target.removeEventListener('pointermove', handlers.move);
      target.removeEventListener('pointerup', handlers.up);
      target.removeEventListener('pointercancel', handlers.cancel);
      target.removeEventListener('wheel', emitWheel);
    }
    if (keyTarget) {
      keyTarget.removeEventListener('keydown', emitKeyDown);
      keyTarget.removeEventListener('keyup', emitKeyUp);
    }
    target = null;
    canvas = null;
    keyTarget = null;
  };

  const bindTo = (element: HTMLElement, canvasElement: ICanvas | null) => {
    unbind();
    target = element;
    canvas = canvasElement;
    element.addEventListener('pointerdown', handlers.down);
    element.addEventListener('pointermove', handlers.move);
    element.addEventListener('pointerup', handlers.up);
    element.addEventListener('pointercancel', handlers.cancel);
    element.addEventListener('wheel', emitWheel, { passive: true });
    if (typeof window !== 'undefined') {
      keyTarget = window;
      keyTarget.addEventListener('keydown', emitKeyDown);
      keyTarget.addEventListener('keyup', emitKeyUp);
    }
  };

  if (options.target) {
    const isCanvas =
      typeof HTMLCanvasElement !== 'undefined' && options.target instanceof HTMLCanvasElement;
    bindTo(options.target, isCanvas ? (options.target as HTMLCanvasElement) : null);
  }

  return {
    name: 'input',
    available: true,
    bind(bindings: CapabilityBindings) {
      bindTo(bindings.canvas as unknown as HTMLElement, bindings.canvas);
    },
    dispose() {
      unbind();
      pointerListeners.down.length = 0;
      pointerListeners.move.length = 0;
      pointerListeners.up.length = 0;
      pointerListeners.cancel.length = 0;
      wheelListeners.length = 0;
      keyDownListeners.length = 0;
      keyUpListeners.length = 0;
    },
    onPointerDown(listener) {
      addListener(pointerListeners.down, listener);
    },
    offPointerDown(listener) {
      removeListener(pointerListeners.down, listener);
    },
    onPointerMove(listener) {
      addListener(pointerListeners.move, listener);
    },
    offPointerMove(listener) {
      removeListener(pointerListeners.move, listener);
    },
    onPointerUp(listener) {
      addListener(pointerListeners.up, listener);
    },
    offPointerUp(listener) {
      removeListener(pointerListeners.up, listener);
    },
    onPointerCancel(listener) {
      addListener(pointerListeners.cancel, listener);
    },
    offPointerCancel(listener) {
      removeListener(pointerListeners.cancel, listener);
    },
    onWheel(listener) {
      addListener(wheelListeners, listener);
    },
    offWheel(listener) {
      removeListener(wheelListeners, listener);
    },
    onKeyDown(listener) {
      addListener(keyDownListeners, listener);
    },
    offKeyDown(listener) {
      removeListener(keyDownListeners, listener);
    },
    onKeyUp(listener) {
      addListener(keyUpListeners, listener);
    },
    offKeyUp(listener) {
      removeListener(keyUpListeners, listener);
    },
  };
}
