import React, { useState } from 'react';
import { Avatar } from 'antd';

import { Identicon } from '@oyster/common';

import type { Artist } from '../../types';

const MetaAvatarItem = (properties: {
  creator: Artist;
  size: number;
  alt?: string;
}) => {
  const { creator, size, alt } = properties;
  const [noImage, setNoImage] = useState(false);
  const image = creator.image || '';

  return (
    <Avatar
      alt={alt}
      size={size}
      src={
        noImage ? (
          <Identicon
            alt={alt}
            address={creator.address}
            style={{ width: size }}
          />
        ) : (
          image
        )
      }
      onError={() => {
        setNoImage(true);
        return false;
      }}
    />
  );
};

export const MetaAvatar = (properties: {
  creators?: Artist[];
  showMultiple?: boolean;
  size?: number;
}) => {
  const { creators, showMultiple } = properties;
  const size = properties.size || 32;

  if (!creators || creators.length === 0) {
    return <Avatar size={size} src={false} />;
  }

  const controls = (creators || []).map((creator, ii) => (
    <MetaAvatarItem creator={creator} alt={creator.name} key={ii} size={size} />
  ));

  if (!showMultiple) {
    return controls[0];
  }

  return <Avatar.Group>{controls || null}</Avatar.Group>;
};

export const MetaAvatarDetailed = (properties: {
  creators?: Artist[];
  size?: number;
}) => {
  const { creators } = properties;
  const size = properties.size || 32;
  if (!creators || creators.length === 0) {
    return <Avatar size={size} src={false} />;
  }
  return (
    <div>
      {(creators || []).map((creator, _index) => (
        <div style={{ display: 'flex' }} key={_index}>
          <MetaAvatarItem creator={creator} alt={creator.name} size={size} />
          <p style={{ marginLeft: 10 }}>
            {creator.name ? creator.name : 'No name provided.'}
          </p>
        </div>
      ))}
    </div>
  );
};
