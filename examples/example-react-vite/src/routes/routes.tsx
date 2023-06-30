import { HOMEPAGE_URL } from 'consts';
import { Connect } from 'Page';
import { Root } from 'Page';
import { CONNECT } from './connect';
import { DAPP } from './dApp';
import {
  RESET_CONNECTION,
  SEND_MESSAGE,
  SEND_COIN,
  SIGN_JWT,
  SIGN_HEX_MESSAGE,
  SWITCH_TO_GROUP_ACTION,
  REMOVE_PENDING_METHOD,
} from './actions';

export const routes = [
  {
    path: HOMEPAGE_URL,
    element: <Root />,
    children: [
      { index: true, element: <Connect /> },
      CONNECT,
      DAPP,
      RESET_CONNECTION,
      SEND_COIN,
      SEND_MESSAGE,
      SIGN_HEX_MESSAGE,
      SIGN_JWT,
      SWITCH_TO_GROUP_ACTION,
      REMOVE_PENDING_METHOD,
    ],
  },
  // { path: FOUR_OH_FOUR_URL, element: <NotFound /> },
  // { path: '*', element: <Navigate to={FOUR_OH_FOUR_URL} /> },
];
