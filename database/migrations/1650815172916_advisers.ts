import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Advisers extends BaseSchema {
  protected tableName = 'advisers'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // table.increments('id')
      table.string('adviser_id').primary().references('users.user_id').onDelete('CASCADE')

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
