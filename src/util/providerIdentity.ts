import type { ApiProvider } from '../types/providers';

export interface ProviderIdentity {
  key: string;
  label: string;
  rawId: string;
}

const PROVIDER_UI_KEY = Symbol.for('promptfoo.providerUiKey');

type ProviderWithUiKey = ApiProvider & {
  [PROVIDER_UI_KEY]?: string;
};

function getProviderLabel(provider: { id: () => string; label?: string }): string {
  return provider.label || provider.id();
}

/**
 * Assign stable UI keys to provider instances for the lifetime of a single run.
 * This keeps duplicate labels or duplicate raw IDs from collapsing into one row.
 */
export function assignProviderUiKeys(
  providers: Array<{ id: () => string; label?: string }>,
): ProviderIdentity[] {
  return providers.map((provider, index) => {
    const rawId = provider.id();
    const label = getProviderLabel(provider);
    const key = `${rawId}#${index}`;

    (provider as ProviderWithUiKey)[PROVIDER_UI_KEY] = key;

    return { key, label, rawId };
  });
}

/**
 * Resolve the stable UI key for a provider instance.
 */
export function getProviderUiKey(provider: { id: () => string; label?: string }): string {
  return (provider as ProviderWithUiKey)[PROVIDER_UI_KEY] ?? getProviderLabel(provider);
}
