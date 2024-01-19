import {FailedTransactions} from "../entities/FailedTransactions";
import {AppDataSource} from "../services/AppDataSource";

const findFailedTransaction = async (data: Partial<FailedTransactions>) => {
  return await AppDataSource.getRepository(FailedTransactions)
    .findOne({
      where: { ...data }
    });
}

const deleteFailedTransaction = async (criteria: Partial<FailedTransactions>) => {
  await AppDataSource.getRepository(FailedTransactions).delete({ ...criteria });
}

const insertFailedTransaction = async (data: Partial<FailedTransactions>) => {
  await AppDataSource.getRepository(FailedTransactions).insert({...data});
}

const updateFailedTransaction = async (id: number, data: Partial<FailedTransactions>) => {
  await AppDataSource.getRepository(FailedTransactions).update({ id }, { ...data });
}

export { findFailedTransaction, deleteFailedTransaction, insertFailedTransaction, updateFailedTransaction };
