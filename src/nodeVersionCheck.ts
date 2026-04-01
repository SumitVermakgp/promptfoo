type ParsedNodeVersion = readonly [major: number, minor: number, patch: number];

type ComparatorOperator = '^' | '>=' | '>' | '<=' | '<' | '=';

interface Comparator {
  operator: ComparatorOperator;
  version: ParsedNodeVersion;
}

export function parseNodeVersion(version: string): ParsedNodeVersion | null {
  const normalizedVersion = version.startsWith('v') ? version.slice(1) : version;
  const match = normalizedVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    return null;
  }

  return [
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10),
    Number.parseInt(match[3], 10),
  ] as const;
}

function compareNodeVersions(left: ParsedNodeVersion, right: ParsedNodeVersion): number {
  for (let index = 0; index < left.length; index++) {
    if (left[index] > right[index]) {
      return 1;
    }
    if (left[index] < right[index]) {
      return -1;
    }
  }

  return 0;
}

function parseComparator(token: string): Comparator | null {
  const match = token.match(/^(>=|<=|>|<|\^|=)?v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);

  if (!match) {
    return null;
  }

  return {
    operator: (match[1] ?? '=') as ComparatorOperator,
    version: [
      Number.parseInt(match[2], 10),
      Number.parseInt(match[3] ?? '0', 10),
      Number.parseInt(match[4] ?? '0', 10),
    ] as const,
  };
}

function satisfiesComparator(version: ParsedNodeVersion, comparator: Comparator): boolean {
  const comparison = compareNodeVersions(version, comparator.version);

  switch (comparator.operator) {
    case '>=':
      return comparison >= 0;
    case '>':
      return comparison > 0;
    case '<=':
      return comparison <= 0;
    case '<':
      return comparison < 0;
    case '=':
      return comparison === 0;
    case '^': {
      const upperBound = [comparator.version[0] + 1, 0, 0] as const;
      return comparison >= 0 && compareNodeVersions(version, upperBound) < 0;
    }
  }
}

export function isSupportedNodeVersion(version: string, supportedRange: string): boolean | null {
  const parsedVersion = parseNodeVersion(version);

  if (!parsedVersion) {
    return null;
  }

  const alternatives = supportedRange
    .split('||')
    .map((rangePart) => rangePart.trim())
    .filter((rangePart) => rangePart.length > 0);

  if (alternatives.length === 0) {
    return false;
  }

  for (const alternative of alternatives) {
    const parsedComparators = alternative
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .map(parseComparator);

    if (
      parsedComparators.length === 0 ||
      parsedComparators.some((comparator) => comparator === null)
    ) {
      continue;
    }

    const comparators = parsedComparators as Comparator[];

    if (comparators.every((comparator) => satisfiesComparator(parsedVersion, comparator))) {
      return true;
    }
  }

  return false;
}
