import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepBusinessInfo } from '../../domain/value-objects/rep-business-info.vo';
import { RepId } from '../../domain/value-objects/rep-id.vo';

export interface UpdateRepBusinessInfoCommand {
  repId: string;
  /** Pass null to remove business info from the Rep. */
  businessInfo: {
    businessName: string;
    businessTaxId?: string;
    businessEmail?: string;
  } | null;
}

export class UpdateRepBusinessInfoHandler {
  constructor(private readonly repRepository: IRepRepository) {}

  async execute(command: UpdateRepBusinessInfoCommand): Promise<void> {
    const rep = await this.repRepository.findById(RepId.of(command.repId));
    if (rep === null) {
      throw new Error(`Rep not found: ${command.repId}`);
    }
    const businessInfo =
      command.businessInfo != null ? RepBusinessInfo.create(command.businessInfo) : null;
    rep.updateBusinessInfo(businessInfo);
    await this.repRepository.save(rep);
  }
}
