import { Entity, Column } from 'typeorm';
import Model from './model.entity';

@Entity('payment_transactions')
export class PaymentTransaction extends Model {
  @Column()
  orderId: string;

  @Column({ nullable: true })
  userId?: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  status: string;

  @Column('text')
  gatewayResponse: string;

  @Column()
  clientRequestId: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ default: false })
  webhookReceived: boolean;
} 