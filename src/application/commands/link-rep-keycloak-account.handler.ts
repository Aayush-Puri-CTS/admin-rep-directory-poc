import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';

export interface LinkRepKeycloakAccountCommand {
  repId: string;
  keycloakUserId: string;
}

export class LinkRepKeycloakAccountHandler {
  constructor(private readonly repRepository: IRepRepository) {}

  async execute(command: LinkRepKeycloakAccountCommand): Promise<void> {
    const rep = await this.repRepository.findById(RepId.of(command.repId));
    if (rep === null) {
      throw new Error(`Rep not found: ${command.repId}`);
    }
    rep.linkKeycloakAccount(command.keycloakUserId);
    await this.repRepository.save(rep);
  }
}
