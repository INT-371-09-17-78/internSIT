import { DateTime } from 'luxon'
import { column, BaseModel, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'
// import User from 'App/Models/User'
// import Document from 'App/Models/Document'
import UserHasDoc from 'App/Models/UserHasDoc'

export default class File extends BaseModel {
  @column({ isPrimary: true })
  public file_id: string

  @column()
  public file_name: string

  @column()
  public file_size: string

  @column()
  public template_step: string

  // @column()
  // public doc_name: string

  // @belongsTo(() => Document)
  // public document: BelongsTo<typeof Document>

  // @column()
  // public user_id: string

  @column({ columnName: 'post_id' })
  public post_id: number

  @column()
  public user_has_doc_id: number

  // @belongsTo(() => Document)
  // public document: BelongsTo<typeof Document>

  @belongsTo(() => Post)
  public post: BelongsTo<typeof Post>

  // @belongsTo(() => User)
  // public user: BelongsTo<typeof User>

  @belongsTo(() => UserHasDoc)
  public userHasDoc: BelongsTo<typeof UserHasDoc>

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime
}
