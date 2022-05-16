import type { StringPublicKey } from '@oyster/common';
import { useMeta } from '@oyster/common';

import type { SafetyDepositDraft } from '../../../../actions/createAuctionManager';
import { useUserArts } from '../../../../hooks';

// Here we check if user has NFTs that could be received from pack opening
// Opened cards may shuffle between user's packs that have the same PackSet key,
// Since we don't store a ProvingProcess from what an NFT was received
export const useOpenedMetadata = (
  packKey: StringPublicKey,
  maxLength: number,
): SafetyDepositDraft[] => {
  const { packCardsByPackSet } = useMeta();
  const ownedMetadata = useUserArts();

  const packCards = packCardsByPackSet[packKey];

  const metadata = ownedMetadata.reduce<SafetyDepositDraft[]>(
    (accumulator, value) => {
      const parent = value.edition?.info.parent;
      if (parent && accumulator.length < maxLength) {
        const metadataExistsInPack = packCards?.some(
          ({ info }) => info.master === parent,
        );

        if (metadataExistsInPack) {
          accumulator.push(value);
        }
      }

      return accumulator;
    },
    [],
  );

  return metadata;
};
