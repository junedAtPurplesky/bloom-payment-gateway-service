import { Entity, Column, Index, BeforeInsert } from "typeorm";
import bcrypt from "bcryptjs";
import Model from "./model.entity";

export enum RoleEnumType {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

@Entity("users")
export class User extends Model {
  @Column({ nullable: true })
  image?: string;

  @Column({
    type: "enum",
    enum: RoleEnumType,
    default: RoleEnumType.CUSTOMER,
  })
  role: RoleEnumType;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  number?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  country?: string;

  @Index("verificationCode_index")
  @Column({ type: "text", nullable: true })
  verificationCode!: string | null;

  @Column({ nullable: true })
  authToken: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ type: "varchar", length: 6, nullable: true })
  otp: string | null;

  @Column({ type: "timestamp", nullable: true })
  otpExpiresAt: Date | null;

  @Column({ default: false })
  isOtpVerified: boolean;

  @Column({ nullable: false })
  password: string;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12);
  }

  static async comparePasswords(
    candidatePassword: string,
    hashedPassword: string
  ) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
}
