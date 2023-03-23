import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class UsersInAcademicYears extends BaseSchema {
  protected tableName = 'users_in_academic_years'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('user_id', 80).references('users.user_id').onDelete('CASCADE')
      table
        .string('academic_year')
        // .unsigned()
        .references('academic_years.academic_year')
        .onDelete('CASCADE')
      table.boolean('approved').defaultTo(false).notNullable()
      table.unique(['academic_year', 'user_id'])
      table
        .integer('advisor_ac_id')
        .unsigned()
        .references('users_in_academic_years.id')
        .onDelete('CASCADE')
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
