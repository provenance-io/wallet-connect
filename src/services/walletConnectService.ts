import WalletConnectClient from '@walletconnect/client';
import { Buffer } from 'buffer';
import {
  LOCAL_STORAGE_NAMES,
  WALLET_APP_EVENTS,
  WCS_DEFAULT_STATE,
  WINDOW_MESSAGES,
} from '../consts';
import type {
  ConnectMethod,
  PartialState,
  SendMessageMethod,
  UpdateModalData,
  WCLocalState,
  WCSState,
  WalletConnectClientType,
} from '../types';
import {
  addToLocalStorage,
  clearLocalStorage,
  getChangedFields,
  getLocalStorageValues,
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

export class WalletConnectService {
  #connectionTimer = 0; // Timer tracking when the currenct wcjs connection should expire

  #connector?: WalletConnectClientType; // walletconnect connector object

  #updateContext: ((state: WCSState) => void) | undefined = undefined; // Connect class state updates to context wrapper

  state: WCSState = WCS_DEFAULT_STATE; // Main data held and used within this class object

  // Keep all state updates tidy in a single method (prevent random setting in methods)
  #setState = (
    updatedState: PartialState<WCSState> | 'reset',
    updateLocalStorage = true
  ) => {
    const isReset = updatedState === 'reset';
    // Either clone the default state (due to reset) or use existing state
    const newState = Object.assign({}, isReset ? WCS_DEFAULT_STATE : this.state);
    // Resets don't need to update any values
    if (!isReset) {
      // Since state is not a flat object, we need to loop through each level to add/combine data vs overwriting all of it
      // Eg: Only change the state.wallet.address (leave all other state.wallet values the same)
      const updatedStateKeys = Object.keys(updatedState) as Array<
        keyof typeof updatedState
      >;
      updatedStateKeys.forEach((updateKey) => {
        const newNestedState = updatedState[updateKey];
        const existingNestedState = newState[updateKey];
        // Note: Due to TS limitations, we can't infer the key here and have to manually build out state
        switch (updateKey) {
          case 'connection':
            newState.connection = {
              ...existingNestedState,
              ...newNestedState,
            } as WCSState['connection'];
            break;
          case 'modal':
            newState.modal = {
              ...existingNestedState,
              ...newNestedState,
            } as WCSState['modal'];
            break;
          case 'wallet':
            newState.wallet = {
              ...existingNestedState,
              ...newNestedState,
            } as WCSState['wallet'];
            break;
        }
      });
    }
    // Update the state based on the newState
    this.state = newState;
    // Let the context provider know we've updated our state
    if (this.#updateContext) this.#updateContext(newState);
    // If needed, write state changes into wcjs localStorage
    if (updateLocalStorage) {
      if (isReset) clearLocalStorage('walletconnect-js');
      else addToLocalStorage('walletconnect-js', newState);
    }
  };

  // Keep the WalletConnect connector saved, but inaccessable/out of the class state
  #setConnector(connector?: WalletConnectClientType) {
    this.#connector = connector;
  }

  constructor() {
    // Pull 'walletconnect' and 'walletconnect-js' localStorage values to see if we might already be connected
    const { existingWCJSState, existingWCState } = getLocalStorageValues();
    // Add all the existing wcjs values from localStorage into state
    this.#setState(existingWCJSState);
    // Are we already connected with walletconnect?
    if (
      existingWCState &&
      existingWCState.connected &&
      existingWCState.accounts.length
    ) {
      // Rebuild the connector from existing session data
      const newConnector = new WalletConnectClient({
        session: existingWCState.session,
      });
      this.#setConnector(newConnector);
    }
    // Setup a listener for localStorage changes
    window.addEventListener('storage', this.#handleLocalStorageChange);
  }

  // Allow this class to notify/update the context about state changes
  setContextUpdater(updateFunction: (state: WCSState) => void): void {
    this.#updateContext = updateFunction;
  }

  // Control auto-disconnect / timeout
  #startConnectionTimer = () => {
    // Can't start a timer if one is already running (make sure we have EXP and EST too)
    if (
      !this.#connectionTimer &&
      this.state.connection.exp &&
      this.state.connection.est
    ) {
      // Get the time until expiration (typically this.state.connectionTimeout, but might not be if session restored from refresh)
      const connectionTimeout = this.state.connection.exp - Date.now();
      // Create a new timer
      const newConnectionTimer = window.setTimeout(() => {
        // When this timer expires, kill the session
        this.disconnect();
      }, connectionTimeout);
      // Save this timer (so it can be deleted on a reset)
      this.#connectionTimer = newConnectionTimer;
    }
  };

  // Pull latest state values on demand (prevent stale state in callback events)
  #getState = () => this.state;

  // WalletConnect localStorage values changed
  #localStorageChangeWalletConnectJS(
    newValue: string | null,
    oldValue: string | null
  ) {
    // Convert each string json into a workable object
    const newLocalStorageObj = JSON.parse(newValue || '{}') as Partial<WCSState>;
    const oldLocalStorageObj = JSON.parse(oldValue || '{}') as Partial<WCSState>;
    // We only care about specific storage values in walletconnect
    const targetValues = [
      'connectionEXP',
      'connectionEST',
      'connectionTimeout',
      'signedJWT',
      'walletAppId',
    ];
    // Which of these target values changed in the new storage object?
    const changedObj = getChangedFields(
      newLocalStorageObj,
      oldLocalStorageObj,
      targetValues
    );
  }

  // WalletConnect localStorage values changed
  #localStorageChangeWalletConnect(
    newValue: string | null,
    oldValue: string | null
  ) {
    // Convert each string json into a workable object
    const newLocalStorageObj = JSON.parse(newValue || '{}') as Partial<WCLocalState>;
    const oldLocalStorageObj = JSON.parse(oldValue || '{}') as Partial<WCLocalState>;
    // We only care about specific storage values in walletconnect
    const targetValues = ['accounts', 'bridge', 'connected'];
    // Which of these target values changed in the new storage object?
    const changedObj = getChangedFields(
      newLocalStorageObj,
      oldLocalStorageObj,
      targetValues
    );
  }

  // One or more values within localStorage have changed, see if we care about any of the values and update the state as needed
  #handleLocalStorageChange(storageEvent: StorageEvent) {
    const { key: storageEventKey, newValue, oldValue } = storageEvent;
    // WalletConnect-JS localStorage values changed
    // Info: Another tab triggered a disconnect, or "switch account", connectionTimeout reset, etc
    if (storageEventKey === LOCAL_STORAGE_NAMES.WALLETCONNECTJS)
      this.#localStorageChangeWalletConnectJS(newValue, oldValue);
    // WalletConnect localStorage values changed
    else if (storageEventKey === LOCAL_STORAGE_NAMES.WALLETCONNECT)
      this.#localStorageChangeWalletConnect(newValue, oldValue);
  }

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
    if (this.#connectionTimer) {
      // Stop timer
      window.clearTimeout(this.#connectionTimer);
      // Reset timer value to 0
      this.#connectionTimer = 0;
    }
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
