import { Test, TestingModule } from '@nestjs/testing';
import { CommisionsService } from './commisions.service';

describe('CommisionsService', () => {
  let service: CommisionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommisionsService],
    }).compile();

    service = module.get<CommisionsService>(CommisionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
