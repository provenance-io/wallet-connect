<div align="center">
  <img src="./src/logo.svg" alt="Provenance.io WalletConnect-JS"/>
</div>
<br/><br/>

# Provenance.io WalletConnect-JS

Library to interface with Provenance Wallet using WalletConnect.

[Provenance] is a distributed, proof of stake blockchain designed for the financial services industry.

For more information about [Provenance Inc](https://provenance.io) visit https://provenance.io


## Table of Contents
1. [Installation](#Installation)
2. [Window messages](#Window-Messages)
3. [WalletConnectContextProvider](#WalletConnectContextProvider)
4. [useWalletConnect](#useWalletConnect)
5. [walletConnectService](#walletConnectService)
    - [activateRequest](#activateRequest)
    - [addMarker](#addMarker)
    - [cancelRequest](#cancelRequest)
    - [connect](#connect)
    - [delegateHash](#delegateHash)
    - [disconnect](#disconnect)
    - [sendHash](#sendHash)
    - [signJWT](#signJWT)
    - [signMessage](#signMessage)
    - [writeScope](#writeScope)
6. [walletConnectState](#walletConnectState)
7. [Web App](#Web-App)
8. [Clone LocalStorage](#Automatic-localSession-copy)
9. [WalletConnect-js Status](#Status)

## Installation

Import the dependency

```bash
npm install @provenanceio/walletconnect-js --save
```

Importable items:

```js
import { WINDOW_MESSAGES, WalletConnectContextProvider, useWalletConnect } from '@provenanceio/walletconnect-js';
```
## Window Messages
Each method will return a window message indicating whether it failed or was completed as well as the result

*Note A: See `walletConnectService` for all `WINDOW_MESSAGES` based on method.*
*Note B: All of these are based off Node.js Event Emitters, read more on them here: [Node.js Event Emitters](https://nodejs.org/api/events.html#event-newlistener)*
```js
// (Example using cancelRequest)

// Listen for complete/success
walletConnectService.addListener(WINDOW_MESSAGE.CANCEL_REQUEST_COMPLETE, (result) => {
  console.log(`WalletConnectJS | Complete | Result: `, result);
};
// Listen for error/failure
walletConnectService.addListener(WINDOW_MESSAGE.CANCEL_REQUEST_FAILED, (result) => {
  const { error } = result;
  console.log(`WalletConnectJS | Failed | result, error: `, result, error);
};
```

## WalletConnectContextProvider
React context provider to supply state to every child within
  - Include as parent to all Components using `walletconnect-js`
  - Takes in an optional `network` prop of `"mainnet"` or `"testnet"` (default `"mainnet"`)
    ```js
      // Controls the automatic session logout / idle time
      mainnet: 900, // 15 min
      testnet: 99999, // 27 hours
    ```
  - Usage Example (w/React.js):
    ```js
    // index.js
    ...

    ReactDOM.render(
      <WalletConnectContextProvider network="testnet">
        <App />
      </WalletConnectContextProvider>,
      document.getElementById('root')
    );
    ```

## useWalletConnect

React hook which contains `walletConnectService` and `walletConnectState`

## walletConnectService
  - Holds all main methods and functions to use WalletConnect service
  
  - #### activateRequest
    Activate a request
    ```js
      walletConnectService.activateRequest(denom);
      // denom: string | 'My_Special_Marker'
      // WINDOW_MESSAGES: ACTIVATE_REQUEST_COMPLETE, ACTIVATE_REQUEST_FAILED
    ```
  - #### addMarker
    Add a marker
    ```js
      walletConnectService.addMarker({ denom, amount });
      // denom: string | 'My_Special_Marker'
      // amount: number | 10
      // WINDOW_MESSAGES: ADD_MARKER_COMPLETE, ADD_MARKER_FAILED
    ```
  - #### cancelRequest
    Cancels a request
    ```js
      walletConnectService.cancelRequest(denom);
      // denom: string | 'My_Special_Marker'
      // WINDOW_MESSAGES: CANCEL_REQUEST_COMPLETE, CANCEL_REQUEST_FAILED
    ```
  - #### connect
    Connect a WalletConnect wallet
    ```js
      walletConnectService.connect();
      // WINDOW_MESSAGE: CONNECTED
    ```
  - #### delegateHash
    Delegate a custom amount of Hash token to a custom address
    ```js
      walletConnectService.delegateHash({ to, amount });
      // to: string | 'tpa1b23'
      // amount: number | 10
      // WINDOW_MESSAGES: DELEGATE_HASH_COMPLETE, DELEGATE_HASH_FAILED
    ```
  - #### disconnect
    Disconnect current session
    ```js
      walletConnectService.disconnect();
      // WINDOW_MESSAGE: DISCONNECT
    ```
  - #### sendHash
    Send a custom amount of Hash token to a custom address
    ```js
      walletConnectService.sendHash({ to, amount });
      // to: string | 'tpa1b23'
      // amount: number | 10
      // WINDOW_MESSAGES: TRANSACTION_COMPLETE, TRANSACTION_FAILED
    ```
  - #### signJWT
    Prompt user to sign a generated JWT
    ```js
      walletConnectService.signJWT();
      // WINDOW_MESSAGES: SIGN_JWT_COMPLETE, SIGN_JWT_FAILED
    ```
  - #### signMessage
    Prompt user to sign a custom message
    ```js
      walletConnectService.signMessage(message);
      // message: string | 'My Custom Message'
      // WINDOW_MESSAGES: SIGNATURE_COMPLETE, SIGNATURE_FAILED
    ```
  - #### writeScope
    Write to a scope
    ```js
      walletConnectService.writeScope({ scope, signersList, scopeUuid, specUuid });
      // scope: object | {}
      // signersList: array | []
      // scopeUuid: string | 'A8675-309-867A'
      // specUuid: string | '867B-5309-J3NNY'
      // WINDOW_MESSAGES: WRITE_SCOPE_COMPLETE, WRITE_SCOPE_FAILED
    ```

## walletConnectState
  - Holds current walletconnect-js state values
    ```js
    initialState: {
      account: '', // Figure account uuid [string]
      address: '', // Wallet address [string]
      assets: [], // Wallet assets [array]
      connected: false, // WalletConnect connected [bool]
      connectionIat: null, // WalletConnect initialized at time [number]
      connector: null, // WalletConnect connector 
      figureConnected: false, // Account and address both exist [bool]
      loading: '', // Are any methods currently loading/pending [string]
      newAccount: false, // Is this a newly created account
      peer: {}, // Connected wallet info [object]
      publicKey: '', // Wallet public key
      QRCode: '', // QR Code to connect to WalletConnect bridge [string]
      showQRCodeModal: false, // Should the QR modal be open [bool]
      signedJWT: '', // Signed JWT token [string]
    }
    ```

## Web App
This package comes bundled with a full React demo that you can run locally to test out the various features of `walletconnect-js`.
To see how to initiate and run the webDemo, look through the [webDemo README.md](./webDemo/README.md)

  * Quick Start:
    1) Pull down the latest `walletconnect-js`.
    2) Run `npm i` to install all the required node packages
    3) Run `npm run start` to launch a localhost demo, live updates take place on each page reload.

## Automatic localSession copy
Copy `window.localStorage` values from one site to another (mainly, to `localHost`)
  1) Run this command in console on the first page you with to copy from
  ```js
  copy(`Object.entries(${JSON.stringify(localStorage)})
  .forEach(([k,v])=>localStorage.setItem(k,v))`)
  ```
  2) Paste result (clipboard should automatically have been filled) into target page console.
  3) Refresh page, storage values should be synced.

## Status

[![Latest Release][release-badge]][release-latest]
[![Apache 2.0 License][license-badge]][license-url]
[![LOC][loc-badge]][loc-report]

[license-badge]: https://img.shields.io/github/license/provenance-io/walletconnect-js.svg
[license-url]: https://github.com/provenance-io/walletconnect-js/blob/main/LICENSE
[release-badge]: https://img.shields.io/github/tag/provenance-io/walletconnect-js.svg
[release-latest]: https://github.com/provenance-io/walletconnect-js/releases/latest
[loc-badge]: https://tokei.rs/b1/github/provenance-io/walletconnect-js
[loc-report]: https://github.com/provenance-io/walletconnect-js
[lint-badge]: https://github.com/provenance-io/walletconnect-js/workflows/Lint/badge.svg
[provenance]: https://provenance.io/#overview

This application is under heavy development. The upcoming public blockchain is the evolution of the private Provenance network blockchain started in 2018.
Current development is being supported by [Figure Technologies](https://figure.com).
