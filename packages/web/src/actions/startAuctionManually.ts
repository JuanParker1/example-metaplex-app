import type {
  Connection,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import { startAuction } from '@oyster/common/dist/lib/models/metaplex/index';
import type { WalletSigner } from '@oyster/common';
import { notify, sendTransactionWithRetry } from '@oyster/common';

import type { AuctionView } from '../hooks';

export async function startAuctionManually(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
) {
  try {
    const signers: Keypair[] = [];
    const instructions: TransactionInstruction[] = [];

    await startAuction(
      auctionView.vault.pubkey,
      auctionView.auctionManager.authority,
      instructions,
    );

    await sendTransactionWithRetry(connection, wallet, instructions, signers);

    notify({
      message: 'Auction started',
      type: 'success',
    });
  } catch (error) {
    notify({
      message: 'Transaction failed...',
      description: 'Failed to start the auction',
      type: 'error',
    });
    return Promise.reject(error);
  }
}
