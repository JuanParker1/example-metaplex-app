import type { Metadata, ParsedAccount } from '@oyster/common';

import type { ExtendedPack } from '../../types/packs';

import type { Item } from './types';

export const isPack = (item: Item): item is ExtendedPack =>
  (item as ExtendedPack)?.info && !!(item as ExtendedPack).info.randomOracle;

export const isMetadata = (item: Item): item is ParsedAccount<Metadata> =>
  (item as ParsedAccount<Metadata>)?.info &&
  !!(item as ParsedAccount<Metadata>).info.data;
