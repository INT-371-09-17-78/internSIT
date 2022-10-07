import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class DocumentsStatuses extends BaseSchema {
  protected tableName = 'students_documents_statuses'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      //   table.primary(['student_id', 'document_id'])
      //   table.string('student_id', 80).references('students.student_id').onDelete('CASCADE')
      table
        .integer('doc_stat_id')
        .unsigned()
        .references('documents_statuses.id')
        .onDelete('CASCADE')
      table.string('student_id', 80).references('students.student_id').onDelete('CASCADE')
      table.string('no_approve_reason', 500).nullable()
      // table.unique(['student_id', 'doc_stat_id'])
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
