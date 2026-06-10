import { IsEmail, IsString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class LoginDto extends RegisterDto {}
