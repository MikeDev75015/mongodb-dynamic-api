import { createMock } from '@golevelup/ts-jest';
import { Model } from 'mongoose';

const buildModelMock = ({
  create,
  find,
  findOne,
  findOneAndReplace,
  findOneAndUpdate,
  deleteMany,
  deleteOne,
  updateOne,
}: {
  create?: any[];
  find?: any[][];
  findOne?: any[];
  findOneAndReplace?: any[];
  findOneAndUpdate?: any[];
  deleteMany?: any[];
  deleteOne?: any[];
  updateOne?: any[];
} = {}) => {
  const modelMock = createMock<Model<any>>();

  if (create?.length) {
    create.forEach((c, i) =>
      i === create.length - 1
        ? modelMock.create.mockResolvedValue(c)
        : modelMock.create.mockResolvedValueOnce(c),
    );
  }

  if (find?.length) {
    find.forEach((f, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      } as any;

      if (i === find.length - 1) {
        modelMock.find.mockReturnValue(value);
      } else {
        modelMock.find.mockReturnValueOnce(value);
      }
    });
  }

  if (findOne?.length) {
    findOne.forEach((f, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      } as any;

      if (i === findOne.length - 1) {
        modelMock.findOne.mockReturnValue(value);
      } else {
        modelMock.findOne.mockReturnValueOnce(value);
      }
    });
  }

  if (findOneAndReplace?.length) {
    findOneAndReplace.forEach((f, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      } as any;

      if (i === findOneAndReplace.length - 1) {
        modelMock.findOneAndReplace.mockReturnValue(value);
      } else {
        modelMock.findOneAndReplace.mockReturnValueOnce(value);
      }
    });
  }

  if (findOneAndUpdate?.length) {
    findOneAndUpdate.forEach((f, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(f)),
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(f)),
        }),
      } as any;

      if (i === findOneAndUpdate.length - 1) {
        modelMock.findOneAndUpdate.mockReturnValue(value);
      } else {
        modelMock.findOneAndUpdate.mockReturnValueOnce(value);
      }
    });
  }

  if (deleteOne?.length) {
    deleteOne.forEach((d, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(d)),
      } as any;

      if (i === deleteOne.length - 1) {
        modelMock.deleteOne.mockReturnValue(value);
      } else {
        modelMock.deleteOne.mockReturnValueOnce(value);
      }
    });
  }

  if (deleteMany?.length) {
    deleteMany.forEach((d, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(d)),
      } as any;

      if (i === deleteMany.length - 1) {
        modelMock.deleteMany.mockReturnValue(value);
      } else {
        modelMock.deleteMany.mockReturnValueOnce(value);
      }
    });
  }

  if (updateOne?.length) {
    updateOne.forEach((u, i) => {
      const value = {
        exec: jest.fn(() => Promise.resolve(u)),
      } as any;

      if (i === updateOne.length - 1) {
        modelMock.updateOne.mockReturnValue(value);
      } else {
        modelMock.updateOne.mockReturnValueOnce(value);
      }
    });
  }

  return modelMock;
};

export { buildModelMock };
