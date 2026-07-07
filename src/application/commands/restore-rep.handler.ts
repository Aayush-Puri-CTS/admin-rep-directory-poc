import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';

export interface RestoreRepCommand {
  repId: string;
}

export class RestoreRepHandler {
  constructor(private readonly repRepository: IRepRepository) {}

  async execute(command: RestoreRepCommand): Promise<void> {
    const rep = await this.repRepository.findById(RepId.of(command.repId));
    if (rep === null) {
      throw new Error(`Rep not found: ${command.repId}`);
    }
    rep.restore();
    await this.repRepository.save(rep);
  }
}
