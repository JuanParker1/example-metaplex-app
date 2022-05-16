import React from 'react';
import type { CardProps } from 'antd';
import { Card } from 'antd';

import { ArtContent } from '../ArtContent';
import type { AuctionView } from '../../hooks';
import { useArt, useCreators } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { MetaAvatar } from '../MetaAvatar';
import { AuctionCountdown } from '../AuctionNumbers';

import { useTokenList } from '../../contexts/tokenList';

import { useAuctionStatus } from './hooks/useAuctionStatus';

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (properties: AuctionCard) => {
  const { auctionView } = properties;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';

  const tokenInfo = useTokenList().subscribedTokens.find(
    (m) => m.address == auctionView.auction.info.tokenMint,
  );
  const { status, amount } = useAuctionStatus(auctionView);

  const card = (
    <Card hoverable={true} className={`auction-render-card`} bordered={false}>
      <div className={'card-art-info'}>
        <div className="auction-gray-wrapper">
          <div className={'card-artist-info'}>
            <MetaAvatar
              creators={creators.length > 0 ? [creators[0]] : undefined}
            />
            <span className={'artist-name'}>
              {creators[0]?.name ||
                creators[0]?.address?.slice(0, 6) ||
                'Go to auction'}
              ...
            </span>
          </div>
          <div className={'art-content-wrapper'}>
            <ArtContent
              className="auction-image no-events"
              preview={false}
              pubkey={id}
              allowMeshRender={false}
            />
          </div>
          <div className={'art-name'}>{name}</div>
          {!auctionView.isInstantSale && (
            <div className="auction-info-container">
              <div className={'info-message'}>ENDING IN</div>
              <AuctionCountdown auctionView={auctionView} labels={false} />
            </div>
          )}
        </div>
      </div>
      <div className="card-bid-info">
        <span className={'text-uppercase info-message'}>{status}</span>
        <AmountLabel
          containerStyle={{ flexDirection: 'row' }}
          title={status}
          amount={amount}
          iconSize={24}
          tokenInfo={tokenInfo}
        />
      </div>
    </Card>
  );

  return card;
};
