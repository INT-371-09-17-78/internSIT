import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AcademicYearConfigs extends BaseSchema {
  protected tableName = 'academic_year_configs'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('acedemic_year')
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
