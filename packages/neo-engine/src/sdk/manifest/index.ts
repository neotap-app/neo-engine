export const NEO_ENGINE_RUNTIME_PREFIX = 'neo-engine@';
export const DEFAULT_ENTRY = 'src/index.ts';

export interface NeoManifestData {
  name: string;
  version: string;
  engine: string;
  entry: string;
}

export interface ParsedEngineRuntime {
  name: string;
  version: string;
}

export class ManifestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestParseError';
  }
}

export class NeoManifest {
  readonly name: string;
  readonly version: string;
  readonly engine: string;
  readonly entry: string;

  constructor(data: NeoManifestData) {
    this.name = data.name;
    this.version = data.version;
    this.engine = data.engine;
    this.entry = data.entry;
  }

  static parseEngineRuntime(engine: string): ParsedEngineRuntime | null {
    if (!engine.startsWith(NEO_ENGINE_RUNTIME_PREFIX)) {
      return null;
    }
    return {
      name: 'neo-engine',
      version: engine.slice(NEO_ENGINE_RUNTIME_PREFIX.length),
    };
  }

  static parse(text: string): NeoManifest {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      throw new ManifestParseError(
        `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return NeoManifest.fromObject(raw);
  }

  static fromObject(raw: unknown): NeoManifest {
    if (typeof raw !== 'object' || raw === null) {
      throw new ManifestParseError('manifest must be an object');
    }
    const obj = raw as Record<string, unknown>;

    if (typeof obj.name !== 'string' || obj.name.length === 0) {
      throw new ManifestParseError('manifest.name must be a non-empty string');
    }
    if (typeof obj.version !== 'string' || !/^\d+\.\d+\.\d+/.test(obj.version)) {
      throw new ManifestParseError(`manifest.version must be a semver string, got ${String(obj.version)}`);
    }
    if (typeof obj.engine !== 'string' || !NeoManifest.parseEngineRuntime(obj.engine)) {
      throw new ManifestParseError(`manifest.engine must start with "${NEO_ENGINE_RUNTIME_PREFIX}", got ${String(obj.engine)}`);
    }

    const entry = obj.entry;
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new ManifestParseError('manifest.entry must be a non-empty string');
    }

    return new NeoManifest({
      name: obj.name,
      version: obj.version,
      engine: obj.engine,
      entry,
    });
  }

  get runtime(): ParsedEngineRuntime | null {
    return NeoManifest.parseEngineRuntime(this.engine);
  }

  get effectiveEntry(): string {
    return this.entry ?? DEFAULT_ENTRY;
  }

  toJSON(): NeoManifestData {
    return {
      name: this.name,
      version: this.version,
      engine: this.engine,
      entry: this.entry,
    };
  }
}
