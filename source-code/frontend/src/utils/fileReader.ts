/**
 * 文件读取工具
 * 封装 FileReader API，提供 Base64 编码和文本读取功能
 */

/**
 * 文件读取结果接口
 */
export interface FileReadResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * 读取文件为 Base64 编码
 * @param file 文件对象
 * @returns Promise<FileReadResult> 读取结果
 */
export function readFileAsBase64(file: File): Promise<FileReadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result as string;
        resolve({
          success: true,
          data: result,
        });
      } catch (error) {
        resolve({
          success: false,
          error: `读取文件 "${file.name}" 失败：${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: `读取文件 "${file.name}" 失败：${reader.error?.message || '未知错误'}`,
      });
    };

    reader.onabort = () => {
      resolve({
        success: false,
        error: `读取文件 "${file.name}" 被中止`,
      });
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      resolve({
        success: false,
        error: `无法读取文件 "${file.name}"：${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });
}

/**
 * 读取文件为文本
 * @param file 文件对象
 * @param encoding 文本编码（默认为 'UTF-8'）
 * @returns Promise<FileReadResult> 读取结果
 */
export function readFileAsText(
  file: File,
  encoding: string = 'UTF-8'
): Promise<FileReadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result as string;
        resolve({
          success: true,
          data: result,
        });
      } catch (error) {
        resolve({
          success: false,
          error: `读取文件 "${file.name}" 失败：${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: `读取文件 "${file.name}" 失败：${reader.error?.message || '未知错误'}`,
      });
    };

    reader.onabort = () => {
      resolve({
        success: false,
        error: `读取文件 "${file.name}" 被中止`,
      });
    };

    try {
      reader.readAsText(file, encoding);
    } catch (error) {
      resolve({
        success: false,
        error: `无法读取文件 "${file.name}"：${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });
}

/**
 * 读取文件为 ArrayBuffer
 * @param file 文件对象
 * @returns Promise<FileReadResult> 读取结果（data 为 ArrayBuffer 的 Base64 编码）
 */
export function readFileAsArrayBuffer(file: File): Promise<FileReadResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        // 将 ArrayBuffer 转换为 Base64
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');
        const base64 = btoa(binaryString);
        
        resolve({
          success: true,
          data: base64,
        });
      } catch (error) {
        resolve({
          success: false,
          error: `读取文件 "${file.name}" 失败：${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: `读取文件 "${file.name}" 失败：${reader.error?.message || '未知错误'}`,
      });
    };

    reader.onabort = () => {
      resolve({
        success: false,
        error: `读取文件 "${file.name}" 被中止`,
      });
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch (error) {
      resolve({
        success: false,
        error: `无法读取文件 "${file.name}"：${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });
}

/**
 * 批量读取文件为 Base64
 * @param files 文件列表
 * @returns Promise<FileReadResult[]> 读取结果数组
 */
export async function readFilesAsBase64(files: File[]): Promise<FileReadResult[]> {
  const promises = files.map(file => readFileAsBase64(file));
  return Promise.all(promises);
}

/**
 * 批量读取文件为文本
 * @param files 文件列表
 * @param encoding 文本编码（默认为 'UTF-8'）
 * @returns Promise<FileReadResult[]> 读取结果数组
 */
export async function readFilesAsText(
  files: File[],
  encoding: string = 'UTF-8'
): Promise<FileReadResult[]> {
  const promises = files.map(file => readFileAsText(file, encoding));
  return Promise.all(promises);
}

/**
 * 从 Base64 Data URL 中提取纯 Base64 数据
 * @param dataUrl Base64 Data URL（例如：data:image/png;base64,iVBORw0KG...）
 * @returns 纯 Base64 字符串，如果格式不正确则返回原字符串
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  const base64Prefix = 'base64,';
  const base64Index = dataUrl.indexOf(base64Prefix);
  
  if (base64Index !== -1) {
    return dataUrl.slice(base64Index + base64Prefix.length);
  }
  
  return dataUrl;
}

/**
 * 获取 Base64 Data URL 的 MIME 类型
 * @param dataUrl Base64 Data URL
 * @returns MIME 类型，如果无法提取则返回空字符串
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : '';
}

/**
 * 验证 Base64 字符串格式
 * @param base64 Base64 字符串
 * @returns 是否为有效的 Base64 格式
 */
export function isValidBase64(base64: string): boolean {
  try {
    // 移除可能的 Data URL 前缀
    const pureBase64 = extractBase64FromDataUrl(base64);
    
    // Base64 字符串只能包含 A-Z, a-z, 0-9, +, /, = 字符
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    
    if (!base64Regex.test(pureBase64)) {
      return false;
    }
    
    // 尝试解码
    atob(pureBase64);
    return true;
  } catch {
    return false;
  }
}

/**
 * 计算 Base64 编码后的大小（字节）
 * @param base64 Base64 字符串（可以是 Data URL）
 * @returns 编码后的大小（字节）
 */
export function getBase64Size(base64: string): number {
  const pureBase64 = extractBase64FromDataUrl(base64);
  
  // Base64 编码后的大小计算：
  // 每 4 个字符代表 3 个字节
  // 需要减去填充字符（=）的数量
  const paddingCount = (pureBase64.match(/=/g) || []).length;
  const base64Length = pureBase64.length;
  
  return Math.floor((base64Length * 3) / 4) - paddingCount;
}

/**
 * 格式化文件大小为人类可读的字符串
 * @param bytes 字节数
 * @param decimals 小数位数（默认为 2）
 * @returns 格式化后的字符串（例如：1.23 MB）
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
