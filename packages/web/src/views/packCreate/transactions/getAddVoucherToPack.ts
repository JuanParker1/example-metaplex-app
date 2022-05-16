import { addVoucherToPack } from '@oyster/common';
import type { TransactionInstruction } from '@solana/web3.js';

import type { GetAddVoucherToPackParameters } from './interface';

export const getAddVoucherToPack = async ({
  selectedVouchers,
  packSetKey,
  walletPublicKey,
}: GetAddVoucherToPackParameters): Promise<TransactionInstruction[]> => {
  const addVouchersToPack = selectedVouchers.map((voucher) => {
    return addVoucherToPack({
      ...voucher,
      packSetKey,
      authority: walletPublicKey.toBase58(),
    });
  });

  return Promise.all(addVouchersToPack);
};
