import type {
  ParsedAccount,
  StringPublicKey,
  TokenAccount,
} from '@oyster/common';
import type { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import type { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';

import type { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import type { VoucherByKey } from '../../../types/packs';

import type { PackMetadataByPackCard } from './hooks/useMetadataByPackCard';

export type PackContextProps = {
  isLoading: boolean;
  packKey: StringPublicKey;
  voucherMint: StringPublicKey;
  openedMetadata: SafetyDepositDraft[];
  metadataByPackCard: PackMetadataByPackCard;
  handleOpenPack: () => Promise<void>;
  redeemModalMetadata: StringPublicKey[];
  pack?: ParsedAccount<PackSet>;
  voucherMetadataKey?: StringPublicKey;
  provingProcess?: ParsedAccount<ProvingProcess>;
};

export interface GetProvingProcessParameters {
  pack: ParsedAccount<PackSet>;
  voucherMint?: StringPublicKey;
  provingProcess?: ParsedAccount<ProvingProcess>;
  vouchers: VoucherByKey;
  accountByMint: Map<string, TokenAccount>;
  connection: Connection;
  wallet: WalletContextState;
}

export interface RequestCardsUsingVoucherParameters {
  pack: ParsedAccount<PackSet>;
  cardsLeftToOpen: number;
  voucherTokenAccount?: TokenAccount;
  voucherKey: StringPublicKey;
  editionKey: StringPublicKey;
  editionMint: StringPublicKey;
  connection: Connection;
  wallet: WalletContextState;
}
