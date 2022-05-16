import type {
  Keypair,
  Connection,
  TransactionInstruction,
  Commitment,
} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import type { ParsedAccount, WalletSigner } from '@oyster/common';
import {
  sendTransactionWithRetry,
  placeBid,
  cache,
  ensureWrappedAccount,
  toLamports,
  toPublicKey,
  createAssociatedTokenAccountInstruction,
  programIds,
  pubkeyToString,
  WRAPPED_SOL_MINT,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import type { TokenAccount } from '@oyster/common/dist/lib/models/account';
import { approve } from '@oyster/common/dist/lib/models/account';

import type { MintInfo } from '@solana/spl-token';
import { AccountLayout } from '@solana/spl-token';

import BN from 'bn.js';

import type { AuctionView } from '../hooks';

import { QUOTE_MINT } from '../constants';

import { setupCancelBid } from './cancelBid';

export async function sendPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  // value entered by the user adjust to decimals of the mint
  amount: number | BN,
  commitment?: Commitment,
) {
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];
  const bid = await setupPlaceBid(
    connection,
    wallet,
    bidderTokenAccount,
    auctionView,
    accountsByMint,
    amount,
    instructions,
    signers,
  );

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions[0],
    signers[0],
    commitment,
  );

  if (commitment) {
    await connection.confirmTransaction(txid, commitment);
  }

  return {
    amount: bid,
  };
}

export async function setupPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  // value entered by the user adjust to decimals of the mint
  // If BN, then assume instant sale and decimals already adjusted.
  amount: number | BN,
  overallInstructions: TransactionInstruction[][],
  overallSigners: Keypair[][],
): Promise<BN> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const tokenAccount = bidderTokenAccount
    ? (cache.get(bidderTokenAccount) as TokenAccount)
    : undefined;
  const mint = cache.get(
    tokenAccount ? tokenAccount.info.mint : QUOTE_MINT,
  ) as ParsedAccount<MintInfo>;

  const lamports =
    accountRentExempt +
    (typeof amount === 'number'
      ? toLamports(amount, mint.info)
      : amount.toNumber());

  let bidderPotTokenAccount: string | undefined;
  if (auctionView.myBidderPot) {
    bidderPotTokenAccount = auctionView.myBidderPot?.info.bidderPot;
    if (!auctionView.auction.info.ended()) {
      const cancelSigners: Keypair[][] = [];
      const cancelInstr: TransactionInstruction[][] = [];
      await setupCancelBid(
        auctionView,
        accountsByMint,
        accountRentExempt,
        wallet,
        cancelSigners,
        cancelInstr,
        connection,
      );
      signers = [...signers, ...cancelSigners[0]];
      instructions = [...cancelInstr[0], ...instructions];
    }
  }

  let receivingSolAccountOrAta = '';
  receivingSolAccountOrAta =
    auctionView.auction.info.tokenMint == WRAPPED_SOL_MINT.toBase58()
      ? ensureWrappedAccount(
          instructions,
          cleanupInstructions,
          tokenAccount,
          wallet.publicKey,
          lamports + accountRentExempt * 2,
          signers,
        )
      : await findAta(auctionView, wallet, connection);
  const transferAuthority = approve(
    instructions,
    cleanupInstructions,
    toPublicKey(receivingSolAccountOrAta),
    wallet.publicKey,
    lamports - accountRentExempt,
  );

  signers.push(transferAuthority);

  const bid = new BN(lamports - accountRentExempt);
  await placeBid(
    wallet.publicKey.toBase58(),
    pubkeyToString(receivingSolAccountOrAta),
    bidderPotTokenAccount,
    auctionView.auction.info.tokenMint,
    transferAuthority.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    auctionView.auctionManager.vault,
    bid,
    instructions,
  );

  overallInstructions.push([...instructions, ...cleanupInstructions.reverse()]);
  overallSigners.push(signers);
  return bid;
}

export const findAta = async (
  auctionView: AuctionView,
  wallet: WalletSigner,
  connection: Connection,
) => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();
  let receivingSolAccountOrAta = '';
  // if alternative currency is set, go for it
  const PROGRAM_IDS = programIds();
  const auctionTokenMint = new PublicKey(auctionView.auction.info.tokenMint);
  const [ata] = await PublicKey.findProgramAddress(
    [
      wallet.publicKey.toBuffer(),
      PROGRAM_IDS.token.toBuffer(),
      auctionTokenMint.toBuffer(),
    ],
    PROGRAM_IDS.associatedToken,
  );
  receivingSolAccountOrAta = pubkeyToString(ata);
  const settleInstructions: TransactionInstruction[] = [];

  const existingAta = await connection.getAccountInfo(ata);

  // create a new ATA if there is none
  console.log('Looking for existing ata?', existingAta);
  if (!existingAta) {
    createAssociatedTokenAccountInstruction(
      settleInstructions,
      toPublicKey(receivingSolAccountOrAta),
      wallet.publicKey,
      wallet.publicKey,
      auctionTokenMint,
    );
  }

  return receivingSolAccountOrAta;
};
