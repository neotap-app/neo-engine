import type { ILifecycle } from '../../types/game-context/lifecycle';

export function createH5Lifecycle(): ILifecycle {
  const showListeners: Array<() => void> = [];
  const hideListeners: Array<() => void> = [];

  const onVisibility = () => {
    if (document.hidden) {
      hideListeners.forEach((fn) => fn());
    } else {
      showListeners.forEach((fn) => fn());
    }
  };

  document.addEventListener('visibilitychange', onVisibility);

  return {
    name: 'lifecycle',
    available: true,
    onShow(listener) {
      showListeners.push(listener);
    },
    onHide(listener) {
      hideListeners.push(listener);
    },
  };
}
