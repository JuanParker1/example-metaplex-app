import React, { useEffect } from 'react';

export const Banner = (properties: {
  src: string;
  useBannerBg: boolean;
  headingText: string;
  subHeadingText: string;
  actionComponent?: JSX.Element;
  children?: React.ReactNode;
}) => {
  return (
    <>
      <div id="mobile-banner">
        <img className="banner-img" src={properties.src} />
        <div className="banner-content">
          <div id={'main-heading'}>{properties.headingText}</div>
          <div id={'sub-heading'}>{properties.subHeadingText}</div>
          {properties.actionComponent}
        </div>
      </div>
      <div
        id={'current-banner'}
        style={{ backgroundImage: `url(${properties.src})` }}
      >
        <span id={'gradient-banner'}></span>
        <div id="banner-inner">
          <div id={'message-container'}>
            <div id={'main-heading'}>{properties.headingText}</div>
            <div id={'sub-heading'}>{properties.subHeadingText}</div>
            {properties.actionComponent}
          </div>
          {properties.children}
          <div className="powered-by">
            <span>
              POWERED BY <b>METAPLEX</b>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
