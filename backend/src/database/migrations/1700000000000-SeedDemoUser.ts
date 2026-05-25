import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed the M0 guest/demo user (idempotent).
 *
 * Per DB design doc §2.1, the demo user is a pre-existing row keyed by
 * UUID a0000000-0000-0000-0000-000000000001. The runtime guest-login
 * flow also calls ensureGuestUser() as a safety net.
 *
 * Password hash below is bcrypt cost-10 of 'demo1234'. The demo account
 * is not meant to be logged into via password — only via guest-login.
 */
export class SeedDemoUser1700000000000 implements MigrationInterface {
  name = 'SeedDemoUser1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO users (id, email, password_hash, nickname, plan_type, video_quota)
      VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'demo@vidcraft.io',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        '体验用户',
        'free',
        3
      )
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM users WHERE id = 'a0000000-0000-0000-0000-000000000001';
    `);
  }
}
