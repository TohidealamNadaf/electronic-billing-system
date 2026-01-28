import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Estimate } from '../../estimates/entities/estimate.entity';

@Entity()
export class Client {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true, type: 'text' })
    address: string;

    @Column({ nullable: true, type: 'text' })
    customFields: string; // JSON string

    @OneToMany(() => Invoice, (invoice) => invoice.client)
    invoices: Invoice[];

    @OneToMany(() => Estimate, (estimate) => estimate.client)
    estimates: Estimate[];
}
