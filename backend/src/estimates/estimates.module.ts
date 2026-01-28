import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';
import { Estimate } from './entities/estimate.entity';
import { EstimateItem } from './entities/estimate-item.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Estimate, EstimateItem])],
    controllers: [EstimatesController],
    providers: [EstimatesService],
})
export class EstimatesModule { }
