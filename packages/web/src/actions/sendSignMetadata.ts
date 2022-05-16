import type {
  Keypair,
  Connection,
  TransactionInstruction,
} from '@solana/web3.js';
import type { StringPublicKey, WalletSigner } from '@oyster/common';
import { sendTransactionWithRetry, signMetadata } from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export async function sendSignMetadata(
  connection: Connection,
  wallet: WalletSigner,
  metadata: StringPublicKey,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  await signMetadata(metadata, wallet.publicKey.toBase58(), instructions);

  await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
}
