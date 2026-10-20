import type { DevServerHandle, DevServerOptions } from '../dev';
import type { PreviewServerHandle, PreviewServerOptions } from '../preview';

export interface CLIOptions {
  cwd: string;
}

export async function runCLI(argv: string[], options: CLIOptions = { cwd: process.cwd() }): Promise<void> {
  const [command, ...rest] = argv;
  switch (command) {
    case 'lint':
      await runLint(rest, options);
      break;
    case 'build':
      await runBuild(rest, options);
      break;
    case 'dev':
      await runDev(rest, options);
      break;
    case 'preview':
      await runPreview(rest, options);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      if (command) {
        process.stderr.write(`unknown command: ${command}\n`);
      }
      printHelp();
      process.exitCode = 1;
  }
}

async function runLint(_argv: string[], options: CLIOptions): Promise<void> {
  const { lintProject } = await import('./lint');
  const result = await lintProject(options.cwd);
  for (const error of result.errors) {
    process.stderr.write(`error: ${error}\n`);
  }
  for (const warning of result.warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function runBuild(argv: string[], options: CLIOptions): Promise<void> {
  const { buildProjectCLI } = await import('./build');
  await buildProjectCLI(options.cwd, argv);
}

async function runDev(argv: string[], options: CLIOptions): Promise<void> {
  const { devProjectCLI } = await import('./dev');
  await devProjectCLI(options.cwd, argv);
}

async function runPreview(argv: string[], options: CLIOptions): Promise<void> {
  const { previewProjectCLI } = await import('./preview');
  await previewProjectCLI(options.cwd, argv);
}

export async function startDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  const { startDevServer: start } = await import('../dev');
  return start(options);
}

export async function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServerHandle> {
  const { startPreviewServer: start } = await import('../preview');
  return start(options);
}

function printHelp(): void {
  process.stdout.write(
    [
      'neo-engine CLI',
      '',
      'Usage: neo <command> [options]',
      '',
      'Commands:',
      '  lint           校验项目（manifest / 入口 / 本地 import 图的静态约束）',
      '  build          构建项目到目标平台（--target <h5|wechat|douyin> [--outDir <dir>]）',
      '  dev            启动 Vite 开发服务器（[--port <n>] [--host <addr>]）',
      '  preview        预览 H5 构建产物（[--outDir <dir>] [--port <n>] [--host <addr>]）',
      '  help           显示帮助',
      '',
      'Options:',
      '  --port, --port=<n>      监听端口（dev 默认 5173，preview 默认 4173）',
      '  --host, --host=<addr>   监听地址（默认 localhost；裸 --host 等价于 0.0.0.0）',
      '  --outDir, --outDir=<dir>  产物目录（build/preview 默认 dist）',
      '',
      'Run in a game project directory (contains package.neo.json).',
      '',
    ].join('\n'),
  );
}
