import { convertUtf8ToHex } from "@walletconnect/utils";
import { CustomActionData } from '../../types';
import { State } from '../walletConnectService';
import { WALLET_LIST, WALLET_APP_EVENTS } from '../../consts';

export const customAction = async (state: State, data: CustomActionData) => {
  let valid = false;
  const {
    message: rawB64Message,
    description = 'Custom Action',
    method = 'provenance_sendTransaction',
    gasPrice,
  } = data;
  const { connector, address, walletApp, customExtId } = state;
  const metadata = JSON.stringify({
    description,
    address,
    gasPrice,
  });
  // Custom Request
  const request = {
    id: 1,
    jsonrpc: "2.0",
    method,
    params: [metadata],
  };
  // Wallet App must exist
  if (!walletApp) return { valid, error: 'Wallet app is missing', data, request };
  const activeWalletApp = WALLET_LIST.find(wallet => wallet.id === walletApp);
  if (!activeWalletApp) return { valid, error: 'Invalid active wallet app', data, request };
  if (!connector) return { valid, data, request, error: 'No wallet connected' };

  // If message isn't an array, turn it into one
  const b64MessageArray = Array.isArray(rawB64Message) ? rawB64Message : [rawB64Message];
  // Convert to hex
  const hexMsgArray = b64MessageArray.map((msg) => convertUtf8ToHex(msg))
  request.params.push(...hexMsgArray);
  try {
    // If the wallet app has an eventAction (web/extension) trigger it
    if (activeWalletApp.eventAction) {
      const eventData = { event: WALLET_APP_EVENTS.EVENT , customExtId };
      activeWalletApp.eventAction(eventData);
    }
    // send message
    const result = await connector.sendCustomRequest(request);
    // TODO verify transaction ID
    valid = !!result

    // result is a hex encoded signature
    return { valid, result, data, request };
  } catch (error) { return { valid, error, data, request }; }
};
