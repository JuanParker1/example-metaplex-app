import type { ReactElement } from 'react';
import React, { memo } from 'react';
import { Image } from 'antd';

import { PackDistributionType } from '@oyster/common';

import type { ReviewAndMintStepProps } from './interface';
import { getTotalNFTsCount } from './utils';

const ReviewAndMintStep = ({
  uri,
  name,
  description,
  supplyByMetadataKey,
  allowedAmountToRedeem,
  distributionType,
}: ReviewAndMintStepProps): ReactElement => {
  const totalNFTs = getTotalNFTsCount(supplyByMetadataKey);
  const numberOfPacks = Math.floor(totalNFTs / allowedAmountToRedeem) || 0;
  const isUnlimited = distributionType === PackDistributionType.Unlimited;

  return (
    <div className="review-step-wrapper">
      <Image
        wrapperClassName="review-step-wrapper__image-wrapper"
        className="review-step-wrapper__image"
        src={uri}
        preview
        loading="lazy"
      />

      <p className="review-step-wrapper__title">{name}</p>

      <p className="review-step-wrapper__text">{description}</p>

      <p className="review-step-wrapper__subtitle">Number of packs</p>
      <p className="review-step-wrapper__text">
        {isUnlimited ? 'Unlimited' : numberOfPacks}
      </p>

      <p className="review-step-wrapper__subtitle">Total NFTs</p>
      <p className="review-step-wrapper__text">
        {isUnlimited ? 'Unlimited' : totalNFTs}
      </p>
    </div>
  );
};

export default memo(ReviewAndMintStep);
