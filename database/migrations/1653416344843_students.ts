import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Students extends BaseSchema {
  protected tableName = 'students'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      
      table.double('student_id').primary()
      table.string('firstname', 80).notNullable()
      table.string('lastname', 80).notNullable()
      table.string('email', 80).notNullable()
      table.string('password', 500).notNullable()
      table.string('department', 80).nullable
      table.string('position', 80).nullable
      table.string('company', 80).nullable
      table.integer('duration').nullable
      table.date('start_date').nullable
      table.date('end_date').nullable
      table.string('mentor_name', 80).nullable
      table.string('mentor_email', 80).nullable
      table.string('mentor_tel_no', 10).nullable
      table.string('remember_me_token').nullable()


      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
