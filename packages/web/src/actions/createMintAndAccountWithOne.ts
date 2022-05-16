import type { Keypair, TransactionInstruction } from '@solana/web3.js';
import { Token } from '@solana/spl-token';
import type { StringPublicKey } from '@oyster/common';
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  findProgramAddress,
  programIds,
  toPublicKey,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export async function createMintAndAccountWithOne(
  wallet: any,
  receiverWallet: StringPublicKey,
  mintRent: any,
  instructions: TransactionInstruction[],
  signers: Keypair[],
): Promise<{ mint: StringPublicKey; account: StringPublicKey }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const mint = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    wallet.publicKey,
    wallet.publicKey,
    signers,
  );

  const PROGRAM_IDS = programIds();

  const [account] = await findProgramAddress(
    [
      toPublicKey(receiverWallet).toBuffer(),
      PROGRAM_IDS.token.toBuffer(),
      mint.toBuffer(),
    ],
    PROGRAM_IDS.associatedToken,
  );
  createAssociatedTokenAccountInstruction(
    instructions,
    toPublicKey(account),
    wallet.publicKey,
    toPublicKey(receiverWallet),
    mint,
  );

  instructions.push(
    Token.createMintToInstruction(
      PROGRAM_IDS.token,
      mint,
      toPublicKey(account),
      wallet.publicKey,
      [],
      1,
    ),
  );

  return { mint: mint.toBase58(), account };
}
