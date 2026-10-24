export interface NeoErrorHandlerOptions {
  mountExpression?: string;
  fallbackText?: string;
}

const DEFAULT_FALLBACK_TEXT = '游戏加载失败，请稍后重试';
const FALLBACK_STYLE =
  'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
  'color:#fff;background:#000;font:16px/1.5 sans-serif;z-index:9999;padding:24px;text-align:center;';

export function neoErrorHandlerSource(options: NeoErrorHandlerOptions = {}): string[] {
  const mountExpression = options.mountExpression ?? 'null';
  const fallbackText = JSON.stringify(options.fallbackText ?? DEFAULT_FALLBACK_TEXT);
  const fallbackStyle = JSON.stringify(FALLBACK_STYLE);

  return [
    `var __neoMount = ${mountExpression};`,
    `function reportNeoError(error) {`,
    `  try { console.error('[neo-engine] runtime error', error); } catch (e) {}`,
    `  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {`,
    `    try { window.dispatchEvent(new CustomEvent('neo:error', { detail: error })); } catch (e) {}`,
    `  }`,
    `  try {`,
    `    if (__neoMount && typeof __neoMount.appendChild === 'function' && typeof document !== 'undefined' && typeof document.createElement === 'function') {`,
    `      var existing = typeof __neoMount.querySelector === 'function' ? __neoMount.querySelector('.neo-error-fallback') : null;`,
    `      if (!existing) {`,
    `        var fallback = document.createElement('div');`,
    `        fallback.className = 'neo-error-fallback';`,
    `        fallback.textContent = ${fallbackText};`,
    `        fallback.style.cssText = ${fallbackStyle};`,
    `        __neoMount.appendChild(fallback);`,
    `      }`,
    `    }`,
    `  } catch (e) {}`,
    `}`,
    `if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {`,
    `  window.addEventListener('error', function (event) { reportNeoError(event && (event.error || event.message)); });`,
    `  window.addEventListener('unhandledrejection', function (event) { reportNeoError(event && event.reason); });`,
    `}`,
  ];
}
