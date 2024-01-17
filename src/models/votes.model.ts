import {Votes} from "../entities/Votes";
import {AppDataSource} from "../services/AppDataSource";

const getVote = async (criteria: Partial<Votes>) => {
  return await AppDataSource.getRepository(Votes).findOne({ where: { ...criteria }});
}

const insertVote = async (data: Partial<Votes>) => {
  await AppDataSource.getRepository(Votes).insert({ ...data });
}

export { getVote, insertVote }
