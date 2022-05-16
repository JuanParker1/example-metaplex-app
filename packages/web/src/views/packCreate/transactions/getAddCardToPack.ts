import { addCardToPack } from '@oyster/common';
import type { TransactionInstruction } from '@solana/web3.js';

import type { GetAddCardToPackParameters } from './interface';

export const getAddCardToPack = async ({
  selectedItems,
  packSetKey,
  walletPublicKey,
}: GetAddCardToPackParameters): Promise<TransactionInstruction[]> => {
  const addCardsToPack = selectedItems.map((selectedItem) => {
    return addCardToPack({
      ...selectedItem,
      packSetKey,
      authority: walletPublicKey.toBase58(),
    });
  });

  return Promise.all(addCardsToPack);
};
