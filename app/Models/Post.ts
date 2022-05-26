import { DateTime } from 'luxon'
import { column, BaseModel, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'

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
  public user_id: string

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
