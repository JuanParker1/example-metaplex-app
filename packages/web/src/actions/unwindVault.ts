import type {
  Keypair,
  Connection,
  TransactionInstruction,
} from '@solana/web3.js';
import type {
  Vault,
  ParsedAccount,
  SafetyDepositBox,
  WalletSigner,
} from '@oyster/common';
import {
  programIds,
  createAssociatedTokenAccountInstruction,
  withdrawTokenFromSafetyDepositBox,
  VaultState,
  sendTransactionsWithManualRetry,
  decodeExternalPriceAccount,
  findProgramAddress,
  toPublicKey,
} from '@oyster/common';

import BN from 'bn.js';

import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import { closeVault } from './closeVault';

const BATCH_SIZE = 1;

// Given a vault you own, unwind all the tokens out of it.
export async function unwindVault(
  connection: Connection,
  wallet: WalletSigner,
  vault: ParsedAccount<Vault>,
  safetyDepositBoxesByVaultAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositBox>
  >,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let batchCounter = 0;
  const PROGRAM_IDS = programIds();
  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  let currentSigners: Keypair[] = [];
  let currentInstructions: TransactionInstruction[] = [];

  if (vault.info.state === VaultState.Inactive) {
    console.log('Vault is inactive, combining');
    const epa = await connection.getAccountInfo(
      toPublicKey(vault.info.pricingLookupAddress),
    );
    if (epa) {
      const decoded = decodeExternalPriceAccount(epa.data);
      // "Closing" it here actually brings it to Combined state which means we can withdraw tokens.
      const { instructions: cvInstructions, signers: cvSigners } =
        await closeVault(
          connection,
          wallet,
          vault.pubkey,
          vault.info.fractionMint,
          vault.info.fractionTreasury,
          vault.info.redeemTreasury,
          decoded.priceMint,
          vault.info.pricingLookupAddress,
        );

      signers.push(cvSigners);
      instructions.push(cvInstructions);
    }
  }

  const vaultKey = vault.pubkey;
  const boxes: ParsedAccount<SafetyDepositBox>[] = [];

  let box = safetyDepositBoxesByVaultAndIndex[vaultKey + '-0'];
  if (box) {
    boxes.push(box);
    let index = 1;
    while (box) {
      box =
        safetyDepositBoxesByVaultAndIndex[vaultKey + '-' + index.toString()];
      if (box) boxes.push(box);
      index++;
    }
  }
  console.log('Found boxes', boxes);
  for (const nft of boxes) {
    const [ata] = await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        PROGRAM_IDS.token.toBuffer(),
        toPublicKey(nft.info.tokenMint).toBuffer(),
      ],
      PROGRAM_IDS.associatedToken,
    );
    const existingAta = await connection.getAccountInfo(toPublicKey(ata));
    console.log('Existing ata?', existingAta);
    if (!existingAta)
      createAssociatedTokenAccountInstruction(
        currentInstructions,
        toPublicKey(ata),
        wallet.publicKey,
        wallet.publicKey,
        toPublicKey(nft.info.tokenMint),
      );

    const value = await connection.getTokenAccountBalance(
      toPublicKey(nft.info.store),
    );
    await withdrawTokenFromSafetyDepositBox(
      new BN(value.value.uiAmount || 1),
      ata,
      nft.pubkey,
      nft.info.store,
      vault.pubkey,
      vault.info.fractionMint,
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

  await sendTransactionsWithManualRetry(
    connection,
    wallet,
    instructions,
    signers,
  );
}
