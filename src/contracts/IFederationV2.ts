import { Contract } from 'web3-eth-contract';
import { VERSIONS } from './Constants';
import { IFederation } from './IFederation';
import { ConfigChain } from '../lib/configChain';
import {ContractAbi} from "web3";

export class IFederationV2 implements IFederation {
  federationContract: Contract<ContractAbi>;
  config: ConfigChain;
  privateKey: string;

  constructor(config: ConfigChain, fedContract: Contract<ContractAbi>, privateKey: string) {
    this.federationContract = fedContract;
    this.config = config;
    this.privateKey = privateKey;
  }

  getVersion() {
    return VERSIONS.V2;
  }

  async isMember(address: string): Promise<any> {
    return this.federationContract.methods.isMember(address);
  }

  getTransactionId(paramsObj: any) {
    return this.federationContract.methods
      .getTransactionId(
        paramsObj.originalTokenAddress,
        paramsObj.sender,
        paramsObj.receiver,
        paramsObj.amount,
        paramsObj.blockHash,
        paramsObj.transactionHash,
        paramsObj.logIndex,
      )
      .call();
  }

  async transactionWasProcessed(txId: string) {
    return await this.federationContract.methods.transactionWasProcessed(txId).call() as unknown as boolean;
  }

  async hasVoted(txId: string, from: string) {
    return await this.federationContract.methods.hasVoted(txId).call({ from }) as unknown as boolean;
  }

  getVoteTransactionABI(paramsObj: any): string {
    return this.federationContract.methods
      .voteTransaction(
        paramsObj.originalTokenAddress,
        paramsObj.sender,
        paramsObj.receiver,
        paramsObj.amount,
        paramsObj.blockHash,
        paramsObj.transactionHash,
        paramsObj.logIndex,
      )
      .encodeABI();
  }

  getAddress() {
    return this.federationContract.options.address;
  }

  getPastEvents(eventName, options) {
    return this.federationContract.getPastEvents(eventName, options);
  }

  async emitHeartbeat(
    txSender: any,
    fedVersion: any,
    fedChainsIds: any[],
    fedChainsBlocks: any[],
    fedChainsInfo: any[],
  ) {
    const txData = this.federationContract.methods
      .emitHeartbeat(fedChainsBlocks[0], fedChainsBlocks[1], fedVersion, fedChainsInfo[0], fedChainsInfo[1])
      .encodeABI();

    return await txSender.sendTransaction(this.getAddress(), txData, 0, this.privateKey);
  }
}
