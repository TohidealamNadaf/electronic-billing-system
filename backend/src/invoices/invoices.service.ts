import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Client } from '../clients/entities/client.entity';
import { Product } from '../products/entities/product.entity';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        private dataSource: DataSource,
    ) { }

    /**
     * Find existing product by name or create a new one
     * This auto-creates products from custom items for reusability
     */
    private async findOrCreateProduct(
        queryRunner: any,
        productName: string,
        price: number
    ): Promise<Product> {
        // Normalize name: trim whitespace and convert to lowercase for comparison
        const normalizedName = productName.trim();

        // Try to find existing product (case-insensitive)
        let product = await queryRunner.manager
            .createQueryBuilder(Product, 'product')
            .where('LOWER(product.name) = LOWER(:name)', { name: normalizedName })
            .getOne();

        // If not found, create it
        if (!product) {
            product = new Product();
            product.name = normalizedName;
            product.price = price;
            product.description = 'Auto-created from custom item';
            product.stock = 0; // Custom items don't have initial stock
            product = await queryRunner.manager.save(product);
            console.log(`✅ Auto-created product: "${normalizedName}" (ID: ${product.id}) at ₹${price}`);
        }

        return product;
    }

    async create(createInvoiceDto: CreateInvoiceDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const {
                clientId, items, date, subTotal, taxTotal, total, gstEnabled, gstRate,
                columnLabels, customColumns, paymentStatus, paidAmount,
                balanceAmount, discountAmount, showPaymentDetails, isSimpleInvoice, payments
            } = createInvoiceDto;

            const client = await queryRunner.manager.findOneBy(Client, { id: clientId });
            if (!client) throw new NotFoundException(`Client with ID ${clientId} not found`);

            const invoice = new Invoice();
            invoice.client = client;
            invoice.date = date;
            invoice.items = [];
            invoice.subTotal = subTotal;
            invoice.taxTotal = taxTotal;
            invoice.total = total;
            invoice.gstEnabled = gstEnabled;
            invoice.gstRate = gstRate;
            invoice.columnLabels = columnLabels;
            invoice.customColumns = customColumns;
            invoice.paymentStatus = paymentStatus || 'Pending';
            invoice.paidAmount = paidAmount || 0;
            invoice.balanceAmount = balanceAmount || 0;
            invoice.discountAmount = discountAmount || 0;
            invoice.showPaymentDetails = showPaymentDetails !== undefined ? showPaymentDetails : true;
            invoice.isSimpleInvoice = isSimpleInvoice !== undefined ? isSimpleInvoice : false;
            invoice.payments = payments || [];

            for (const itemDto of items) {
                const invoiceItem = new InvoiceItem();

                if (itemDto.productId) {
                    const product = await queryRunner.manager.findOneBy(Product, { id: itemDto.productId });
                    if (!product) throw new NotFoundException(`Product with ID ${itemDto.productId} not found`);

                    invoiceItem.product = product;
                    invoiceItem.price = product.price; // Snapshot price
                    invoiceItem.productName = itemDto.productName || product.name;

                    product.stock -= itemDto.quantity;
                    await queryRunner.manager.save(product);
                } else if (itemDto.productName && itemDto.productName.trim()) {
                    // Custom Item - Auto-create product for reusability
                    const product = await this.findOrCreateProduct(
                        queryRunner,
                        itemDto.productName,
                        itemDto.price || 0
                    );

                    invoiceItem.product = product;
                    invoiceItem.price = itemDto.price || 0; // Use the entered price
                    invoiceItem.productName = product.name;

                    // Reduce stock (even though it starts at 0, maintaining consistency)
                    product.stock -= itemDto.quantity;
                    await queryRunner.manager.save(product);
                } else {
                    // Fallback for missing product name
                    throw new Error('Product name is required for custom items');
                }

                invoiceItem.quantity = itemDto.quantity;
                invoiceItem.customValues = itemDto.customValues || '';

                invoice.items.push(invoiceItem);
            }

            const savedInvoice = await queryRunner.manager.save(invoice);
            await queryRunner.commitTransaction();
            return savedInvoice;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const existingInvoice = await queryRunner.manager.findOne(Invoice, {
                where: { id },
                relations: ['items', 'items.product', 'client']
            });

            if (!existingInvoice) throw new NotFoundException(`Invoice #${id} not found`);

            // Cast to any to bypass PartialType linter issues, or use strict checks
            const dto: any = updateInvoiceDto;

            // If items are provided, redo stock and items
            if (dto.items) {
                // Revert Stock for Old Items
                for (const item of existingInvoice.items) {
                    if (item.product) {
                        item.product.stock += item.quantity;
                        await queryRunner.manager.save(item.product);
                    }
                }
                // Remove Old Items
                await queryRunner.manager.remove(existingInvoice.items);
                existingInvoice.items = [];

                // Add New Items
                for (const itemDto of dto.items) {
                    const invoiceItem = new InvoiceItem();

                    if (itemDto.productId) {
                        const product = await queryRunner.manager.findOneBy(Product, { id: itemDto.productId });
                        if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

                        invoiceItem.product = product;
                        invoiceItem.price = product.price;
                        invoiceItem.productName = itemDto.productName || product.name;

                        product.stock -= itemDto.quantity;
                        await queryRunner.manager.save(product);
                    } else if (itemDto.productName && itemDto.productName.trim()) {
                        // Custom Item - Auto-create product for reusability
                        const product = await this.findOrCreateProduct(
                            queryRunner,
                            itemDto.productName,
                            itemDto.price || 0
                        );

                        invoiceItem.product = product;
                        invoiceItem.price = itemDto.price || 0;
                        invoiceItem.productName = product.name;

                        product.stock -= itemDto.quantity;
                        await queryRunner.manager.save(product);
                    } else {
                        // Fallback
                        throw new Error('Product name is required for custom items');
                    }

                    invoiceItem.quantity = itemDto.quantity;
                    invoiceItem.customValues = itemDto.customValues || '';

                    existingInvoice.items.push(invoiceItem);
                }
            }

            // Update other fields if provided
            if (dto.clientId) {
                const client = await queryRunner.manager.findOneBy(Client, { id: dto.clientId });
                if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);
                existingInvoice.client = client;
            }

            existingInvoice.date = dto.date ?? existingInvoice.date;
            existingInvoice.subTotal = dto.subTotal ?? existingInvoice.subTotal;
            existingInvoice.taxTotal = dto.taxTotal ?? existingInvoice.taxTotal;
            existingInvoice.total = dto.total ?? existingInvoice.total;
            existingInvoice.gstEnabled = dto.gstEnabled ?? existingInvoice.gstEnabled;
            existingInvoice.gstRate = dto.gstRate ?? existingInvoice.gstRate;
            existingInvoice.columnLabels = dto.columnLabels ?? existingInvoice.columnLabels;
            existingInvoice.customColumns = dto.customColumns ?? existingInvoice.customColumns;
            existingInvoice.paymentStatus = dto.paymentStatus ?? existingInvoice.paymentStatus;
            existingInvoice.paidAmount = dto.paidAmount ?? existingInvoice.paidAmount;
            existingInvoice.balanceAmount = dto.balanceAmount ?? existingInvoice.balanceAmount;
            existingInvoice.discountAmount = dto.discountAmount ?? existingInvoice.discountAmount;

            if (dto.showPaymentDetails !== undefined) {
                existingInvoice.showPaymentDetails = dto.showPaymentDetails;
            }
            if (dto.isSimpleInvoice !== undefined) {
                existingInvoice.isSimpleInvoice = dto.isSimpleInvoice;
            }
            if (dto.payments !== undefined) {
                existingInvoice.payments = dto.payments;
            }

            await queryRunner.manager.save(existingInvoice);

            // Reload the complete invoice with all relations to ensure client is returned
            const finalInvoice = await queryRunner.manager.findOne(Invoice, {
                where: { id },
                relations: ['client', 'items', 'items.product']
            });

            await queryRunner.commitTransaction();
            return finalInvoice;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    findAll() {
        return this.invoicesRepository.find({
            relations: ['client', 'items', 'items.product'],
            order: { date: 'DESC', id: 'DESC' }
        });
    }

    findOne(id: number) {
        return this.invoicesRepository.findOne({
            where: { id },
            relations: ['client', 'items', 'items.product'],
        });
    }

    remove(id: number) {
        return this.invoicesRepository.delete(id);
    }
}
