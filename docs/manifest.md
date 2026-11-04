# Manifest

```ts
const NEO_ENGINE_RUNTIME_PREFIX = 'neo-engine@';
const DEFAULT_ENTRY = 'src/index.ts';

interface NeoManifestData {
  name: string;
  version: string;
  engine: string;
  entry: string;
}

interface ParsedEngineRuntime {
  name: string;
  version: string;
}

class NeoManifest {
  readonly name: string;
  readonly version: string;
  readonly engine: string;
  readonly entry: string;

  constructor(data: NeoManifestData);

  static parse(text: string): NeoManifest;
  static fromObject(raw: unknown): NeoManifest;
  static parseEngineRuntime(engine: string): ParsedEngineRuntime | null;

  get runtime(): ParsedEngineRuntime | null;
  get effectiveEntry(): string;
  toJSON(): NeoManifestData;
}
```

| 成员 | 说明 |
| --- | --- |
| `NeoManifest.parse(text)` | 解析 JSON 并校验；JSON 非法抛 `ManifestParseError` |
| `NeoManifest.fromObject(raw)` | 从对象校验并构造 |
| `NeoManifest.parseEngineRuntime(engine)` | 解析 `neo-engine@<version>`；前缀不匹配返回 `null` |
| `runtime` | 等价于 `parseEngineRuntime(this.engine)` |
| `effectiveEntry` | 返回 `entry`（当前 `entry` 为必填，不会为空） |
| `toJSON()` | 返回 4 字段普通对象 |

校验规则：

- `name`：非空字符串；
- `version`：匹配 `/^\d+\.\d+\.\d+/`；
- `engine`：以 `neo-engine@` 开头；
- `entry`：非空字符串。

`ManifestParseError` 的 `name` 固定为 `'ManifestParseError'`。

引导代码会把 manifest 注入 `RuntimeOptions.manifest`，运行时原样挂到 [GameContext.manifest](./game/context.md)。
