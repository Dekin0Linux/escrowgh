import { Test, TestingModule } from '@nestjs/testing';
import { CommisionsController } from './commisions.controller';

describe('CommisionsController', () => {
  let controller: CommisionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommisionsController],
    }).compile();

    controller = module.get<CommisionsController>(CommisionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
