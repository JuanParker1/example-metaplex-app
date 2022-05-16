import type { Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import type {
  ParsedAccount,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import { getSafetyDepositBoxAddress } from '@oyster/common/dist/lib/actions/vault';
import type { StoreIndexer } from '@oyster/common/dist/lib/models/metaplex/index';
import {
  getStoreIndexer,
  getAuctionCache,
  MAX_INDEXED_ELEMENTS,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { setStoreIndex } from '@oyster/common/dist/lib/models/metaplex/setStoreIndex';
import { setAuctionCache } from '@oyster/common/dist/lib/models/metaplex/setAuctionCache';
import BN from 'bn.js';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAuctionIndexer(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey,
  tokenMints: StringPublicKey[],
  storeIndexer: ParsedAccount<StoreIndexer>[],
  skipCache?: boolean,
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();
  const payer = wallet.publicKey.toBase58();

  const instructions: TransactionInstruction[] = [];

  const {
    auctionCache,
    instructions: createAuctionCacheInstructions,
    signers: createAuctionCacheSigners,
  } = await createAuctionCache(
    wallet,
    vault,
    auction,
    auctionManager,
    tokenMints,
  );

  const above =
    storeIndexer.length === 0
      ? undefined
      : storeIndexer[0].info.auctionCaches[0];

  const storeIndexKey = await getStoreIndexer(0);
  await setStoreIndex(
    storeIndexKey,
    auctionCache,
    payer,
    new BN(0),
    new BN(0),
    instructions,
    undefined,
    above,
  );

  const { instructions: propagationInstructions, signers: propagationSigners } =
    await propagateIndex(wallet, storeIndexer);

  return {
    instructions: [
      ...(skipCache ? [] : createAuctionCacheInstructions),
      instructions,
      ...propagationInstructions,
    ],
    signers: [
      ...(skipCache ? [] : createAuctionCacheSigners),
      [],
      ...propagationSigners,
    ],
  };
}

const INDEX_TRANSACTION_SIZE = 10;
async function propagateIndex(
  wallet: WalletSigner,
  storeIndexer: ParsedAccount<StoreIndexer>[],
): Promise<{ instructions: TransactionInstruction[][]; signers: Keypair[][] }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  const currentSignerBatch: Array<Keypair[]> = [];
  const currentInstrBatch: Array<TransactionInstruction[]> = [];

  let indexSigners: Keypair[] = [];
  let indexInstructions: TransactionInstruction[] = [];

  let currentPage: ParsedAccount<StoreIndexer> | null = storeIndexer[0];
  let lastPage: ParsedAccount<StoreIndexer> | null = null;
  while (
    currentPage &&
    currentPage.info.auctionCaches.length == MAX_INDEXED_ELEMENTS
  ) {
    const cacheLeavingThePage =
      currentPage.info.auctionCaches[currentPage.info.auctionCaches.length - 1];
    const nextPage = storeIndexer[currentPage.info.page.toNumber() + 1];
    if (nextPage) {
      lastPage = currentPage;
      currentPage = nextPage;
    } else {
      lastPage = currentPage;
      currentPage = null;
    }

    const storeIndexKey = currentPage
      ? currentPage.pubkey
      : await getStoreIndexer(lastPage.info.page.toNumber() + 1);
    const above = currentPage ? currentPage.info.auctionCaches[0] : undefined;

    await setStoreIndex(
      storeIndexKey,
      cacheLeavingThePage,
      payer,
      lastPage.info.page.add(new BN(1)),
      new BN(0),
      indexInstructions,
      undefined,
      above,
    );

    if (indexInstructions.length >= INDEX_TRANSACTION_SIZE) {
      currentSignerBatch.push(indexSigners);
      currentInstrBatch.push(indexInstructions);
      indexSigners = [];
      indexInstructions = [];
    }
  }

  if (
    indexInstructions.length < INDEX_TRANSACTION_SIZE &&
    indexInstructions.length > 0
  ) {
    currentSignerBatch.push(indexSigners);
    currentInstrBatch.push(indexInstructions);
  }

  return {
    instructions: currentInstrBatch,
    signers: currentSignerBatch,
  };
}

const TRANSACTION_SIZE = 10;

async function createAuctionCache(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey,
  tokenMints: StringPublicKey[],
): Promise<{
  auctionCache: StringPublicKey;
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  const currentSignerBatch: Array<Keypair[]> = [];
  const currentInstrBatch: Array<TransactionInstruction[]> = [];

  let cacheSigners: Keypair[] = [];
  let cacheInstructions: TransactionInstruction[] = [];
  const auctionCache = await getAuctionCache(auction);

  for (const tokenMint of tokenMints) {
    const safetyDeposit = await getSafetyDepositBoxAddress(vault, tokenMint);

    await setAuctionCache(
      auctionCache,
      payer,
      auction,
      safetyDeposit,
      auctionManager,
      new BN(0),
      cacheInstructions,
    );

    if (cacheInstructions.length >= TRANSACTION_SIZE) {
      currentSignerBatch.push(cacheSigners);
      currentInstrBatch.push(cacheInstructions);
      cacheSigners = [];
      cacheInstructions = [];
    }
  }

  if (
    cacheInstructions.length < TRANSACTION_SIZE &&
    cacheInstructions.length > 0
  ) {
    currentSignerBatch.push(cacheSigners);
    currentInstrBatch.push(cacheInstructions);
  }

  return {
    auctionCache,
    instructions: currentInstrBatch,
    signers: currentSignerBatch,
  };
}
