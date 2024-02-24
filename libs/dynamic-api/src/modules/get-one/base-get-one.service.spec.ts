import { BaseGetOneService } from '@dynamic-api';
import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { buildModelMock } from '../../../__mocks__/model.mock';

describe('BaseGetOneService', () => {
  let service: any;
  const response = { _id: 'ObjectId', __v: 1, name: 'test' };
  const modelMock = buildModelMock({ findOne: [response] });

  beforeEach(() => {
    class TestService extends BaseGetOneService<any> {
      constructor(protected readonly _: Model<any>) {
        super(_);
      }
    }

    service = new TestService(modelMock);
    jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(false);
  });

  it('should have getOne method', () => {
    expect(service).toHaveProperty('getOne');
  });

  describe('getOne', () => {
    it('should call model.findOne and return the response', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, __v, ...documentWithoutIdAndVersion } = response;

      await expect(service.getOne('ObjectId')).resolves.toStrictEqual({
        ...documentWithoutIdAndVersion,
        id: response._id,
      });
      expect(modelMock.findOne).toHaveBeenCalledWith({ _id: 'ObjectId' });
    });

    it('should call model.findOne with soft deletable query', async () => {
      jest.spyOn(service, 'isSoftDeletable', 'get').mockReturnValue(true);
      await service.getOne('ObjectId');

      expect(modelMock.findOne).toHaveBeenCalledWith({
        _id: 'ObjectId',
        isDeleted: false,
      });
    });

    it('should throw error if document not found', async () => {
      modelMock.findOne.mockReturnValueOnce({
        lean: () => ({
          exec: jest.fn(() => Promise.resolve(undefined)),
        }),
      } as any);

      await expect(service.getOne('ObjectId')).rejects.toThrow(
        new BadRequestException('Document not found'),
      );
    });
  });
});
