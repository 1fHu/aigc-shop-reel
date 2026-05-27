import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Intentionally a no-op.
 *
 * The demo/guest user is provisioned by the runtime ensureGuestUser()
 * safety net. Keeping seed SQL here would create a false impression that
 * application startup executes this migration.
 */
export class SeedDemoUser1700000000000 implements MigrationInterface {
  name = 'SeedDemoUser1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
  }
}
