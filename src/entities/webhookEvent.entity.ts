import { Entity, Column } from 'typeorm';
import Model from './model.entity';

@Entity('webhook_events')
export class WebhookEvent extends Model {
  @Column()
  eventType: string;

  @Column('text')
  payload: string;

  @Column({ nullable: true })
  relatedTransactionId?: string;

  @Column({ default: false })
  processed: boolean;
} 