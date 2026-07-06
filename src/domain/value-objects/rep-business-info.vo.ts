export interface RepBusinessInfoProps {
  businessName: string;
  /** Tax ID / EIN / TIN — field name varies in matrix (business_tax_id, tin). */
  businessTaxId?: string;
  businessEmail?: string;
}

export class RepBusinessInfo {
  readonly businessName: string;
  readonly businessTaxId: string | undefined;
  readonly businessEmail: string | undefined;

  private constructor(props: RepBusinessInfoProps) {
    if (!props.businessName.trim()) throw new Error('businessName is required');
    this.businessName = props.businessName.trim();
    this.businessTaxId = props.businessTaxId;
    this.businessEmail = props.businessEmail;
  }

  static create(props: RepBusinessInfoProps): RepBusinessInfo {
    return new RepBusinessInfo(props);
  }
}
