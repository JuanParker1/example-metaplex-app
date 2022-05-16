import React from 'react';
import { SendOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';

import { LABELS } from '../../constants';

import { footerConf as footerConfig } from './footerData';

export const Footer = () => {
  const validateMessages = {
    types: {
      email: 'Input is not a valid email!',
    },
  };

  const CustomForm = (properties: {
    status: any;
    message: any;
    onValidated: any;
  }) => {
    let email: any;
    const submit = (values: any) => {
      email = values.user.email;
      email &&
        email.includes('@') &&
        properties.onValidated({
          EMAIL: email,
          // NAME: name.value
        });
    };
    return (
      <>
        <Form
          className={'footer-sign-up'}
          onFinish={submit}
          validateMessages={validateMessages}
        >
          <Form.Item
            name={['user', 'email']}
            rules={[
              {
                type: 'email',
              },
            ]}
            style={{ display: 'flex !important' }}
          >
            <Input
              className={'footer-input'}
              type="text"
              id="input"
              placeholder="Email Address"
              bordered={false}
            />
            <Button className={'footer-button'} htmlType="submit">
              <SendOutlined />
            </Button>
          </Form.Item>
        </Form>
        {properties.status ? (
          <div
            style={{
              background: 'rgb(217,217,217)',
              borderRadius: 2,
              padding: 10,
              display: 'inline-block',
            }}
          >
            {properties.status === 'sending' && (
              <div style={{ color: 'blue' }}>Loading...</div>
            )}
            {properties.status === 'error' && (
              <div
                style={{ color: 'red' }}
                dangerouslySetInnerHTML={{ __html: properties.message }}
              />
            )}
            {properties.status === 'success' && (
              <div
                style={{ color: 'green' }}
                dangerouslySetInnerHTML={{ __html: properties.message }}
              />
            )}
          </div>
        ) : null}
      </>
    );
  };

  const NewsLetterForm = () => (
    <CustomForm status={status} message={''} onValidated={() => {}} />
  );

  return (
    <div className="footer-container">
      <div className="footer-info">
        {footerConfig.showShopName ? (
          <div className="footer-community">
            <div className="sub-header">
              {LABELS.STORE_NAME} NFT Marketplace
            </div>
            <div className="footer-link">Powered by Metaplex and Solana</div>
          </div>
        ) : null}
        {footerConfig.components.map((component, ii) => (
          <div className="footer-section-container" key={ii}>
            <div className="sub-header">{component.title}</div>
            {component.links.map((link, jj) => (
              <div className="body-text" key={jj}>
                <a
                  className="footer-link"
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        ))}
        {footerConfig.showEmailSubscriber ? (
          <div className="footer-section-container subscriber-container">
            <div className="subscriber-text">
              {footerConfig.emailSubscriberText}
            </div>
            <NewsLetterForm />
          </div>
        ) : null}
      </div>
      <div className="footer-foot">
        <div className="small-body footer-link">
          2021 {LABELS.STORE_NAME} LLC, All rights reserved
        </div>
      </div>
    </div>
  );
};
