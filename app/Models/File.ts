import { DateTime } from 'luxon'
import { column, BaseModel, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'

export default class File extends BaseModel {
  @column({ isPrimary: true })
  public file_id: number

  @column()
  public file_name: string

  @column()
  public post_id: string

  @belongsTo(() => Post)
  public post: BelongsTo<typeof Post>

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime
}