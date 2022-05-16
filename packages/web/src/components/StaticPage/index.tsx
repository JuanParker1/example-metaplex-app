import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Col, Divider, Row } from 'antd';
import BN from 'bn.js';

import Masonry from 'react-masonry-css';

import { CardLoader } from '../MyLoader';
import { useMeta } from '../../contexts';
import { AuctionRenderCard } from '../AuctionRenderCard';
import { AuctionViewState, useAuctions } from '../../hooks';

interface Connect {
  label: string;
  url: string;
}

interface Author {
  name: string;
  avatar?: string;
  details?: string;
  stats?: string[];
  connectWith?: Connect[];
}

interface HeadContent {
  title: string;
  subtitle: string;
  bannerImage: string;
  author?: Author;
}

interface ImageCaption {
  text: string;
  linkText?: string;
  linkUrl?: string;
}

interface ArticleSection {
  title?: string;
  paragraphs: string[];
  image?: string;
  caption?: ImageCaption;
}

interface MidContent {
  sections: ArticleSection[];
}

interface LeftContent {
  author: Author;
}

//https://stackoverflow.com/questions/1480133/how-can-i-get-an-objects-absolute-position-on-the-page-in-javascript
const cumulativeOffset = (element: HTMLElement) => {
  let top = 0,
    left = 0;
  let cumulativeElement: Element | null = element;
  do {
    // @ts-ignore
    top += cumulativeElement.offsetTop || 0;
    // @ts-ignore
    left += cumulativeElement.offsetLeft || 0;
    // @ts-ignore
    cumulativeElement = cumulativeElement.offsetParent;
  } while (cumulativeElement);

  return {
    top: top,
    left: left,
  };
};
export const StaticPage = (properties: {
  headContent: HeadContent;
  leftContent?: LeftContent;
  midContent: MidContent;
  bottomContent: boolean;
}) => {
  const [dimensions, setDimensions] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });
  useEffect(() => {
    function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
  const auctions = useAuctions(AuctionViewState.Live);
  const { isLoading } = useMeta();
  const breakpointColumnsObject = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const liveAuctions = auctions.sort(
    (a, b) =>
      a.auction.info.endedAt
        ?.sub(b.auction.info.endedAt || new BN(0))
        .toNumber() || 0,
  );

  const liveAuctionsView = (
    <Masonry
      breakpointCols={breakpointColumnsObject}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? liveAuctions.map((m, index) => {
            const id = m.auction.pubkey;
            return (
              <Link to={`/auction/${id}`} key={index}>
                <AuctionRenderCard key={id} auctionView={m} />
              </Link>
            );
          })
        : [...Array.from({ length: 10 })].map((_, index) => (
            <CardLoader key={index} />
          ))}
    </Masonry>
  );

  const headerSection = (
    <section id="header-container">
      {/*<span id="header-gradient"></span>*/}
      <Row>
        <Col span={24} xl={8} className="header-left">
          <p className="header-subtitle">{properties.headContent.subtitle}</p>
          <Divider />
          <p className="header-title">{properties.headContent.title}</p>

          {properties.headContent.author && (
            <div className="author-container">
              <img
                src={properties.headContent.author.avatar}
                className="author-avatar"
                width="32px"
                height="32px"
                alt="author image"
              />
              <p className="author-name">
                {properties.headContent.author.name}
              </p>
            </div>
          )}
        </Col>

        <Col xl={16} span={24} className="header-right">
          <img
            src={properties.headContent.bannerImage}
            className="header-image"
            width="880px"
            height="620px"
            alt={`${properties.headContent.title} image`}
          />
        </Col>
      </Row>
    </section>
  );
  const leftSection = properties.leftContent && (
    <section id="left-container" className="author-container">
      <img
        src={properties.leftContent?.author.avatar}
        className="author-avatar"
        alt="author image"
      />
      <p className="author-name">{properties.leftContent?.author.name}</p>
      <div className="author-details">
        <p className="author-subtitle">Details</p>
        <p>{properties.leftContent?.author.details}</p>
      </div>
      <div className="author-stats">
        <p className="author-subtitle">Stats</p>
        {properties.leftContent?.author.stats?.map((e, index) => (
          <p key={index}>{e}</p>
        ))}
      </div>
      <div className="author-connect">
        <p className="author-subtitle">Connect with the artist</p>
        {properties.leftContent?.author.connectWith?.map((e, ii) => (
          <p key={ii}>
            <a href={e.url}>{e.label}</a>
          </p>
        ))}
      </div>
    </section>
  );
  const middleSection = (
    <section id="middle-container">
      {properties.midContent.sections.map((section, index) => (
        <div key={index} className="mid-section-item">
          {section.title && <span className="mid-title">{section.title}</span>}
          {section.paragraphs?.map((paragraph, ii) => (
            <p className="paragraph-text" key={ii}>
              {paragraph}
            </p>
          ))}

          {section.image && (
            <img
              src={section.image}
              className="image"
              width="720px"
              height="450px"
              alt={`${section.title} image`}
            />
          )}

          {section.caption && (
            <p className="image-caption">
              {section.caption.text}
              <a
                href={section.caption.linkUrl}
                rel="noreferrer"
                target="_blank"
              >
                {section.caption.linkText}
              </a>
            </p>
          )}
        </div>
      ))}
    </section>
  );
  const rightSection = <section id="right-container"></section>;
  const finalSection = (
    <section id="bottom-container">
      <p className="bottom-title">Shop the Collection</p>
      {liveAuctionsView}
    </section>
  );

  return (
    <Fragment>
      {headerSection}
      <Row className="static-page-container">
        <Col xs={24} md={4}>
          {leftSection}
        </Col>
        <Col xs={24} md={16}>
          {middleSection}
        </Col>
        <Col xs={24} md={4}>
          {rightSection}
        </Col>
      </Row>
      {properties.bottomContent && finalSection}
    </Fragment>
  );
};
