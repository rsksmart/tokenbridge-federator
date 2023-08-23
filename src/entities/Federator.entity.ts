import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FederatorEntity {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string;
    @Column()
    heartBeatLastBlock: number
}
