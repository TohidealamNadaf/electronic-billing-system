import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productsRepository: Repository<Product>,
    ) { }

    create(createProductDto: CreateProductDto) {
        const product = this.productsRepository.create(createProductDto);
        return this.productsRepository.save(product);
    }

    findAll() {
        return this.productsRepository.find();
    }

    findOne(id: number) {
        return this.productsRepository.findOneBy({ id });
    }

    update(id: number, updateProductDto: any) {
        return this.productsRepository.update(id, updateProductDto);
    }

    remove(id: number) {
        return this.productsRepository.delete(id);
    }

    async restock(id: number, quantity: number) {
        const product = await this.productsRepository.findOneBy({ id });
        if (!product) {
            throw new Error('Product not found');
        }
        product.stock += quantity;
        return this.productsRepository.save(product);
    }

    async decreaseStock(id: number, quantity: number) {
        const product = await this.productsRepository.findOneBy({ id });
        if (!product) {
            throw new Error('Product not found');
        }
        product.stock -= quantity;
        return this.productsRepository.save(product);
    }
}
