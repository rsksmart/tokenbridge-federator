import {ConfigData} from './config';
import web3 from 'web3';
import TransactionSender from './TransactionSender';
import {CustomError} from './CustomError';
import {BridgeFactory} from '../contracts/BridgeFactory';
import {FederationFactory} from '../contracts/FederationFactory';
import {AllowTokensFactory} from '../contracts/AllowTokensFactory';
import * as utils from '../lib/utils';
import * as typescriptUtils from './typescriptUtils';
import Federator from './Federator';
import {ConfigChain} from './configChain';
import {IFederation} from '../contracts/IFederation';
import {LogWrapper} from './logWrapper';
import {
    GetLogsParams,
    ProcessLogParams,
    ProcessLogsParams,
    ProcessTransactionParams,
    VoteTransactionParams,
} from '../types/federator';
import {AppDataSource} from "../services/AppDataSource";
import {FailedTransactions} from "../entities/FailedTransactions";
import {Votes} from "../entities/Votes";
import {
    deleteFailedTransaction,
    findFailedTransaction,
    insertFailedTransaction, updateFailedTransaction
} from "../models/failedTransactions.model";
import {getVote, insertVote} from "../models/votes.model";


type ValidateAndVoteReturn = {
    receipt: unknown,
    wasVotedBefore: boolean,
    wasProcessed: boolean,
    voteSuccess: boolean
}

export default class FederatorERC extends Federator {
    constructor(config: ConfigData, logger: LogWrapper) {
        super(config, logger);
    }

    async run({
                  sideChainConfig,
                  sideChainWeb3,
                  transactionSender,
                  bridgeFactory,
                  federationFactory,
              }: {
        sideChainConfig: ConfigChain;
        sideChainWeb3: web3;
        transactionSender: TransactionSender;
        bridgeFactory: BridgeFactory;
        federationFactory: FederationFactory;
    }): Promise<boolean> {
        const currentBlock = await this.getMainChainWeb3().eth.getBlockNumber();
        const mainChainId = await this.getCurrentChainId();
        const sideChainId = await this.getChainId(sideChainWeb3);
        this.logger.upsertContext('Main Chain ID', mainChainId);
        this.logger.upsertContext('Side Chain ID', sideChainId);
        const allowTokensFactory = new AllowTokensFactory();

        this.logger.trace(`Federator Run started currentBlock: ${currentBlock}, currentChainId: ${mainChainId}`);
        const isMainSyncing = await this.getMainChainWeb3().eth.isSyncing();
        if (isMainSyncing !== false) {
            this.logger.warn(
                `ChainId ${mainChainId} is Syncing, ${JSON.stringify(
                    isMainSyncing,
                )}. Federator won't process requests till is synced`,
            );
            return false;
        }

        const isSideSyncing = await sideChainWeb3.eth.isSyncing();
        if (isSideSyncing !== false) {
            this.logger.warn(
                `ChainId ${sideChainId} is Syncing, ${JSON.stringify(
                    isSideSyncing,
                )}. Federator won't process requests till is synced`,
            );
            return false;
        }

        this.logger.trace(`Current Block ${currentBlock} ChainId ${mainChainId}`);
        const allowTokens = await allowTokensFactory.createInstance(this.config.mainchain);
        const confirmations = await allowTokens.getConfirmations();
        const toBlock = currentBlock - confirmations.largeAmountConfirmations;
        const newToBlock = currentBlock - confirmations.smallAmountConfirmations;

        this.logger.info('Running to Block', toBlock);
        this.logger.info(`Confirmations Large: ${confirmations.largeAmountConfirmations}, newToBlock ${newToBlock}`);

        if (toBlock <= 0 && newToBlock <= 0) {
            return false;
        }

        let fromBlock = await this.getLastBlock(mainChainId, sideChainId);
        if (fromBlock >= toBlock && fromBlock >= newToBlock) {
            this.logger.warn(
                `Current chain ${mainChainId} Height ${toBlock} is the same or lesser than the last block processed ${fromBlock}`,
            );
            return false;
        }
        fromBlock = fromBlock + 1;
        this.logger.debug('Running from Block', fromBlock);
        await this.getLogsAndProcess({
            sideChainId,
            mainChainId,
            transactionSender,
            fromBlock,
            toBlock,
            currentBlock,
            mediumAndSmall: false,
            confirmations,
            sideChainConfig,
            federationFactory,
            allowTokensFactory,
            bridgeFactory,
        });
        const lastBlockProcessed = toBlock;

        this.logger.debug('Started Log.ts and Process of Medium and Small confirmations up to block', newToBlock);
        await this.getLogsAndProcess({
            sideChainId,
            mainChainId,
            transactionSender,
            fromBlock: lastBlockProcessed,
            toBlock: newToBlock,
            currentBlock,
            mediumAndSmall: true,
            confirmations,
            sideChainConfig,
            federationFactory,
            allowTokensFactory,
            bridgeFactory,
        });

        return true;
    }

    async getLogsAndProcess(getLogParams: GetLogsParams) {
        this.logger.trace(
            `getLogsAndProcess started currentBlock: ${getLogParams.currentBlock}, fromBlock: ${getLogParams.fromBlock}, toBlock: ${getLogParams.toBlock}`,
        );
        if (getLogParams.fromBlock >= getLogParams.toBlock) {
            this.logger.trace('getLogsAndProcess fromBlock >= toBlock', getLogParams.fromBlock, getLogParams.toBlock);
            return;
        }
        this.logger.upsertContext('Current Block', getLogParams.currentBlock);
        const mainBridge = await getLogParams.bridgeFactory.createInstance(this.config.mainchain);

        const recordsPerPage = 1000;
        const numberOfPages = Math.ceil((getLogParams.toBlock - getLogParams.fromBlock) / recordsPerPage);
        this.logger.debug(`Total pages ${numberOfPages}, blocks per page ${recordsPerPage}`);

        let fromPageBlock = getLogParams.fromBlock;
        for (let currentPage = 1; currentPage <= numberOfPages; currentPage++) {
            let toPagedBlock = fromPageBlock + recordsPerPage - 1;
            if (currentPage === numberOfPages) {
                toPagedBlock = getLogParams.toBlock;
            }
            this.logger.debug(`Page ${currentPage} getting events from block ${fromPageBlock} to ${toPagedBlock}`);
            this.logger.upsertContext('fromBlock', fromPageBlock);
            this.logger.upsertContext('toBlock', toPagedBlock);
            const logs = await mainBridge.getPastEvents('Cross', getLogParams.sideChainId, {
                fromBlock: fromPageBlock,
                toBlock: toPagedBlock,
                _destinationChainId: getLogParams.sideChainId,
            });
            if (!logs) {
                throw new Error('Failed to obtain the logs');
            }

            this.logger.info(`Found ${logs.length} logs`);
            await this._processLogs({
                ...getLogParams,
                logs,
            });
            if (!getLogParams.mediumAndSmall) {
                await this._saveProgress(getLogParams.mainChainId, getLogParams.sideChainId, toPagedBlock);
            }
            fromPageBlock = toPagedBlock + 1;
        }
    }

    async checkFederatorIsMember(sideFedContract: IFederation, federatorAddress: string) {
        const isMember = await typescriptUtils.retryNTimes(sideFedContract.isMember(federatorAddress));
        if (!isMember) {
            throw new Error(`This Federator addr:${federatorAddress} is not part of the federation`);
        }
    }

    async processLog(processLogParams: ProcessLogParams): Promise<boolean> {
        this.logger.info('Processing event log:', processLogParams.log);

        const {blockHash, transactionHash, logIndex, blockNumber} = processLogParams.log;

        const {
            _to: receiver,
            _from: crossFromAddress,
            _amount: amount,
            _tokenAddress: tokenAddress,
            _typeId: typeId,
            _originChainId: originChainIdStr,
            _destinationChainId: destinationChainIdStr,
        } = processLogParams.log.returnValues;
        this.logger.trace('log.returnValues', processLogParams.log.returnValues);

        const originChainId = Number(originChainIdStr);
        const destinationChainId = Number(destinationChainIdStr);

        this.logger.upsertContext('transactionHash', transactionHash);
        this.logger.upsertContext('blockHash', blockHash);
        this.logger.upsertContext('blockNumber', blockNumber);
        this.logger.upsertContext('tokenAddress', tokenAddress);

        const originBridge = await processLogParams.bridgeFactory.createInstance(this.config.mainchain);
        const sideTokenAddress = await typescriptUtils.retryNTimes(
            originBridge.getMappedToken({
                originalTokenAddress: tokenAddress,
                chainId: destinationChainIdStr,
            }),
        );

        let allowed: number, mediumAmount: number, largeAmount: number;
        if (sideTokenAddress === utils.ZERO_ADDRESS) {
            ({allowed, mediumAmount, largeAmount} = await processLogParams.allowTokens.getLimits({
                tokenAddress: tokenAddress,
            }));
            if (!allowed) {
                throw new Error(
                    `Original Token not allowed nor side token Tx:${transactionHash} originalTokenAddress:${tokenAddress}
            Bridge Contract Addr ${originBridge}`,
                );
            }
        } else {
            ({allowed, mediumAmount, largeAmount} = await processLogParams.allowTokens.getLimits({
                tokenAddress: sideTokenAddress,
            }));
            if (!allowed) {
                this.logger.error(
                    `Side token:${sideTokenAddress} needs to be allowed Tx:${transactionHash} originalTokenAddress:${tokenAddress}`,
                );
            }
        }

        const mediumAmountBN = web3.utils.toBN(mediumAmount);
        const largeAmountBN = web3.utils.toBN(largeAmount);
        const amountBN = web3.utils.toBN(amount);

        if (processLogParams.mediumAndSmall) {
            // At this point we're processing blocks newer than largeAmountConfirmations
            // and older than smallAmountConfirmations
            if (amountBN.gte(largeAmountBN)) {
                const confirmations = processLogParams.currentBlock - blockNumber;
                const neededConfirmations = processLogParams.confirmations.largeAmountConfirmations;
                this.logger.debug(
                    `[large amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${confirmations} < ${neededConfirmations}`,
                );
                return false;
            }

            if (
                amountBN.gte(mediumAmountBN) &&
                processLogParams.currentBlock - blockNumber < processLogParams.confirmations.mediumAmountConfirmations
            ) {
                const confirmations = processLogParams.currentBlock - blockNumber;
                const neededConfirmations = processLogParams.confirmations.mediumAmountConfirmations;
                this.logger.debug(
                    `[medium amount] Tx: ${transactionHash} ${amount} originalTokenAddress:${tokenAddress} won't be proccessed yet ${confirmations} < ${neededConfirmations}`,
                );
                return false;
            }
        }

        const transactionId = await typescriptUtils.retryNTimes(
            processLogParams.sideFedContract.getTransactionId({
                originalTokenAddress: tokenAddress,
                sender: crossFromAddress,
                receiver,
                amount,
                blockHash,
                transactionHash,
                logIndex,
                originChainId,
                destinationChainId,
            }),
        );
        this.logger.info('get transaction id:', transactionId);

        await this.processTransaction({
            ...processLogParams,
            tokenAddress,
            senderAddress: crossFromAddress,
            receiver,
            amount,
            typeId,
            transactionId,
            originChainId,
            destinationChainId,
        });

        return true;
    }

    async processTransaction(processTransactionParams: ProcessTransactionParams) {
        const dataToHash = {
            to: processTransactionParams.receiver,
            amount: processTransactionParams.amount,
            blockHash: processTransactionParams.log.blockHash,
            transactionHash: processTransactionParams.log.transactionHash,
            logIndex: processTransactionParams.log.logIndex,
            originChainId: processTransactionParams.originChainId,
            destinationChainId: processTransactionParams.destinationChainId,
        };
        this.logger.info('===dataToHash===', dataToHash);
        this.logger.warn('===log===', processTransactionParams.log);
        const transactionDataHash = await typescriptUtils.retryNTimes(
            processTransactionParams.sideBridgeContract.getTransactionDataHash(dataToHash),
        );
        const wasProcessed = await typescriptUtils.retryNTimes(
            processTransactionParams.sideBridgeContract.getProcessed(transactionDataHash),
        );
        if (wasProcessed) {
            this.logger.info(
                `Already processed Block: ${processTransactionParams.log.blockHash} Tx: ${processTransactionParams.log.transactionHash}
          originalTokenAddress: ${processTransactionParams.tokenAddress}`,
            );
            return;
        }
        const hasVoted = await processTransactionParams.sideFedContract.hasVoted(
            processTransactionParams.transactionId,
            processTransactionParams.federatorAddress,
        );
        if (hasVoted) {
            this.logger.debug(
                `Block: ${processTransactionParams.log.blockHash} Tx: ${processTransactionParams.log.transactionHash}
        originalTokenAddress: ${processTransactionParams.tokenAddress}  has already been voted by us`,
            );
            return;
        }
        this.logger.info(
            `Voting tx: ${processTransactionParams.log.transactionHash} block: ${processTransactionParams.log.blockHash}
      originalTokenAddress: ${processTransactionParams.tokenAddress}`,
        );
        await this._voteTransaction({
            ...processTransactionParams,
            blockHash: processTransactionParams.log.blockHash,
            transactionHash: processTransactionParams.log.transactionHash,
            logIndex: processTransactionParams.log.logIndex,
        });
    }

    async _processLogs(processLogsParams: ProcessLogsParams) {
        try {
            const federatorAddress = await processLogsParams.transactionSender.getAddress(this.config.privateKey);
            const sideFedContract = await processLogsParams.federationFactory.createInstance(
                processLogsParams.sideChainConfig,
                this.config.privateKey,
            );
            const sideBridgeContract = await processLogsParams.bridgeFactory.createInstance(
                processLogsParams.sideChainConfig,
            );
            const allowTokens = await processLogsParams.allowTokensFactory.createInstance(this.config.mainchain);

            await this.checkFederatorIsMember(sideFedContract, federatorAddress);

            for (const log of processLogsParams.logs) {
                await this.processLog({
                    ...processLogsParams,
                    log,
                    sideFedContract,
                    allowTokens,
                    federatorAddress,
                    sideBridgeContract,
                });
            }

            return true;
        } catch (err) {
            throw new CustomError(`Exception processing logs`, err);
        }
    }

    async _voteTransaction(voteTransactionParams: VoteTransactionParams) {
        try {
            voteTransactionParams.transactionId = voteTransactionParams.transactionId.toLowerCase();
            this.logger.info(
                `Starting vote process for the TX ${voteTransactionParams.transactionHash} from 
                ${voteTransactionParams.originChainId} with transactionId ${voteTransactionParams.transactionId}`,
            );

            const txDataAbi = await voteTransactionParams.sideFedContract.getVoteTransactionABI({
                originalTokenAddress: voteTransactionParams.tokenAddress,
                sender: voteTransactionParams.senderAddress,
                receiver: voteTransactionParams.receiver,
                amount: voteTransactionParams.amount,
                blockHash: voteTransactionParams.blockHash,
                transactionHash: voteTransactionParams.transactionHash,
                logIndex: voteTransactionParams.logIndex,
                originChainId: voteTransactionParams.originChainId,
                destinationChainId: voteTransactionParams.destinationChainId,
            });

            await this.verifyIfwasRevertedAndRetry(voteTransactionParams, txDataAbi);
        } catch (err) {
            throw new CustomError(
                `Exception Voting tx:${voteTransactionParams.transactionHash} block: ${voteTransactionParams.blockHash} originalTokenAddress: ${voteTransactionParams.tokenAddress}`,
                err,
            );
        }
    }

    async verifyIfwasRevertedAndRetry(params, txAbi) {
        const revertedTx = await findFailedTransaction({
            mainChain: params.mainChainId,
            sideChain: params.sideChainId,
            transactionId: params.transactionId
        });

        const result = await this.validateAndVote(params, txAbi);

        if (revertedTx && (result.voteSuccess || result.wasVotedBefore || result.wasProcessed)) {
            await deleteFailedTransaction({
                mainChain: params.mainChainId,
                sideChain: params.sideChainId,
                transactionId: params.transactionId
            });
        }
    }

    async validateAndVote(params, txDataAbi): Promise<ValidateAndVoteReturn> {
        const validateAndVoteReturn: ValidateAndVoteReturn = {
            receipt: null,
            voteSuccess: false,
            wasVotedBefore: false,
            wasProcessed: false
        };

        const fedAddress = await params.transactionSender.getAddress(this.config.privateKey);

        const hasVoted = await params.sideFedContract
          .hasVoted(params.transactionId, fedAddress);

        const hasVotedDb = await getVote({transactionId: params.transactionId});

        const failedRetry = await findFailedTransaction({
            transactionId: params.transactionId,
            timesRetried: this.config.maxFailedTxRetry
        });

        const wasProcessed = await params.sideFedContract
          .transactionWasProcessed(params.transactionId);

        if(hasVoted || wasProcessed || hasVotedDb || failedRetry) {
            this.logger.warn(`Transaction ${params.transactionId} will not be voted by the 
                federator: ${fedAddress} hasVoted result ${hasVoted} - wasProcessed result ${wasProcessed} hasVotedDb 
                result ${hasVotedDb}`);

            validateAndVoteReturn.wasVotedBefore = hasVoted || hasVotedDb;
            validateAndVoteReturn.wasProcessed = wasProcessed;
            validateAndVoteReturn.receipt = null;
            validateAndVoteReturn.voteSuccess = false;

            return validateAndVoteReturn;
        }

        const receipt = await params.transactionSender.sendTransaction(
          params.sideFedContract.getAddress(),
          txDataAbi,
          0,
          this.config.privateKey,
        );

        if(receipt.status) {
            validateAndVoteReturn.receipt = receipt;
            validateAndVoteReturn.voteSuccess = true;

            const dataToInsert: Partial<Votes> = {
                voted: true,
                transactionId: params.transactionId,
                transactionData: JSON.stringify({
                    transactionId: params.transactionId,
                    status: receipt.status,
                    blockHash: receipt.blockHash,
                    blockNumber: receipt.blockNumber,
                    transactionHash: receipt.transactionHash,
                    from: receipt.from,
                    to: receipt.to,
                    cumulativeGasUsed: receipt.cumulativeGasUsed,
                    amount: params.amount,
                    originalTokenAddress: params.tokenAddress,
                })
            };

            await insertVote(dataToInsert);
        } else {
            validateAndVoteReturn.receipt = null;
            validateAndVoteReturn.voteSuccess = false;

            this.logger.error(
              `Voting ${params.amount} of originalTokenAddress:${params.tokenAddress}
                        TransactionId ${params.transactionId} failed, check the receipt`,
              receipt,
            );

            const hasFailedBefore = await findFailedTransaction({
                transactionId: params.transactionId
            });

            if(!hasFailedBefore) {
                const dataToInsert: Partial<FailedTransactions> = {
                    mainChain: params.mainChainId,
                    sideChain: params.sideChainId,
                    transactionId: params.transactionId,
                    timesRetried: 1,
                    txData: JSON.stringify({
                        originalTokenAddress: params.tokenAddress,
                        sender: params.senderAddress,
                        receiver: params.receiver,
                        amount: params.amount,
                        blockHash: params.blockHash,
                        transactionHash: params.transactionHash,
                        logIndex: params.logIndex,
                        error: receipt.error,
                        status: receipt.status,
                        receipt: {...receipt},
                    })
                };
                await insertFailedTransaction(dataToInsert);
            } else {
                await updateFailedTransaction(hasFailedBefore.id, {
                    timesRetried: hasFailedBefore.timesRetried + 1 > this.config.maxFailedTxRetry ?
                      this.config.maxFailedTxRetry : hasFailedBefore.timesRetried + 1
                });
            }
        }
        return validateAndVoteReturn;
    }
}
