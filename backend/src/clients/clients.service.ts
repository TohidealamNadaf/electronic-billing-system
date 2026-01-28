import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
    constructor(
        @InjectRepository(Client)
        private clientsRepository: Repository<Client>,
    ) { }

    create(createClientDto: CreateClientDto) {
        const client = this.clientsRepository.create(createClientDto);
        return this.clientsRepository.save(client);
    }

    findAll() {
        return this.clientsRepository.find();
    }

    findOne(id: number) {
        return this.clientsRepository.findOneBy({ id });
    }

    update(id: number, updateClientDto: any) {
        return this.clientsRepository.update(id, updateClientDto);
    }

    remove(id: number) {
        return this.clientsRepository.delete(id);
    }
}
