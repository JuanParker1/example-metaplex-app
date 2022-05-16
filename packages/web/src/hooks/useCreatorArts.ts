import type { StringPublicKey } from '@oyster/common';

import { useMeta } from '../contexts';

export const useCreatorArts = (id?: StringPublicKey) => {
  const { metadata } = useMeta();
  const filtered = metadata.filter((m) =>
    m.info.data.creators?.some((c) => c.address === id),
  );

  return filtered;
};
