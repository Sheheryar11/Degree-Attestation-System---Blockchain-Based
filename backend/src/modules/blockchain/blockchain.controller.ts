import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { BlockchainService } from './blockchain.service';

@ApiTags('blockchain')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly service: BlockchainService) {}

  @Get('records')
  @ApiOperation({ summary: 'List all blockchain records (ADMIN)' })
  listAll() {
    return this.service.listAll();
  }
}
