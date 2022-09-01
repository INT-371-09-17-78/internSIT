import { column, BaseModel, manyToMany, ManyToMany } from '@ioc:Adonis/Lucid/Orm'
import Status from 'App/Models/Status'
// import File from 'App/Models/File'

export default class Document extends BaseModel {
  @column({ isPrimary: true })
  public doc_name: string

  @manyToMany(() => Status, {
    localKey: 'doc_name',
    pivotForeignKey: 'document_id',
    relatedKey: 'status_name',
    pivotRelatedForeignKey: 'status_id',
    pivotTable: 'documents_statuses',
    // pivotColumns: ['proficiency'],
    pivotTimestamps: true,
  })
  public statuses: ManyToMany<typeof Status>
}
