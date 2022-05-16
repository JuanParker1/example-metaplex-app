import React, { useEffect, useState, useCallback } from 'react';
import {
  Steps,
  Row,
  Button,
  Upload,
  Col,
  Input,
  Statistic,
  Slider,
  Spin,
  InputNumber,
  Form,
  Typography,
  Space,
  Card,
  Checkbox,
} from 'antd';

import type {
  IMetadataExtension,
  MetadataFile,
  StringPublicKey,
} from '@oyster/common';
import {
  MAX_METADATA_LEN,
  useConnection,
  MetadataCategory,
  useConnectionConfig,
  Creator,
  shortenAddress,
  MetaplexModal,
  MetaplexOverlay,
  WRAPPED_SOL_MINT,
  getAssetCostToStore,
  LAMPORT_MULTIPLIER,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';

import {
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { getLast } from '../../utils/utils';
import { AmountLabel } from '../../components/AmountLabel';
import useWindowDimensions from '../../utils/layout';
import { mintNFT } from '../../actions';
import { useTokenList } from '../../contexts/tokenList';
import type { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { ArtSelector } from '../auctionCreate/artSelector';

import { UserSearch } from './../../components/UserSearch';
import type { UserValue } from './../../components/UserSearch';
import { Confetti } from './../../components/Confetti';
import { ArtCard } from './../../components/ArtCard';

const { Step } = Steps;
const { Dragger } = Upload;
const { Text } = Typography;

export const ArtCreateView = () => {
  const connection = useConnection();
  const { endpoint } = useConnectionConfig();
  const wallet = useWallet();
  const [alertMessage, setAlertMessage] = useState<string>();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const { width } = useWindowDimensions();
  const [nftCreateProgress, setNFTcreateProgress] = useState<number>(0);

  const [step, setStep] = useState<number>(0);
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [isMinting, setMinting] = useState<boolean>(false);
  const [nft, setNft] = useState<
    { metadataAccount: StringPublicKey } | undefined
  >(undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [isCollection, setIsCollection] = useState<boolean>(false);
  const [attributes, setAttributes] = useState<IMetadataExtension>({
    name: '',
    symbol: '',
    collection: '',
    description: '',
    external_url: '',
    image: '',
    animation_url: undefined,
    attributes: undefined,
    seller_fee_basis_points: 0,
    creators: [],
    properties: {
      files: [],
      category: MetadataCategory.Image,
    },
  });

  const gotoStep = useCallback(
    (_step: number) => {
      history.push(`/art/create/${_step.toString()}`);
      if (_step === 0) setStepsVisible(true);
    },
    [history],
  );

  useEffect(() => {
    if (step_param) setStep(Number.parseInt(step_param));
    else gotoStep(0);
  }, [step_param, gotoStep]);

  // store files
  const mint = async () => {
    const metadata = {
      name: attributes.name,
      symbol: attributes.symbol,
      creators: attributes.creators,
      collection: attributes.collection,
      description: attributes.description,
      sellerFeeBasisPoints: attributes.seller_fee_basis_points,
      image: attributes.image,
      animation_url: attributes.animation_url,
      attributes: attributes.attributes,
      external_url: attributes.external_url,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
      },
    };
    setStepsVisible(false);
    setMinting(true);

    try {
      const _nft = await mintNFT(
        connection,
        wallet,
        endpoint.name,
        files,
        metadata,
        setNFTcreateProgress,
        attributes.properties?.maxSupply,
      );

      if (_nft) setNft(_nft);
      setAlertMessage('');
    } catch (error: any) {
      setAlertMessage(error.message);
    } finally {
      setMinting(false);
    }
  };

  return (
    <>
      <Row className={'creator-base-page'} style={{ paddingTop: 50 }}>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
              style={{
                width: 'fit-content',
                margin: '0 auto 30px auto',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <Step title="Category" />
              <Step title="Upload" />
              <Step title="Info" />
              <Step title="Royalties" />
              <Step title="Launch" />
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          {step === 0 && (
            <CategoryStep
              confirm={(category: MetadataCategory) => {
                setAttributes({
                  ...attributes,
                  properties: {
                    ...attributes.properties,
                    category,
                  },
                });
                gotoStep(1);
              }}
            />
          )}
          {step === 1 && (
            <UploadStep
              attributes={attributes}
              setAttributes={setAttributes}
              files={files}
              setFiles={setFiles}
              confirm={() => gotoStep(2)}
            />
          )}

          {step === 2 && (
            <InfoStep
              attributes={attributes}
              files={files}
              isCollection={isCollection}
              setIsCollection={setIsCollection}
              setAttributes={setAttributes}
              confirm={() => gotoStep(3)}
            />
          )}
          {step === 3 && (
            <RoyaltiesStep
              attributes={attributes}
              confirm={() => gotoStep(4)}
              setAttributes={setAttributes}
            />
          )}
          {step === 4 && (
            <LaunchStep
              attributes={attributes}
              files={files}
              confirm={() => gotoStep(5)}
              connection={connection}
            />
          )}
          {step === 5 && (
            <WaitingStep
              mint={mint}
              minting={isMinting}
              step={nftCreateProgress}
              confirm={() => gotoStep(6)}
            />
          )}
          {0 < step && step < 5 && (
            <div style={{ margin: 'auto', width: 'fit-content' }}>
              <Button onClick={() => gotoStep(step - 1)}>Back</Button>
            </div>
          )}
        </Col>
      </Row>
      <MetaplexOverlay visible={step === 6}>
        <Congrats nft={nft} alert={alertMessage} />
      </MetaplexOverlay>
    </>
  );
};

const CategoryStep = (properties: {
  confirm: (category: MetadataCategory) => void;
}) => {
  const { width } = useWindowDimensions();
  return (
    <>
      <Row className="call-to-action">
        <h2>Create a new item</h2>
        <p>
          First time creating on Metaplex?{' '}
          <a
            href="https://docs.metaplex.com/storefront/create"
            target="_blank"
            rel="noreferrer"
          >
            Read our creators’ guide.
          </a>
        </p>
      </Row>
      <Row justify={width < 768 ? 'center' : 'start'}>
        <Col>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => properties.confirm(MetadataCategory.Image)}
            >
              <div>
                <div>Image</div>
                <div className="type-btn-description">JPG, PNG, GIF</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => properties.confirm(MetadataCategory.Video)}
            >
              <div>
                <div>Video</div>
                <div className="type-btn-description">MP4, MOV</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => properties.confirm(MetadataCategory.Audio)}
            >
              <div>
                <div>Audio</div>
                <div className="type-btn-description">MP3, WAV, FLAC</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => properties.confirm(MetadataCategory.VR)}
            >
              <div>
                <div>AR/3D</div>
                <div className="type-btn-description">GLB</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => properties.confirm(MetadataCategory.HTML)}
            >
              <div>
                <div>HTML Asset</div>
                <div className="type-btn-description">HTML</div>
              </div>
            </Button>
          </Row>
        </Col>
      </Row>
    </>
  );
};

const UploadStep = (properties: {
  attributes: IMetadataExtension;
  setAttributes: (attribute: IMetadataExtension) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  confirm: () => void;
}) => {
  const [coverFile, setCoverFile] = useState<File | undefined>(
    properties.files?.[0],
  );
  const [mainFile, setMainFile] = useState<File | undefined>(
    properties.files?.[1],
  );
  const [coverArtError, setCoverArtError] = useState<string>();

  const [customURL, setCustomURL] = useState<string>('');
  const [customURLError, setCustomURLError] = useState<string>('');
  const disableContinue = !(coverFile || (!customURLError && !!customURL));

  useEffect(() => {
    properties.setAttributes({
      ...properties.attributes,
      properties: {
        ...properties.attributes.properties,
        files: [],
      },
    });
  }, []);

  const uploadMessage = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return 'Upload your audio creation (MP3, FLAC, WAV)';
      case MetadataCategory.Image:
        return 'Upload your image creation (PNG, JPG, GIF)';
      case MetadataCategory.Video:
        return 'Upload your video creation (MP4, MOV, GLB)';
      case MetadataCategory.VR:
        return 'Upload your AR/VR creation (GLB)';
      case MetadataCategory.HTML:
        return 'Upload your HTML File (HTML)';
      default:
        return 'Please go back and choose a category';
    }
  };

  const acceptableFiles = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return '.mp3,.flac,.wav';
      case MetadataCategory.Image:
        return '.png,.jpg,.gif';
      case MetadataCategory.Video:
        return '.mp4,.mov,.webm';
      case MetadataCategory.VR:
        return '.glb';
      case MetadataCategory.HTML:
        return '.html';
      default:
        return '';
    }
  };

  const { category } = properties.attributes.properties;

  const urlPlaceholder = `http://example.com/path/to/${
    category === MetadataCategory.Image ? 'image' : 'file'
  }`;

  return (
    <>
      <Row className="call-to-action">
        <h2>Now, let&apos;s upload your creation</h2>
        <p style={{ fontSize: '1.2rem' }}>
          Your file will be uploaded to the decentralized web via Arweave.
          Depending on file type, can take up to 1 minute. Arweave is a new type
          of storage that backs data with sustainable and perpetual endowments,
          allowing users and developers to truly store data forever – for the
          very first time.
        </p>
      </Row>
      <Row className="content-action">
        <h3>Upload a cover image (PNG, JPG, GIF, SVG)</h3>
        <Dragger
          accept=".png,.jpg,.gif,.mp4,.svg"
          style={{ padding: 20, background: 'rgba(255, 255, 255, 0.08)' }}
          multiple={false}
          onRemove={() => {
            setMainFile(undefined);
            setCoverFile(undefined);
          }}
          customRequest={(info) => {
            // dont upload files here, handled outside of the control
            info?.onSuccess?.({}, null as any);
          }}
          fileList={coverFile ? [coverFile as any] : []}
          onChange={async (info) => {
            const file = info.file.originFileObj;

            if (!file) {
              return;
            }

            const sizeKB = file.size / 1024;

            if (sizeKB < 25) {
              setCoverArtError(
                `The file ${file.name} is too small. It is ${
                  Math.round(10 * sizeKB) / 10
                }KB but should be at least 25KB.`,
              );
              return;
            }

            setCoverFile(file);
            setCoverArtError(undefined);
          }}
        >
          <div className="ant-upload-drag-icon">
            <h3 style={{ fontWeight: 700 }}>
              Upload your cover image (PNG, JPG, GIF, SVG)
            </h3>
          </div>
          {coverArtError ? (
            <Text type="danger">{coverArtError}</Text>
          ) : (
            <p className="ant-upload-text" style={{ color: '#6d6d6d' }}>
              Drag and drop, or click to browse
            </p>
          )}
        </Dragger>
      </Row>
      {properties.attributes.properties?.category !==
        MetadataCategory.Image && (
        <Row
          className="content-action"
          style={{ marginBottom: 5, marginTop: 30 }}
        >
          <h3>{uploadMessage(properties.attributes.properties?.category)}</h3>
          <Dragger
            accept={acceptableFiles(properties.attributes.properties?.category)}
            style={{ padding: 20, background: 'rgba(255, 255, 255, 0.08)' }}
            multiple={false}
            customRequest={(info) => {
              // dont upload files here, handled outside of the control
              info?.onSuccess?.({}, null as any);
            }}
            fileList={mainFile ? [mainFile as any] : []}
            onChange={async (info) => {
              const file = info.file.originFileObj;

              // Reset image URL
              setCustomURL('');
              setCustomURLError('');

              if (file) setMainFile(file);
            }}
            onRemove={() => {
              setMainFile(undefined);
            }}
          >
            <div className="ant-upload-drag-icon">
              <h3 style={{ fontWeight: 700 }}>Upload your creation</h3>
            </div>
            <p className="ant-upload-text" style={{ color: '#6d6d6d' }}>
              Drag and drop, or click to browse
            </p>
          </Dragger>
        </Row>
      )}
      <Form.Item
        className={'url-form-action'}
        style={{
          width: '100%',
          flexDirection: 'column',
          paddingTop: 30,
          marginBottom: 4,
        }}
        label={<h3>OR use absolute URL to content</h3>}
        labelAlign="left"
        colon={false}
        validateStatus={customURLError ? 'error' : 'success'}
        help={customURLError}
      >
        <Input
          disabled={!!mainFile}
          placeholder={urlPlaceholder}
          value={customURL}
          onChange={(event_) => setCustomURL(event_.target.value)}
          onFocus={() => setCustomURLError('')}
          onBlur={() => {
            if (!customURL) {
              setCustomURLError('');
              return;
            }

            try {
              // Validate URL and save
              new URL(customURL);
              setCustomURL(customURL);
              setCustomURLError('');
            } catch (error) {
              console.error(error);
              setCustomURLError('Please enter a valid absolute URL');
            }
          }}
        />
      </Form.Item>
      <Row>
        <Button
          type="primary"
          size="large"
          disabled={disableContinue}
          onClick={async () => {
            properties.setAttributes({
              ...properties.attributes,
              properties: {
                ...properties.attributes.properties,
                files: [coverFile, mainFile, customURL]
                  .filter(Boolean)
                  .map((f) => {
                    const uri = typeof f === 'string' ? f : f?.name || '';
                    const type =
                      typeof f === 'string' || !f
                        ? 'unknown'
                        : f.type || getLast(f.name.split('.')) || 'unknown';

                    return {
                      uri,
                      type,
                    } as MetadataFile;
                  }),
              },
              image: coverFile?.name || customURL || '',
              animation_url:
                properties.attributes.properties?.category !==
                  MetadataCategory.Image && customURL
                  ? customURL
                  : mainFile && mainFile.name,
            });
            const url = await fetch(customURL).then((res) => res.blob());
            const files = [
              coverFile,
              mainFile,
              customURL ? new File([url], customURL) : '',
            ].filter(Boolean) as File[];

            properties.setFiles(files);
            properties.confirm();
          }}
          style={{ marginTop: 24 }}
          className="action-btn"
        >
          Continue to Mint
        </Button>
      </Row>
    </>
  );
};

interface Royalty {
  creatorKey: string;
  amount: number;
}

const useArtworkFiles = (files: File[], attributes: IMetadataExtension) => {
  const [data, setData] = useState<{ image: string; animation_url: string }>({
    image: '',
    animation_url: '',
  });

  useEffect(() => {
    if (attributes.image) {
      const file = files.find((f) => f.name === attributes.image);
      if (file) {
        const reader = new FileReader();
        reader.addEventListener('load', function (event) {
          setData((data: any) => {
            return {
              ...data,
              image: (event.target?.result as string) || '',
            };
          });
        });
        if (file) reader.readAsDataURL(file);
      }
    }

    if (attributes.animation_url) {
      const file = files.find((f) => f.name === attributes.animation_url);
      if (file) {
        const reader = new FileReader();
        reader.addEventListener('load', function (event) {
          setData((data: any) => {
            return {
              ...data,
              animation_url: (event.target?.result as string) || '',
            };
          });
        });
        if (file) reader.readAsDataURL(file);
      }
    }
  }, [files, attributes]);

  return data;
};

const InfoStep = (properties: {
  attributes: IMetadataExtension;
  files: File[];
  isCollection: boolean;
  setIsCollection: (value: boolean) => void;
  setAttributes: (attribute: IMetadataExtension) => void;
  confirm: () => void;
}) => {
  const { image } = useArtworkFiles(properties.files, properties.attributes);
  const [form] = Form.useForm();
  const { isCollection, setIsCollection } = properties;
  const [selectedCollection, setSelectedCollection] = useState<
    Array<SafetyDepositDraft>
  >([]);

  const artistFilter = useCallback(
    (index: SafetyDepositDraft) =>
      !(index.metadata.info.data.creators || []).some(
        (c: Creator) => !c.verified,
      ),
    [],
  );

  useEffect(() => {
    if (selectedCollection.length > 0) {
      properties.setAttributes({
        ...properties.attributes,
        collection: selectedCollection[0].metadata.info.mint,
      });
    }
  }, [selectedCollection]);

  return (
    <>
      <Row className="call-to-action">
        <h2>Describe your item</h2>
        <p>
          Provide detailed description of your creative process to engage with
          your audience.
        </p>
      </Row>
      <Row className="content-action" justify="space-around">
        <Col>
          {properties.attributes.image && (
            <ArtCard
              image={image}
              animationURL={properties.attributes.animation_url}
              category={properties.attributes.properties?.category}
              name={properties.attributes.name}
              symbol={properties.attributes.symbol}
              small={true}
              artView={!(properties.files.length > 1)}
              className="art-create-card"
            />
          )}
        </Col>
        <Col className="section" style={{ minWidth: 300 }}>
          <label className="action-field">
            <span className="field-title">Title</span>
            <Input
              autoFocus
              className="input"
              placeholder="Max 50 characters"
              maxLength={50}
              allowClear
              value={properties.attributes.name}
              onChange={(info) =>
                properties.setAttributes({
                  ...properties.attributes,
                  name: info.target.value,
                })
              }
            />
          </label>
          <label className="action-field">
            <span className="field-title">Symbol</span>
            <Input
              className="input"
              placeholder="Max 10 characters"
              maxLength={10}
              allowClear
              value={properties.attributes.symbol}
              onChange={(info) =>
                properties.setAttributes({
                  ...properties.attributes,
                  symbol: info.target.value,
                })
              }
            />
          </label>
          <label className="action-field direction-row">
            <Checkbox
              checked={isCollection}
              onChange={(value) => {
                setIsCollection(value.target.checked);
              }}
            />
            <span className="field-title" style={{ marginLeft: '10px' }}>
              Is parent collection?
            </span>
          </label>
          {!isCollection && (
            <label className="action-field">
              <span className="field-title">Collection</span>
              <ArtSelector
                filter={artistFilter}
                selected={selectedCollection}
                setSelected={(items) => {
                  setSelectedCollection(items);
                }}
                allowMultiple={false}
              >
                Select NFT
              </ArtSelector>
            </label>
          )}
          <label className="action-field">
            <span className="field-title">Description</span>
            <Input.TextArea
              className="input textarea"
              placeholder="Max 500 characters"
              maxLength={500}
              value={properties.attributes.description}
              onChange={(info) =>
                properties.setAttributes({
                  ...properties.attributes,
                  description: info.target.value,
                })
              }
              allowClear
            />
          </label>
          <label className="action-field">
            <span className="field-title">Maximum Supply</span>
            {!isCollection ? (
              <InputNumber
                placeholder="Quantity"
                value={properties.attributes.properties.maxSupply}
                onChange={(value: number) => {
                  properties.setAttributes({
                    ...properties.attributes,
                    properties: {
                      ...properties.attributes.properties,
                      maxSupply: value,
                    },
                  });
                }}
                className="royalties-input"
              />
            ) : (
              0
            )}
          </label>
          <label className="action-field">
            <span className="field-title">Attributes</span>
          </label>
          <Form name="dynamic_attributes" form={form} autoComplete="off">
            <Form.List name="attributes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Space key={key} align="baseline">
                      <Form.Item name={[name, 'trait_type']} hasFeedback>
                        <Input placeholder="trait_type (Optional)" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'value']}
                        rules={[{ required: true, message: 'Missing value' }]}
                        hasFeedback
                      >
                        <Input placeholder="value" />
                      </Form.Item>
                      <Form.Item name={[name, 'display_type']} hasFeedback>
                        <Input placeholder="display_type (Optional)" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add attribute
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
        </Col>
      </Row>

      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            form.validateFields().then((values) => {
              const nftAttributes = values.attributes;
              // value is number if possible
              for (const nftAttribute of nftAttributes || []) {
                const newValue = Number(nftAttribute.value);
                if (!isNaN(newValue)) {
                  nftAttribute.value = newValue;
                }
              }
              console.log('Adding NFT attributes:', nftAttributes);
              properties.setAttributes({
                ...properties.attributes,
                attributes: nftAttributes,
              });

              properties.confirm();
            });
          }}
          className="action-btn"
        >
          Continue to royalties
        </Button>
      </Row>
    </>
  );
};

const RoyaltiesSplitter = (properties: {
  creators: Array<UserValue>;
  royalties: Array<Royalty>;
  setRoyalties: Function;
  isShowErrors?: boolean;
}) => {
  return (
    <Col>
      <Row gutter={[0, 24]}>
        {properties.creators.map((creator, index) => {
          const royalty = properties.royalties.find(
            (royalty) => royalty.creatorKey === creator.key,
          );
          if (!royalty) return null;

          const amt = royalty.amount;

          const handleChangeShare = (newAmt: number) => {
            properties.setRoyalties(
              properties.royalties.map((_royalty) => {
                return {
                  ..._royalty,
                  amount:
                    _royalty.creatorKey === royalty.creatorKey
                      ? newAmt
                      : _royalty.amount,
                };
              }),
            );
          };

          return (
            <Col span={24} key={index}>
              <Row
                align="middle"
                gutter={[0, 16]}
                style={{ margin: '5px auto' }}
              >
                <Col span={4} style={{ padding: 10 }}>
                  {creator.label}
                </Col>
                <Col span={3}>
                  <InputNumber<number>
                    min={0}
                    max={100}
                    formatter={(value) => `${value}%`}
                    value={amt}
                    parser={(value) =>
                      Number.parseInt(value?.replace('%', '') ?? '0')
                    }
                    onChange={handleChangeShare}
                    className="royalties-input"
                  />
                </Col>
                <Col span={4} style={{ paddingLeft: 12 }}>
                  <Slider value={amt} onChange={handleChangeShare} />
                </Col>
                {properties.isShowErrors && amt === 0 && (
                  <Col style={{ paddingLeft: 12 }}>
                    <Text type="danger">
                      The split percentage for this creator cannot be 0%.
                    </Text>
                  </Col>
                )}
              </Row>
            </Col>
          );
        })}
      </Row>
    </Col>
  );
};

const RoyaltiesStep = (properties: {
  attributes: IMetadataExtension;
  setAttributes: (attribute: IMetadataExtension) => void;
  confirm: () => void;
}) => {
  // const file = props.attributes.image;
  const { publicKey, connected } = useWallet();
  const [creators, setCreators] = useState<Array<UserValue>>([]);
  const [fixedCreators, setFixedCreators] = useState<Array<UserValue>>([]);
  const [royalties, setRoyalties] = useState<Array<Royalty>>([]);
  const [totalRoyaltyShares, setTotalRoyaltiesShare] = useState<number>(0);
  const [showCreatorsModal, setShowCreatorsModal] = useState<boolean>(false);
  const [isShowErrors, setIsShowErrors] = useState<boolean>(false);

  useEffect(() => {
    if (publicKey) {
      const key = publicKey.toBase58();
      setFixedCreators([
        {
          key,
          label: shortenAddress(key),
          value: key,
        },
      ]);
    }
  }, [connected, setCreators]);

  useEffect(() => {
    setRoyalties(
      [...fixedCreators, ...creators].map((creator) => ({
        creatorKey: creator.key,
        amount: Math.trunc(100 / [...fixedCreators, ...creators].length),
      })),
    );
  }, [creators, fixedCreators]);

  useEffect(() => {
    // When royalties changes, sum up all the amounts.
    const total = royalties.reduce((totalShares, royalty) => {
      return totalShares + royalty.amount;
    }, 0);

    setTotalRoyaltiesShare(total);
  }, [royalties]);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 20 }}>
        <h2>Set royalties and creator splits</h2>
        <p>
          Royalties ensure that you continue to get compensated for your work
          after its initial sale.
        </p>
      </Row>
      <Row className="content-action" style={{ marginBottom: 20 }}>
        <label className="action-field">
          <span className="field-title">Royalty Percentage</span>
          <p>
            This is how much of each secondary sale will be paid out to the
            creators.
          </p>
          <InputNumber
            autoFocus
            min={0}
            max={100}
            placeholder="Between 0 and 100"
            onChange={(value: number) => {
              properties.setAttributes({
                ...properties.attributes,
                seller_fee_basis_points: value * 100,
              });
            }}
            className="royalties-input"
          />
        </label>
      </Row>
      {[...fixedCreators, ...creators].length > 0 && (
        <Row>
          <label className="action-field" style={{ width: '100%' }}>
            <span className="field-title">Creators Split</span>
            <p>
              This is how much of the proceeds from the initial sale and any
              royalties will be split out amongst the creators.
            </p>
            <RoyaltiesSplitter
              creators={[...fixedCreators, ...creators]}
              royalties={royalties}
              setRoyalties={setRoyalties}
              isShowErrors={isShowErrors}
            />
          </label>
        </Row>
      )}
      <Row>
        <span
          onClick={() => setShowCreatorsModal(true)}
          style={{ padding: 10, marginBottom: 10 }}
        >
          <span
            style={{
              color: 'white',
              fontSize: 25,
              padding: '0px 8px 3px 8px',
              background: 'rgb(57, 57, 57)',
              borderRadius: '50%',
              marginRight: 5,
              verticalAlign: 'middle',
            }}
          >
            +
          </span>
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              verticalAlign: 'middle',
              lineHeight: 1,
            }}
          >
            Add another creator
          </span>
        </span>
        <MetaplexModal
          visible={showCreatorsModal}
          onCancel={() => setShowCreatorsModal(false)}
        >
          <label className="action-field" style={{ width: '100%' }}>
            <span className="field-title">Creators</span>
            <UserSearch setCreators={setCreators} />
          </label>
        </MetaplexModal>
      </Row>
      {isShowErrors && totalRoyaltyShares !== 100 && (
        <Row>
          <Text type="danger" style={{ paddingBottom: 14 }}>
            The split percentages for each creator must add up to 100%. Current
            total split percentage is {totalRoyaltyShares}%.
          </Text>
        </Row>
      )}
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            // Find all royalties that are invalid (0)
            const zeroedRoyalties = royalties.filter(
              (royalty) => royalty.amount === 0,
            );

            if (zeroedRoyalties.length > 0 || totalRoyaltyShares !== 100) {
              // Contains a share that is 0 or total shares does not equal 100, show errors.
              setIsShowErrors(true);
              return;
            }

            const creatorStructs: Creator[] = [
              ...fixedCreators,
              ...creators,
            ].map(
              (c) =>
                new Creator({
                  address: c.value,
                  verified: c.value === publicKey?.toBase58(),
                  share:
                    royalties.find((r) => r.creatorKey === c.value)?.amount ||
                    Math.round(100 / royalties.length),
                }),
            );

            const share = creatorStructs.reduce(
              (accumulator, element) => (accumulator += element.share),
              0,
            );
            if (share > 100 && creatorStructs.length > 0) {
              creatorStructs[0].share -= share - 100;
            }
            properties.setAttributes({
              ...properties.attributes,
              creators: creatorStructs,
            });
            properties.confirm();
          }}
          className="action-btn"
        >
          Continue to review
        </Button>
      </Row>
    </>
  );
};

const LaunchStep = (properties: {
  confirm: () => void;
  attributes: IMetadataExtension;
  files: File[];
  connection: Connection;
}) => {
  const [cost, setCost] = useState(0);
  const { image } = useArtworkFiles(properties.files, properties.attributes);
  const files = properties.files;
  const metadata = properties.attributes;
  useEffect(() => {
    const rentCall = Promise.all([
      properties.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      properties.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ]);
    if (files.length > 0)
      getAssetCostToStore([
        ...files,
        new File([JSON.stringify(metadata)], 'metadata.json'),
      ]).then(async (lamports) => {
        const sol = lamports / LAMPORT_MULTIPLIER;

        // TODO: cache this and batch in one call
        const [mintRent, metadataRent] = await rentCall;

        // const uriStr = 'x';
        // let uriBuilder = '';
        // for (let i = 0; i < MAX_URI_LENGTH; i++) {
        //   uriBuilder += uriStr;
        // }

        const additionalSol = (metadataRent + mintRent) / LAMPORT_MULTIPLIER;

        // TODO: add fees based on number of transactions and signers
        setCost(sol + additionalSol);
      });
  }, [files, metadata, setCost]);

  return (
    <>
      <Row className="call-to-action">
        <h2>Launch your creation</h2>
        <p>
          Provide detailed description of your creative process to engage with
          your audience.
        </p>
      </Row>
      <Row className="content-action" justify="space-around">
        <Col>
          {properties.attributes.image && (
            <ArtCard
              image={image}
              animationURL={properties.attributes.animation_url}
              category={properties.attributes.properties?.category}
              name={properties.attributes.name}
              symbol={properties.attributes.symbol}
              small={true}
              artView={properties.files[1]?.type === 'unknown'}
              className="art-create-card"
            />
          )}
        </Col>
        <Col className="section" style={{ minWidth: 300 }}>
          <Statistic
            className="create-statistic"
            title="Royalty Percentage"
            value={properties.attributes.seller_fee_basis_points / 100}
            precision={2}
            suffix="%"
          />
          {cost ? (
            <AmountLabel
              title="Cost to Create"
              amount={cost.toFixed(5)}
              tokenInfo={useTokenList().tokenMap.get(
                WRAPPED_SOL_MINT.toString(),
              )}
            />
          ) : (
            <Spin />
          )}
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={properties.confirm}
          className="action-btn"
        >
          Pay with SOL
        </Button>
        <Button
          disabled={true}
          size="large"
          onClick={properties.confirm}
          className="action-btn"
        >
          Pay with Credit Card
        </Button>
      </Row>
    </>
  );
};

const WaitingStep = (properties: {
  mint: Function;
  minting: boolean;
  confirm: Function;
  step: number;
}) => {
  useEffect(() => {
    const function_ = async () => {
      await properties.mint();
      properties.confirm();
    };
    function_();
  }, []);

  const setIconForStep = (currentStep: number, componentStep) => {
    if (currentStep === componentStep) {
      return <LoadingOutlined />;
    }
    return null;
  };

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Spin size="large" />
      <Card>
        <Steps direction="vertical" current={properties.step}>
          <Step
            className={'white-description'}
            title="Minting"
            description="Starting Mint Process"
            icon={setIconForStep(properties.step, 0)}
          />
          <Step
            className={'white-description'}
            title="Preparing Assets"
            icon={setIconForStep(properties.step, 1)}
          />
          <Step
            className={'white-description'}
            title="Signing Metadata Transaction"
            description="Approve the transaction from your wallet"
            icon={setIconForStep(properties.step, 2)}
          />
          <Step
            className={'white-description'}
            title="Sending Transaction to Solana"
            description="This will take a few seconds."
            icon={setIconForStep(properties.step, 3)}
          />
          <Step
            className={'white-description'}
            title="Waiting for Initial Confirmation"
            icon={setIconForStep(properties.step, 4)}
          />
          <Step
            className={'white-description'}
            title="Waiting for Final Confirmation"
            icon={setIconForStep(properties.step, 5)}
          />
          <Step
            className={'white-description'}
            title="Uploading to Arweave"
            icon={setIconForStep(properties.step, 6)}
          />
          <Step
            className={'white-description'}
            title="Updating Metadata"
            icon={setIconForStep(properties.step, 7)}
          />
          <Step
            className={'white-description'}
            title="Signing Token Transaction"
            description="Approve the final transaction from your wallet"
            icon={setIconForStep(properties.step, 8)}
          />
        </Steps>
      </Card>
    </div>
  );
};

const Congrats = (properties: {
  nft?: {
    metadataAccount: StringPublicKey;
  };
  alert?: string;
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const parameters = {
      text: "I've created a new NFT artwork on Metaplex, check it out!",
      url: `${
        window.location.origin
      }/#/art/${properties.nft?.metadataAccount.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParameters = new URLSearchParams(parameters).toString();
    return `https://twitter.com/intent/tweet?${queryParameters}`;
  };

  if (properties.alert) {
    // TODO  - properly reset this components state on error
    return (
      <>
        <div className="waiting-title">Sorry, there was an error!</div>
        <p>{properties.alert}</p>
        <Button onClick={() => history.push('/art/create')}>
          Back to Create NFT
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="waiting-title">Congratulations, you created an NFT!</div>
      <div className="congrats-button-container">
        <Button
          className="metaplex-button"
          onClick={() => window.open(newTweetURL(), '_blank')}
        >
          <span>Share it on Twitter</span>
          <span>&gt;</span>
        </Button>
        <Button
          className="metaplex-button"
          onClick={() =>
            history.push(`/art/${properties.nft?.metadataAccount.toString()}`)
          }
        >
          <span>See it in your collection</span>
          <span>&gt;</span>
        </Button>
        <Button
          className="metaplex-button"
          onClick={() => history.push('/auction/create')}
        >
          <span>Sell it via auction</span>
          <span>&gt;</span>
        </Button>
      </div>
      <Confetti />
    </>
  );
};
