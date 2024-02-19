import {ConfigData} from "../src/lib/config";

export const config: ConfigData = {
  mainchain: {
    name: "rsktestnet",
    chainId: 31,
    bridge: "0x21df59aef6175467fefb9e44fbb98911978a13f2",
    allowTokens: "0xa683146bb93544068737dfca59f098e7844cdfa8",
    federation: "0x73de98b3eb19cae5dfc71fb3e54f3ffd4aa02705",
    testToken: "0xa77c1d4c0bdef5b90b33d9ea5c48cf19edd2f831",
    host: "https://localhost",
    fromBlock: 3987787,
    blockTimeMs: 15000
  },
  sidechain: [{
    name: "sepolia",
    chainId: 1456,
    bridge: "0x6e169e30fcc54bf8dc01282eba4109442a0e8417",
    allowTokens: "0x5335256e5a1fd61e857f20e2bf61d27418484604",
    federation: "0x38fdb3fd8967769e1398e2628358ab20b0d8f9ca",
    testToken: "0xa77c1d4c0bdef5b90b33d9ea5c48cf19edd2f831",
    host: "http://127.0.0.1:8545",
    fromBlock: 46,
    blockTimeMs: 30000
  }],
  runEvery: 1,
  privateKey: "njhsgdfuyuwerewkjrh",
  storagePath: "./db",
  etherscanApiKey: "hytrnh764kjdnhg75jnmj",
  runHeartbeatEvery: 1,
  endpointsPort: 5000,
  federatorRetries: 3,
  checkHttps: true,
  explorer: "",
  name: "Federator-test",
  maxFailedTxRetry: 3
}