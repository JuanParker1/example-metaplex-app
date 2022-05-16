import type { Keypair, TransactionInstruction } from '@solana/web3.js';
import type { StringPublicKey, WalletSigner } from '@oyster/common';
import { deprecatedCreateReservationList } from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import { WinningConfigType } from '@oyster/common/dist/lib/models/metaplex/index';

import type { SafetyDepositInstructionTemplate } from './addTokensToVault';

const BATCH_SIZE = 10;
// This command batches out creating reservation lists for those tokens who are being sold in PrintingV1 mode.
// Reservation lists are used to insure printing order among limited editions.
export async function deprecatedCreateReservationListForTokens(
  wallet: WalletSigner,
  auctionManager: StringPublicKey,
  safetyDepositInstructionTemplates: SafetyDepositInstructionTemplate[],
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let batchCounter = 0;

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  let currentSigners: Keypair[] = [];
  let currentInstructions: TransactionInstruction[] = [];
  for (const safetyDeposit of safetyDepositInstructionTemplates) {
    if (
      safetyDeposit.config.winningConfigType === WinningConfigType.PrintingV1 &&
      safetyDeposit.draft.masterEdition
    )
      await deprecatedCreateReservationList(
        safetyDeposit.draft.metadata.pubkey,
        safetyDeposit.draft.masterEdition.pubkey,
        auctionManager,
        wallet.publicKey.toBase58(),
        wallet.publicKey.toBase58(),
        currentInstructions,
      );

    if (batchCounter === BATCH_SIZE) {
      signers.push(currentSigners);
      instructions.push(currentInstructions);
      batchCounter = 0;
      currentSigners = [];
      currentInstructions = [];
    }
    batchCounter++;
  }

  if (instructions[instructions.length - 1] !== currentInstructions) {
    signers.push(currentSigners);
    instructions.push(currentInstructions);
  }

  return { signers, instructions };
}
