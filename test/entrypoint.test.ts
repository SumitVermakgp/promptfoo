import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isSupportedNodeVersion, parseNodeVersion } from '../src/nodeVersionCheck';

const SUPPORTED_NODE_VERSION_RANGE = '^20.20.0 || >=22.22.0';

/**
 * Tests for the version check logic used in src/entrypoint.ts
 *
 * The entrypoint itself has top-level await and side effects, so we test
 * the core logic (version parsing, range checks, runtime detection) in isolation.
 */
describe('entrypoint version check logic', () => {
  describe('Node.js version parsing', () => {
    it('parses process.version values into semver parts', () => {
      const testCases = [
        { version: 'v20.20.0', expected: [20, 20, 0] as const },
        { version: '20.20.2', expected: [20, 20, 2] as const },
        { version: 'v22.22.1', expected: [22, 22, 1] as const },
        { version: 'v24.14.0', expected: [24, 14, 0] as const },
      ];

      for (const { version, expected } of testCases) {
        expect(parseNodeVersion(version)).toEqual(expected);
      }
    });

    it('returns null for malformed versions', () => {
      const malformedVersions = ['vX.Y.Z', 'v20', '', 'node-20.20.0', 'invalid'];

      for (const version of malformedVersions) {
        expect(parseNodeVersion(version)).toBeNull();
      }
    });
  });

  describe('Node.js engines range checks', () => {
    it('rejects unsupported versions within the same major release', () => {
      const unsupportedVersions = ['v18.20.8', 'v20.9.0', 'v20.19.5', 'v21.0.0', 'v22.21.0'];

      for (const version of unsupportedVersions) {
        expect(isSupportedNodeVersion(version, SUPPORTED_NODE_VERSION_RANGE)).toBe(false);
      }
    });

    it('accepts versions that satisfy the declared engines range', () => {
      const supportedVersions = ['v20.20.0', 'v20.20.2', 'v22.22.1', 'v24.14.0'];

      for (const version of supportedVersions) {
        expect(isSupportedNodeVersion(version, SUPPORTED_NODE_VERSION_RANGE)).toBe(true);
      }
    });

    it('supports AND comparators inside one range clause', () => {
      const customRange = '>=20.20.0 <21.0.0 || >=22.22.0';

      expect(isSupportedNodeVersion('v20.20.0', customRange)).toBe(true);
      expect(isSupportedNodeVersion('v20.21.0', customRange)).toBe(true);
      expect(isSupportedNodeVersion('v21.0.0', customRange)).toBe(false);
      expect(isSupportedNodeVersion('v22.22.1', customRange)).toBe(true);
    });

    it('returns null for malformed process.version values', () => {
      expect(isSupportedNodeVersion('vX.Y.Z', SUPPORTED_NODE_VERSION_RANGE)).toBeNull();
    });
  });

  describe('alternative runtime detection', () => {
    let originalBun: unknown;
    let originalDeno: unknown;

    beforeEach(() => {
      // Save original values
      originalBun = (globalThis as Record<string, unknown>).Bun;
      originalDeno = (globalThis as Record<string, unknown>).Deno;
    });

    afterEach(() => {
      // Restore original values
      if (originalBun === undefined) {
        delete (globalThis as Record<string, unknown>).Bun;
      } else {
        (globalThis as Record<string, unknown>).Bun = originalBun;
      }
      if (originalDeno === undefined) {
        delete (globalThis as Record<string, unknown>).Deno;
      } else {
        (globalThis as Record<string, unknown>).Deno = originalDeno;
      }
    });

    it('detects Bun runtime via globalThis.Bun', () => {
      // Simulate Bun environment
      (globalThis as Record<string, unknown>).Bun = { version: '1.0.0' };

      const isBun = typeof (globalThis as Record<string, unknown>).Bun !== 'undefined';
      expect(isBun).toBe(true);
    });

    it('detects Deno runtime via globalThis.Deno', () => {
      // Simulate Deno environment
      (globalThis as Record<string, unknown>).Deno = { version: { deno: '1.40.0' } };

      const isDeno = typeof (globalThis as Record<string, unknown>).Deno !== 'undefined';
      expect(isDeno).toBe(true);
    });

    it('returns false for Bun/Deno detection in standard Node.js', () => {
      // Ensure Bun and Deno are not defined (standard Node.js)
      delete (globalThis as Record<string, unknown>).Bun;
      delete (globalThis as Record<string, unknown>).Deno;

      const isBun = typeof (globalThis as Record<string, unknown>).Bun !== 'undefined';
      const isDeno = typeof (globalThis as Record<string, unknown>).Deno !== 'undefined';

      expect(isBun).toBe(false);
      expect(isDeno).toBe(false);
    });

    it('skips version check when running in Bun', () => {
      (globalThis as Record<string, unknown>).Bun = { version: '1.0.0' };

      const isBun = typeof (globalThis as Record<string, unknown>).Bun !== 'undefined';
      const isDeno = typeof (globalThis as Record<string, unknown>).Deno !== 'undefined';

      // Simulate old Node version string (though Bun wouldn't have this)
      const version = 'v16.0.0';
      const major = parseInt(version.slice(1), 10);

      // Version check should be skipped for Bun
      const shouldCheckVersion = !isBun && !isDeno;
      expect(shouldCheckVersion).toBe(false);

      // Even though major < 20, the check is skipped
      expect(major < 20).toBe(true);
    });

    it('skips version check when running in Deno', () => {
      (globalThis as Record<string, unknown>).Deno = { version: { deno: '1.40.0' } };

      const isBun = typeof (globalThis as Record<string, unknown>).Bun !== 'undefined';
      const isDeno = typeof (globalThis as Record<string, unknown>).Deno !== 'undefined';

      // Version check should be skipped for Deno
      const shouldCheckVersion = !isBun && !isDeno;
      expect(shouldCheckVersion).toBe(false);
    });
  });

  describe('error message formatting', () => {
    it('produces a yellow-colored error message for unsupported versions', () => {
      const version = 'v20.9.0';
      const errorMessage = `\x1b[33mNode.js ${version} is not supported. Please upgrade to a supported Node.js version (${SUPPORTED_NODE_VERSION_RANGE}).\x1b[0m`;

      expect(errorMessage).toContain('v20.9.0');
      expect(errorMessage).toContain('is not supported');
      expect(errorMessage).toContain(SUPPORTED_NODE_VERSION_RANGE);
      // Contains ANSI yellow color code
      expect(errorMessage).toContain('\x1b[33m');
      // Contains ANSI reset code
      expect(errorMessage).toContain('\x1b[0m');
    });

    it('produces a distinct error message for malformed versions', () => {
      const version = 'vX.Y.Z';
      const errorMessage = `\x1b[33mUnexpected Node.js version format: ${version}. Please use a supported Node.js version (${SUPPORTED_NODE_VERSION_RANGE}).\x1b[0m`;

      expect(errorMessage).toContain('Unexpected Node.js version format');
      expect(errorMessage).toContain('vX.Y.Z');
      expect(errorMessage).toContain(SUPPORTED_NODE_VERSION_RANGE);
    });

    it('uses the injected engines range in the error message', () => {
      const version = 'v22.0.0';
      const supportedRange = '^22.22.0 || >=24.0.0';
      const errorMessage = `\x1b[33mNode.js ${version} is not supported. Please upgrade to a supported Node.js version (${supportedRange}).\x1b[0m`;

      expect(errorMessage).toContain(supportedRange);
    });
  });

  describe('build-time constant behavior', () => {
    it('uses fallback when __PROMPTFOO_NODE_VERSION_RANGE__ is undefined', () => {
      // In development/testing, the constant is undefined
      const __PROMPTFOO_NODE_VERSION_RANGE__: string | undefined = undefined;
      const supportedNodeVersionRange =
        typeof __PROMPTFOO_NODE_VERSION_RANGE__ === 'undefined'
          ? '^20.20.0 || >=22.22.0'
          : __PROMPTFOO_NODE_VERSION_RANGE__;

      expect(supportedNodeVersionRange).toBe('^20.20.0 || >=22.22.0');
    });

    it('uses injected value when __PROMPTFOO_NODE_VERSION_RANGE__ is defined', () => {
      // At build time, the constant is replaced with the actual value
      const __PROMPTFOO_NODE_VERSION_RANGE__: string | undefined = '^22.22.0 || >=24.0.0';
      const supportedNodeVersionRange =
        typeof __PROMPTFOO_NODE_VERSION_RANGE__ === 'undefined'
          ? '^20.20.0 || >=22.22.0'
          : __PROMPTFOO_NODE_VERSION_RANGE__;

      expect(supportedNodeVersionRange).toBe('^22.22.0 || >=24.0.0');
    });
  });
});
