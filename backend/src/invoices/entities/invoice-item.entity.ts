import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class InvoiceItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
    invoice: Invoice;

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
