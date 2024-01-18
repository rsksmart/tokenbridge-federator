import {AppDataSource} from "../services/AppDataSource";
import {LogDebug} from "../entities/LogDebug";

const insertLogDebug = async(message: string) => {
  await AppDataSource.getRepository(LogDebug).insert({ log: message });
}

const clearOldLogs = async () => {
  await AppDataSource.getRepository(LogDebug).createQueryBuilder()
    .where('createdAt < :deleteDate',
      { deleteDate: new Date().setDate(new Date().getDate() - 30) })
    .delete().execute();
}

export { insertLogDebug, clearOldLogs }
