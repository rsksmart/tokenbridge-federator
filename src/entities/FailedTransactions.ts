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
    hash: string;
    @Column()
    txData: string
}
