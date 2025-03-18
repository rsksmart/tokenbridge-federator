import { BN } from 'ethereumjs-util';
import FederatorERC from '../src/lib/FederatorERC';
import { LogWrapper } from '../src/lib/logWrapper';
import { ConfigData } from '../src/lib/config';
import * as typescriptUtils from '../src/lib/typescriptUtils';
import { ProcessLogParams } from '../src/types/federator';

jest.mock('../src/models/logDebug.model', () => ({
  insertLogDebug: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/lib/typescriptUtils', () => ({
  retryNTimes: jest.fn((promise) => promise),
  RetryCounter: jest.fn().mockImplementation(function() {
    return {
      count: 0,
      retry: jest.fn(),
      canRetry: jest.fn().mockReturnValue(true),
      getAttemptNumber: jest.fn().mockReturnValue(1)
    };
  })
}));

describe('FederatorERC processLog Amount Conversion Test', () => {
  let federatorERC: FederatorERC;
  let mockLogger: LogWrapper;
  let mockConfig: ConfigData;
  let mockProcessTransactionParams: any;
  let mockSideFedContract: any;
  let capturedTransactionIdParams: any;
  let mockTransactionSender: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      upsertContext: jest.fn(),
    } as unknown as LogWrapper;

    mockConfig = {
      mainchain: {
        host: 'http://localhost:8545',
        fromBlock: 0,
      },
      sidechain: {
        host: 'http://localhost:8546',
        fromBlock: 0,
      },
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      storagePath: './test-storage',
      maxFailedTxRetry: 3,
      federatorRetries: 3,
    } as unknown as ConfigData;

    federatorERC = new FederatorERC(mockConfig, mockLogger);

    const mockSideBridgeContract = {
      getTransactionDataHash: jest.fn().mockResolvedValue('0xmockedhash'),
      getProcessed: jest.fn().mockResolvedValue(false),
      getAddress: jest.fn().mockResolvedValue('0xmockedBridgeAddress'),
    };

    mockSideFedContract = {
      hasVoted: jest.fn().mockResolvedValue(false),
      transactionWasProcessed: jest.fn().mockResolvedValue(false),
      getVoteTransactionABI: jest.fn().mockResolvedValue('0xmockedABI'),
      getAddress: jest.fn().mockResolvedValue('0xmockedFedAddress'),
      getTransactionId: jest.fn().mockImplementation(function(params) {
        capturedTransactionIdParams = params;
        return Promise.resolve('0xtransactionId123');
      }),
    };

    mockTransactionSender = {
      getAddress: jest.fn().mockResolvedValue('0xmockedFederatorAddress'),
      sendTransaction: jest.fn().mockResolvedValue({
        status: true,
        blockHash: '0xmockedBlockHash',
        blockNumber: 12345,
        transactionHash: '0xmockedTransactionHash',
        from: '0xmockedFrom',
        to: '0xmockedTo',
        cumulativeGasUsed: 100000,
      }),
    };

    const mockLog = {
      blockHash: '0xblockHash123',
      transactionHash: '0xtxHash123',
      logIndex: 0,
      returnValues: {
        _to: '0xreceiver',
        _from: '0xsender',
        _amount: '1000000000000000000', 
        _tokenAddress: '0xtokenAddress',
        _typeId: '0',
        _originChainId: '1',
        _destinationChainId: '2',
      },
    };

    mockProcessTransactionParams = {
      log: mockLog,
      sideFedContract: mockSideFedContract,
      sideBridgeContract: mockSideBridgeContract,
      transactionSender: mockTransactionSender,
      federatorAddress: '0xmockedFederatorAddress',
      sideChainId: 2,
      mainChainId: 1,
      currentBlock: 12500,
      mediumAndSmall: false,
      confirmations: {
        mediumAmountConfirmations: 10,
        largeAmountConfirmations: 30,
      },
      sideChainConfig: {
        host: 'http://localhost:8546',
        fromBlock: 0,
      },
      tokenAddress: '0xtokenAddress',
      senderAddress: '0xsender',
      receiver: '0xreceiver',
      amount: new BN('1000000000000000000'),
      typeId: '0',
      transactionId: '0xtransactionId123',
      originChainId: 1,
      destinationChainId: 2,
      allowTokens: {
        getLimits: jest.fn(),
      },
      federationFactory: {},
      allowTokensFactory: {},
      bridgeFactory: {},
    };
    federatorERC._voteTransaction = jest.fn().mockResolvedValue(undefined);
  });

  it('demonstrates amount conversion issue in processLog for multiple amounts', async () => {
    const testAmounts = [
      '1',                                
      '100',                             
      '1000000',                          
      '1000000000',                       
      '10000000000',                      
      '100000000000',                     
      '1000000000000',                    
      '10000000000000',                   
      '100000000000000',                  
      '1000000000000000',                       
      '1000000000000000000',             
      '10000000000000000000',             
      '100000000000000000000',            
      '1000000000000000000000',         
      '10000000000000000000000',        
      '100000000000000000000000',       
      '1000000000000000000000000',     
      '10000000000000000000000000',     
      // Edge cases
      '12444000000000001234567',          
      '999999999999999999999999999999',
      '123456789012345678901234567890',  
      '9007199254740992',                
      '9007199254740993' 
    ];
    
    const mockOriginBridge = {
      getMappedToken: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000'),
    };
    
    const mockBridgeFactory = {
      createInstance: jest.fn().mockResolvedValue(mockOriginBridge),
    };
    
    const mockAllowTokens = {
      getLimits: jest.fn().mockResolvedValue({
        allowed: true,
        mediumAmount: '1000000000000000000',
        largeAmount: '10000000000000000000'
      })
    };

    const baseTestParams = {
      ...mockProcessTransactionParams,
      sideFedContract: mockSideFedContract,
      allowTokens: mockAllowTokens,
      bridgeFactory: mockBridgeFactory,
      confirmations: {
        largeAmountConfirmations: 30,
        mediumAmountConfirmations: 10,
      },
      currentBlock: 12500,
    };

    federatorERC.config = {
      ...mockConfig,
      mainchain: {
        host: 'http://localhost:8545',
        fromBlock: 0,
        name: 'mainchain',
        chainId: 1,
        bridge: '0xmockedBridgeAddress',
        allowTokens: '0xmockedAllowTokensAddress',
        federation: '0xmockedFederationAddress',
        testToken: '0xmockedTestTokenAddress',
        blockTimeMs: 15000
      },
    };

    interface TestResult {
      originalAmount: string;
      passedAmount: string;
      passed: boolean;
    }
    
    const results = {
      passed: 0,
      failed: 0,
      details: [] as TestResult[]
    };

    for (const amount of testAmounts) {
      mockSideFedContract.getTransactionId.mockClear();
      capturedTransactionIdParams = null;
      
      const mockLog = {
        blockHash: '0xblockHash123',
        transactionHash: '0xtxHash123',
        logIndex: 0,
        returnValues: {
          _to: '0xreceiver',
          _from: '0xsender',
          _amount: amount,
          _tokenAddress: '0xtokenAddress',
          _typeId: '0',
          _originChainId: '1',
          _destinationChainId: '2',
        },
      };
      
      const testParams: ProcessLogParams = {
        ...baseTestParams,
        log: mockLog,
      };

      await federatorERC.processLog(testParams);

      expect(mockSideFedContract.getTransactionId).toHaveBeenCalled();
      expect(capturedTransactionIdParams).not.toBeNull();
      
      const passedAmount = capturedTransactionIdParams.amount;
      const testPassed = amount === passedAmount;
      
      results.details.push({
        originalAmount: amount,
        passedAmount: passedAmount,
        passed: testPassed
      });
      
      if (testPassed) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
    
    // Output summary
    console.log('================================');
    console.log('SUMMARY');
    console.log(`Total Tests: ${testAmounts.length}`);
    console.log(`✓ Passed: ${results.passed}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log('================================');
    
    if (results.failed > 0) {
      console.log('FAILED TESTS DETAILS:');
      results.details
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`Original: ${result.originalAmount}`);
          console.log(`Received: ${result.passedAmount}`);
          console.log('------------');
        });
    }    
    expect(results.failed).toBe(0);
  });
}); 