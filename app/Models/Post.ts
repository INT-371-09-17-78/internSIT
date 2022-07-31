import { DateTime } from 'luxon'
import { column, BaseModel, belongsTo, BelongsTo, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'
import File from 'App/Models/File'

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

  @hasMany(() => File, { foreignKey: 'post_id' })
  public files: HasMany<typeof File>

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime
}
