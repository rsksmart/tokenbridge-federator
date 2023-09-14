# Federator

Presents the event and necesary information to validate it on the other network.
The federator is an off-chain process which performs voting actions to validate transactions between a Mainchain (source) and a Sidechain (target) network. These transactions are obtained from the Bridge contract on the Mainchain using event logs and voted in the Sidechain through a Federation contract. Once all required signers (federators) vote for a transaction the Federation contract starts the process to release the funds on the Sidechain.
The federators will be the owners of the contracts willing to allow to cross their tokens, and by doing so staking they reputation.

## Config

Go to /config copy `config.sample.js` file and rename it to `config.js` set mainchain and sidechain to point to the json files of the networks you are using, for example rsktestnet-kovan.json and kovan.json, `make sure to set the host parameter of those files`. Add a value to the key `FEDERATOR_KEY` in the .env file, and add the private key of the member of the Federation contract, also you can define a general retry attempts number for the failed processes in the application by setting the value of the key `ENV_DEFAULT_ATTEMPTS` to the number of attempts that you desire, you can use 0 for infinite attempts, if no attempt is provided the default value is 3. The members of the federation are controled by the MultiSig contract, same that is owner of the Bridge and AllowedTokens contracts.
You will also need to add an [etherscan api key](https://etherscan.io/myapikey) in this config file.
> Please also note that the private node of RSKj should be running and synced with public one.
## Usage

Run `npm install` to install the dependencies, make sure you followed the previous config step. Then to start the service run `npm start` which will start a single federator that listen to both networks. Check the logs to see that everything is working properly.

## Test

To run an integration test use `npm run integrationTest`. The integration test will use a preconfigured private key (from `config.js`) which is assumed to be the only member of the Federation contract.
In order to test with multiple federators, ensure they're added as members of the Federation contract and pass their private keys as a comma separated string for both chains as arguments of the integration test script. For instance:
`node integrationTest.js "privKeyM1, privKeyM2, privKeyMN" "privKeyS1, privKeyS2, privKeySN"`

## Run a Federator

### Config

To run the federator using Docker, go to the /config folder and rename `config.sample.js` to `config.js`. In that file you will determine the networks the federate must be listening to, for example for the bridge in testnet a federator config.js will look like

```js
module.exports = {
  mainchain: require("./rsktestnet.json"), //the json containing the smart contract addresses in rsk
  sidechain: [
    require("./sepolia.json"), //the json containing the smart contract addresses in eth
  ],
  runEvery: 2, // In minutes,
  privateKey: process.env.FEDERATOR_KEY || '',
  storagePath: "./db",
  etherscanApiKey: "",
  runHeartbeatEvery: 1, // In hours
  endpointsPort: 5000, // Server port
  federatorRetries: 0, // 0 means infinite retries
  checkHttps: false,
  name: 'federator'
}
```

where the mainchain for example is rsktestnet and the sidechain is sepolia, the .json files are in the /config folder and includes the addresses of the contracts in that network and the block number when they where deployed.
The order of sidechain and mainchain is not important is just which one is going to be checked first, as federators are bi directionals.
Inside the .json files there is also the host to that network, for example this is the sepolia.json

```json
{
  "name": "sepolia",
  "bridge": "0xd31e66af9d830bfc35e493929a8f6523ca2b01b1",
  "federation": "0x091e26c96e7f4aaef0d85746bb99b733ec28df90",
  "multiSig": "0xbee2572941ffcb2ab2e61450fecc8db75321e6c9",
  "allowTokens": "0x926d302f3b6bc4d0eeea9caf6942fd7e0a9a0422",
  "chainId": 11155111,
  "host": "https://sepolia.infura.io/v3/<YOUR INFURA API KEY>",
  "fromBlock": 3724896
}
```

You need to change `"<YOUR NODE HOST AND RPC PORT>"` for the url of your node for that network and the json rpc port,  host can only be `https or localhost`.
`Remember to do it for both networks`.
Also you need to create a `federators.key` file with the federator private in it.

### Development
- In your development environment you must have 2 blockchains running (ganache is ok)
- To start, go to the `bridge` directory and run
```shell
$ npm run ganache
```

- Open another shell and run the other chain
```shell
$ npm run ganache-mirror
```

- Still in the `bridge` directory you will need to deploy the contracts to the chains
```shell
$ npm run deployLocalIntegrationTest
```

- After that got to the `federator` directory then compile and run the federator
```shell
$ npm run build-start
```

### Latest block

The federator will use the block number in  `./db/federatorDB.sqlite` for the main chain and side chain as starting point. This is important as the federator will increase the number each time it successfully polls for blocks, and indicates the last block run.
If this files don't exist, the program will automatically create them using the `config.fromBlock` number. This is ok, but the default config number is the creation of the contract and may be too far from the current block number, having a negative impact in performance even preventing the program from running. This is way it should be as closest as the current block number minus the confirmations blocks as posible.

### Docker image

To run the federator inside Docker container please follow this steps.
- Inside the config folder rename config.sample.js to config.js
- In the config file change the mainchain and side chain files to the ones with your configuration, there is an example file for all available networks
- After you make sure that all config files are ok
- In the root directory rename the .env.example to .env
- And put your wallet private key over there, the same one that was registered as federator
- In the config files for the main chain and side chain change the "fromBlock" parameter to be as close as possible from the last block before your federator being up and running.

Then run :

### Configure, build and run the whole solution with docker compose for RSK MainNet.
###### Ensure your user belongs to docker group.
```sh
sudo usermod -aG docker $USER
```

```sh
sudo mkdir /var/lib/rsk/database /var/log/rsk /etc/rsk
sudo wget https://raw.githubusercontent.com/rsksmart/artifacts/master/rskj-ubuntu-installer/config/logback.xml -P /etc/rsk/
sudo wget https://raw.githubusercontent.com/rsksmart/artifacts/master/rskj-ubuntu-installer/config/mainnet.conf -O /var/lib/rsk/node.conf
sudo chown $USER:$USER /var/lib/rsk/database /var/log/rsk /etc/rsk
```

###### [With all federator configuration done](https://github.com/rsksmart/tokenbridge-federator#config "With all federator configuration done");  simply run:

```sh
docker compose build
docker compose up -d
```

###### RSKj Details:
Log files will be located in:
* /var/log/rsk

Database will be located in:
* /var/lib/rsk/database/mainnet

Configuration files:
* /etc/rsk/node.conf
* /etc/rsk/logback.xml

More information about how to customize rskj node configuration [here](https://dev.rootstock.io/rsk/node/ "here")

###### As and example of how to configure to run you might want to change the `rpc` to this:
```
rpc {
  providers {
    web {
      cors = "*"
      http {
        enabled = true
        bind_address = 0.0.0.0
        hosts = [
          "127.0.0.1",
          "::1",
          "localhost",
          "rskj-node01",
          "172.17.0.1",
        ]
        port = 4444
      }
    } 
  }
}
```

### Status endpoint

This endpoint is introduced, in order to better monitor health status on the Federator processes running.

* **<DOMAIN:PORT>/isAlive**

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{ "status" : "ok" }`

### Skip HTTPS check
- As an developer you can set in config.js the property `checkHttps: false` to skip the HTTPS check on the host url config
