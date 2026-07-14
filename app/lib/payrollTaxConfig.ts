export type TaxAgeCategory = "under65" | "65to74" | "75plus";

type TaxBracket = {
  min: number;
  max: number | null;
  baseTax: number;
  rate: number;
};

type PayeTaxYearConfig = {
  taxYear: number;
  startMonth: string;
  endMonth: string;
  brackets: TaxBracket[];
  rebates: Record<TaxAgeCategory, number>;
};

export const PAYROLL_TAX_CONFIG = {
  uif: {
    monthlyEarningsLimit: 17712,
    employeeRate: 0.01,
    employerRate: 0.01,
  },
  paye: [
    {
      taxYear: 2027,
      startMonth: "2026-03",
      endMonth: "2027-02",
      brackets: [
        { min: 1, max: 245100, baseTax: 0, rate: 0.18 },
        { min: 245101, max: 383100, baseTax: 44118, rate: 0.26 },
        { min: 383101, max: 530200, baseTax: 79998, rate: 0.31 },
        { min: 530201, max: 695800, baseTax: 125599, rate: 0.36 },
        { min: 695801, max: 887000, baseTax: 185215, rate: 0.39 },
        { min: 887001, max: 1878600, baseTax: 259783, rate: 0.41 },
        { min: 1878601, max: null, baseTax: 666339, rate: 0.45 },
      ],
      rebates: {
        under65: 17820,
        "65to74": 27585,
        "75plus": 30834,
      },
    },
    {
      taxYear: 2026,
      startMonth: "2025-03",
      endMonth: "2026-02",
      brackets: [
        { min: 1, max: 237100, baseTax: 0, rate: 0.18 },
        { min: 237101, max: 370500, baseTax: 42678, rate: 0.26 },
        { min: 370501, max: 512800, baseTax: 77362, rate: 0.31 },
        { min: 512801, max: 673000, baseTax: 121475, rate: 0.36 },
        { min: 673001, max: 857900, baseTax: 179147, rate: 0.39 },
        { min: 857901, max: 1817000, baseTax: 251258, rate: 0.41 },
        { min: 1817001, max: null, baseTax: 644489, rate: 0.45 },
      ],
      rebates: {
        under65: 17235,
        "65to74": 26679,
        "75plus": 29824,
      },
    },
  ] satisfies PayeTaxYearConfig[],
};

function normaliseAgeCategory(ageCategory: string): TaxAgeCategory {
  if (ageCategory === "65to74" || ageCategory === "75plus") {
    return ageCategory;
  }

  return "under65";
}

export function getPayeTaxYearConfig(payrollMonth: string) {
  const cleanPayrollMonth = /^\d{4}-\d{2}$/.test(payrollMonth)
    ? payrollMonth
    : PAYROLL_TAX_CONFIG.paye[0].startMonth;

  return (
    PAYROLL_TAX_CONFIG.paye.find(
      (config) =>
        cleanPayrollMonth >= config.startMonth && cleanPayrollMonth <= config.endMonth
    ) || PAYROLL_TAX_CONFIG.paye[0]
  );
}

export function calculateEstimatedPaye({
  annualTaxableIncome,
  ageCategory,
  payrollMonth,
}: {
  annualTaxableIncome: number;
  ageCategory: string;
  payrollMonth: string;
}) {
  const taxConfig = getPayeTaxYearConfig(payrollMonth);
  const bracket = taxConfig.brackets.find(
    (item) =>
      annualTaxableIncome >= item.min &&
      (item.max === null || annualTaxableIncome <= item.max)
  );

  if (!bracket) return 0;

  const rebate = taxConfig.rebates[normaliseAgeCategory(ageCategory)];
  const annualTax =
    bracket.baseTax + (annualTaxableIncome - (bracket.min - 1)) * bracket.rate;

  return Number((Math.max(annualTax - rebate, 0) / 12).toFixed(2));
}

export function calculateEstimatedUif(grossPay: number) {
  const uifSalary = Math.min(grossPay, PAYROLL_TAX_CONFIG.uif.monthlyEarningsLimit);
  const employee = Number(
    (uifSalary * PAYROLL_TAX_CONFIG.uif.employeeRate).toFixed(2)
  );
  const employer = Number(
    (uifSalary * PAYROLL_TAX_CONFIG.uif.employerRate).toFixed(2)
  );

  return {
    employee,
    employer,
    total: Number((employee + employer).toFixed(2)),
  };
}