import type { ParsedAccount } from '@oyster/common';
import { useMeta } from '@oyster/common';
import type { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';

import type { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserArts } from '../../../hooks';
import type { PackByKey, VoucherByKey } from '../../../types/packs';
import type { Item } from '../types';

// This hook joins user metadata with packs in the same view
// If there is a pack that can be assigned to a metadata edition
// Then a pack entity will be returned
// SafetyDeposit otherwise
export const useUserMetadataWithPacks = (): Item[] => {
  const { vouchers, packs, provingProcesses } = useMeta();
  const ownedMetadata = useUserArts();

  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';

  if (!shouldEnableNftPacks) {
    return ownedMetadata;
  }

  return getMetadataWithPacks({
    ownedMetadata,
    vouchers,
    packs,
    provingProcesses,
  });
};

const getMetadataWithPacks = ({
  ownedMetadata,
  vouchers,
  packs,
  provingProcesses,
}: {
  ownedMetadata: SafetyDepositDraft[];
  vouchers: VoucherByKey;
  packs: PackByKey;
  provingProcesses: Record<string, ParsedAccount<ProvingProcess>>;
}): Item[] =>
  // Go through owned metadata
  // If it's an edition, check if this edition can be used as a voucher to open a pack
  // Return ExtendedPack entity if so
  ownedMetadata.reduce<Item[]>((accumulator, metadata) => {
    if (!metadata.edition) {
      return [...accumulator, metadata];
    }

    const masterEdition = metadata.edition?.info.parent;
    const voucher = Object.values(vouchers).find(
      ({ info }) => info.master === masterEdition,
    );

    if (!voucher) {
      return [...accumulator, metadata];
    }

    const doesHaveProvingProcess = Object.values(provingProcesses).find(
      ({ info }) => info.voucherMint === metadata.metadata.info.mint,
    );

    if (doesHaveProvingProcess) {
      return accumulator;
    }

    return [
      ...accumulator,
      {
        ...packs[voucher.info.packSet],
        voucher: voucher.pubkey,
        voucherMetadataKey: metadata.metadata.pubkey,
        mint: metadata.metadata.info.mint,
      },
    ];
  }, []);
