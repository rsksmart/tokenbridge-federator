import {AppDataSource} from "../services/AppDataSource";
import {Log} from "../entities/Log";

const getLog = async (mainChainId: number, sideChainId: number) => {
  return await AppDataSource.getRepository(Log)
    .findOne({ where: { mainChain: mainChainId, sideChain: sideChainId }});
}

const insertLog = async(log: Partial<Log>) => {
  await AppDataSource.getRepository(Log).insert(log);
}

const updateLog = async (id: number, data: Partial<Log>) => {
  return await AppDataSource.getRepository(Log).update({id}, {...data});
}

export { getLog, insertLog, updateLog }
