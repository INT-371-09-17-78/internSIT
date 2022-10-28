import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class UsersInAcademicYears extends BaseSchema {
  protected tableName = 'users_in_academic_years'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('academic_year')
        // .unsigned()
        .references('academic_years.academic_year')
        .onDelete('CASCADE')
      table.string('user_id', 80).references('users.user_id').onDelete('CASCADE')
      table.boolean('approved').defaultTo(false).notNullable()
      table.unique(['academic_year', 'user_id'])
      table.string('advisor_id').references('advisors.advisor_id').onDelete('CASCADE')
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
