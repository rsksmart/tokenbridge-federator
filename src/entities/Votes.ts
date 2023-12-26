import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
