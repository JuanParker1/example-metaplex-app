import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { MetaState, ParsedAccount, StringPublicKey } from '@oyster/common';
import type {
  Connection,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import type BN from 'bn.js';
import type { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

import type { PackMetadataByPackCard } from '../contexts/hooks/useMetadataByPackCard';

export interface GenerateTransactionsResponse {
  instructions: TransactionInstruction[];
  signers: Keypair[];
}

export interface ClaimPackCardsParameters
  extends Pick<MetaState, 'packCards' | 'masterEditions'> {
  wallet: WalletContextState;
  connection: Connection;
  pack: ParsedAccount<PackSet>;
  voucherMint: StringPublicKey;
  cardsToRedeem: Map<number, number>;
  metadataByPackCard: PackMetadataByPackCard;
}

export interface ClaimSeveralCardsByIndexParameters
  extends Pick<MetaState, 'packCards' | 'masterEditions'> {
  wallet: WalletContextState;
  connection: Connection;
  pack: ParsedAccount<PackSet>;
  numberOfCards: number;
  voucherMint: StringPublicKey;
  index: number;
  metadataByPackCard: PackMetadataByPackCard;
}
export interface GenerateClaimPackInstructionsParameters {
  wallet: WalletContextState;
  connection: Connection;
  index: number;
  packSetKey: StringPublicKey;
  userToken: StringPublicKey;
  voucherMint: StringPublicKey;
  metadataMint: StringPublicKey;
  edition: BN;
}

export interface NewMintParameters {
  wallet: WalletContextState;
  connection: Connection;
}

export interface RequestCardsParameters {
  pack: ParsedAccount<PackSet>;
  tokenAccount?: StringPublicKey;
  wallet: WalletContextState;
  connection: Connection;
  cardsLeftToOpen: number;
  voucherKey: StringPublicKey;
  editionKey: StringPublicKey;
  editionMint: StringPublicKey;
}

export interface RequestCardsInstructionsParameters
  extends Omit<RequestCardParameters, 'index'> {
  cardsLeftToOpen: number;
}

export interface RequestCardParameters {
  index: number;
  packSetKey: StringPublicKey;
  voucherKey: StringPublicKey;
  editionKey: StringPublicKey;
  editionMint: StringPublicKey;
  tokenAccount?: StringPublicKey;
  wallet: WalletContextState;
  randomOracle: StringPublicKey;
}
