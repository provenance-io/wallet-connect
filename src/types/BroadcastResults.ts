import WalletConnectClient from "@walletconnect/client";
import { MarkerResults } from './MarkerResults'
import { CustomActionResults } from './CustomActionResults'
import { SignJWTResult } from './SignJWTResult'

export type BroadcastResults = {
  params?: MarkerResults | WalletConnectClient | CustomActionResults | SignJWTResult
}