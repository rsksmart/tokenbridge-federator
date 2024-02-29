import { BN } from 'ethereumjs-util';
import { Contract } from 'web3-eth-contract';
import { CustomError } from '../lib/CustomError';
import { VERSIONS } from './Constants';
import { IAllowTokens } from './IAllowTokens';
import { ConfirmationsReturn } from './IAllowTokensV0';
import {ContractAbi} from "web3";

export interface GetLimitsParams {
  tokenAddress: string;
}

export class IAllowTokensV1 implements IAllowTokens {
  allowTokensContract: Contract<ContractAbi>;
  mapTokenInfoAndLimits: any;
  chainId: number;

  constructor(allowTokensContract: Contract<ContractAbi>, chainId: number) {
    this.allowTokensContract = allowTokensContract;
    this.mapTokenInfoAndLimits = {};
    this.chainId = chainId;
  }

  getVersion(): string {
    return VERSIONS.V1;
  }

  async getConfirmations(): Promise<ConfirmationsReturn> {
    const promises: BN[] = [];
    promises.push(await this.getSmallAmountConfirmations());
    promises.push(await this.getMediumAmountConfirmations());
    promises.push(await this.getLargeAmountConfirmations());
    const result = await Promise.all(promises);
    return {
      smallAmountConfirmations: Number(result[0]),
      mediumAmountConfirmations: Number(result[1]),
      largeAmountConfirmations: Number(result[2]),
    };
  }

  async getSmallAmountConfirmations(): Promise<BN> {
    try {
      return this.allowTokensContract.methods.smallAmountConfirmations().call();
    } catch (err) {
      throw new CustomError(`Exception getSmallAmountConfirmations at AllowTokens Contract`, err);
    }
  }

  async getMediumAmountConfirmations(): Promise<BN> {
    try {
      return this.allowTokensContract.methods.mediumAmountConfirmations().call();
    } catch (err) {
      throw new CustomError(`Exception getMediumAmountConfirmations at AllowTokens Contract`, err);
    }
  }

  async getLargeAmountConfirmations(): Promise<BN> {
    try {
      return this.allowTokensContract.methods.largeAmountConfirmations().call();
    } catch (err) {
      throw new CustomError(`Exception getLargeAmountConfirmations at AllowTokens Contract`, err);
    }
  }

  async getLimits(objParams: GetLimitsParams) {
    try {
      let result = this.mapTokenInfoAndLimits[objParams.tokenAddress];
      if (!result) {
        const infoAndLimits: any = await this.allowTokensContract.methods.getInfoAndLimits(objParams.tokenAddress).call();
        result = {
          allowed: infoAndLimits.info.allowed,
          mediumAmount: infoAndLimits.limit.mediumAmount,
          largeAmount: infoAndLimits.limit.largeAmount,
        };
        if (result.allowed) {
          this.mapTokenInfoAndLimits[objParams.tokenAddress] = result;
        }
      }
      return result;
    } catch (err) {
      throw new CustomError(`Exception getInfoAndLimits at AllowTokens Contract for ${objParams.tokenAddress}`, err);
    }
  }
}
