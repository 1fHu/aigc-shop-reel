import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from './product.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { ok } from '../../common/api-response';

@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('parse-url')
  parseUrl(@Body() body: { project_id: string; url: string }) {
    return ok(this.productService.parseUrl(body.project_id, body.url));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('parse-image')
  parseImage(@Body() body: { project_id: string; image: { originalname?: string } | string }) {
    const imageName = typeof body.image === 'string' ? body.image : body.image.originalname || 'image.jpg';
    return ok(this.productService.parseImage(body.project_id, imageName));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':project_id')
  update(@Param('project_id') projectId: string, @Body() body: UpdateProductDto) {
    return ok(this.productService.updateProjectProduct(projectId, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':project_id/confirm')
  confirm(@Param('project_id') projectId: string) {
    return ok(this.productService.confirm(projectId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':project_id')
  getByProjectId(@Param('project_id') projectId: string) {
    return ok(this.productService.getByProjectId(projectId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('import')
  import(@Body() body: { target_project_id: string; source_project_id: string }) {
    return ok(this.productService.importFromProject(body.target_project_id, body.source_project_id));
  }
}
