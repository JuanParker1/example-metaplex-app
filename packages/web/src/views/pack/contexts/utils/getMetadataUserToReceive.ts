import type { StringPublicKey } from '@oyster/common';
import { findPackCardProgramAddress, toPublicKey } from '@oyster/common';

import type { PackMetadataByPackCard } from '../hooks/useMetadataByPackCard';

interface GetMetadataUserToReceiveParameters {
  cardsToRedeem: Map<number, number>;
  metadataByPackCard: PackMetadataByPackCard;
  packPubKey: StringPublicKey;
}

// Returns metadata that user should receive as a result of pack opening
export const getMetadataUserToReceive = async ({
  cardsToRedeem,
  metadataByPackCard,
  packPubKey,
}: GetMetadataUserToReceiveParameters): Promise<StringPublicKey[]> => {
  const metadataUserToReceive: StringPublicKey[] = [];
  for (const [index, numberToRedeem] of cardsToRedeem.entries()) {
    const packCard = await findPackCardProgramAddress(
      toPublicKey(packPubKey),
      index,
    );
    const metadataByCard = metadataByPackCard[packCard];

    for (let index_ = 0; index_ < numberToRedeem; index_++) {
      metadataUserToReceive.push(metadataByCard.pubkey);
    }
  }

  return metadataUserToReceive;
};
