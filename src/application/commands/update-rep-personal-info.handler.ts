import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';

export interface UpdateRepPersonalInfoCommand {
  repId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  cellPhone?: string;
  telephone?: string;
  fax?: string;
  num800?: string;
  dateOfBirth?: Date;
  ssn?: string;
}

export class UpdateRepPersonalInfoHandler {
  constructor(private readonly repRepository: IRepRepository) {}

  async execute(command: UpdateRepPersonalInfoCommand): Promise<void> {
    const rep = await this.repRepository.findById(RepId.of(command.repId));
    if (rep === null) {
      throw new Error(`Rep not found: ${command.repId}`);
    }
    rep.updatePersonalInfo(
      RepPersonalInfo.create({
        firstName: command.firstName,
        lastName: command.lastName,
        middleName: command.middleName,
        email: command.email,
        cellPhone: command.cellPhone,
        telephone: command.telephone,
        fax: command.fax,
        num800: command.num800,
        dateOfBirth: command.dateOfBirth,
        ssn: command.ssn,
      }),
    );
    await this.repRepository.save(rep);
  }
}
