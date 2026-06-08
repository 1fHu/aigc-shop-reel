import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferencesColumn1710000000000 implements MigrationInterface {
  name = 'AddUserPreferencesColumn1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferences"`);
  }
}
