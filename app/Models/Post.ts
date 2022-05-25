import { DateTime } from 'luxon'
import { column, BaseModel, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Student from 'App/Models/Student'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  public post_id: number

  @column()
  public topic: string

  @column()
  public content: string

  @column()
  public fav: number

  @column()
  public student_id: number

  @belongsTo(() => Student)
  public student: BelongsTo<typeof Student>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
