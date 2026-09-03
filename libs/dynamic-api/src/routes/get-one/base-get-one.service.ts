import { Model, PopulateOptions } from 'mongoose';
import { AfterSaveCallback, CallbackRetryOptions, PopulateConfig } from '../../interfaces';
import { BaseEntity } from '../../models';
import { BaseService } from '../../services/base/base.service';
import { GetOneService } from './get-one-service.interface';

export abstract class BaseGetOneService<Entity extends BaseEntity>
  extends BaseService<Entity>
  implements GetOneService<Entity> {
  protected readonly callback: AfterSaveCallback<Entity> | undefined;
  protected readonly callbackRetry: CallbackRetryOptions | undefined;
  protected readonly populate: PopulateConfig | undefined;

  protected constructor(protected readonly model: Model<Entity>) {
    super(model);
  }

  async getOne(id: string, user?: unknown): Promise<Entity> {
    try {
      const query = this.model.findOne({
        _id: id,
        ...(
          this.isSoftDeletable ? { isDeleted: false } : undefined
        ),
      });

      if (this.populate) {
        // Mongoose's `populate()` overloads don't jointly cover a bare-string-or-array-or-object
        // union in one signature — cast to the (structurally equivalent, more permissive)
        // "options" overload; Mongoose itself normalizes a bare string identically at runtime.
        query.populate(this.populate as PopulateOptions | (string | PopulateOptions)[]);
      }

      const document = await query
      .lean<Entity>()
      .exec();

      if (!document) {
        this.handleDocumentNotFound();
      }

      await this.invokeAfterSaveCallback(this.callback, this.addDocumentId(document), user, this.callbackRetry);

      return this.buildInstance(document);
    } catch (error) {
      this.handleMongoErrors(error);
    }
  }
}
