import type { PackDistributionType, TokenAccount } from '@oyster/common';
import type { Keypair } from '@solana/web3.js';
import type BN from 'bn.js';

import type { SafetyDepositDraft } from '../../actions/createAuctionManager';

export interface PackState extends InfoFormState {
  selectedItems: Record<string, SafetyDepositDraft>;
  selectedVouchers: Record<string, SafetyDepositDraft>;
  distributionType: PackDistributionType;
  weightByMetadataKey: Record<string, number>;
  supplyByMetadataKey: Record<string, number>;
  allowedAmountToRedeem: number;
  mutable: boolean;
  redeemStartDate?: moment.Moment | null;
  redeemEndDate?: moment.Moment | null;
  isUnlimitedSupply: boolean;
}

export interface InfoFormState {
  name: string;
  description: string;
  uri: string;
}

export interface SelectedItem {
  mint: string;
  maxSupply: BN;
  weight: BN;
  tokenAccount: TokenAccount;
  toAccount: Keypair;
  index: number;
}

export interface SelectedVoucher {
  mint: string;
  tokenAccount: TokenAccount;
  index: number;
}

export interface MapSelectedItemsParameters
  extends Pick<
    PackState,
    | 'supplyByMetadataKey'
    | 'weightByMetadataKey'
    | 'selectedItems'
    | 'distributionType'
  > {
  accountByMint: Map<string, TokenAccount>;
}

export interface MapSelectedVouchersParameters
  extends Pick<PackState, 'selectedVouchers'> {
  accountByMint: Map<string, TokenAccount>;
}
