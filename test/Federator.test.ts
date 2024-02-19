import { config } from './config';
import {Logs, LOGGER_CATEGORY_FEDERATOR_MAIN} from "../src/lib/logs";
import Federator from "../src/lib/FederatorERC";

let federator: any;

describe('Federator', () => {
    beforeEach(async () => {
        federator = new Federator(
            config,
            Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_MAIN),
        )
    });

    it("Should start the federator", async () => {
        expect(federator.config.maxFailedTxRetry).toEqual(config.maxFailedTxRetry);
    })
})
