import { useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import { useMeta } from '@oyster/common';

import type { AuctionView } from '../../../../../../hooks';
import { useAuctions } from '../../../../../../hooks';

import type { LiveAuctionViewState } from '../..';

import { getFilterFunction, resaleAuctionsFilter } from './utils';

export const useAuctionsList = (
  activeKey: LiveAuctionViewState,
): { auctions: AuctionView[]; hasResaleAuctions: boolean } => {
  const { publicKey } = useWallet();
  const auctions = useAuctions();
  const { pullAuctionListData, isLoading } = useMeta();

  useEffect(() => {
    if (auctions.length === 0 || isLoading) return;
    for (const auction of auctions) {
      pullAuctionListData(auction.auction.pubkey);
    }
  }, [auctions.length, isLoading]);

  const filteredAuctions = useMemo(() => {
    const filterFunction = getFilterFunction(activeKey);

    return auctions.filter((auction) => filterFunction(auction, publicKey));
  }, [activeKey, auctions, publicKey]);

  const hasResaleAuctions = useMemo(() => {
    return auctions.some((auction) => resaleAuctionsFilter(auction));
  }, [auctions]);

  return { auctions: filteredAuctions, hasResaleAuctions };
};
