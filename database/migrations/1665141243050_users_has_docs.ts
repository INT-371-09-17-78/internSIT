import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class UserHasDocs extends BaseSchema {
  protected tableName = 'users_has_docs'

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
      table
        .integer('user_in_academic_year_id')
        .unsigned()
        .references('users_in_academic_years.id')
        .onDelete('CASCADE')
      table.string('no_approve_reason', 500).nullable()
      table.dateTime('advisor_date').nullable()
      table.dateTime('student_date').nullable()
      table.string('meeting_link').nullable()
      table.string('supervision_status').nullable()
      table.string('advisor_comment').nullable()
      table.string('date_confirm_status').nullable()
      // table.unique(['doc_stat_id', 'user_in_academic_year_id'])
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
