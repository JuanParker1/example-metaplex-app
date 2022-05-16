import {
  MAX_PACK_SET_SIZE,
  sendTransactionsInChunks,
  SequenceType,
  programIds,
} from '@oyster/common';
import type { TransactionInstruction } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import { mapSelectedItems, mapSelectedVouchers } from '../utils';

import type { CreatePackParameters } from './interface';
import { getInitPackSet } from './getInitPackSet';
import { getCreateAccount } from './getCreateAccount';
import { getAddCardToPack } from './getAddCardToPack';
import { getAddVoucherToPack } from './getAddVoucherToPack';
import { getActivate } from './getActivate';
import { getCreateTokenAccounts } from './getCreateTokenAccounts';

const CREATE_ACCOUNT_CHUNK_SIZE = 5;
const ADD_CARD_TO_PACK_CHUNK_SIZE = 3;

const chunk = <T>(array: Array<T>, chunkSize: number): T[][] => {
  const R: T[][] = [];

  for (
    let index = 0, length_ = array.length;
    index < length_;
    index += chunkSize
  ) {
    R.push(array.slice(index, index + chunkSize));
  }

  return R;
};

const generateCreatePackInstructions = async ({
  wallet,
  connection,
  accountByMint,
  data,
}: CreatePackParameters): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const packSet = Keypair.generate();

  if (!packSet.publicKey) new Error('No packSet key');

  const walletPublicKey = wallet.publicKey;
  const packSetKey = packSet.publicKey;

  const createAccountInstruction = await getCreateAccount({
    connection,
    walletPublicKey,
    newAccountPubkey: packSetKey,
    space: MAX_PACK_SET_SIZE,
    programId: programIds().pack_create,
  });

  const initPackSetInstruction = await getInitPackSet({
    data,
    walletPublicKey,
    packSetKey,
  });

  const {
    selectedVouchers,
    selectedItems,
    supplyByMetadataKey,
    weightByMetadataKey,
    distributionType,
  } = data;

  const cardsToAdd = mapSelectedItems({
    selectedItems,
    supplyByMetadataKey,
    weightByMetadataKey,
    accountByMint,
    distributionType,
  });

  // Create accounts for token transfer
  const createTokenAccountsInstructions = await getCreateTokenAccounts({
    cardsToAdd,
    connection,
    walletPublicKey,
  });
  const addCardToPackInstructions = await getAddCardToPack({
    selectedItems: cardsToAdd,
    walletPublicKey,
    packSetKey,
  });

  const vouchersToAdd = mapSelectedVouchers({
    selectedVouchers,
    accountByMint,
  });
  const addVoucherToPackInstructions = await getAddVoucherToPack({
    selectedVouchers: vouchersToAdd,
    walletPublicKey,
    packSetKey,
  });

  const activateInstruction = await getActivate({
    walletPublicKey,
    packSetKey,
  });

  const addCardsChunks = chunk(
    addCardToPackInstructions,
    ADD_CARD_TO_PACK_CHUNK_SIZE,
  );
  const addCardsSignersChunks = addCardsChunks.map(() => []);

  const createTokenAccountsChunks = chunk(
    createTokenAccountsInstructions,
    CREATE_ACCOUNT_CHUNK_SIZE,
  );
  const createTokenSignersChunks = chunk(
    cardsToAdd.map(({ toAccount }) => toAccount),
    CREATE_ACCOUNT_CHUNK_SIZE,
  );

  return {
    instructions: [
      [createAccountInstruction, initPackSetInstruction],
      ...createTokenAccountsChunks,
      ...addCardsChunks,
      addVoucherToPackInstructions,
      [activateInstruction],
    ],
    signers: [
      [packSet],
      ...createTokenSignersChunks,
      ...addCardsSignersChunks,
      [],
      [],
    ],
  };
};

export const sendCreatePack = async ({
  wallet,
  connection,
  accountByMint,
  data,
}: CreatePackParameters) => {
  const { instructions, signers } = await generateCreatePackInstructions({
    wallet,
    connection,
    accountByMint,
    data,
  });

  return sendTransactionsInChunks(
    connection,
    wallet,
    instructions,
    signers,
    SequenceType.Sequential,
    'singleGossip',
    120_000,
    10,
  );
};
