import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';

import { formatAmount, formatUSD, WRAPPED_SOL_MINT } from '@oyster/common';

import type { TokenInfo } from '@solana/spl-token-registry';

import { useSolPrice, useAllSplPrices } from '../../contexts';
import { TokenCircle } from '../Custom';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  displaySymbol?: string;
  title?: string;
  style?: object;
  containerStyle?: object;
  iconSize?: number;
  customPrefix?: JSX.Element;
  ended?: boolean;
  tokenInfo?: TokenInfo;
}

export const AmountLabel = (properties: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    displaySymbol = '',
    title = '',
    style = {},
    containerStyle = {},
    iconSize = 38,
    customPrefix,
    ended,
    tokenInfo,
  } = properties;
  // Add formattedAmount to be able to parse USD value and retain abbreviation of value
  const amount =
    typeof _amount === 'string' ? Number.parseFloat(_amount) : _amount;
  let formattedAmount = `${amount}`;
  if (amount >= 1) {
    formattedAmount = formatAmount(amount);
  }

  const solPrice = useSolPrice();
  const altSplPrice = useAllSplPrices().find(
    (a) => a.tokenMint == tokenInfo?.address,
  )?.tokenPrice;
  const tokenPrice =
    tokenInfo?.address == WRAPPED_SOL_MINT.toBase58() ? solPrice : altSplPrice;

  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (tokenPrice) setPriceUSD(tokenPrice * amount);
  }, [amount, tokenPrice, altSplPrice]);

  const PriceNaN = isNaN(amount);

  return (
    <div style={{ display: 'flex', ...containerStyle }}>
      {PriceNaN === false && (
        <Statistic
          style={style}
          className="create-statistic"
          title={title || ''}
          value={`${formattedAmount} ${displaySymbol || ''}`}
          prefix={
            customPrefix || (
              <TokenCircle
                iconSize={iconSize}
                iconFile={
                  tokenInfo?.logoURI == '' ? undefined : tokenInfo?.logoURI
                }
              />
            )
          }
        />
      )}
      {displayUSD && (
        <div className="usd">
          {PriceNaN === false ? (
            priceUSD ? (
              formatUSD.format(priceUSD)
            ) : (
              '$N/A'
            )
          ) : (
            <div className="placebid">{ended ? 'N/A' : 'Place Bid'}</div>
          )}
        </div>
      )}
    </div>
  );
};
