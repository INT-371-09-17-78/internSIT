import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AcademicYears extends BaseSchema {
  protected tableName = 'academic_years'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // table.increments('conf_id')
      // table.increments('academic_year')
      table.string('academic_year').primary()
      // table.integer('academic_year_name').notNullable()
      // table.string('semester').notNullable()
      table.boolean('status').notNullable().defaultTo(false)
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
