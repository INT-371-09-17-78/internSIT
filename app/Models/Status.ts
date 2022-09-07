import { column, BaseModel, manyToMany, ManyToMany } from '@ioc:Adonis/Lucid/Orm'
import Document from 'App/Models/Document'
// import User from 'App/Models/User'
// import File from 'App/Models/File'

export default class Status extends BaseModel {
  @column({ isPrimary: true })
  public status_name: string

  @manyToMany(() => Document, {
    localKey: 'status_name',
    pivotForeignKey: 'status_id',
    relatedKey: 'doc_name',
    pivotRelatedForeignKey: 'document_id',
    pivotTable: 'documents_statuses',
    pivotTimestamps: true,
  })
  //   public skills: ManyToMany<typeof Skill>
  public documents: ManyToMany<typeof Document>
}
