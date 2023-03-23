import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Posts extends BaseSchema {
  protected tableName = 'posts'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('post_id').primary()
      table.string('topic', 80).notNullable()
      table.string('content', 10000).notNullable()
      table.integer('fav').nullable()
      table
        .integer('user_in_academic_year_id')
        .unsigned()
        .references('users_in_academic_years.id')
        .onDelete('CASCADE')
        .notNullable()
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
