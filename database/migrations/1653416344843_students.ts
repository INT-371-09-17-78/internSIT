import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Students extends BaseSchema {
  protected tableName = 'students'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('student_id').primary().references('users.user_id').onDelete('CASCADE')
      table.string('department', 80).nullable()
      table.string('position', 80).nullable()
      table.string('company', 80).nullable()
      table.integer('plan').nullable()
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.string('mentor_name', 80).nullable()
      table.string('mentor_email', 80).nullable()
      table.string('mentor_tel_no', 10).nullable()
      table.string('status', 30).notNullable().defaultTo('ยังไม่ได้เลือก')
      table.string('study', 10).nullable()
      table.string('reasons', 500).nullable()
      // table.string('remember_me_token').nullable()
      // table.string('user_id')
      table.string('adviser_id').references('users.user_id').onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
