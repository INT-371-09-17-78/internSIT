import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class UsersSchema extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('user_id', 80).primary()
      table.string('firstname', 80).nullable()
      table.string('lastname', 80).nullable()
      table.string('email', 80).nullable()
      table.string('role', 80).notNullable().defaultTo('student')
      table.string('password', 500).nullable()
      table.string('remember_me_token').nullable()
      // table.string('adviser_id').references('users.user_id').onDelete('CASCADE')
      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
