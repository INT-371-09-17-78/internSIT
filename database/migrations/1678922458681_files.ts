import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Files extends BaseSchema {
  protected tableName = 'files'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('file_id', 80).primary()
      // table.increments('file_id').primary()
      table.string('file_name', 80).notNullable()
      table.string('file_size', 10).notNullable()
      // table.string('doc_id').references('documents.doc_name').onDelete('CASCADE').nullable()
      table.integer('post_id').references('posts.post_id').onDelete('CASCADE').nullable().unsigned()
      table
        .integer('user_has_doc_id')
        .unsigned()
        .references('users_has_docs.id')
        .onDelete('CASCADE')
        .nullable()
      // table.string('doc_name').references('documents.doc_name').onDelete('CASCADE').nullable()
      // table.string('user_id').references('users.user_id').onDelete('CASCADE').nullable()
      // table.unique(['user_id', 'doc_id'])
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
