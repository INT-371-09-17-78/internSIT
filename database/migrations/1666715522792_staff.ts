import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Staff extends BaseSchema {
  protected tableName = 'staff'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // table.increments('id')
      table.string('staff_id').primary().references('users.user_id').onDelete('CASCADE')
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
