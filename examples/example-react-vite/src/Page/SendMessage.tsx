import styled from 'styled-components';
import { useState } from 'react';
import { useWalletConnect } from '@provenanceio/walletconnect-js';
import type { ProvenanceMethod, BroadcastEventData } from '@provenanceio/walletconnect-js';
import { Button, Input, ActionCard, ActionGas, Results, Dropdown } from 'Components';
import { ICON_NAMES } from 'consts';
import { COLORS } from 'theme';

const TestMessage = styled.span`
  font-size: 1rem;
  color: ${COLORS.PRIMARY_400};
  cursor: pointer;
  font-style: italic;
  margin-bottom: 8px;
`;

export const SendMessage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const [customId, setCustomId] = useState('');
  const [results, setResults] = useState<BroadcastEventData[keyof BroadcastEventData] | undefined>();
  const [method, setMethod] = useState<ProvenanceMethod>(
    'provenance_sendTransaction'
  );
  const [gasData, setGasData] = useState({ gasPrice: '', gasPriceDenom: '' });
  const { walletConnectService: wcs, walletConnectState } = useWalletConnect();
  const { pendingMethod } = walletConnectState;
  const sendMessageLoading = pendingMethod === 'sendMessage';

  const handleSubmit = async () => {
    // Convert input string value to number for price
    const finalGasData = { ...gasData, gasPrice: Number(gasData.gasPrice) };

    const result = await wcs.sendMessage({
      message,
      description,
      gasPrice: finalGasData,
      method,
      customId,
    });
    setResults(result);
  };

  const clickUseSampleButton = () => {
    setMessage(
      'ChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5kEmwKKXRwMWtuc3hmbm4wbHE0OG1tbmtmbmtndGtrOHFueHhkdTB5MnRrbGtoEil0cDFrbnN4Zm5uMGxxNDhtbW5rZm5rZ3Rrazhxbnh4ZHUweTJ0a2xraBoUCgVuaGFzaBILMTAwMDAwMDAwMDA='
    );
  };

  const status = results ? results.error ? 'failure' : 'success' : undefined;

  return (
    <ActionCard
      icon={ICON_NAMES.GEAR}
      title="Send Message"
      description="Pass along an encoded base64 message to the wallet"
      status={status}
    >
      <TestMessage
        onClick={clickUseSampleButton}
        title="Message: Send 10 Hash to tp1knsxfnn0lq48mmnkfnkgtkk8qnxxdu0y2tklkh"
      >
        Click here to use sample message
      </TestMessage>
      <Input
        width="100%"
        value={message}
        label="Base64 Encoded Message"
        placeholder="Enter Base64 Encoded Message"
          onChange={setMessage}
          bottomGap
          disabled={sendMessageLoading}
      />
      <Dropdown
        value={method}
        label="Message method"
        onChange={setMethod}
        bottomGap
        options={['provenance_sign', 'provenance_sendTransaction']}
      />
      <Input
        value={description}
        label="Wallet message description (Optional)"
        placeholder="Enter message description"
        onChange={setDescription}
        bottomGap
        disabled={sendMessageLoading}
      />
      <Input
            value={customId}
            label="Custom ID (Optional)"
            placeholder="Enter Custom ID"
            onChange={setCustomId}
            bottomGap
            disabled={sendMessageLoading}
          />
      <ActionGas setGasData={setGasData} gasData={gasData} />
      <Button
        loading={sendMessageLoading}
        onClick={handleSubmit}
        disabled={!message || !method}
      >
        Submit
      </Button>
      <Results results={results} setResults={setResults} />
    </ActionCard>
  );
};
