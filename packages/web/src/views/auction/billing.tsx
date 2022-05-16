import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Layout, Spin, Button, Table } from 'antd';

import type {
  BidderMetadata,
  ParsedAccount,
  BidderPot,
  Bid,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import {
  useConnection,
  cache,
  fromLamports,
  useMint,
  getBidderPotKey,
  programIds,
  useUserAccounts,
  toPublicKey,
  WRAPPED_SOL_MINT,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';

import type { PayoutTicket } from '@oyster/common/dist/lib/models/metaplex/index';
import {
  getBidderKeys,
  getPayoutTicket,
  NonWinningConstraint,
  WinningConstraint,
} from '@oyster/common/dist/lib/models/metaplex/index';
import type { Connection } from '@solana/web3.js';

import type { MintInfo } from '@solana/spl-token';

import { settle } from '../../actions/settle';
import { useMeta } from '../../contexts';
import {
  useArt,
  useAuction,
  useBidsForAuction,
  useUserBalance,
} from '../../hooks';
import type { AuctionView } from '../../hooks';
import { ArtContent } from '../../components/ArtContent';
const { Content } = Layout;

export const BillingView = () => {
  const { id } = useParams<{ id: string }>();
  const auctionView = useAuction(id);
  const connection = useConnection();
  const wallet = useWallet();
  const mint = useMint(auctionView?.auction.info.tokenMint);

  return auctionView && wallet && connection && mint ? (
    <InnerBillingView
      auctionView={auctionView}
      connection={connection}
      wallet={wallet}
      mint={mint}
    />
  ) : (
    <Spin />
  );
};

function getLosingParticipationPrice(
  element: ParsedAccount<BidderMetadata>,
  auctionView: AuctionView,
) {
  const nonWinnerConstraint =
    auctionView.auctionManager.participationConfig?.nonWinningConstraint;

  if (nonWinnerConstraint === NonWinningConstraint.GivenForFixedPrice)
    return (
      auctionView.auctionManager.participationConfig?.fixedPrice?.toNumber() ||
      0
    );
  else if (nonWinnerConstraint === NonWinningConstraint.GivenForBidPrice)
    return element.info.lastBid.toNumber() || 0;
  else return 0;
}

function useWinnerPotsByBidderKey(
  auctionView: AuctionView,
): Record<string, ParsedAccount<BidderPot>> {
  const [pots, setPots] = useState<Record<string, ParsedAccount<BidderPot>>>(
    {},
  );
  const PROGRAM_IDS = programIds();

  const winnersLength = auctionView.auctionManager.numWinners.toNumber();
  const auction = auctionView.auction;
  const winners = auction.info.bidState.bids;
  const truWinners = useMemo(() => {
    return [...winners].reverse().slice(0, winnersLength);
  }, [winners, winnersLength]);

  useEffect(() => {
    (async () => {
      const promises: Promise<{ winner: Bid; key: StringPublicKey }>[] =
        truWinners.map((winner) =>
          getBidderPotKey({
            auctionProgramId: PROGRAM_IDS.auction,
            auctionKey: auction.pubkey,
            bidderPubkey: winner.key,
          }).then((key) => ({
            key,
            winner,
          })),
        );
      const values = await Promise.all(promises);

      const newPots = values.reduce((agg, value) => {
        const element = cache.get(value.key) as ParsedAccount<BidderPot>;
        if (element) {
          agg[value.winner.key] = element;
        }

        return agg;
      }, {} as Record<string, ParsedAccount<BidderPot>>);

      setPots(newPots);
    })();
  }, [truWinners, setPots]);
  return pots;
}

function usePayoutTickets(
  auctionView: AuctionView,
): Record<string, { tickets: ParsedAccount<PayoutTicket>[]; sum: number }> {
  const { payoutTickets } = useMeta();
  const [foundPayoutTickets, setFoundPayoutTickets] = useState<
    Record<string, ParsedAccount<PayoutTicket>>
  >({});

  useEffect(() => {
    if (
      auctionView.items
        .flat()
        .map((index) => index.metadata)
        .some((index) => !index)
    ) {
      return;
    }
    const currentFound = { ...foundPayoutTickets };
    // items are in exact order of winningConfigs + order of bid winners
    // when we moved to tiered auctions items will be array of arrays, remember this...
    // this becomes triple loop
    const prizeArrays = [
      ...auctionView.items,
      ...(auctionView.participationItem
        ? [[auctionView.participationItem]]
        : []),
    ];
    const payoutPromises: { key: string; promise: Promise<StringPublicKey> }[] =
      [];
    for (const [index, items] of prizeArrays.entries()) {
      for (const [index_, item] of items.entries()) {
        const creators = item.metadata?.info?.data?.creators || [];
        const recipientAddresses = creators
          ? [
              ...creators.map((c) => c.address),
              auctionView.auctionManager.authority,
            ]
          : [auctionView.auctionManager.authority];

        for (let k = 0; k < recipientAddresses.length; k++) {
          // Ensure no clashes with tickets from other safety deposits in other winning configs even if from same creator by making long keys
          const key = `${auctionView.auctionManager.pubkey}-${index}-${index_}-${item.safetyDeposit.pubkey}-${recipientAddresses[k]}-${k}`;

          if (!currentFound[key]) {
            payoutPromises.push({
              key,
              promise: getPayoutTicket(
                auctionView.auctionManager.pubkey,
                item === auctionView.participationItem ? null : index,
                item === auctionView.participationItem ? null : index_,
                k < recipientAddresses.length - 1 ? k : null,
                item.safetyDeposit.pubkey,
                recipientAddresses[k],
              ),
            });
          }
        }
      }
    }
    Promise.all(payoutPromises.map((p) => p.promise)).then(
      (payoutKeys: StringPublicKey[]) => {
        payoutKeys.forEach((payoutKey: StringPublicKey, index: number) => {
          if (payoutTickets[payoutKey])
            currentFound[payoutPromises[index].key] = payoutTickets[payoutKey];
        });

        setFoundPayoutTickets((pt) => ({ ...pt, ...currentFound }));
      },
    );
  }, [
    Object.values(payoutTickets).length,
    auctionView.items
      .flat()
      .map((index) => index.metadata)
      .filter((index) => !!index).length,
  ]);

  return Object.values(foundPayoutTickets).reduce(
    (
      accumulator: Record<
        string,
        { tickets: ParsedAccount<PayoutTicket>[]; sum: number }
      >,
      element: ParsedAccount<PayoutTicket>,
    ) => {
      if (!accumulator[element.info.recipient]) {
        accumulator[element.info.recipient] = {
          sum: 0,
          tickets: [],
        };
      }
      accumulator[element.info.recipient].tickets.push(element);
      accumulator[element.info.recipient].sum +=
        element.info.amountPaid.toNumber();
      return accumulator;
    },
    {},
  );
}

export function useBillingInfo({ auctionView }: { auctionView: AuctionView }) {
  const { bidRedemptions, bidderMetadataByAuctionAndBidder } = useMeta();
  const auctionKey = auctionView.auction.pubkey;

  const [participationBidRedemptionKeys, setParticipationBidRedemptionKeys] =
    useState<Record<string, StringPublicKey>>({});

  const bids = useBidsForAuction(auctionView.auction.pubkey);

  const payoutTickets = usePayoutTickets(auctionView);
  const winners = [...auctionView.auction.info.bidState.bids]
    .reverse()
    .slice(0, auctionView.auctionManager.numWinners.toNumber());
  const winnerPotsByBidderKey = useWinnerPotsByBidderKey(auctionView);

  // Uncancelled bids or bids that were cancelled for refunds but only after redeemed
  // for participation
  const usableBids = bids.filter(
    (b) =>
      !b.info.cancelled ||
      bidRedemptions[
        participationBidRedemptionKeys[b.pubkey]
      ]?.info.getBidRedeemed(
        auctionView.participationItem?.safetyDeposit.info.order || 0,
      ),
  );

  const hasParticipation =
    auctionView.auctionManager.participationConfig !== undefined &&
    auctionView.auctionManager.participationConfig !== null;
  let participationEligible = hasParticipation ? usableBids : [];

  useMemo(async () => {
    const newKeys: Record<string, StringPublicKey> = {};

    for (const o of bids) {
      if (!participationBidRedemptionKeys[o.pubkey]) {
        newKeys[o.pubkey] = (
          await getBidderKeys(auctionView.auction.pubkey, o.info.bidderPubkey)
        ).bidRedemption;
      }
    }

    setParticipationBidRedemptionKeys({
      ...participationBidRedemptionKeys,
      ...newKeys,
    });
  }, [bids.length]);

  if (
    auctionView.auctionManager.participationConfig?.winnerConstraint ===
    WinningConstraint.NoParticipationPrize
  )
    // Filter winners out of the open edition eligible
    participationEligible = participationEligible.filter(
      // winners are stored by pot key, not bidder key, so we translate
      (b) => !winnerPotsByBidderKey[b.info.bidderPubkey],
    );

  const nonWinnerConstraint =
    auctionView.auctionManager.participationConfig?.nonWinningConstraint;

  const participationEligibleUnredeemable: ParsedAccount<BidderMetadata>[] = [];

  for (const o of participationEligible) {
    const isWinner = winnerPotsByBidderKey[o.info.bidderPubkey];
    // Winners automatically pay nothing for open editions, and are getting claimed anyway right now
    // so no need to add them to list
    if (isWinner) {
      continue;
    }

    if (
      nonWinnerConstraint === NonWinningConstraint.GivenForFixedPrice ||
      nonWinnerConstraint === NonWinningConstraint.GivenForBidPrice
    ) {
      const key = participationBidRedemptionKeys[o.pubkey];
      if (key) {
        const redemption = bidRedemptions[key];
        if (
          !redemption ||
          !redemption.info.getBidRedeemed(
            auctionView.participationItem?.safetyDeposit.info.order || 0,
          )
        )
          participationEligibleUnredeemable.push(o);
      } else participationEligibleUnredeemable.push(o);
    }
  }

  const participationUnredeemedTotal = participationEligibleUnredeemable.reduce(
    (accumulator, element) =>
      (accumulator += getLosingParticipationPrice(element, auctionView)),
    0,
  );

  // Winners always get it for free so pay zero for them - figure out among all
  // eligible open edition winners what is the total possible for display.
  const participationPossibleTotal = participationEligible.reduce(
    (accumulator, element) => {
      const isWinner = winnerPotsByBidderKey[element.info.bidderPubkey];
      let price = 0;
      if (!isWinner) price = getLosingParticipationPrice(element, auctionView);

      return (accumulator += price);
    },
    0,
  );

  const totalWinnerPayments = winners.reduce(
    (accumulator, w) => (accumulator += w.amount.toNumber()),
    0,
  );

  const winnersThatCanBeEmptied = Object.values(winnerPotsByBidderKey).filter(
    (p) => !p.info.emptied,
  );

  const bidsToClaim: {
    metadata: ParsedAccount<BidderMetadata>;
    pot: ParsedAccount<BidderPot>;
  }[] = [
    ...winnersThatCanBeEmptied.map((pot) => ({
      metadata:
        bidderMetadataByAuctionAndBidder[`${auctionKey}-${pot.info.bidderAct}`],
      pot,
    })),
  ];

  return {
    bidsToClaim,
    totalWinnerPayments,
    payoutTickets,
    participationEligible,
    participationPossibleTotal,
    participationUnredeemedTotal,
    hasParticipation,
  };
}

export const InnerBillingView = ({
  auctionView,
  wallet,
  connection,
  mint,
}: {
  auctionView: AuctionView;
  wallet: WalletSigner;
  connection: Connection;
  mint: MintInfo;
}) => {
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const balance = useUserBalance(auctionView.auction.info.tokenMint);
  const [escrowBalance, setEscrowBalance] = useState<number | undefined>();
  const { whitelistedCreatorsByCreator, pullBillingPage } = useMeta();
  useEffect(() => {
    pullBillingPage(id);
  }, []);
  const [escrowBalanceRefreshCounter, setEscrowBalanceRefreshCounter] =
    useState(0);

  useEffect(() => {
    connection
      .getTokenAccountBalance(
        toPublicKey(auctionView.auctionManager.acceptPayment),
      )
      .then((resp) => {
        if (resp.value.uiAmount !== undefined && resp.value.uiAmount !== null)
          setEscrowBalance(resp.value.uiAmount);
      });
  }, [escrowBalanceRefreshCounter]);

  const myPayingAccount = balance.accounts[0];

  const { accountByMint } = useUserAccounts();

  const {
    bidsToClaim,
    totalWinnerPayments,
    payoutTickets,
    participationPossibleTotal,
    participationUnredeemedTotal,
    hasParticipation,
  } = useBillingInfo({
    auctionView,
  });
  return (
    <Content>
      <Col>
        <Row
          style={{ margin: '0 30px', textAlign: 'left', fontSize: '1.4rem' }}
        >
          <Col span={12}>
            <ArtContent
              pubkey={id}
              className="artwork-image"
              allowMeshRender={true}
            />
          </Col>
          <Col span={12}>
            <div style={{ fontWeight: 700 }}>{art.title}</div>
            <br />
            <div className="info-header">TOTAL AUCTION VALUE</div>
            <div className="escrow">
              {auctionView.auctionManager.acceptPayment ==
              WRAPPED_SOL_MINT.toBase58()
                ? '◎'
                : ''}
              {fromLamports(
                totalWinnerPayments + participationPossibleTotal,
                mint,
              )}
            </div>
            <br />
            <div className="info-header">TOTAL AUCTION REDEEMED VALUE</div>
            <div className="escrow">
              {auctionView.auctionManager.acceptPayment ==
              WRAPPED_SOL_MINT.toBase58()
                ? '◎'
                : ''}
              {fromLamports(
                totalWinnerPayments +
                  participationPossibleTotal -
                  participationUnredeemedTotal,
                mint,
              )}
            </div>
            <br />
            <div className="info-header">
              TOTAL COLLECTED BY ARTISTS AND AUCTIONEER
            </div>
            <div className="escrow">
              {auctionView.auctionManager.acceptPayment ==
              WRAPPED_SOL_MINT.toBase58()
                ? '◎'
                : ''}
              {fromLamports(
                Object.values(payoutTickets).reduce(
                  (accumulator, element) => (accumulator += element.sum),
                  0,
                ),
                mint,
              )}
            </div>
            <br />
            <div className="info-header">TOTAL UNSETTLED</div>
            <div className="escrow">
              {auctionView.auctionManager.acceptPayment ==
              WRAPPED_SOL_MINT.toBase58()
                ? '◎'
                : ''}
              {fromLamports(
                bidsToClaim.reduce(
                  (accumulator, element) =>
                    (accumulator += element.metadata.info.lastBid.toNumber()),
                  0,
                ),
                mint,
              )}
            </div>
            <br />
            <div className="info-header">TOTAL IN ESCROW</div>
            <div className="escrow">
              {escrowBalance !== undefined ? (
                `${
                  auctionView.auction.info.tokenMint ==
                  WRAPPED_SOL_MINT.toBase58()
                    ? '◎'
                    : ''
                } ${escrowBalance}`
              ) : (
                <Spin />
              )}
            </div>
            <br />
            {hasParticipation && (
              <>
                <div className="info-header">
                  TOTAL UNREDEEMED PARTICIPATION FEES OUTSTANDING
                </div>
                <div className="outstanding-open-editions">
                  {auctionView.auctionManager.acceptPayment ==
                  WRAPPED_SOL_MINT.toBase58()
                    ? '◎'
                    : ''}
                  {fromLamports(participationUnredeemedTotal, mint)}
                </div>
                <br />
              </>
            )}
            <br />
            <Button
              type="primary"
              size="large"
              className="action-btn"
              onClick={async () => {
                await settle(
                  connection,
                  wallet,
                  auctionView,
                  bidsToClaim.map((b) => b.pot),
                  myPayingAccount.pubkey,
                  accountByMint,
                );
                setEscrowBalanceRefreshCounter((ctr) => ctr + 1);
              }}
            >
              SETTLE OUTSTANDING
            </Button>
          </Col>
        </Row>
        <Row>
          <Table
            style={{ width: '100%' }}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Address',
                dataIndex: 'address',
                key: 'address',
              },
              {
                title: 'Amount Paid',
                dataIndex: 'amountPaid',
                render: (value: number) => (
                  <span>◎{fromLamports(value, mint)}</span>
                ),
                key: 'amountPaid',
              },
            ]}
            dataSource={Object.keys(payoutTickets).map((t) => ({
              key: t,
              name: whitelistedCreatorsByCreator[t]?.info?.name || 'N/A',
              address: t,
              amountPaid: payoutTickets[t].sum,
            }))}
          />
        </Row>
      </Col>
    </Content>
  );
};
