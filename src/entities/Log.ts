import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Log {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    mainChain: number;
    @Column()
    sideChain: number;
    @Column()
    block: number
}
