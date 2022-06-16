import { convertUtf8ToHex } from '@walletconnect/utils';
import { Message } from 'google-protobuf';
import {
  buildMessage,
  createAnyMessageBase64,
} from '@provenanceio/wallet-utils';
import { SendCoinData } from '../../types';
import { State } from '../walletConnectService';
import { WALLET_LIST, WALLET_APP_EVENTS } from '../../consts';

export const sendCoin = async (state: State, data: SendCoinData) => {
  let valid = false;
  const { connector, address, walletApp, customExtId } = state;
  const {
    to: toAddress,
    amount: initialAmount,
    denom: initialDenom = 'hash',
    gasPrice,
  } = data;
  const method = 'provenance_sendTransaction';
  const type = 'MsgSend';
  let amount = initialAmount;
  let denom = initialDenom.toLowerCase();
  if (denom === 'hash') {
    // Convert hash amount to nhash (cannot send hash, can only send nhash)
    amount = initialAmount * 10 ** 9;
    denom = 'nhash';
  }
  // Set amount to string value
  const amountString = `${amount}`;
  const description = `Send Coin (${denom})`;
  const sendMessage = {
    fromAddress: address,
    toAddress,
    amountList: [{ denom, amount: amountString }],
  };

  const metadata = JSON.stringify({
    description,
    address,
    gasPrice,
  });
  // Custom Request
  const request = {
    id: 1,
    jsonrpc: '2.0',
    method,
    params: [metadata],
  };

  // Wallet App must exist
  if (!walletApp) return { valid, error: 'Wallet app is missing', data, request };
  const activeWalletApp = WALLET_LIST.find(wallet => wallet.id === walletApp);
  if (!activeWalletApp) return { valid, error: 'Invalid active wallet app', data, request };
  if (!connector) return { valid, data, request, error: 'No wallet connected' };

  const messageMsgSend = buildMessage(type, sendMessage);
  const message = createAnyMessageBase64(type, messageMsgSend as Message);

  // encode message (hex)
  const hexMsg = convertUtf8ToHex(message);
  request.params.push(hexMsg);
  try {
    // If the wallet app has an eventAction (web/extension) trigger it
    if (activeWalletApp.eventAction) {
      const eventData = { event: WALLET_APP_EVENTS.EVENT , customExtId };
      activeWalletApp.eventAction(eventData);
    }
    // send message
    const result = await connector.sendCustomRequest(request);
    // TODO verify transaction ID
    valid = !!result;
    // result is a hex encoded signature
    return { valid, result, data, request };
  } catch (error) {
    return { valid, error, data, request };
  }
};
