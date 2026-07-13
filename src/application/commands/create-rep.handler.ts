import { NotFoundException } from '@nestjs/common';
import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepBusinessInfo } from '../../domain/value-objects/rep-business-info.vo';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { RepType } from '../../domain/value-objects/rep-type';

export interface CreateRepCommand {
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
  businessName?: string;
  businessTaxId?: string;
  businessEmail?: string;
  uplineRepId?: string;
  repType?: RepType;
}

export class CreateRepHandler {
  constructor(private readonly repRepository: IRepRepository) {}

  async execute(command: CreateRepCommand): Promise<void> {
    if (command.uplineRepId != null) {
      const upline = await this.repRepository.findById(RepId.of(command.uplineRepId));
      if (!upline) {
        throw new NotFoundException(`Upline Rep '${command.uplineRepId}' does not exist`);
      }
    }

    const personalInfo = RepPersonalInfo.create({
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
    });

    const businessInfo =
      command.businessName != null
        ? RepBusinessInfo.create({
            businessName: command.businessName,
            businessTaxId: command.businessTaxId,
            businessEmail: command.businessEmail,
          })
        : null;

    const rep = Rep.create({
      id: RepId.of(command.repId),
      personalInfo,
      businessInfo: businessInfo ?? undefined,
      uplineRepId: command.uplineRepId != null ? RepId.of(command.uplineRepId) : undefined,
      repType: command.repType,
    });

    await this.repRepository.save(rep);
  }
}
