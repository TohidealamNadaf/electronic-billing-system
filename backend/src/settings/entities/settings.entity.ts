import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Settings {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 'Your Company Name' })
    companyName: string;

    @Column({ nullable: true })
    companyOwner: string;

    @Column({ default: '123 Business Road, City, Country' })
    companyAddress: string;

    @Column({ default: '+1 (234) 567-890' })
    companyPhone: string;

    @Column({ default: true })
    isGstEnabled: boolean;

    @Column({ default: '18%' })
    gstRate: string;

    @Column({ nullable: true })
    gstNumber: string;

    @Column({ default: false })
    isDiscountEnabled: boolean;

    @Column({ type: 'text', nullable: true, default: '1. Payment is due upon receipt.\n2. Please quote invoice number in all correspondence.\n3. Thank you for your business.' })
    termsAndConditions: string;

    @Column({ default: true })
    showTerms: boolean;

    @Column({ type: 'text', nullable: true })
    columnLabels: string; // JSON: { product: string, quantity: string, price: string, total: string }

    @Column({ type: 'text', nullable: true })
    customColumns: string; // JSON: Array<{ name: string, formula: string }>

    @Column({ type: 'text', nullable: true })
    businessProfileConfig: string; // JSON: { showName: boolean, showAddress: boolean, showContact: boolean, showGst: boolean }
}
