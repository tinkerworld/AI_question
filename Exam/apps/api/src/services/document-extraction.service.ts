export interface ExtractDocumentInput {
  fileBase64?: string;
  fileText?: string;
  fileName?: string;
  mimeType?: string;
}

export class DocumentExtractionService {
  /**
   * Extracts clean plain text from an uploaded document (PDF, TXT, or MD).
   */
  static async extractText(input: ExtractDocumentInput): Promise<string> {
    // 1. Direct text provided
    if (input.fileText && typeof input.fileText === 'string' && input.fileText.trim().length > 0) {
      return input.fileText.trim();
    }

    if (!input.fileBase64) {
      throw new Error('INVALID_DOCUMENT: No document content or file data provided.');
    }

    const fileName = (input.fileName || '').toLowerCase();
    const mimeType = (input.mimeType || '').toLowerCase();
    const isPdf = mimeType.includes('pdf') || fileName.endsWith('.pdf');
    const buffer = Buffer.from(input.fileBase64, 'base64');
    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

    if (buffer.length === 0) {
      throw new Error('INVALID_DOCUMENT: The uploaded file is empty.');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`FILE_TOO_LARGE: Uploaded file exceeds the maximum allowed size of 50MB (received ${(buffer.length / (1024 * 1024)).toFixed(1)}MB).`);
    }

    if (isPdf) {
      const extracted = await this.extractPdfText(buffer);
      if (!extracted || extracted.trim().length === 0) {
        throw new Error('PDF_EMPTY_OR_UNREADABLE: Could not extract text layer from the PDF. Ensure the PDF contains a selectable text layer.');
      }
      return extracted.trim();
    }

    // Default to UTF-8 text (txt, md, json, etc.)
    const text = buffer.toString('utf-8');
    if (!text || text.trim().length === 0) {
      throw new Error('INVALID_DOCUMENT: The uploaded text document is empty.');
    }
    return text.trim();
  }

  /**
   * Extracts text from PDF buffer using pdf-parse.
   */
  private static async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const pdfModule = require('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy().catch(() => {});
        return result.text || '';
      }
      if (typeof pdfModule === 'function') {
        const result = await pdfModule(buffer);
        return result.text || '';
      }
      if (pdfModule.default && typeof pdfModule.default === 'function') {
        const result = await pdfModule.default(buffer);
        return result.text || '';
      }
      throw new Error('PDF parser module interface not recognized');
    } catch (err: any) {
      throw new Error(`PDF_EXTRACTION_FAILED: Failed to parse PDF text: ${err.message}`);
    }
  }
}
