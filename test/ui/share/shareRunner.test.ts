import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock modules before importing the module under test
vi.mock('../../../src/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/ui/interactiveCheck', () => ({
  shouldUseInkUI: vi.fn(() => false),
}));

// Mock initInkApp to avoid loading ink/React, and to trigger onController in the render callback
vi.mock('../../../src/ui/initInkApp', () => ({
  initInkApp: vi.fn(async (options: any) => {
    // Create promise resolvers for channels
    const resolvers: Record<string, (v: any) => void> = {};
    const promises: Record<string, Promise<any>> = {};
    for (const [key, _defaultVal] of Object.entries(options.channels || {})) {
      promises[key] = new Promise((resolve) => {
        resolvers[key] = resolve;
      });
    }

    // Call the render function to get the element and trigger onController
    const element = options.render(resolvers);

    // Extract props and trigger onController if present
    const appProps = element?.props?.children?.props || element?.props;
    if (appProps?.onController) {
      const { createShareController } = await import('../../../src/ui/share/ShareApp');
      appProps.onController(createShareController(vi.fn()));
    }

    const mockCleanup = vi.fn();
    return {
      renderResult: {
        cleanup: mockCleanup,
        clear: vi.fn(),
        unmount: vi.fn(),
        rerender: vi.fn(),
        waitUntilExit: vi.fn().mockResolvedValue(undefined),
        instance: {},
      },
      cleanup: mockCleanup,
      promises,
    };
  }),
}));

// Mock ShareApp
vi.mock('../../../src/ui/share/ShareApp', () => ({
  ShareApp: vi.fn(() => null),
  createShareController: vi.fn((_setProgress: any) => ({
    setPhase: vi.fn(),
    setProgress: vi.fn(),
    complete: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('shareRunner', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure shouldUseInkUI returns false by default
    const { shouldUseInkUI } = await import('../../../src/ui/interactiveCheck');
    vi.mocked(shouldUseInkUI).mockReturnValue(false);
  });

  describe('shouldUseInkShare', () => {
    it('should return false by default (opt-in)', async () => {
      const { shouldUseInkShare } = await import('../../../src/ui/share/shareRunner');
      expect(shouldUseInkShare()).toBe(false);
    });

    it('should return true when shouldUseInkUI returns true', async () => {
      const { shouldUseInkUI } = await import('../../../src/ui/interactiveCheck');
      vi.mocked(shouldUseInkUI).mockReturnValue(true);

      const { shouldUseInkShare } = await import('../../../src/ui/share/shareRunner');
      expect(shouldUseInkShare()).toBe(true);
    });
  });

  describe('initInkShare', () => {
    it('should call initInkApp and return result structure', async () => {
      const { initInkShare } = await import('../../../src/ui/share/shareRunner');

      const result = await initInkShare({
        evalId: 'test-eval-id',
        description: 'Test eval description',
        resultCount: 10,
        skipConfirmation: false,
      });

      expect(result.controller).toBeDefined();
      expect(result.cleanup).toBeDefined();
      expect(result.confirmation).toBeDefined();
      expect(result.result).toBeDefined();
    });

    it('should resolve confirmation when onConfirm is called', async () => {
      const { initInkApp } = await import('../../../src/ui/initInkApp');

      // Override to capture resolvers
      let capturedResolvers: Record<string, (v: any) => void> = {};
      vi.mocked(initInkApp).mockImplementationOnce(async (options: any): Promise<any> => {
        const resolvers: Record<string, (v: any) => void> = {};
        const promises: Record<string, Promise<any>> = {};
        for (const [key] of Object.entries(options.channels || {})) {
          promises[key] = new Promise((resolve) => {
            resolvers[key] = resolve;
          });
        }
        capturedResolvers = resolvers;

        // Call render and trigger onController
        const element = options.render(resolvers);
        const appProps = element?.props?.children?.props || element?.props;
        if (appProps?.onController) {
          const { createShareController } = await import('../../../src/ui/share/ShareApp');
          appProps.onController(createShareController(vi.fn()));
        }

        return {
          renderResult: { cleanup: vi.fn(), waitUntilExit: vi.fn().mockResolvedValue(undefined) },
          cleanup: vi.fn(),
          controller: null,
          promises,
        };
      });

      const { initInkShare } = await import('../../../src/ui/share/shareRunner');
      const shareUI = await initInkShare({ evalId: 'test-eval-id' });

      // Simulate confirm
      capturedResolvers.confirmation(true);
      const confirmed = await shareUI.confirmation;
      expect(confirmed).toBe(true);
    });

    it('should resolve confirmation=false when onCancel is called', async () => {
      const { initInkApp } = await import('../../../src/ui/initInkApp');

      let capturedResolvers: Record<string, (v: any) => void> = {};
      vi.mocked(initInkApp).mockImplementationOnce(async (options: any): Promise<any> => {
        const resolvers: Record<string, (v: any) => void> = {};
        const promises: Record<string, Promise<any>> = {};
        for (const [key] of Object.entries(options.channels || {})) {
          promises[key] = new Promise((resolve) => {
            resolvers[key] = resolve;
          });
        }
        capturedResolvers = resolvers;

        const element = options.render(resolvers);
        const appProps = element?.props?.children?.props || element?.props;
        if (appProps?.onController) {
          const { createShareController } = await import('../../../src/ui/share/ShareApp');
          appProps.onController(createShareController(vi.fn()));
        }

        return {
          renderResult: { cleanup: vi.fn(), waitUntilExit: vi.fn().mockResolvedValue(undefined) },
          cleanup: vi.fn(),
          controller: null,
          promises,
        };
      });

      const { initInkShare } = await import('../../../src/ui/share/shareRunner');
      const shareUI = await initInkShare({ evalId: 'test-eval-id' });

      // Simulate cancel
      capturedResolvers.confirmation(false);
      capturedResolvers.result(undefined);

      const confirmed = await shareUI.confirmation;
      expect(confirmed).toBe(false);
    });

    it('should resolve result with shareUrl when onComplete is called', async () => {
      const { initInkApp } = await import('../../../src/ui/initInkApp');

      let capturedResolvers: Record<string, (v: any) => void> = {};
      vi.mocked(initInkApp).mockImplementationOnce(async (options: any): Promise<any> => {
        const resolvers: Record<string, (v: any) => void> = {};
        const promises: Record<string, Promise<any>> = {};
        for (const [key] of Object.entries(options.channels || {})) {
          promises[key] = new Promise((resolve) => {
            resolvers[key] = resolve;
          });
        }
        capturedResolvers = resolvers;

        const element = options.render(resolvers);
        const appProps = element?.props?.children?.props || element?.props;
        if (appProps?.onController) {
          const { createShareController } = await import('../../../src/ui/share/ShareApp');
          appProps.onController(createShareController(vi.fn()));
        }

        return {
          renderResult: { cleanup: vi.fn(), waitUntilExit: vi.fn().mockResolvedValue(undefined) },
          cleanup: vi.fn(),
          controller: null,
          promises,
        };
      });

      const { initInkShare } = await import('../../../src/ui/share/shareRunner');
      const shareUI = await initInkShare({ evalId: 'test-eval-id' });

      // Simulate complete
      capturedResolvers.result('https://app.promptfoo.dev/eval/test-123');

      const resultUrl = await shareUI.result;
      expect(resultUrl).toBe('https://app.promptfoo.dev/eval/test-123');
    });
  });

  describe('createShareController', () => {
    it('should create a controller with all required methods', async () => {
      const { createShareController } = await import('../../../src/ui/share/ShareApp');

      const controller = createShareController(vi.fn());

      expect(controller.setPhase).toBeDefined();
      expect(controller.setProgress).toBeDefined();
      expect(controller.complete).toBeDefined();
      expect(controller.error).toBeDefined();
    });
  });
});
