import { Controller, Post, Get, Body, Res, Req, HttpCode } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateCredentials(loginDto);
    const token = await this.authService.generateToken(user);
    const cookieOptions = this.authService.getCookieOptions();

    res.cookie('auth_token', token, cookieOptions);

    return { email: user.email };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token');
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @HttpCode(200)
  getMe(@Req() req: Request) {
    const user = req.user;
    if (!user) {
      return null;
    }
    return user;
  }
}
