import {DataSource} from "typeorm";
import {FederatorEntity} from "../entities/Federator.entity";
import {Log} from "../entities/Log";
import {FailedTransactions} from "../entities/FailedTransactions";
import {Votes} from "../entities/Votes";

export const AppDataSource = new DataSource({
    type :"sqlite",
    database: "db/federatorDB.sqlite",
    entities: [FederatorEntity, Log, FailedTransactions, Votes],
    synchronize: true
});
