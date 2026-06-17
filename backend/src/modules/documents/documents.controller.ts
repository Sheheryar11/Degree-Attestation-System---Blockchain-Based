import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, Req,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents for an application' })
  findAll(@Param('applicationId') applicationId: string, @CurrentUser() user: AuthUser) {
    return this.service.findAllForApplication(applicationId, user.id, user.role as Role);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, type: { type: 'string' } } } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('applicationId') applicationId: string,
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })] }))
    file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.upload(applicationId, user.id, user.role as Role, file, dto, req.ip, req.headers['user-agent']);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete a document' })
  delete(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.delete(documentId, user.id, user.role as Role, req.ip, req.headers['user-agent']);
  }
}
