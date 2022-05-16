import type {
  Keypair,
  Connection,
  TransactionInstruction,
} from '@solana/web3.js';
import type {
  ParsedAccount,
  BidderPot,
  TokenAccount,
  WalletSigner,
} from '@oyster/common';
import {
  SequenceType,
  sendTransactions,
  sendTransactionWithRetry,
  createAssociatedTokenAccountInstruction,
  programIds,
  findProgramAddress,
  AuctionState,
  toPublicKey,
} from '@oyster/common';

import { claimBid } from '@oyster/common/dist/lib/models/metaplex/claimBid';
import { emptyPaymentAccount } from '@oyster/common/dist/lib/models/metaplex/emptyPaymentAccount';

import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import type { AuctionView } from '../hooks';

import { setupPlaceBid } from './sendPlaceBid';

const BATCH_SIZE = 10;
const SETTLE_TRANSACTION_SIZE = 6;
const CLAIM_TRANSACTION_SIZE = 6;
export async function settle(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
  bidsToClaim: ParsedAccount<BidderPot>[],
  payingAccount: string | undefined,
  accountsByMint: Map<string, TokenAccount>,
) {
  if (
    auctionView.auction.info.ended() &&
    auctionView.auction.info.state !== AuctionState.Ended
  ) {
    const signers: Keypair[][] = [];
    const instructions: TransactionInstruction[][] = [];

    await setupPlaceBid(
      connection,
      wallet,
      payingAccount,
      auctionView,
      accountsByMint,
      0,
      instructions,
      signers,
    );

    await sendTransactionWithRetry(
      connection,
      wallet,
      instructions[0],
      signers[0],
    );
  }

  await claimAllBids(connection, wallet, auctionView, bidsToClaim);
  await emptyPaymentAccountForAllTokens(connection, wallet, auctionView);
}

async function emptyPaymentAccountForAllTokens(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const PROGRAM_IDS = programIds();
  const signers: Array<Array<Keypair[]>> = [];
  const instructions: Array<Array<TransactionInstruction[]>> = [];

  let currentSignerBatch: Array<Keypair[]> = [];
  let currentInstrBatch: Array<TransactionInstruction[]> = [];

  let settleSigners: Keypair[] = [];
  let settleInstructions: TransactionInstruction[] = [];
  const ataLookup: Record<string, boolean> = {};
  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 4 settlements per txn
  // That's what this loop is building.
  const prizeArrays = [
    ...auctionView.items,
    ...(auctionView.participationItem ? [[auctionView.participationItem]] : []),
  ];
  for (const [index, items] of prizeArrays.entries()) {
    for (const [index_, item] of items.entries()) {
      const creators = item.metadata.info.data.creators;
      const edgeCaseWhereCreatorIsAuctioneer = !!creators
        ?.map((c) => c.address)
        .find((c) => c === auctionView.auctionManager.authority);

      const addresses = [
        ...(creators ? creators.map((c) => c.address) : []),
        auctionView.auctionManager.authority,
      ];

      for (let k = 0; k < addresses.length; k++) {
        const [ata] = await findProgramAddress(
          [
            toPublicKey(addresses[k]).toBuffer(),
            PROGRAM_IDS.token.toBuffer(),
            toPublicKey(auctionView.auction.info.tokenMint).toBuffer(),
          ],
          PROGRAM_IDS.associatedToken,
        );
        const existingAta = await connection.getAccountInfo(toPublicKey(ata));
        console.log('Existing ata?', existingAta);
        if (!existingAta && !ataLookup[ata])
          createAssociatedTokenAccountInstruction(
            settleInstructions,
            toPublicKey(ata),
            wallet.publicKey,
            toPublicKey(addresses[k]),
            toPublicKey(auctionView.auction.info.tokenMint),
          );

        ataLookup[ata] = true;

        const creatorIndex = creators
          ? creators.map((c) => c.address).indexOf(addresses[k])
          : null;

        await emptyPaymentAccount(
          auctionView.auctionManager.acceptPayment,
          ata,
          auctionView.auctionManager.pubkey,
          item.metadata.pubkey,
          item.masterEdition?.pubkey,
          item.safetyDeposit.pubkey,
          item.safetyDeposit.info.vault,
          auctionView.auction.pubkey,
          wallet.publicKey.toBase58(),
          addresses[k],
          item === auctionView.participationItem ? null : index,
          item === auctionView.participationItem ? null : index_,
          creatorIndex === -1 ||
            creatorIndex === null ||
            (edgeCaseWhereCreatorIsAuctioneer && k === addresses.length - 1)
            ? null
            : creatorIndex,
          settleInstructions,
        );

        if (settleInstructions.length >= SETTLE_TRANSACTION_SIZE) {
          currentSignerBatch.push(settleSigners);
          currentInstrBatch.push(settleInstructions);
          settleSigners = [];
          settleInstructions = [];
        }

        if (currentInstrBatch.length === BATCH_SIZE) {
          signers.push(currentSignerBatch);
          instructions.push(currentInstrBatch);
          currentSignerBatch = [];
          currentInstrBatch = [];
        }
      }
    }
  }

  if (
    settleInstructions.length < SETTLE_TRANSACTION_SIZE &&
    settleInstructions.length > 0
  ) {
    currentSignerBatch.push(settleSigners);
    currentInstrBatch.push(settleInstructions);
  }

  if (currentInstrBatch.length <= BATCH_SIZE && currentInstrBatch.length > 0) {
    // add the last one on
    signers.push(currentSignerBatch);
    instructions.push(currentInstrBatch);
  }

  for (const [index, instructionBatch] of instructions.entries()) {
    const signerBatch = signers[index];
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
  }
}

async function claimAllBids(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
  bids: ParsedAccount<BidderPot>[],
) {
  const signers: Array<Array<Keypair[]>> = [];
  const instructions: Array<Array<TransactionInstruction[]>> = [];

  let currentSignerBatch: Array<Keypair[]> = [];
  let currentInstrBatch: Array<TransactionInstruction[]> = [];

  let claimBidSigners: Keypair[] = [];
  let claimBidInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 7 claims in each txn
  // That's what this loop is building.
  for (const bid of bids) {
    console.log('Claiming', bid.info.bidderAct);
    await claimBid(
      auctionView.auctionManager.acceptPayment,
      bid.info.bidderAct,
      bid.info.bidderPot,
      auctionView.vault.pubkey,
      auctionView.auction.info.tokenMint,
      claimBidInstructions,
    );

    if (claimBidInstructions.length === CLAIM_TRANSACTION_SIZE) {
      currentSignerBatch.push(claimBidSigners);
      currentInstrBatch.push(claimBidInstructions);
      claimBidSigners = [];
      claimBidInstructions = [];
    }

    if (currentInstrBatch.length === BATCH_SIZE) {
      signers.push(currentSignerBatch);
      instructions.push(currentInstrBatch);
      currentSignerBatch = [];
      currentInstrBatch = [];
    }
  }

  if (
    claimBidInstructions.length < CLAIM_TRANSACTION_SIZE &&
    claimBidInstructions.length > 0
  ) {
    currentSignerBatch.push(claimBidSigners);
    currentInstrBatch.push(claimBidInstructions);
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
