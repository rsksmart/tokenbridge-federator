import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';

@Entity()
export class Votes {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    transactionId: string
    @Column({default: false})
    voted: boolean;
    @Column({nullable: true})
    transactionData: string;
    @CreateDateColumn()
    createdAt: Date;
    @UpdateDateColumn()
    updatedAt: Date;
}
