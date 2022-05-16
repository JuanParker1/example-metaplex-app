import BN from 'bn.js';
import type {
  Connection,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import type { StringPublicKey, TokenAccount } from '@oyster/common';
import {
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
} from '@oyster/common';

import type { WalletContextState } from '@solana/wallet-adapter-react';

import type { Art } from '../types';

import { setupMintEditionIntoWalletInstructions } from './setupMintEditionIntoWalletInstructions';

// TODO: Refactor. Extract batching logic,
//  as the similar one is used in settle.ts and convertMasterEditions.ts
const MINT_TRANSACTION_SIZE = 5;
const BATCH_SIZE = 10;

export async function mintEditionsToWallet(
  art: Art,
  wallet: WalletContextState,
  connection: Connection,
  mintTokenAccount: TokenAccount,
  editions = 1,
  mintDestination: StringPublicKey,
  editionNumber?: number,
) {
  const signers: Array<Array<Keypair[]>> = [];
  const instructions: Array<Array<TransactionInstruction[]>> = [];

  let currentSignerBatch: Array<Keypair[]> = [];
  let currentInstrBatch: Array<TransactionInstruction[]> = [];

  let mintEditionIntoWalletSigners: Keypair[] = [];
  let mintEditionIntoWalletInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns.
  // That's what this loop is building.
  for (let index = 0; index < editions; index++) {
    console.log('Minting', index);
    await setupMintEditionIntoWalletInstructions(
      art,
      wallet,
      connection,
      mintTokenAccount,
      editionNumber ? new BN(editionNumber) : new BN(art.supply! + 1 + index),
      mintEditionIntoWalletInstructions,
      mintEditionIntoWalletSigners,
      mintDestination,
    );

    if (mintEditionIntoWalletInstructions.length === MINT_TRANSACTION_SIZE) {
      currentSignerBatch.push(mintEditionIntoWalletSigners);
      currentInstrBatch.push(mintEditionIntoWalletInstructions);
      mintEditionIntoWalletSigners = [];
      mintEditionIntoWalletInstructions = [];
    }

    if (currentInstrBatch.length === BATCH_SIZE) {
      signers.push(currentSignerBatch);
      instructions.push(currentInstrBatch);
      currentSignerBatch = [];
      currentInstrBatch = [];
    }
  }

  if (
    mintEditionIntoWalletInstructions.length < MINT_TRANSACTION_SIZE &&
    mintEditionIntoWalletInstructions.length > 0
  ) {
    currentSignerBatch.push(mintEditionIntoWalletSigners);
    currentInstrBatch.push(mintEditionIntoWalletInstructions);
  }

  if (currentInstrBatch.length <= BATCH_SIZE && currentInstrBatch.length > 0) {
    // add the last one on
    signers.push(currentSignerBatch);
    instructions.push(currentInstrBatch);
  }
  console.log('Instructions', instructions);
  for (const [index, instructionBatch] of instructions.entries()) {
    const signerBatch = signers[index];
    console.log('Running batch', index);
    if (instructionBatch.length >= 2)
      // Pump em through!
      await sendTransactions(
        connection,
        wallet,
        instructionBatch,
        signerBatch,
        SequenceType.StopOnFailure,
        'single',
      );
    else
      await sendTransactionWithRetry(
        connection,
        wallet,
        instructionBatch[0],
        signerBatch[0],
        'single',
      );
    console.log('Done');
  }
}
