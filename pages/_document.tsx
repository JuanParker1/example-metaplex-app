import Document, { Head, Main, Html, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';
import type { DocumentContext, DocumentInitialProps } from 'next/document';
import { Fragment } from 'react';

/**
 * _document page. Customises the "Document" model to augment the app's HTML.
 *
 * Only rendered in the server (build time for SSG)
 *
 * https://nextjs.org/docs/advanced-features/custom-document
 */
class MyDocument extends Document {
  static async getInitialProps(
    context: DocumentContext,
  ): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = context.renderPage;

    try {
      context.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (properties) =>
            sheet.collectStyles(<App {...properties} />),
        });

      const initialProperties = await Document.getInitialProps(context);
      return {
        ...initialProperties,
        styles: [
          <Fragment key="1">
            {initialProperties.styles}
            {sheet.getStyleElement()}
          </Fragment>,
        ],
      };
    } finally {
      sheet.seal();
    }
  }

  public render = (): JSX.Element => (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default MyDocument;
