import { Rep } from '../entities/rep.entity';
import { RepId } from '../value-objects/rep-id.vo';

export const REP_REPOSITORY = Symbol('IRepRepository');

export interface IRepRepository {
  findById(id: RepId): Promise<Rep | null>;
  save(rep: Rep): Promise<void>;
}
