import type { Connection } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import type BN from 'bn.js';
import type { StringPublicKey, TokenAccount } from '@oyster/common';
import { mintNewEditionFromMasterEditionViaToken } from '@oyster/common';

import type { WalletContextState } from '@solana/wallet-adapter-react';

import type { Art } from '../types';

import { createMintAndAccountWithOne } from './createMintAndAccountWithOne';

export async function setupMintEditionIntoWalletInstructions(
  art: Art,
  wallet: WalletContextState,
  connection: Connection,
  mintTokenAccount: TokenAccount,
  edition: BN,
  instructions: any,
  signers: any,
  mintDestination: StringPublicKey,
) {
  if (!art.mint) throw new Error('Art mint is not provided');
  if (typeof art.supply === 'undefined') {
    throw new TypeError('Art supply is not provided');
  }
  if (!wallet.publicKey) throw new Error('Wallet pubKey is not provided');
  if (!mintTokenAccount) {
    throw new Error('Art mint token account is not provided');
  }
  const walletPubKey = wallet.publicKey.toString();
  const { mint: tokenMint } = art;
  const { pubkey: mintTokenAccountPubKey } = mintTokenAccount;
  const mintTokenAccountOwner = mintTokenAccount.info.owner.toString();

  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  const { mint: newMint } = await createMintAndAccountWithOne(
    wallet,
    mintDestination,
    mintRentExempt,
    instructions,
    signers,
  );

  await mintNewEditionFromMasterEditionViaToken(
    newMint,
    tokenMint,
    walletPubKey,
    walletPubKey,
    mintTokenAccountOwner,
    mintTokenAccountPubKey,
    instructions,
    walletPubKey,
    edition,
  );
}
