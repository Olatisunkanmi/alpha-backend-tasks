import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class AddRecruitersTable1710000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create recruiters table
    await queryRunner.createTable(
      new Table({
        name: "recruiters",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "workspace_id",
            type: "varchar",
            length: "64",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "160",
            isNullable: false,
          },
          {
            name: "email",
            type: "varchar",
            length: "160",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      "recruiters",
      new TableForeignKey({
        name: "fk_recruiters_workspace_id",
        columnNames: ["workspace_id"],
        referencedTableName: "sample_workspaces",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      "recruiters",
      new TableIndex({
        name: "idx_recruiters_workspace_id",
        columnNames: ["workspace_id"],
      }),
    );

    await queryRunner.createIndex(
      "recruiters",
      new TableIndex({
        name: "idx_recruiters_email",
        columnNames: ["email"],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex("recruiters", "idx_recruiters_email");
    await queryRunner.dropIndex("recruiters", "idx_recruiters_workspace_id");

    // Drop foreign key
    await queryRunner.dropForeignKey(
      "recruiters",
      "fk_recruiters_workspace_id",
    );

    // Drop table
    await queryRunner.dropTable("recruiters");
  }
}
