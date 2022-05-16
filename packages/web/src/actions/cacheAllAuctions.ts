import type { Connection } from '@solana/web3.js';
import type {
  MetaState,
  ParsedAccount,
  SafetyDepositBox,
  WalletSigner,
} from '@oyster/common';
import {
  getAuctionCache,
  loadAccounts,
  MetaplexKey,
  programIds,
  pullPages,
  sendTransactions,
  SequenceType,
} from '@oyster/common';

import { BN } from 'bn.js';

import { buildListWhileNonZero } from '../hooks';

import { cacheAuctionIndexer } from './cacheAuctionInIndexer';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAllAuctions(
  wallet: WalletSigner,
  connection: Connection,
  temporaryCache: MetaState,
) {
  if (!programIds().store) {
    return false;
  }
  const store = programIds().store?.toBase58();

  if (temporaryCache.storeIndexer.length > 0) {
    console.log('----> Previously indexed. Pulling all.');
    // well now we need to pull first.
    temporaryCache = await loadAccounts(connection);
  }

  let auctionManagersToCache = Object.values(
    temporaryCache.auctionManagersByAuction,
  )
    .filter((a) => a.info.store == store)
    .sort((a, b) =>
      (
        temporaryCache.auctions[b.info.auction].info.endedAt ||
        new BN(Date.now() / 1000)
      )
        .sub(
          temporaryCache.auctions[a.info.auction].info.endedAt ||
            new BN(Date.now() / 1000),
        )
        .toNumber(),
    );

  const indexedInStoreIndexer = {};

  for (const s of temporaryCache.storeIndexer) {
    for (const a of s.info.auctionCaches) indexedInStoreIndexer[a] = true;
  }

  const alreadyIndexed = Object.values(temporaryCache.auctionCaches).reduce(
    (hash, value) => {
      hash[value.info.auctionManager] = indexedInStoreIndexer[value.pubkey];

      return hash;
    },
    {},
  );
  auctionManagersToCache = auctionManagersToCache.filter(
    (a) => !alreadyIndexed[a.pubkey],
  );

  console.log(
    '----> Found',
    auctionManagersToCache.length,
    'auctions to cache.',
  );

  let storeIndex = temporaryCache.storeIndexer;
  for (const auctionManager of auctionManagersToCache) {
    const boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      temporaryCache.safetyDepositBoxesByVaultAndIndex,
      auctionManager.info.vault,
    );
    if (auctionManager.info.key === MetaplexKey.AuctionManagerV2) {
      const { instructions, signers } = await cacheAuctionIndexer(
        wallet,
        auctionManager.info.vault,
        auctionManager.info.auction,
        auctionManager.pubkey,
        boxes.map((a) => a.info.tokenMint),
        storeIndex,
        !!temporaryCache.auctionCaches[
          await getAuctionCache(auctionManager.info.auction)
        ],
      );

      await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'max',
      );

      storeIndex = await pullPages(connection);
    }
  }
}
