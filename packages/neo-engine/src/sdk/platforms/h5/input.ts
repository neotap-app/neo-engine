import type { IInput, PointerEventData } from '../../types/game-context/input';

export interface H5InputOptions {
  target?: HTMLElement | null;
}

export function createH5Input(options: H5InputOptions = {}): IInput {
  const target = options.target ?? document.body;
  const listeners: Record<string, Array<(event: PointerEventData) => void>> = {
    down: [],
    move: [],
    up: [],
  };

  const emit = (type: keyof typeof listeners) => (ev: PointerEvent) => {
    const rect = target.getBoundingClientRect();
    const data: PointerEventData = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
    listeners[type].forEach((fn) => fn(data));
  };

  const onDown = emit('down');
  const onMove = emit('move');
  const onUp = emit('up');

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);

  return {
    name: 'input',
    available: true,
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
