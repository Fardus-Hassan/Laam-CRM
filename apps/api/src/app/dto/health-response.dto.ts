import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'laam-api' })
  service!: string;

  @ApiProperty({ example: '0.0.1' })
  version!: string;

  @ApiProperty({ example: '2026-06-25T00:00:00.000Z' })
  timestamp!: string;
}
