import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { ok } from '../../common/api-response';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('overview')
  overview(@Req() request: { user: { id: string } }) {
    return ok(this.dashboardService.getOverview(request.user.id));
  }
}
