import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { AccessControl, PlatformAccess } from '../../domain/value-objects/access-control.vo';
import { RepId } from '../../domain/value-objects/rep-id.vo';

export interface UpdateRepAccessControlCommand {
  repId: string;
  entries: PlatformAccess[];
}

export class UpdateRepAccessControlHandler {
  constructor(private readonly repRepository: IRepRepository) {}

  async execute(command: UpdateRepAccessControlCommand): Promise<void> {
    const rep = await this.repRepository.findById(RepId.of(command.repId));
    if (rep === null) {
      throw new Error(`Rep not found: ${command.repId}`);
    }
    rep.updateAccessControl(AccessControl.create(command.entries));
    await this.repRepository.save(rep);
  }
}
