import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Posts extends BaseSchema {
  protected tableName = 'posts'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('post_id').primary()
      table.string('topic', 80).notNullable()
      table.string('content', 10000).notNullable()
      table.integer('fav').nullable()
      table
      .double('student_id')
      .unsigned()
      .references('students.student_id')
      .onDelete('CASCADE') //
      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
