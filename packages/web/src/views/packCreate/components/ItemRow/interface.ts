import type { ReactElement } from 'react';

import type { SafetyDepositDraft } from '../../../../actions/createAuctionManager';

export interface ItemRowProps {
  isSelected?: boolean;
  onClick?: () => void;
  item: SafetyDepositDraft;
  children?: ReactElement;
  showSupply?: boolean;
}
