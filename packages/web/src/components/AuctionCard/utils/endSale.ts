import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import type {
  BidderMetadata,
  BidRedemptionTicket,
  ParsedAccount,
  PrizeTrackingTicket,
  TokenAccount,
} from '@oyster/common';
import { sendTransactions } from '@oyster/common';

import type { WalletContextState } from '@solana/wallet-adapter-react';

import { claimUnusedPrizes } from '../../../actions/claimUnusedPrizes';
import { endAuction } from '../../../models/metaplex/endAuction';
import type { AuctionView } from '../../../hooks';

interface EndSaleParameters {
  auctionView: AuctionView;
  connection: Connection;
  accountByMint: Map<string, TokenAccount>;
  bids: ParsedAccount<BidderMetadata>[];
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>;
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>;
  wallet: WalletContextState;
}

export async function endSale({
  auctionView,
  connection,
  accountByMint,
  bids,
  bidRedemptions,
  prizeTrackingTickets,
  wallet,
}: EndSaleParameters) {
  const { vault, auctionManager } = auctionView;

  const endAuctionInstructions = [];
  await endAuction(
    new PublicKey(vault.pubkey),
    new PublicKey(auctionManager.authority),
    endAuctionInstructions,
  );

  const claimInstructions = [];
  const claimSigners = [];
  await claimUnusedPrizes(
    connection,
    wallet,
    auctionView,
    accountByMint,
    bids,
    bidRedemptions,
    prizeTrackingTickets,
    claimSigners,
    claimInstructions,
  );

  const instructions = [endAuctionInstructions, ...claimInstructions];
  const signers = [[], ...claimSigners];

  return sendTransactions(connection, wallet, instructions, signers);
}
