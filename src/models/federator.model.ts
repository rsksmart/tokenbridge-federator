import {FederatorEntity} from "../entities/Federator.entity";
import {AppDataSource} from "../services/AppDataSource";
import {LOGGER_CATEGORY_FEDERATOR_DATABASE, Logs} from "../lib/logs";

const logger = Logs.getInstance().getLogger(LOGGER_CATEGORY_FEDERATOR_DATABASE);

const getFederatorByName = async (name: string): Promise<FederatorEntity | null> => {
  try {
    const fedRepository = AppDataSource.getRepository(FederatorEntity);
    return await fedRepository.findOne({ where: { name }});
  }
  catch (error) {
    logger.error('Error on get federator by name: ', error);
    throw error;
  }
}

const updateFederator = async (data: Partial<FederatorEntity>, name: string) => {
 try {
   const federator = await getFederatorByName(name);

   if (federator) {
     await AppDataSource.createQueryBuilder().update(FederatorEntity)
       .set({ ...data }).where("name = :name", { name }).execute();
   }
 } catch (error) {
   logger.error('Error on update federator: ', error);
   throw error;
 }
}

const insertFederator = async (entity: FederatorEntity) => {
  try {
    const fedRepository = AppDataSource.getRepository(FederatorEntity);
    await fedRepository.insert(entity);
  } catch (error) {
    logger.error('Error on insert federator: ', error);
    throw error;
  }
}

export { getFederatorByName, updateFederator, insertFederator };
