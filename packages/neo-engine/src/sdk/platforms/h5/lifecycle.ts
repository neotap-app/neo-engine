import type { ILifecycle } from '../../types/game-context/lifecycle';

export function createH5Lifecycle(): ILifecycle {
  const showListeners: Array<() => void> = [];
  const hideListeners: Array<() => void> = [];
  let attached = false;

  const onVisibility = () => {
    if (document.hidden) {
      hideListeners.forEach((fn) => fn());
    } else {
      showListeners.forEach((fn) => fn());
    }
  };

  const attach = () => {
    if (attached) {
      return;
    }
    document.addEventListener('visibilitychange', onVisibility);
    attached = true;
  };

  const detach = () => {
    if (!attached) {
      return;
    }
    document.removeEventListener('visibilitychange', onVisibility);
    attached = false;
  };

  attach();

  return {
    name: 'lifecycle',
    available: true,
    bind() {
      attach();
    },
    dispose() {
      detach();
      showListeners.length = 0;
      hideListeners.length = 0;
    },
    onShow(listener) {
      showListeners.push(listener);
    },
    offShow(listener) {
      const index = showListeners.indexOf(listener);
      if (index >= 0) {
        showListeners.splice(index, 1);
      }
    },
    onHide(listener) {
      hideListeners.push(listener);
    },
    offHide(listener) {
      const index = hideListeners.indexOf(listener);
      if (index >= 0) {
        hideListeners.splice(index, 1);
      }
    },
  };
}
