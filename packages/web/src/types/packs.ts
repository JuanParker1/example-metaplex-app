import type { PackVoucher } from '@oyster/common/dist/lib/models/packs/accounts/PackVoucher';
import type { ParsedAccount, StringPublicKey } from '@oyster/common';
import type { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import type { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';

export type VoucherByKey = Record<string, ParsedAccount<PackVoucher>>;
export type ExtendedVoucher = ParsedAccount<PackVoucher> & {
  mint: StringPublicKey;
  edition: StringPublicKey;
};

export type ExtendedVoucherByKey = Record<string, ExtendedVoucher>;
export type PackByKey = Record<string, ParsedAccount<PackSet>>;
export type ExtendedPack = ParsedAccount<PackSet> & {
  voucher: StringPublicKey;
  voucherMetadataKey: StringPublicKey;
  cardsRedeemed?: number;
  mint?: StringPublicKey;
  provingProcessKey?: StringPublicKey;
};
export type ProvingProcessByKey = Record<string, ParsedAccount<ProvingProcess>>;
