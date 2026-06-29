/**
 * 文件类型检测和图标映射工具
 * 根据MIME类型和文件扩展名检测文件类型，并映射对应的图标
 */

/**
 * 文件类型枚举
 */
export enum FileType {
  // 图片类型
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_PNG = 'image/png',
  IMAGE_GIF = 'image/gif',
  IMAGE_WEBP = 'image/webp',
  IMAGE_BMP = 'image/bmp',
  
  // 文档类型
  PDF = 'application/pdf',
  TEXT = 'text/plain',
  MARKDOWN = 'text/markdown',
  JSON = 'application/json',
  XML = 'application/xml',
  CSV = 'text/csv',
  LOG = 'text/x-log',
  
  // Office 文档
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  // 代码文件
  PYTHON = 'text/x-python',
  JAVASCRIPT = 'text/javascript',
  TYPESCRIPT = 'text/typescript',
  JAVA = 'text/x-java',
  C = 'text/x-c',
  CPP = 'text/x-c++',
  GO = 'text/x-go',
  RUST = 'text/x-rust',
  
  // 未知类型
  UNKNOWN = 'application/octet-stream',
}

/**
 * 文件类别
 */
export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  CODE = 'code',
  UNKNOWN = 'unknown',
}

/**
 * 文件图标类型
 */
export enum FileIcon {
  // 图片图标
  IMAGE = 'image',
  
  // 文档图标
  PDF = 'pdf',
  TEXT = 'text',
  MARKDOWN = 'markdown',
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  LOG = 'log',
  WORD = 'word',
  EXCEL = 'excel',
  
  // 代码图标
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JAVA = 'java',
  C = 'c',
  CPP = 'cpp',
  GO = 'go',
  RUST = 'rust',
  CODE = 'code',
  
  // 未知图标
  UNKNOWN = 'unknown',
}

/**
 * 文件类型信息
 */
export interface FileTypeInfo {
  type: FileType;
  category: FileCategory;
  icon: FileIcon;
  displayName: string;
}

/**
 * 扩展名到MIME类型的映射
 */
const EXTENSION_TO_MIME: Record<string, FileType> = {
  // 图片
  '.jpg': FileType.IMAGE_JPEG,
  '.jpeg': FileType.IMAGE_JPEG,
  '.png': FileType.IMAGE_PNG,
  '.gif': FileType.IMAGE_GIF,
  '.webp': FileType.IMAGE_WEBP,
  '.bmp': FileType.IMAGE_BMP,
  
  // 文档
  '.pdf': FileType.PDF,
  '.txt': FileType.TEXT,
  '.md': FileType.MARKDOWN,
  '.json': FileType.JSON,
  '.xml': FileType.XML,
  '.csv': FileType.CSV,
  '.log': FileType.LOG,
  '.docx': FileType.DOCX,
  '.xlsx': FileType.XLSX,
  
  // 代码
  '.py': FileType.PYTHON,
  '.js': FileType.JAVASCRIPT,
  '.ts': FileType.TYPESCRIPT,
  '.jsx': FileType.JAVASCRIPT,
  '.tsx': FileType.TYPESCRIPT,
  '.java': FileType.JAVA,
  '.c': FileType.C,
  '.cpp': FileType.CPP,
  '.go': FileType.GO,
  '.rs': FileType.RUST,
};

/**
 * MIME类型到文件类型信息的映射
 */
const MIME_TO_TYPE_INFO: Record<string, Omit<FileTypeInfo, 'type'>> = {
  // 图片
  'image/jpeg': {
    category: FileCategory.IMAGE,
    icon: FileIcon.IMAGE,
    displayName: 'JPEG 图片',
  },
  'image/png': {
    category: FileCategory.IMAGE,
    icon: FileIcon.IMAGE,
    displayName: 'PNG 图片',
  },
  'image/gif': {
    category: FileCategory.IMAGE,
    icon: FileIcon.IMAGE,
    displayName: 'GIF 图片',
  },
  'image/webp': {
    category: FileCategory.IMAGE,
    icon: FileIcon.IMAGE,
    displayName: 'WebP 图片',
  },
  'image/bmp': {
    category: FileCategory.IMAGE,
    icon: FileIcon.IMAGE,
    displayName: 'BMP 图片',
  },
  
  // 文档
  'application/pdf': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.PDF,
    displayName: 'PDF 文档',
  },
  'text/plain': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.TEXT,
    displayName: '文本文件',
  },
  'text/markdown': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.MARKDOWN,
    displayName: 'Markdown 文档',
  },
  'application/json': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.JSON,
    displayName: 'JSON 文件',
  },
  'application/xml': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.XML,
    displayName: 'XML 文件',
  },
  'text/xml': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.XML,
    displayName: 'XML 文件',
  },
  'text/csv': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.CSV,
    displayName: 'CSV 文件',
  },
  'text/x-log': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.LOG,
    displayName: '日志文件',
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.WORD,
    displayName: 'Word 文档',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    category: FileCategory.DOCUMENT,
    icon: FileIcon.EXCEL,
    displayName: 'Excel 表格',
  },
  
  // 代码
  'text/x-python': {
    category: FileCategory.CODE,
    icon: FileIcon.PYTHON,
    displayName: 'Python 代码',
  },
  'text/javascript': {
    category: FileCategory.CODE,
    icon: FileIcon.JAVASCRIPT,
    displayName: 'JavaScript 代码',
  },
  'text/typescript': {
    category: FileCategory.CODE,
    icon: FileIcon.TYPESCRIPT,
    displayName: 'TypeScript 代码',
  },
  'text/x-java': {
    category: FileCategory.CODE,
    icon: FileIcon.JAVA,
    displayName: 'Java 代码',
  },
  'text/x-c': {
    category: FileCategory.CODE,
    icon: FileIcon.C,
    displayName: 'C 代码',
  },
  'text/x-c++': {
    category: FileCategory.CODE,
    icon: FileIcon.CPP,
    displayName: 'C++ 代码',
  },
  'text/x-go': {
    category: FileCategory.CODE,
    icon: FileIcon.GO,
    displayName: 'Go 代码',
  },
  'text/x-rust': {
    category: FileCategory.CODE,
    icon: FileIcon.RUST,
    displayName: 'Rust 代码',
  },
};

/**
 * 从文件名获取扩展名
 * @param fileName 文件名
 * @returns 扩展名（小写，包含点）
 */
function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return '';
  }
  return fileName.slice(lastDotIndex).toLowerCase();
}

/**
 * 根据MIME类型检测文件类型
 * @param mimeType MIME类型
 * @returns 文件类型，如果无法识别则返回null
 */
function detectTypeByMime(mimeType: string): FileType | null {
  const normalizedMime = mimeType.toLowerCase().trim();
  
  // 精确匹配
  if (normalizedMime in MIME_TO_TYPE_INFO) {
    return normalizedMime as FileType;
  }
  
  // 模糊匹配图片类型
  if (normalizedMime.startsWith('image/')) {
    return FileType.IMAGE_JPEG; // 默认图片类型
  }
  
  // 模糊匹配文本类型
  if (normalizedMime.startsWith('text/')) {
    return FileType.TEXT; // 默认文本类型
  }
  
  return null;
}

/**
 * 根据文件扩展名检测文件类型
 * @param fileName 文件名
 * @returns 文件类型，如果无法识别则返回null
 */
function detectTypeByExtension(fileName: string): FileType | null {
  const extension = getFileExtension(fileName);
  return EXTENSION_TO_MIME[extension] || null;
}

/**
 * 检测文件类型
 * @param file 文件对象或文件信息
 * @returns 文件类型信息
 */
export function detectFileType(file: File | { name: string; type: string }): FileTypeInfo {
  // 优先使用MIME类型检测
  let detectedType = detectTypeByMime(file.type);
  
  // 如果MIME类型检测失败，使用扩展名检测
  if (!detectedType) {
    detectedType = detectTypeByExtension(file.name);
  }
  
  // 如果仍然无法检测，返回未知类型
  if (!detectedType) {
    return {
      type: FileType.UNKNOWN,
      category: FileCategory.UNKNOWN,
      icon: FileIcon.UNKNOWN,
      displayName: '未知文件',
    };
  }
  
  // 获取类型信息
  const typeInfo = MIME_TO_TYPE_INFO[detectedType];
  
  return {
    type: detectedType,
    ...typeInfo,
  };
}

/**
 * 获取文件图标
 * @param file 文件对象或文件信息
 * @returns 文件图标类型
 */
export function getFileIcon(file: File | { name: string; type: string }): FileIcon {
  const typeInfo = detectFileType(file);
  return typeInfo.icon;
}

/**
 * 获取文件类别
 * @param file 文件对象或文件信息
 * @returns 文件类别
 */
export function getFileCategory(file: File | { name: string; type: string }): FileCategory {
  const typeInfo = detectFileType(file);
  return typeInfo.category;
}

/**
 * 获取文件显示名称
 * @param file 文件对象或文件信息
 * @returns 文件类型的显示名称
 */
export function getFileDisplayName(file: File | { name: string; type: string }): string {
  const typeInfo = detectFileType(file);
  return typeInfo.displayName;
}

/**
 * 检查文件是否为图片
 * @param file 文件对象或文件信息
 * @returns 是否为图片
 */
export function isImageFile(file: File | { name: string; type: string }): boolean {
  const category = getFileCategory(file);
  return category === FileCategory.IMAGE;
}

/**
 * 检查文件是否为文档
 * @param file 文件对象或文件信息
 * @returns 是否为文档
 */
export function isDocumentFile(file: File | { name: string; type: string }): boolean {
  const category = getFileCategory(file);
  return category === FileCategory.DOCUMENT;
}

/**
 * 检查文件是否为代码文件
 * @param file 文件对象或文件信息
 * @returns 是否为代码文件
 */
export function isCodeFile(file: File | { name: string; type: string }): boolean {
  const category = getFileCategory(file);
  return category === FileCategory.CODE;
}
