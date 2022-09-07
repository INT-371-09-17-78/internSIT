import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class DocumentsStatuses extends BaseSchema {
  protected tableName = 'documents_statuses'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // table.increments('id').primary()
      table.primary(['student_id', 'document_id'])
      table.string('student_id', 80).references('students.student_id').onDelete('CASCADE')
      table.string('document_id').references('documents.doc_name').onDelete('CASCADE')
      table.string('status_id').references('statuses.status_name').onDelete('CASCADE')
      table.unique(['document_id', 'student_id'])
      table.string('no_approve_reason', 500).nullable()
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
