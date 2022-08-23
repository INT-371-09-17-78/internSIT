import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Files extends BaseSchema {
  protected tableName = 'files'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('file_id').primary()
      table.string('file_name', 80).notNullable()
      table.integer('post_id').references('posts.post_id').onDelete('CASCADE').nullable().unsigned()
      table.string('user_id').references('users.user_id').onDelete('CASCADE').nullable()
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
