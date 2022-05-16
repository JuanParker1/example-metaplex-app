import type { TransactionInstruction } from '@solana/web3.js';
import { SystemProgram } from '@solana/web3.js';

import type { GetCreateAccountParameters } from './interface';

export const getCreateAccount = async ({
  connection,
  newAccountPubkey,
  walletPublicKey,
  space,
  programId,
}: GetCreateAccountParameters): Promise<TransactionInstruction> => {
  const packSetRentExempt = await connection.getMinimumBalanceForRentExemption(
    space,
  );

  return SystemProgram.createAccount({
    fromPubkey: walletPublicKey,
    newAccountPubkey,
    lamports: packSetRentExempt,
    space,
    programId,
  });
};
