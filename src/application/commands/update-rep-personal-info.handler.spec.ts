import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { UpdateRepPersonalInfoCommand, UpdateRepPersonalInfoHandler } from './update-rep-personal-info.handler';

function makeRep(): Rep {
  return Rep.create({
    id: RepId.of('rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
  });
}

function makeRepo(rep: Rep | null): IRepRepository {
  return {
    findById: jest.fn<Promise<Rep | null>, [RepId]>().mockResolvedValue(rep),
    save: jest.fn<Promise<void>, [Rep]>().mockResolvedValue(undefined),
  };
}

const command: UpdateRepPersonalInfoCommand = {
  repId: 'rep-1',
  firstName: 'Bob',
  lastName: 'Jones',
  email: 'bob@example.com',
};

describe('UpdateRepPersonalInfoHandler', () => {
  it('updates personalInfo and saves', async () => {
    const rep = makeRep();
    const repo = makeRepo(rep);
    await new UpdateRepPersonalInfoHandler(repo).execute(command);
    expect(rep.personalInfo.firstName).toBe('Bob');
    expect(rep.personalInfo.email).toBe('bob@example.com');
    expect(repo.save).toHaveBeenCalledWith(rep);
  });

  it('throws when rep is not found', async () => {
    const repo = makeRepo(null);
    await expect(new UpdateRepPersonalInfoHandler(repo).execute(command)).rejects.toThrow(
      'Rep not found: rep-1',
    );
  });

  it('propagates domain validation errors (empty email)', async () => {
    const repo = makeRepo(makeRep());
    await expect(
      new UpdateRepPersonalInfoHandler(repo).execute({ ...command, email: '' }),
    ).rejects.toThrow('email is required');
  });
});
