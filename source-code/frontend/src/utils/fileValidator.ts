/**
 * 文件验证工具
 * 提供文件类型、大小、数量等验证功能
 */

// 文件大小限制（字节）
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_COUNT = 10;

// 支持的图片格式
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
];

// 支持的文档格式
export const SUPPORTED_DOCUMENT_FORMATS = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
  'text/csv',
  'text/x-log',
  // Office 文档
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  // 代码文件
  'text/x-python',
  'text/javascript',
  'text/typescript',
  'text/x-java',
  'text/x-c',
  'text/x-c++',
  'text/x-go',
  'text/x-rust',
];

// 支持的文件扩展名（用于MIME类型检测失败时的备用方案）
export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
];

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.txt',
  '.md',
  '.json',
  '.xml',
  '.csv',
  '.log',
  '.docx',
  '.xlsx',
  '.py',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.java',
  '.cpp',
  '.c',
  '.go',
  '.rs',
];

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

/**
 * 验证文件类型
 * @param file 文件对象
 * @returns 验证结果
 */
export function validateFileType(file: File): ValidationResult {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // 检查是否为支持的图片格式
  const isImage = SUPPORTED_IMAGE_FORMATS.includes(fileType) ||
    SUPPORTED_IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext));

  // 检查是否为支持的文档格式
  const isDocument = SUPPORTED_DOCUMENT_FORMATS.includes(fileType) ||
    SUPPORTED_DOCUMENT_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (isImage || isDocument) {
    return { valid: true };
  }

  // 不支持的格式，返回警告但允许上传
  return {
    valid: true,
    warning: `文件类型 "${file.type || '未知'}" 可能不被支持，但仍允许上传。`,
  };
}

/**
 * 验证单个文件大小
 * @param file 文件对象
 * @returns 验证结果
 */
export function validateFileSize(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `文件 "${file.name}" 大小为 ${sizeMB}MB，超过了 ${maxSizeMB}MB 的限制。`,
    };
  }

  return { valid: true };
}

/**
 * 验证总文件大小
 * @param files 文件列表
 * @param newFile 新增的文件（可选）
 * @returns 验证结果
 */
export function validateTotalSize(
  files: FileInfo[],
  newFile?: File
): ValidationResult {
  const currentTotalSize = files.reduce((sum, file) => sum + file.size, 0);
  const newFileSize = newFile ? newFile.size : 0;
  const totalSize = currentTotalSize + newFileSize;

  if (totalSize > MAX_TOTAL_SIZE) {
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const maxTotalSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `总文件大小为 ${totalSizeMB}MB，超过了 ${maxTotalSizeMB}MB 的限制。`,
    };
  }

  return { valid: true };
}

/**
 * 验证文件数量
 * @param currentCount 当前文件数量
 * @param newFilesCount 新增文件数量（默认为1）
 * @returns 验证结果
 */
export function validateFileCount(
  currentCount: number,
  newFilesCount: number = 1
): ValidationResult {
  const totalCount = currentCount + newFilesCount;

  if (totalCount > MAX_FILE_COUNT) {
    return {
      valid: false,
      error: `文件数量为 ${totalCount}，超过了 ${MAX_FILE_COUNT} 个的限制。`,
    };
  }

  return { valid: true };
}

/**
 * 综合验证文件
 * @param file 要验证的文件
 * @param existingFiles 已存在的文件列表
 * @returns 验证结果
 */
export function validateFile(
  file: File,
  existingFiles: FileInfo[]
): ValidationResult {
  // 验证文件类型
  const typeResult = validateFileType(file);
  if (!typeResult.valid) {
    return typeResult;
  }

  // 验证单个文件大小
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // 验证文件数量
  const countResult = validateFileCount(existingFiles.length, 1);
  if (!countResult.valid) {
    return countResult;
  }

  // 验证总文件大小
  const totalSizeResult = validateTotalSize(existingFiles, file);
  if (!totalSizeResult.valid) {
    return totalSizeResult;
  }

  // 如果有警告，返回警告
  if (typeResult.warning) {
    return typeResult;
  }

  return { valid: true };
}

/**
 * 批量验证文件
 * @param newFiles 要验证的文件列表
 * @param existingFiles 已存在的文件列表
 * @returns 验证结果数组
 */
export function validateFiles(
  newFiles: File[],
  existingFiles: FileInfo[]
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const tempFiles = [...existingFiles];

  for (const file of newFiles) {
    const result = validateFile(file, tempFiles);
    results.push(result);

    // 如果验证通过，将文件添加到临时列表中，用于后续验证
    if (result.valid) {
      tempFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
  }

  return results;
}

/**
 * 检查文件是否为图片
 * @param file 文件对象
 * @returns 是否为图片
 */
export function isImageFile(file: File | FileInfo): boolean {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return (
    SUPPORTED_IMAGE_FORMATS.includes(fileType) ||
    SUPPORTED_IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext))
  );
}

/**
 * 检查文件是否为文档
 * @param file 文件对象
 * @returns 是否为文档
 */
export function isDocumentFile(file: File | FileInfo): boolean {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return (
    SUPPORTED_DOCUMENT_FORMATS.includes(fileType) ||
    SUPPORTED_DOCUMENT_EXTENSIONS.some(ext => fileName.endsWith(ext))
  );
}
