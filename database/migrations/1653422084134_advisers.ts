import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Advisers extends BaseSchema {
  protected tableName = 'advisers'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.string('adviser_id').primary()
      table.string('firstname', 80).notNullable()
      table.string('lastname', 80).notNullable()
      table.string('email', 80).notNullable()
      table.string('password', 500).notNullable()
  
      table.string('remember_me_token').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
