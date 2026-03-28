import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from '../../src/cache';
import { cacheCommand } from '../../src/commands/cache';
import logger from '../../src/logger';
import { runInkCache, shouldUseInkCache } from '../../src/ui/cache';

vi.mock('../../src/cache');
vi.mock('../../src/logger');
vi.mock('../../src/ui/cache');
vi.mock('../../src/util/index', async (importOriginal) => ({
  ...(await importOriginal()),
  setupEnv: vi.fn(),
}));

describe('cacheCommand', () => {
  let program: Command;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    cacheCommand(program);
    vi.mocked(shouldUseInkCache).mockReturnValue(false);
  });

  it('keeps `cache clear` as a direct clear even when Ink is available', async () => {
    vi.mocked(shouldUseInkCache).mockReturnValue(true);

    const cacheCmd = program.commands.find((cmd) => cmd.name() === 'cache');
    const clearCmd = cacheCmd?.commands.find((cmd) => cmd.name() === 'clear');

    await clearCmd?.parseAsync(['node', 'test']);

    expect(runInkCache).not.toHaveBeenCalled();
    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Clearing cache...');
  });
});
