import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { InvoiceItem } from './invoice-item.entity';

@Entity()
export class Invoice {
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

    @Column({ default: 'Pending' })
    paymentStatus: string; // 'Paid', 'Pending', 'Partially Paid'

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    paidAmount: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    balanceAmount: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    discountAmount: number;

    @Column({ default: true })
    showPaymentDetails: boolean;

    @Column({ default: false })
    isSimpleInvoice: boolean;

    @Column('simple-json', { nullable: true })
    payments: { date: string, amount: number, note?: string }[];

    @ManyToOne(() => Client, (client) => client.invoices, { onDelete: 'SET NULL', nullable: true })
    client?: Client;

    @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
    items: InvoiceItem[];
}
