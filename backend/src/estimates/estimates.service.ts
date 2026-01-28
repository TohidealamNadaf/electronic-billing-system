import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Estimate } from './entities/estimate.entity';
import { EstimateItem } from './entities/estimate-item.entity';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { Client } from '../clients/entities/client.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class EstimatesService {
    constructor(
        @InjectRepository(Estimate)
        private estimatesRepository: Repository<Estimate>,
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

    async create(createEstimateDto: CreateEstimateDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const {
                clientId, items, date, subTotal, taxTotal, total, gstEnabled, gstRate,
                columnLabels, customColumns, status, discountAmount, isSimpleEstimate, notes
            } = createEstimateDto;

            const client = await queryRunner.manager.findOneBy(Client, { id: clientId });
            if (!client) throw new NotFoundException(`Client with ID ${clientId} not found`);

            const estimate = new Estimate();
            estimate.client = client;
            estimate.date = date;
            estimate.items = [];
            estimate.subTotal = subTotal;
            estimate.taxTotal = taxTotal;
            estimate.total = total;
            estimate.gstEnabled = gstEnabled;
            estimate.gstRate = gstRate || '';
            estimate.columnLabels = columnLabels || '';
            estimate.customColumns = customColumns || '';
            estimate.status = status || 'Draft';
            estimate.discountAmount = discountAmount || 0;
            estimate.isSimpleEstimate = isSimpleEstimate !== undefined ? isSimpleEstimate : false;
            estimate.notes = notes || '';

            for (const itemDto of items) {
                const estimateItem = new EstimateItem();

                if (itemDto.productId) {
                    const product = await queryRunner.manager.findOneBy(Product, { id: itemDto.productId });
                    if (!product) throw new NotFoundException(`Product with ID ${itemDto.productId} not found`);

                    estimateItem.product = product;
                    estimateItem.price = product.price; // Snapshot price
                    estimateItem.productName = itemDto.productName || product.name;
                    // No stock reduction for estimates
                } else if (itemDto.productName && itemDto.productName.trim()) {
                    // Custom Item - Auto-create product for reusability
                    const product = await this.findOrCreateProduct(
                        queryRunner,
                        itemDto.productName,
                        itemDto.price || 0
                    );

                    estimateItem.product = product;
                    estimateItem.price = itemDto.price || 0; // Use the entered price
                    estimateItem.productName = product.name;
                    // No stock reduction for estimates
                } else {
                    // Fallback for missing product name
                    throw new Error('Product name is required for custom items');
                }

                estimateItem.quantity = itemDto.quantity;
                estimateItem.customValues = itemDto.customValues || '';

                estimate.items.push(estimateItem);
            }

            const savedEstimate = await queryRunner.manager.save(estimate);
            await queryRunner.commitTransaction();
            return savedEstimate;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll() {
        return this.estimatesRepository.find({
            relations: ['client', 'items', 'items.product'],
            order: { date: 'DESC' }
        });
    }

    async findOne(id: number) {
        const estimate = await this.estimatesRepository.findOne({
            where: { id },
            relations: ['client', 'items', 'items.product']
        });
        if (!estimate) throw new NotFoundException(`Estimate with ID ${id} not found`);
        return estimate;
    }

    async update(id: number, updateEstimateDto: any) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const estimate = await queryRunner.manager.findOne(Estimate, {
                where: { id },
                relations: ['items', 'items.product', 'client']
            });

            if (!estimate) throw new NotFoundException(`Estimate with ID ${id} not found`);

            // Update estimate fields
            if (updateEstimateDto.date) estimate.date = updateEstimateDto.date;
            if (updateEstimateDto.subTotal !== undefined) estimate.subTotal = updateEstimateDto.subTotal;
            if (updateEstimateDto.taxTotal !== undefined) estimate.taxTotal = updateEstimateDto.taxTotal;
            if (updateEstimateDto.total !== undefined) estimate.total = updateEstimateDto.total;
            if (updateEstimateDto.gstEnabled !== undefined) estimate.gstEnabled = updateEstimateDto.gstEnabled;
            if (updateEstimateDto.gstRate !== undefined) estimate.gstRate = updateEstimateDto.gstRate;
            if (updateEstimateDto.columnLabels !== undefined) estimate.columnLabels = updateEstimateDto.columnLabels;
            if (updateEstimateDto.customColumns !== undefined) estimate.customColumns = updateEstimateDto.customColumns;
            if (updateEstimateDto.status !== undefined) estimate.status = updateEstimateDto.status;
            if (updateEstimateDto.discountAmount !== undefined) estimate.discountAmount = updateEstimateDto.discountAmount;
            if (updateEstimateDto.isSimpleEstimate !== undefined) estimate.isSimpleEstimate = updateEstimateDto.isSimpleEstimate;
            if (updateEstimateDto.notes !== undefined) estimate.notes = updateEstimateDto.notes;

            // Update client if provided
            if (updateEstimateDto.clientId) {
                const client = await queryRunner.manager.findOneBy(Client, { id: updateEstimateDto.clientId });
                if (!client) throw new NotFoundException(`Client with ID ${updateEstimateDto.clientId} not found`);
                estimate.client = client;
            }

            // Handle items update if provided
            if (updateEstimateDto.items) {
                // Remove old items (no stock restoration needed for estimates)
                await queryRunner.manager.remove(estimate.items);

                // Add new items
                estimate.items = [];
                for (const itemDto of updateEstimateDto.items) {
                    const estimateItem = new EstimateItem();

                    if (itemDto.productId) {
                        const product = await queryRunner.manager.findOneBy(Product, { id: itemDto.productId });
                        if (!product) throw new NotFoundException(`Product with ID ${itemDto.productId} not found`);

                        estimateItem.product = product;
                        estimateItem.price = product.price;
                        estimateItem.productName = itemDto.productName || product.name;
                    } else if (itemDto.productName && itemDto.productName.trim()) {
                        // Custom Item - Auto-create product for reusability
                        const product = await this.findOrCreateProduct(
                            queryRunner,
                            itemDto.productName,
                            itemDto.price || 0
                        );

                        estimateItem.product = product;
                        estimateItem.price = itemDto.price || 0;
                        estimateItem.productName = product.name;
                        // No stock reduction for estimates
                    } else {
                        // Fallback
                        throw new Error('Product name is required for custom items');
                    }

                    estimateItem.quantity = itemDto.quantity;
                    estimateItem.customValues = itemDto.customValues || '';

                    // CRITICAL: Do NOT affect stock for estimates
                    estimate.items.push(estimateItem);
                }
            }

            await queryRunner.manager.save(estimate);

            // Reload the complete estimate with all relations
            const finalEstimate = await queryRunner.manager.findOne(Estimate, {
                where: { id },
                relations: ['client', 'items', 'items.product']
            });

            await queryRunner.commitTransaction();
            return finalEstimate;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async remove(id: number) {
        const estimate = await this.estimatesRepository.findOne({
            where: { id },
            relations: ['items']
        });

        if (!estimate) throw new NotFoundException(`Estimate with ID ${id} not found`);

        // CRITICAL: No stock restoration needed for estimates
        await this.estimatesRepository.remove(estimate);
        return { message: 'Estimate deleted successfully' };
    }
}
