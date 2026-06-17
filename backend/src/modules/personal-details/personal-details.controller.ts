import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PersonalDetailsService } from './personal-details.service';
import { UpsertPersonalDetailDto } from './dto/upsert-personal-detail.dto';

@ApiTags('personal-details')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('personal-details')
export class PersonalDetailsController {
  constructor(private readonly service: PersonalDetailsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my personal details' })
  async getMyDetails(@CurrentUser() user: AuthUser) {
    return this.service.findByUser(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Create or update my personal details' })
  async upsertMyDetails(@CurrentUser() user: AuthUser, @Body() dto: UpsertPersonalDetailDto) {
    return this.service.upsert(user.id, dto);
  }
}
