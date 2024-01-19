import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';

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
    @CreateDateColumn()
    createdAt: Date
    @UpdateDateColumn()
    updatedAt: Date
}
