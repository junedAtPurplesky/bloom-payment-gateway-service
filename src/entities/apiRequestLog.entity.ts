import { Entity, Column } from 'typeorm';
import Model from './model.entity';

@Entity('api_request_logs')
export class ApiRequestLog extends Model {
  @Column()
  route: string;

  @Column()
  method: string;

  @Column('text')
  requestBody: string;

  @Column('text')
  responseBody: string;

  @Column()
  statusCode: number;

  @Column({ nullable: true })
  apiKeyUsed?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column()
  durationMs: number;
} 