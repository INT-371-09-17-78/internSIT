import { column, BaseModel, manyToMany, ManyToMany } from '@ioc:Adonis/Lucid/Orm'
import Student from 'App/Models/Student'
import { DateTime } from 'luxon'
// import File from 'App/Models/File'

export default class DocumentStatus extends BaseModel {
  //   @column({ isPrimary: true })
  //   public id: number
  public static table = 'documents_statuses'

  @column({ isPrimary: true })
  public id: number

  @column()
  public document_id: string

  @column()
  public status_id: string

  // @column()
  // public no_approve_reason: string

  // @column()
  // public student_id: string

  // @belongsTo(() => Student)
  // public student: BelongsTo<typeof Student>

  @manyToMany(() => Student, {
    localKey: 'id',
    pivotForeignKey: 'doc_stat_id',
    relatedKey: 'student_id',
    pivotRelatedForeignKey: 'student_id',
    pivotTable: 'students_documents_statuses',
    pivotColumns: ['no_approve_reason'],
    pivotTimestamps: true,
  })
  public students: ManyToMany<typeof Student>

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime
}
