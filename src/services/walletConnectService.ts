import { Buffer } from 'buffer';
import events from 'events';
import {
  CONNECTION_TIMEOUT,
  LOCAL_STORAGE_NAMES,
  WALLET_APP_EVENTS,
  WALLETCONNECT_BRIDGE_URL,
  WINDOW_MESSAGES,
} from '../consts';
import type {
  AccountAttribute,
  BroadcastEventData,
  ConnectMethod,
  SendMessageMethod,
  UpdateModalData,
  WalletConnectClientType,
  WalletConnectServiceStatus,
  WalletId,
  WCJSLocalState,
  WCJSLocalStateKeys,
  WCLocalState,
  WCLocalStateKeys,
  WCSSetFullState,
  WCSSetState,
  WCSState,
} from '../types';
import {
  addToLocalStorage,
  clearLocalStorage,
  getAccountInfo,
  getLocalStorageValues,
  isMobile,
  sendWalletEvent,
} from '../utils';
import {
  connect as connectMethod,
  sendMessage as sendMessageMethod,
  sendWalletAction as sendWalletActionMethod,
  signHexMessage as signHexMessageMethod,
  signJWT as signJWTMethod,
} from './methods';

// If we don't have a value for Buffer (node core module) create it/polyfill it
if (window.Buffer === undefined) window.Buffer = Buffer;

const defaultState: WCSState = {
  address: '',
  attributes: [] as AccountAttribute[],
  bridge: WALLETCONNECT_BRIDGE_URL,
  status: 'disconnected',
  connectionEST: null,
  connectionEXP: null,
  connectionTimeout: CONNECTION_TIMEOUT,
  modal: {
    showModal: false,
    isMobile: isMobile(),
    dynamicUrl: '',
    QRCodeImg: '',
    QRCodeUrl: '',
  },
  onDisconnect: undefined,
  peer: null,
  pendingMethod: '',
  publicKey: '',
  representedGroupPolicy: null,
  signedJWT: '',
  version: '3.2.1',
  walletAppId: undefined,
  walletInfo: {},
};

export class WalletConnectService {
  #connectionTimer = 0;

  #connector?: WalletConnectClientType;

  #eventEmitter = new events.EventEmitter();

  #setWalletConnectContext: WCSSetFullState | undefined = undefined;

  #logsEnabled = false;

  state: WCSState = defaultState;

  constructor() {
    this.#buildInitialState();
  }

  setLogging = (logsEnabled: boolean) => {
    this.#logsEnabled = logsEnabled;
  };

  #getLocalStorageState = (currentState: WCSState): WCSState => {
    // If this is the first load, we need to default values to the current state, not the default state since default state has already been initialized

    // Pull 'walletconnect' and 'walletconnect-js' localStorage values to build the state if they exists
    const { existingWCJSState, existingWCState } = getLocalStorageValues();
    // Pull out account info from the "accounts" array found in 'walletconnect'
    const {
      address: localStorageAddress,
      attributes: localStorageAttributes,
      publicKey: localStoragePublicKey,
      jwt: localStorageJWT,
      walletInfo: localStorageWalletInfo,
      representedGroupPolicy: localStorageRepresentedGroupPolicy,
    } = getAccountInfo(existingWCState.accounts);
    // Calculate the current connection status based on localStorage and current values
    const getNewStatus = (): WalletConnectServiceStatus => {
      const currentStateStatus = currentState.status;
      // Default return back the current states status or default status if nothing is set/exists yet
      return currentStateStatus;
    };
    return {
      address: localStorageAddress || currentState.address,
      attributes: localStorageAttributes || currentState.attributes,
      bridge: existingWCState.bridge || currentState.bridge,
      connectionEXP: existingWCJSState.connectionEXP || currentState.connectionEXP,
      connectionEST: existingWCJSState.connectionEST || currentState.connectionEST,
      connectionTimeout:
        existingWCJSState.connectionTimeout || currentState.connectionTimeout,
      modal: currentState.modal,
      peer: currentState.peer,
      pendingMethod: currentState.pendingMethod,
      publicKey: localStoragePublicKey || currentState.publicKey,
      // Note: we are pulling from wcjs storage first incase the user generated a newer JWT since connecting
      signedJWT:
        existingWCJSState.signedJWT || localStorageJWT || currentState.signedJWT,
      status: getNewStatus(),
      version: currentState.version,
      walletAppId: existingWCJSState.walletAppId || currentState.walletAppId,
      walletInfo: localStorageWalletInfo || currentState.walletInfo,
      representedGroupPolicy:
        localStorageRepresentedGroupPolicy || currentState.representedGroupPolicy,
    };
  };

  // Populate the initial state from init call.  Does not trigger "setState" function
  #buildInitialState = async () => {
    // Get the latest state using defaultState values (initial = true)
    const newState = this.#getLocalStorageState(defaultState);
    this.state = newState;
    // If the status is "pending" attempt to reconnect
    if (newState.status === 'pending') {
      // ConnectionTimeout is saved in ms, the connect function takes it as seconds, so we need to convert
      const duration = newState.connectionTimeout
        ? newState.connectionTimeout / 1000
        : undefined;
      await this.connect({ duration, bridge: newState.bridge });
    }
  };

  // Populate the state when localStorage updated.  Trigger "setState" function
  // Note: We want to skip updating localStorage with the setState
  #updateState = () => {
    // Get latest state based on current state values
    const currentState = this.#getLocalStorageState(defaultState);
    this.#setState(currentState, false);
    // If the status is "pending" attempt to reconnect
    if (currentState.status === 'pending') {
      // ConnectionTimeout is saved in ms, the connect function takes it as seconds, so we need to convert
      const duration = currentState.connectionTimeout
        ? currentState.connectionTimeout / 1000
        : undefined;
      this.connect({ duration, bridge: currentState.bridge });
    }
  };

  // Control auto-disconnect / timeout
  #startConnectionTimer = () => {
    // Can't start a timer if one is already running (make sure we have EXP and EST too)
    if (
      !this.#connectionTimer &&
      this.state.connectionEXP &&
      this.state.connectionEST
    ) {
      // Get the time until expiration (typically this.state.connectionTimeout, but might not be if session restored from refresh)
      const connectionTimeout = this.state.connectionEXP - Date.now();
      // Create a new timer
      const newConnectionTimer = window.setTimeout(() => {
        // When this timer expires, kill the session
        this.disconnect();
      }, connectionTimeout);
      // Save this timer (so it can be deleted on a reset)
      this.#connectionTimer = newConnectionTimer;
    }
  };

  // Stop the current running connection timer
  #clearConnectionTimer = () => {
    if (this.#connectionTimer) {
      // Stop timer
      window.clearTimeout(this.#connectionTimer);
      // Reset timer value to 0
      this.#connectionTimer = 0;
    }
  };

  // Pull latest state values on demand (prevent stale state in callback events)
  #getState = () => this.state;

  #updateLocalStorage = (updatedState: Partial<WCSState>) => {
    // Special values to look for
    const {
      connectionEXP,
      connectionEST,
      connectionTimeout,
      signedJWT,
      walletAppId,
    } = updatedState;
    // If the value was changed, add it to the localStorage updates
    const storageUpdates = {
      ...(connectionEXP !== undefined && { connectionEXP }),
      ...(connectionEST !== undefined && { connectionEST }),
      ...(connectionTimeout !== undefined && { connectionTimeout }),
      ...(signedJWT !== undefined && { signedJWT }),
      ...(walletAppId !== undefined && { walletAppId }),
    };
    // If we have updated 1 or more special values, update localStorage
    if (Object.keys(storageUpdates).length) {
      addToLocalStorage('walletconnect-js', storageUpdates);
    }
  };

  // Reset walletConnectService state back to the original default state
  #resetState = () => {
    this.state = { ...defaultState };
    this.#updateContext();
    clearLocalStorage('walletconnect-js');
  };

  // Change the class state
  #setState: WCSSetState = (updatedState, updateLocalStorage = true) => {
    // If the updatedState passes a connector value we want to use it but save it separatly from the public state
    const { connector, ...filteredUpdatedState } = updatedState;
    let finalUpdatedState = { ...filteredUpdatedState };
    // Pull out/surface connector data for state
    finalUpdatedState = {
      ...updatedState,
    };
    // If we get a new "connector" passed in, pull various data keys out
    // if (connector) {
    //   // Update private connector value
    //   this.#connector = connector;
    //   // Pull out/surface connector data for state
    //   const { bridge, peerMeta, accounts, connected } = connector;
    //   const status = connected ? 'connected' : 'disconnected';
    //   const { address, jwt, publicKey, representedGroupPolicy, walletInfo } =
    //     getAccountInfo(accounts);
    //   finalUpdatedState = {
    //     ...updatedState,
    //     address,
    //     bridge,
    //     status,
    //     // We always want to use the jwt in the state over the connector since newer jwts won't show up in the connector
    //     signedJWT: this.state.signedJWT || jwt,
    //     publicKey,
    //     representedGroupPolicy,
    //     walletInfo,
    //     peer: peerMeta,
    //   };
    // }
    // Loop through each to update
    this.state = { ...this.state, ...finalUpdatedState };
    this.#updateContext();
    // Write state changes into localStorage as needed
    if (updateLocalStorage) this.#updateLocalStorage(finalUpdatedState);
  };

  // Update the class object to reflect the latest state changes
  #updateContext = (): void => {
    if (this.#setWalletConnectContext) {
      this.#setWalletConnectContext({
        ...this.state,
      });
    }
  };

  // Create listeners used with eventEmitter/broadcast results
  addListener<Name extends keyof BroadcastEventData>(
    eventName: Name,
    callback: (results: BroadcastEventData[Name]) => void
  ) {
    this.#eventEmitter.addListener(eventName, callback);
  }

  // Remove listener w/specific eventName used with eventEmitter/broadcast results
  removeListener<Name extends keyof BroadcastEventData>(
    targetEvent: Name | 'all',
    callback?: (results: BroadcastEventData[Name]) => void
  ) {
    if (targetEvent === 'all') {
      this.#eventEmitter.eventNames().forEach((eventName) => {
        this.#eventEmitter.removeAllListeners(eventName);
      });
    } else if (callback) {
      // Callback must be provided to remove specific event action
      this.#eventEmitter.removeListener(targetEvent, callback);
    }
  }

  // One or more values within localStorage have changed, see if we care about any of the values and update the state as needed
  handleLocalStorageChange = (storageEvent: StorageEvent) => {
    const { key: storageEventKey, newValue, oldValue } = storageEvent;
    const validStorageEventKey =
      storageEventKey === LOCAL_STORAGE_NAMES.WALLETCONNECT ||
      storageEventKey === LOCAL_STORAGE_NAMES.WALLETCONNECTJS;
    if (validStorageEventKey) {
      const newValueObj = JSON.parse(newValue || '{}') as Partial<
        WCJSLocalState & WCLocalState
      >;
      const oldValueObj = JSON.parse(oldValue || '{}') as Partial<
        WCJSLocalState & WCLocalState
      >;
      // Keys to look for within 'walletconnect' storage object
      const targetWCValues: Partial<WCLocalStateKeys>[] = [
        'accounts',
        'bridge',
        'connected',
      ];

      // Keys to look for within 'walletconnect-js' storage object
      const targetWCJSValues: WCJSLocalStateKeys[] = [
        'connectionEXP',
        'connectionEST',
        'connectionTimeout',
        'signedJWT',
        'walletAppId',
      ];
      // Look for specific changed key values in the objects and return a final object with all the changes
      const findChangedValues = (
        targetValues: typeof targetWCValues | typeof targetWCJSValues
      ) => {
        const foundChangedValues = {} as Record<
          WCLocalStateKeys[number] | WCJSLocalStateKeys[number],
          unknown
        >;
        targetValues.forEach((targetKey) => {
          // Accounts array holds an object with data, but we only want to look at the address value
          // Idea here is that if the account changed we should reload the connection to get the full new data
          if (targetKey === 'accounts') {
            if (
              newValueObj?.accounts?.[0].address !==
              oldValueObj.accounts?.[0].address
            ) {
              foundChangedValues.address = newValueObj?.accounts?.[0].address;
            }
          } else if (newValueObj[targetKey] !== oldValueObj[targetKey]) {
            foundChangedValues[targetKey] = newValueObj[targetKey];
          }
        });
        return foundChangedValues;
      };
      let changedValuesWC, changedValuesWCJS;
      // Make sure the key is changing a value we care about, must be walletconnect or walletconnect-js
      if (storageEventKey === LOCAL_STORAGE_NAMES.WALLETCONNECT)
        changedValuesWC = findChangedValues(targetWCValues);
      if (storageEventKey === LOCAL_STORAGE_NAMES.WALLETCONNECTJS)
        changedValuesWCJS = findChangedValues(targetWCJSValues);

      const changedValues = { ...changedValuesWC, ...changedValuesWCJS };
      const totalChangedValues = Object.keys(changedValues).length;
      if (totalChangedValues) {
        this.#updateState();
      }
    }
  };

  // Create a stateUpdater, used for context to be able to auto change this class state
  setContextUpdater(updateFunction: WCSSetFullState): void {
    this.#setWalletConnectContext = updateFunction;
  }

  // Set a new walletAppId
  setWalletAppId = (id: WalletId) => {
    this.#setState({ walletAppId: id });
  };

  // Update the modal values
  updateModal = (newModalData: UpdateModalData) => {
    const newModal = { ...this.state.modal, ...newModalData };
    let status = this.state.status;
    // If we're closing the modal and #connector isn't connected, update the status from "pending" to "disconnected".  Note: walletAppId will prevent a popup and is different from "closing", so check for it.
    if (
      !newModalData.showModal &&
      status === 'pending' &&
      !this.#connector?.connected &&
      !newModalData.walletAppId
    ) {
      status = 'disconnected';
    }
    this.#setState({
      modal: newModal,
      status,
      ...(newModalData.walletAppId && { walletAppId: newModalData.walletAppId }),
    });
  };

  /**
   *
   * @param connectionTimeout (optional) Seconds to bump the connection timeout by
   */
  resetConnectionTimeout = (connectionTimeout?: number) => {
    // Use the new (convert to ms) or existing connection timeout
    const newConnectionTimeout = connectionTimeout
      ? connectionTimeout * 1000
      : this.state.connectionTimeout;
    // Kill the last timer (if it exists)
    this.#clearConnectionTimer();
    // Build a new connectionEXP (Iat + connectionTimeout)
    const connectionEXP = newConnectionTimeout + Date.now();
    // Save these new values (needed for session restore functionality/page refresh)
    this.#setState({ connectionTimeout: newConnectionTimeout, connectionEXP });
    // Start a new timer
    this.#startConnectionTimer();
    // Send connected wallet custom event with the new connection details
    if (this.state.walletAppId) {
      sendWalletEvent(
        this.state.walletAppId,
        WALLET_APP_EVENTS.RESET_TIMEOUT,
        newConnectionTimeout
      );
    }
  };

  /**
   * @param bridge - (optional) URL string of bridge to connect into
   * @param duration - (optional) Time before connection is timed out (seconds)
   * @param individualAddress - (optional) Individual address to establish connection with, note, if requested, it must exist
   * @param groupAddress - (optional) Group address to establish connection with, note, if requested, it must exist
   * @param prohibitGroups - (optional) Does this dApp ban group accounts connecting to it
   * @param jwtExpiration - (optional) Time from now in seconds to expire new JWT returned
   * @param walletAppId - (optional) Open a specific wallet directly (bypassing the QRCode modal)
   * @param onDisconnect - (optional) Action to take if a disconnect call comes in (to handle wallet disconnecting from dApp)
   */
  connect = async ({
    individualAddress,
    groupAddress,
    bridge,
    duration,
    jwtExpiration,
    prohibitGroups,
    walletAppId,
    onDisconnect,
  }: ConnectMethod = {}) => {
    const results = await connectMethod({
      individualAddress,
      groupAddress,
      bridge,
      duration,
      jwtExpiration,
      prohibitGroups,
      walletAppId,
    });
    // Based on the results perform service actions
    if (results.error) return { error: results.error };
    // No error means we've connected, add the disconnect event if passed in
    else if (onDisconnect) this.#setState({ onDisconnect });
    if (results.state) this.#setState(results.state);
    if (results.resetState) this.#resetState();
    // TODO: What should we return to the user?
    return 'something...';
  };

  /**
   *
   * @param message (optional) Custom disconnect message to send back to dApp
   * */
  disconnect = async (message?: string) => {
    // Run disconnect callback function if provided/exists
    if (this.state.onDisconnect) this.state.onDisconnect(message);
    this.#resetState();
    return message;
  };

  /**
   * @param customId (optional) custom id to track this transaction message
   * @param description (optional) Additional information for wallet to display
   * @param extensionOptions (optional) Tx body extensionOptions
   * @param feeGranter (optional) Specify a fee granter address
   * @param feePayer (optional) Specify a fee payer address
   * @param gasPrice (optional) Gas price object to use
   * @param memo (optional) Tx body memo
   * @param message (required) Raw Base64 encoded msgAny string
   * @param method (optional) What method is used to send this message
   * @param nonCriticalExtensionOptions (optional) Tx body nonCriticalExtensionOptions
   * @param timeoutHeight (optional) Tx body timeoutHeight
   */
  sendMessage = async ({
    customId,
    description,
    extensionOptions,
    feeGranter,
    feePayer,
    gasPrice,
    memo,
    message,
    method,
    nonCriticalExtensionOptions,
    timeoutHeight,
  }: SendMessageMethod) => {
    // Loading while we wait for response
    this.#setState({ pendingMethod: 'sendMessage' });
    const result = await sendMessageMethod({
      address: this.state.address,
      connector: this.#connector,
      customId,
      walletAppId: this.state.walletAppId,
      data: {
        message,
        description,
        gasPrice,
        method,
        feeGranter,
        feePayer,
        timeoutHeight,
        extensionOptions,
        nonCriticalExtensionOptions,
        memo,
      },
      logsEnabled: this.#logsEnabled,
    });
    // No longer loading
    this.#setState({ pendingMethod: '' });
    // Broadcast result of method
    const windowMessage = result.error
      ? WINDOW_MESSAGES.SEND_MESSAGE_FAILED
      : WINDOW_MESSAGES.SEND_MESSAGE_COMPLETE;
    this.#broadcastEvent(windowMessage, result);
    // Refresh auto-disconnect timer
    this.resetConnectionTimeout();

    return result;
  };

  /**
   *
   * @param groupPolicyAddress the Group Policy to switch the wallet to - if null, the wallet
   *        will "unswitch" the group
   * @param description (optional) provide description to display in the wallet when
   *        switching to group policy address
   */
  switchToGroup = async (groupPolicyAddress?: string, description?: string) => {
    // Loading while we wait for response
    this.#setState({ pendingMethod: 'switchToGroup' });
    const result = await sendWalletActionMethod({
      connector: this.#connector,
      walletAppId: this.state.walletAppId,
      data: {
        action: 'switchToGroup',
        payload: groupPolicyAddress ? { address: groupPolicyAddress } : undefined,
        description,
        method: 'wallet_action',
      },
    });
    // No longer loading
    this.#setState({ pendingMethod: '' });
    // Broadcast result of method
    const windowMessage = result.error
      ? WINDOW_MESSAGES.SWITCH_TO_GROUP_FAILED
      : WINDOW_MESSAGES.SWITCH_TO_GROUP_COMPLETE;
    this.#broadcastEvent(windowMessage, result);
    // Refresh auto-disconnect timer
    this.resetConnectionTimeout();

    return result;
  };

  /**
   *
   * @param expires Time from now in seconds to expire new JWT
   */
  signJWT = async (expires: number, options?: { customId?: string }) => {
    // Loading while we wait for response
    this.#setState({ pendingMethod: 'signJWT' });
    const result = await signJWTMethod({
      address: this.state.address,
      connector: this.#connector,
      customId: options?.customId,
      expires,
      publicKey: this.state.publicKey,
      setState: this.#setState,
      walletAppId: this.state.walletAppId,
    });
    // No longer loading
    this.#setState({ pendingMethod: '' });
    // Broadcast result of method
    const windowMessage = result.error
      ? WINDOW_MESSAGES.SIGN_JWT_FAILED
      : WINDOW_MESSAGES.SIGN_JWT_COMPLETE;
    this.#broadcastEvent(windowMessage, result);
    // Refresh auto-disconnect timer
    this.resetConnectionTimeout();
    return result;
  };

  /**
   *
   * @param customMessage Message you want the wallet to sign
   */
  signHexMessage = async (hexMessage: string, options?: { customId?: string }) => {
    // Loading while we wait for response
    this.#setState({ pendingMethod: 'signHexMessage' });
    // Wait to get the result back
    const result = await signHexMessageMethod({
      address: this.state.address,
      connector: this.#connector,
      customId: options?.customId,
      hexMessage,
      publicKey: this.state.publicKey,
      walletAppId: this.state.walletAppId,
    });
    console.log('walletConnectService | signHex result: ', result);
    // No longer loading
    this.#setState({ pendingMethod: '' });
    // Broadcast result of method
    const windowMessage = result.error
      ? WINDOW_MESSAGES.SIGN_HEX_MESSAGE_FAILED
      : WINDOW_MESSAGES.SIGN_HEX_MESSAGE_COMPLETE;
    this.#broadcastEvent(windowMessage, result);
    // Refresh auto-disconnect timer
    this.resetConnectionTimeout();

    return result;
  };

  /**
   * @param customId string (required) string id value of pending action you want to target
   */
  removePendingMethod = async (customId: string) => {
    // Loading while we wait for response
    this.#setState({ pendingMethod: 'removePendingMethod' });
    // Wait to get the result back
    const result = await sendWalletActionMethod({
      connector: this.#connector,
      walletAppId: this.state.walletAppId,
      data: {
        action: 'removePendingMethod',
        payload: { customId },
        method: 'wallet_action',
      },
    });
    // No longer loading
    this.#setState({ pendingMethod: '' });
    // Broadcast result of method
    const windowMessage = result.error
      ? WINDOW_MESSAGES.REMOVE_PENDING_METHOD_FAILED
      : WINDOW_MESSAGES.REMOVE_PENDING_METHOD_COMPLETE;
    this.#broadcastEvent(windowMessage, result);
    // Refresh auto-disconnect timer
    this.resetConnectionTimeout();

    return result;
  };
}
