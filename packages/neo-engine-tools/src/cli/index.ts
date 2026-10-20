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

function printHelp(): void {
  process.stdout.write(
    [
      'neo-engine CLI',
      '',
      'Usage: neo <command> [options]',
      '',
      'Commands:',
      '  lint           校验项目（manifest / 入口 / 静态约束）',
      '  build          构建项目到目标平台（--target <h5|wechat|douyin>）',
      '  help           显示帮助',
      '',
      'Build options:',
      '  --target <h5|wechat|douyin>  目标平台（默认 h5）',
      '  --outDir, -o <dir>           输出目录（默认 dist）',
      '  --base <path>                H5 资源基础路径（默认 "./"，路径自动补尾部 "/"）',
      '                               影响 HTML/JS chunk 与 assets/，仅 H5 生效',
      '',
      'Run in a game project directory (contains package.neo.json).',
      '',
    ].join('\n'),
  );
}
