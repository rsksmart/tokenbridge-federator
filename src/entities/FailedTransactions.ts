import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';

@Entity()
export class FailedTransactions {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    retried: number;
    @Column()
    mainChain: number;
    @Column()
    sideChain: number;
    @Column()
    transactionId: string;
    @Column()
    txData: string;
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
}
