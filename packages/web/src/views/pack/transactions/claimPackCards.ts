import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  claimPack,
  findPackCardProgramAddress,
  sendTransactionsInChunks,
  SequenceType,
  toPublicKey,
} from '@oyster/common';
import { BN } from 'bn.js';

import type {
  ClaimPackCardsParameters,
  ClaimSeveralCardsByIndexParameters,
  GenerateClaimPackInstructionsParameters,
  GenerateTransactionsResponse,
} from './interface';
import { getNewMint } from './getNewMint';

export const claimPackCards = async ({
  connection,
  wallet,
  ...parameters
}: ClaimPackCardsParameters) => {
  const instructions = await getClaimPackCardsInstructions({
    connection,
    wallet,
    ...parameters,
  });

  const flatInstructions = instructions.flat();

  await sendTransactionsInChunks(
    connection,
    wallet,
    flatInstructions.map(({ instructions }) => instructions),
    flatInstructions.map(({ signers }) => signers),
    SequenceType.Sequential,
    'singleGossip',
    120_000,
    20,
  );
};

const getClaimPackCardsInstructions = async ({
  cardsToRedeem,
  ...parameters
}: ClaimPackCardsParameters): Promise<GenerateTransactionsResponse[][]> =>
  Promise.all(
    [...cardsToRedeem.entries()].map(([index, numberOfCards]) =>
      claimSeveralCardsByIndex({
        numberOfCards,
        index,
        ...parameters,
      }),
    ),
  );

const claimSeveralCardsByIndex = async ({
  wallet,
  connection,
  pack,
  numberOfCards,
  voucherMint,
  index,
  metadataByPackCard,
  packCards,
  masterEditions,
}: ClaimSeveralCardsByIndexParameters): Promise<
  GenerateTransactionsResponse[]
> => {
  const packSetKey = pack.pubkey;

  const packCardToRedeem = await findPackCardProgramAddress(
    toPublicKey(packSetKey),
    index,
  );

  const packCardMetadata = metadataByPackCard[packCardToRedeem];
  const userToken = packCards[packCardToRedeem]?.info?.tokenAccount;

  if (!packCardMetadata?.info?.masterEdition) {
    throw new Error('Missing master edition');
  }
  if (!userToken) {
    throw new Error('Missing user token');
  }

  const packCardEdition = masterEditions[packCardMetadata.info.masterEdition];

  return Promise.all(
    Array.from({ length: numberOfCards }).map((_, index_) => {
      const packCardEditionIndex =
        packCardEdition.info.supply.toNumber() + index_ + 1;

      return generateClaimPackInstructions({
        wallet,
        connection,
        index,
        packSetKey,
        userToken,
        voucherMint,
        metadataMint: packCardMetadata.info.mint,
        edition: new BN(packCardEditionIndex),
      });
    }),
  );
};

const generateClaimPackInstructions = async ({
  wallet,
  connection,
  index,
  packSetKey,
  userToken,
  voucherMint,
  metadataMint,
  edition,
}: GenerateClaimPackInstructionsParameters): Promise<GenerateTransactionsResponse> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const walletPublicKey = wallet.publicKey;

  const {
    mint: newMint,
    instructions: newMintInstructions,
    signers: newMintSigners,
  } = await getNewMint(wallet, connection);

  const claimPackInstruction = await claimPack({
    index,
    packSetKey,
    wallet: walletPublicKey,
    userToken,
    voucherMint,
    newMint,
    metadataMint,
    edition,
  });

  return {
    instructions: [...newMintInstructions, claimPackInstruction],
    signers: newMintSigners,
  };
};
