export const ALL_ACTIONS = [
  // ----------------------------------
  // Activate Request Method/Action
  // ----------------------------------
  {
    windowMessage: 'ACTIVATE_REQUEST',
    method: 'activateRequest',
    fields: [
      {
        name: 'denom',
        label: 'Marker Denom',
        value: 'myNewMarker',
        placeholder: 'Enter Marker Denom',
      },
    ],
  },
  // ----------------------------------
  // Add Marker Method/Action
  // ----------------------------------
  {
    windowMessage: 'ADD_MARKER',
    method: 'addMarker',
    fields: [
      {
        name: 'denom',
        label: 'Marker Denom',
        value: 'myNewMarker',
        placeholder: 'Enter Marker Denom',
        width: '80%',
      },
      {
        name: 'amount',
        label: 'Amount',
        value: '1',
        placeholder: 'Enter Marker Amount',
        width: '20%',
      },
    ],
  },
  // ------------------------------
  // Cancel Request Method/Action
  // ------------------------------
  {
    windowMessage: 'CANCEL_REQUEST',
    method: 'cancelRequest',
    fields: [
      {
        name: 'denom',
        label: 'Marker Denom',
        value: 'myNewMarker',
        placeholder: 'Enter Marker Denom',
      },
    ],
  },
  // ------------------------------
  // Custom Action Method/Action
  // ------------------------------
  {
    windowMessage: 'CUSTOM_ACTION',
    method: 'customAction',
    gas: true,
    fields: [
      {
        name: 'description',
        label: 'Wallet message description',
        value: '',
        placeholder: 'Enter custom action description'
      },
      {
        name: 'method',
        label: 'Message method',
        value: 'provenance_sendTransaction',
        placeholder: 'Enter the message method'
      },
      {
        name: 'gasPrice',
        label: 'Gas Price',
        value: '',
        placeholder: 'Gas Price (Defaults to Figure Gas Price)',
        width: '50%',
      },
      {
        name: 'gasPriceDenom',
        label: 'Gas Denom',
        value: '',
        placeholder: 'Gas Denom (Defaults to Figure Gas Denom)',
        width: '50%',
      },
      {
        name: 'message',
        label: 'Base64 Encoded Message',
        value: '',
        placeholder: 'Enter Base64 Encoded Message',
        base64: true,
      },
    ],
  },
  // ----------------------------------
  // Delegate Hash Method/Action
  // ----------------------------------
  {
    windowMessage: 'DELEGATE_HASH',
    method: 'delegateHash',
    gas: true,
    fields: [
      {
        name: 'validatorAddress',
        label: 'Delegate To',
        value: 'tpvaloper1tgq6cpu6hmsrvkvdu82j99tsxxw7qqajn843fe',
        placeholder: 'Enter Address',
        width: '80%',
      },
      {
        name: 'amount',
        label: 'Amount',
        value: '1',
        placeholder: 'Enter Delegation Amount',
        width: '20%',
      },
      {
        name: 'gasPrice',
        label: 'Gas Price',
        value: '',
        placeholder: 'Gas Price (Defaults to Figure Gas Price)',
        width: '50%',
      },
      {
        name: 'gasPriceDenom',
        label: 'Gas Denom',
        value: '',
        placeholder: 'Gas Denom (Defaults to Figure Gas Denom)',
        width: '50%',
      },
    ],
  },
  // ----------------------------------
  // Send Coin Method/Action
  // ----------------------------------
  {
    windowMessage: 'TRANSACTION',
    method: 'sendCoin',
    gas: true,
    fields: [
      {
        name: 'denom',
        label: 'Coin Denom',
        value: 'Hash',
        placeholder: 'Enter Coin Denom',
        width: '20%',
      },
      {
        name: 'to',
        label: 'Coin To',
        value: 'tp1vxlcxp2vjnyjuw6mqn9d8cq62ceu6lllpushy6',
        placeholder: 'Enter Address',
        width: '70%',
      },
      {
        name: 'amount',
        label: 'Amount',
        value: '10',
        placeholder: 'Enter Send Amount',
        width: '10%',
      },
      {
        name: 'gasPrice',
        label: 'Gas Price',
        value: '',
        placeholder: 'Gas Price (Defaults to Figure Gas Price)',
        width: '50%',
      },
      {
        name: 'gasPriceDenom',
        label: 'Gas Denom',
        value: '',
        placeholder: 'Gas Denom (Defaults to Figure Gas Denom)',
        width: '50%',
      },
    ],
  },
  // ----------------------------------
  // Send Hash Method/Action
  // ----------------------------------
  {
    windowMessage: 'TRANSACTION',
    method: 'sendHash',
    gas: true,
    fields: [
      {
        name: 'to',
        label: 'Hash To',
        value: 'tp1vxlcxp2vjnyjuw6mqn9d8cq62ceu6lllpushy6',
        placeholder: 'Enter Address',
        width: '80%',
      },
      {
        name: 'amount',
        label: 'Amount',
        value: '10',
        placeholder: 'Enter Send Amount',
        width: '20%',
      },
      {
        name: 'gasPrice',
        label: 'Gas Price',
        value: '',
        placeholder: 'Gas Price (Defaults to Figure Gas Price)',
        width: '50%',
      },
      {
        name: 'gasPriceDenom',
        label: 'Gas Denom',
        value: '',
        placeholder: 'Gas Denom (Defaults to Figure Gas Denom)',
        width: '50%',
      },
    ],
  },
  // ------------------------------
  // Sign JWT Method/Action
  // ------------------------------
  {
    windowMessage: 'SIGN_JWT',
    method: 'signJWT',
  },
  // ----------------------------------
  // Sign Message Method/Action
  // ----------------------------------
  {
    windowMessage: 'SIGNATURE',
    method: 'signMessage',
    fields: [
      {
        value: 'WalletConnect-JS | WebDemo | Sign Message',
        label: 'Message',
        placeholder: 'Enter Message',
        name: 'message',
      },
    ],
  },
  // ----------------------------------
  // Batch Hash Send
  // ----------------------------------
  {
    windowMessage: 'TRANSACTION',
    method: 'sendHashBatch',
    fields: [
      {
        name: 'to',
        label: 'Hash To',
        value: 'tp1vxlcxp2vjnyjuw6mqn9d8cq62ceu6lllpushy6',
        placeholder: 'Enter Address',
        width: '70%',
      },
      {
        name: 'amount',
        label: 'Amount',
        value: '1',
        placeholder: 'Enter Send Amount',
        width: '20%',
      },
      {
        value: 2,
        label: 'Count',
        placeholder: 'Enter Repeat Count',
        name: 'count',
        width: '10%',
      },
    ],
  },
];
