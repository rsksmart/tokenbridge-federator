import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FailedTransactions {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    mainChain: number;
    @Column()
    sideChain: number;
    @Column()
    transactionId: string;
    @Column()
    txData: string
}
