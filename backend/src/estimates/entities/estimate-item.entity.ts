import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Estimate } from './estimate.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class EstimateItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Estimate, (estimate) => estimate.items, { onDelete: 'CASCADE' })
    estimate: Estimate;

    @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
    product?: Product;

    @Column('int')
    quantity: number;

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'text', nullable: true })
    productName: string;

    @Column({ type: 'text', nullable: true })
    customValues: string;
}
