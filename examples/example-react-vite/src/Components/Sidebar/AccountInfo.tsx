import { useWalletConnect } from '@provenanceio/walletconnect-js';
import { CopyValue } from 'Components';
import styled from 'styled-components';
import { COLORS } from 'theme';

const RowInfo = styled.div`
  padding: 0 20px 0 40px;
  font-size: 0.95rem;
  color: ${COLORS.NEUTRAL_600};
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 18px;
`;
const RowInfoTitle = styled.p`
  font-weight: 700;
  font-size: 1.2rem;
  user-select: none;
  flex-basis: 100%;
  margin-bottom: 2px;
`;
const RowInfoValue = styled.div`
  display: flex;
  align-items: flex-start;
  flex-basis: 100%;
  word-break: break-all;
`;

export const AccountInfo: React.FC = () => {
  const { walletConnectState } = useWalletConnect();
  const { bridge } = walletConnectState.connection;
  const { address, representedGroupPolicy, name: walletName } = walletConnectState.wallet;
  const groupAddress = representedGroupPolicy?.address;

  return (
    <>
      {walletName ? (
        <RowInfo title="Connected wallet name">
          <RowInfoTitle>Wallet Name</RowInfoTitle>
          <RowInfoValue>
            {walletName}
            <CopyValue value={walletName} />
          </RowInfoValue>
        </RowInfo>
      ) : null}
      {address ? (
        <RowInfo>
          <>
            <RowInfoTitle title="Connected wallet address">Address</RowInfoTitle>
            <RowInfoValue>
              {address}
              <CopyValue value={address} />
            </RowInfoValue>
          </>
        </RowInfo>
      ) : null}
      {groupAddress ? (
        <RowInfo>
          <>
            <RowInfoTitle title="Connected wallet representing group address">
              Representing Group Address
            </RowInfoTitle>
            <RowInfoValue>
              {groupAddress}
              <CopyValue value={groupAddress} />
            </RowInfoValue>
          </>
        </RowInfo>
      ) : null}
      {bridge ? (
        <RowInfo>
          <>
            <RowInfoTitle title="Connected wallet bridge">
              Connection Bridge
            </RowInfoTitle>
            <RowInfoValue>
              {bridge}
              <CopyValue value={bridge} />
            </RowInfoValue>
          </>
        </RowInfo>
      ) : null}
    </>
  );
};
