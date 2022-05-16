import type { ParsedAccount } from '@oyster/common';
import { useMeta } from '@oyster/common';
import type { PackVoucher } from '@oyster/common/dist/lib/models/packs/accounts/PackVoucher';
import type { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import type { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

import type { ExtendedPack } from '../../../types/packs';

export const usePacksBasedOnProvingProcesses = (): ExtendedPack[] => {
  const { provingProcesses, packs, vouchers } = useMeta();

  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';

  if (!shouldEnableNftPacks) {
    return [];
  }

  return getPacksBasedOnProvingProcesses({ provingProcesses, packs, vouchers });
};

const getPacksBasedOnProvingProcesses = ({
  provingProcesses,
  vouchers,
  packs,
}: {
  provingProcesses: Record<string, ParsedAccount<ProvingProcess>>;
  vouchers: Record<string, ParsedAccount<PackVoucher>>;
  packs: Record<string, ParsedAccount<PackSet>>;
}): ExtendedPack[] =>
  Object.values(provingProcesses).reduce<ExtendedPack[]>(
    (accumulator, process) => {
      const pack = packs[process.info.packSet];
      const voucher = Object.values(vouchers).find(
        ({ info }) => info.packSet === process.info.packSet,
      );

      if (!voucher) {
        return accumulator;
      }

      return [
        ...accumulator,
        {
          ...pack,
          voucher: voucher.pubkey,
          voucherMetadataKey: voucher.info.metadata,
          cardsRedeemed: process.info.cardsRedeemed,
          provingProcessKey: process.pubkey,
        },
      ];
    },
    [],
  );
