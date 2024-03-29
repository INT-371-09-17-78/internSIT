import BaseSchema from '@ioc:Adonis/Lucid/Schema'
import { StepStatus, AllSteps, SupervisionStatus } from 'Contracts/enum'

export default class UserHasDocs extends BaseSchema {
  protected tableName = 'users_has_docs'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      //   table.primary(['student_id', 'document_id'])
      //   table.string('student_id', 80).references('students.student_id').onDelete('CASCADE')
      // table.integer('step_status_id').unsigned().references('steps_statuses.id').onDelete('CASCADE')
      table
        .integer('user_in_academic_year_id')
        .unsigned()
        .references('users_in_academic_years.id')
        .onDelete('CASCADE')
      table.string('no_approve_reason', 500).nullable()
      table.string('advisor_date').nullable()
      table.string('student_date').nullable()
      table.string('complete_date').nullable()
      table.string('meeting_link').nullable()
      // table.string('supervision_status').nullable()
      table
        .enu('supervision_status', Object.values(SupervisionStatus), {
          useNative: true,
          enumName: 'supervisions',
          existingType: false,
        })
        .nullable()
      // table.string('advisor_comment').nullable()
      table.string('date_confirm_status').nullable()
      table.enu('step', Object.values(AllSteps), {
        useNative: true,
        enumName: 'steps',
        existingType: false,
      })
      table.enu('status', Object.values(StepStatus), {
        useNative: true,
        enumName: 'statuses',
        existingType: false,
      })
      table.boolean('is_react').notNullable().defaultTo(0)
      table.boolean('is_signed').notNullable().defaultTo(0)
      table.boolean('is_new').notNullable().defaultTo(0)
      // table.unique(['doc_stat_id', 'user_in_academic_year_id'])
      // table.unique(['student_id', 'doc_stat_id'])
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
