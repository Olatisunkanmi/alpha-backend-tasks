import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';
import { DocumentType, SummaryStatus } from '../common/enums';

export class CandidateDocumentsAndSummaries1710000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create document_type enum
    const documentTypeValues = Object.values(DocumentType).map(val => `'${val}'`).join(', ');
    await queryRunner.query(`
      CREATE TYPE document_type_enum AS ENUM (${documentTypeValues});
    `);

    // Create summary_status enum
    const summaryStatusValues = Object.values(SummaryStatus).map(val => `'${val}'`).join(', ');
    await queryRunner.query(`
      CREATE TYPE summary_status_enum AS ENUM (${summaryStatusValues});
    `);

    // Create candidate_documents table
    await queryRunner.createTable(
      new Table({
        name: 'candidate_documents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'candidate_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'document_type',
            type: 'document_type_enum',
            isNullable: false,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'storage_key',
            type: 'varchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'raw_text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'uploaded_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
    );

    // Create candidate_summaries table
    await queryRunner.createTable(
      new Table({
        name: 'candidate_summaries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'candidate_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'summary_status_enum',
            default: `'${SummaryStatus.PENDING}'`,
            isNullable: false,
          },
          {
            name: 'score',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'strengths',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'concerns',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'recommended_decision',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'prompt_version',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'candidate_documents',
      new TableForeignKey({
        name: 'fk_candidate_documents_candidate_id',
        columnNames: ['candidate_id'],
        referencedTableName: 'sample_candidates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'candidate_summaries',
      new TableForeignKey({
        name: 'fk_candidate_summaries_candidate_id',
        columnNames: ['candidate_id'],
        referencedTableName: 'sample_candidates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes for performance
    await queryRunner.createIndex(
      'candidate_documents',
      new TableIndex({
        name: 'idx_candidate_documents_candidate_id',
        columnNames: ['candidate_id'],
      }),
    );

    await queryRunner.createIndex(
      'candidate_summaries',
      new TableIndex({
        name: 'idx_candidate_summaries_candidate_id',
        columnNames: ['candidate_id'],
      }),
    );

    await queryRunner.createIndex(
      'candidate_summaries',
      new TableIndex({
        name: 'idx_candidate_summaries_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('candidate_summaries', 'idx_candidate_summaries_status');
    await queryRunner.dropIndex('candidate_summaries', 'idx_candidate_summaries_candidate_id');
    await queryRunner.dropIndex('candidate_documents', 'idx_candidate_documents_candidate_id');

    // Drop foreign keys
    await queryRunner.dropForeignKey('candidate_summaries', 'fk_candidate_summaries_candidate_id');
    await queryRunner.dropForeignKey('candidate_documents', 'fk_candidate_documents_candidate_id');

    // Drop tables
    await queryRunner.dropTable('candidate_summaries');
    await queryRunner.dropTable('candidate_documents');

    // Drop enums
    await queryRunner.query(`DROP TYPE summary_status_enum;`);
    await queryRunner.query(`DROP TYPE document_type_enum;`);
  }
}