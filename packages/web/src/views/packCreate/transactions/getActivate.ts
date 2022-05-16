import { activate } from '@oyster/common';
import type { TransactionInstruction } from '@solana/web3.js';

import type { GetActivateParams as GetActivateParameters } from './interface';

export const getActivate = async ({
  packSetKey,
  walletPublicKey,
}: GetActivateParameters): Promise<TransactionInstruction> => {
  return activate({
    packSetKey,
    authority: walletPublicKey.toBase58(),
  });
};
