import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { EstimateItem } from './estimate-item.entity';

@Entity()
export class Estimate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    total: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    subTotal: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    taxTotal: number;

    @Column({ default: false })
    gstEnabled: boolean;

    @Column({ nullable: true })
    gstRate: string;

    @Column({ type: 'text', nullable: true })
    columnLabels: string;

    @Column({ type: 'text', nullable: true })
    customColumns: string;

    @Column({ default: 'Draft' })
    status: string; // 'Draft', 'Sent', 'Accepted', 'Declined'

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    discountAmount: number;

    @Column({ default: false })
    isSimpleEstimate: boolean;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @ManyToOne(() => Client, (client) => client.estimates, { onDelete: 'SET NULL', nullable: true })
    client?: Client;

    @OneToMany(() => EstimateItem, (item) => item.estimate, { cascade: true })
    items: EstimateItem[];
}
