import type { WalletContextState } from '@solana/wallet-adapter-react';
import type { Connection, PublicKey } from '@solana/web3.js';
import type { TokenAccount } from '@oyster/common';

import type { PackState, SelectedItem, SelectedVoucher } from '../interface';

export interface CreatePackParameters {
  wallet: WalletContextState;
  connection: Connection;
  accountByMint: Map<string, TokenAccount>;
  data: PackState;
}

export interface GetCreateAccountParameters {
  walletPublicKey: PublicKey;
  newAccountPubkey: PublicKey;
  connection: Connection;
  space: number;
  programId: PublicKey;
}

export interface GetCreateTokenAccounts {
  walletPublicKey: PublicKey;
  connection: Connection;
  cardsToAdd: SelectedItem[];
}

interface BaseParameters {
  walletPublicKey: PublicKey;
  packSetKey: PublicKey;
}

export interface GetInitPackSetParameters extends BaseParameters {
  data: PackState;
}

export interface GetAddCardToPackParameters extends BaseParameters {
  selectedItems: SelectedItem[];
}

export interface GetAddVoucherToPackParameters extends BaseParameters {
  selectedVouchers: SelectedVoucher[];
}

export type GetActivateParams = BaseParameters;
