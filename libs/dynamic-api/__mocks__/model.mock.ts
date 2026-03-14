import { createMock } from '@golevelup/ts-jest';
import { Model, Query } from 'mongoose';

type LeanQueryMock<T> = {
  exec: jest.Mock<Promise<T>>;
  lean: () => { exec: jest.Mock<Promise<T>> };
};

type ExecQueryMock<T> = {
  exec: jest.Mock<Promise<T>>;
};

const buildModelMock = <T = unknown>({
  create,
  find,
  findOne,
  findOneAndReplace,
  findOneAndUpdate,
  deleteMany,
  deleteOne,
  updateOne,
}: {
  create?: T[];
  find?: T[][];
  findOne?: T[];
  findOneAndReplace?: T[];
  findOneAndUpdate?: T[];
  deleteMany?: unknown[];
  deleteOne?: unknown[];
  updateOne?: unknown[];
} = {}) => {
  const exec = jest.fn();
  const lean = jest.fn(() => ({ exec }));
  const modelMock = createMock<Model<T>>({
    create: jest.fn(),
    find: jest.fn(() => ({ lean })),
    findOne: jest.fn(() => ({ lean })),
    findOneAndReplace: jest.fn(() => ({ lean })),
    findOneAndUpdate: jest.fn(() => ({ lean })),
    updateMany: jest.fn(() => ({ lean })),
    updateOne: jest.fn(() => ({ lean })),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  });

  if (create?.length) {
    create.forEach((c, i) =>
      i === create.length - 1
        ? modelMock.create.mockResolvedValue(c as unknown as never)
        : modelMock.create.mockResolvedValueOnce(c as unknown as never),
    );
  }

  if (find?.length) {
    find.forEach((f, i) => {
      const value: LeanQueryMock<T[]> = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      };

      if (i === find.length - 1) {
        modelMock.find.mockReturnValue(value as unknown as Query<unknown[], unknown, object, T, 'find', object>);
      } else {
        modelMock.find.mockReturnValueOnce(value as unknown as Query<unknown[], unknown, object, T, 'find', object>);
      }
    });
  }

  if (findOne?.length) {
    findOne.forEach((f, i) => {
      const value: LeanQueryMock<T> = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      };

      if (i === findOne.length - 1) {
        modelMock.findOne.mockReturnValue(value as unknown as Query<unknown, unknown, object, T, 'findOne', object>);
      } else {
        modelMock.findOne.mockReturnValueOnce(value as unknown as Query<unknown, unknown, object, T, 'findOne', object>);
      }
    });
  }

  if (findOneAndReplace?.length) {
    findOneAndReplace.forEach((f, i) => {
      const value: LeanQueryMock<T> = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      };

      if (i === findOneAndReplace.length - 1) {
        modelMock.findOneAndReplace.mockReturnValue(value as unknown as Query<unknown, unknown, object, T, 'findOneAndReplace', object>);
      } else {
        modelMock.findOneAndReplace.mockReturnValueOnce(value as unknown as Query<unknown, unknown, object, T, 'findOneAndReplace', object>);
      }
    });
  }

  if (findOneAndUpdate?.length) {
    findOneAndUpdate.forEach((f, i) => {
      const value: LeanQueryMock<T> = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      };

      if (i === findOneAndUpdate.length - 1) {
        modelMock.findOneAndUpdate.mockReturnValue(value as unknown as Query<unknown, unknown, object, T, 'findOneAndUpdate', object>);
      } else {
        modelMock.findOneAndUpdate.mockReturnValueOnce(value as unknown as Query<unknown, unknown, object, T, 'findOneAndUpdate', object>);
      }
    });
  }

  if (deleteOne?.length) {
    deleteOne.forEach((d, i) => {
      const value: ExecQueryMock<unknown> = {
        exec: jest.fn(() => Promise.resolve(d)),
      };

      if (i === deleteOne.length - 1) {
        modelMock.deleteOne.mockReturnValue(value as unknown as ReturnType<Model<T>['deleteOne']>);
      } else {
        modelMock.deleteOne.mockReturnValueOnce(value as unknown as ReturnType<Model<T>['deleteOne']>);
      }
    });
  }

  if (deleteMany?.length) {
    deleteMany.forEach((d, i) => {
      const value: ExecQueryMock<unknown> = {
        exec: jest.fn(() => Promise.resolve(d)),
      };

      if (i === deleteMany.length - 1) {
        modelMock.deleteMany.mockReturnValue(value as unknown as ReturnType<Model<T>['deleteMany']>);
      } else {
        modelMock.deleteMany.mockReturnValueOnce(value as unknown as ReturnType<Model<T>['deleteMany']>);
      }
    });
  }

  if (updateOne?.length) {
    updateOne.forEach((u, i) => {
      const value: ExecQueryMock<unknown> = {
        exec: jest.fn(() => Promise.resolve(u)),
      };

      if (i === updateOne.length - 1) {
        modelMock.updateOne.mockReturnValue(value as unknown as ReturnType<Model<T>['updateOne']>);
      } else {
        modelMock.updateOne.mockReturnValueOnce(value as unknown as ReturnType<Model<T>['updateOne']>);
      }
    });
  }

  return modelMock;
};

export { buildModelMock };
