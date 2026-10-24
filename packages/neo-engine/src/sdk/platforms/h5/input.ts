import type { CapabilityBindings } from '../../types/game-context/types';
import type { IInput, PointerEventData } from '../../types/game-context/input';

export interface H5InputOptions {
  target?: HTMLElement | null;
}

type ListenerMap = Record<'down' | 'move' | 'up', Array<(event: PointerEventData) => void>>;

export function createH5Input(options: H5InputOptions = {}): IInput {
  const listeners: ListenerMap = {
    down: [],
    move: [],
    up: [],
  };

  let target: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;

  const emit = (type: keyof ListenerMap) => (event: PointerEvent) => {
    const rect = target?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : canvas?.width ?? 0;
    const height = rect && rect.height > 0 ? rect.height : canvas?.height ?? 0;
    const scaleX = canvas && width > 0 ? canvas.width / width : 1;
    const scaleY = canvas && height > 0 ? canvas.height / height : 1;
    const data: PointerEventData = {
      x: (event.clientX - (rect?.left ?? 0)) * scaleX,
      y: (event.clientY - (rect?.top ?? 0)) * scaleY,
    };
    listeners[type].forEach((fn) => fn(data));
  };

  const handlers = {
    down: emit('down'),
    move: emit('move'),
    up: emit('up'),
  };

  const unbind = () => {
    if (!target) {
      return;
    }
    target.removeEventListener('pointerdown', handlers.down);
    target.removeEventListener('pointermove', handlers.move);
    target.removeEventListener('pointerup', handlers.up);
    target = null;
    canvas = null;
  };

  const bindTo = (element: HTMLElement, canvasElement: HTMLCanvasElement | null) => {
    unbind();
    target = element;
    canvas = canvasElement;
    element.addEventListener('pointerdown', handlers.down);
    element.addEventListener('pointermove', handlers.move);
    element.addEventListener('pointerup', handlers.up);
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
      bindTo(bindings.canvas, bindings.canvas);
    },
    dispose() {
      unbind();
      listeners.down.length = 0;
      listeners.move.length = 0;
      listeners.up.length = 0;
    },
    onPointerDown(listener) {
      listeners.down.push(listener);
    },
    onPointerMove(listener) {
      listeners.move.push(listener);
    },
    onPointerUp(listener) {
      listeners.up.push(listener);
    },
  };
}
