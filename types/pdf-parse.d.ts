declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfResult = { text: string; numpages: number; info?: unknown; metadata?: unknown };
  export default function pdf(data: Buffer | Uint8Array): Promise<PdfResult>;
}
