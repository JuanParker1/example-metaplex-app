import classNames from 'classnames';
import type { ReactElement } from 'react';
import React, { memo } from 'react';

import type { SelectCardProps } from './interface';

const SelectCard = ({
  title,
  subtitle,
  isSelected,
  onClick,
}: SelectCardProps): ReactElement => {
  const wrapperCls = classNames({
    'select-card-wrapper': true,
    'select-card-wrapper--selected': isSelected,
  });

  return (
    <div className={wrapperCls} onClick={onClick}>
      <p className="select-card-wrapper__title">{title}</p>
      <p className="select-card-wrapper__subtitle">{subtitle}</p>
    </div>
  );
};

export default memo(SelectCard);
