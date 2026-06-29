/**
 * 文件读取工具单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  readFileAsBase64,
  readFileAsText,
  readFileAsArrayBuffer,
  readFilesAsBase64,
  readFilesAsText,
  extractBase64FromDataUrl,
  getMimeTypeFromDataUrl,
  isValidBase64,
  getBase64Size,
  formatFileSize,
} from '../fileReader';

describe('fileReader', () => {
  describe('readFileAsBase64', () => {
    it('应该成功读取文本文件为 Base64', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsBase64(file);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('data:text/plain;base64,');
      expect(result.error).toBeUndefined();
    });

    it('应该成功读取图片文件为 Base64', async () => {
      // 创建一个简单的 1x1 像素的 PNG 图片
      const pngData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82,
      ]);
      const file = new File([pngData], 'test.png', { type: 'image/png' });

      const result = await readFileAsBase64(file);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('data:image/png;base64,');
      expect(result.error).toBeUndefined();
    });

    it('应该处理空文件', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });

      const result = await readFileAsBase64(file);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('readFileAsText', () => {
    it('应该成功读取文本文件', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsText(file);

      expect(result.success).toBe(true);
      expect(result.data).toBe(content);
      expect(result.error).toBeUndefined();
    });

    it('应该成功读取 UTF-8 编码的文本', async () => {
      const content = '你好，世界！';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsText(file);

      expect(result.success).toBe(true);
      expect(result.data).toBe(content);
    });

    it('应该处理空文件', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });

      const result = await readFileAsText(file);

      expect(result.success).toBe(true);
      expect(result.data).toBe('');
    });

    it('应该支持自定义编码', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsText(file, 'UTF-8');

      expect(result.success).toBe(true);
      expect(result.data).toBe(content);
    });
  });

  describe('readFileAsArrayBuffer', () => {
    it('应该成功读取文件为 ArrayBuffer 并转换为 Base64', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsArrayBuffer(file);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.error).toBeUndefined();
    });

    it('应该处理二进制数据', async () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff]);
      const file = new File([binaryData], 'binary.bin', {
        type: 'application/octet-stream',
      });

      const result = await readFileAsArrayBuffer(file);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('readFilesAsBase64', () => {
    it('应该批量读取多个文件为 Base64', async () => {
      const files = [
        new File(['File 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['File 2'], 'file2.txt', { type: 'text/plain' }),
        new File(['File 3'], 'file3.txt', { type: 'text/plain' }),
      ];

      const results = await readFilesAsBase64(files);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    it('应该处理空数组', async () => {
      const results = await readFilesAsBase64([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('readFilesAsText', () => {
    it('应该批量读取多个文件为文本', async () => {
      const files = [
        new File(['File 1'], 'file1.txt', { type: 'text/plain' }),
        new File(['File 2'], 'file2.txt', { type: 'text/plain' }),
        new File(['File 3'], 'file3.txt', { type: 'text/plain' }),
      ];

      const results = await readFilesAsText(files);

      expect(results).toHaveLength(3);
      expect(results[0].data).toBe('File 1');
      expect(results[1].data).toBe('File 2');
      expect(results[2].data).toBe('File 3');
    });

    it('应该处理空数组', async () => {
      const results = await readFilesAsText([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('extractBase64FromDataUrl', () => {
    it('应该从 Data URL 中提取纯 Base64 数据', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      const expected = 'iVBORw0KGgoAAAANSUhEUgAAAAUA';

      const result = extractBase64FromDataUrl(dataUrl);

      expect(result).toBe(expected);
    });

    it('应该处理没有 base64 前缀的字符串', () => {
      const input = 'iVBORw0KGgoAAAANSUhEUgAAAAUA';

      const result = extractBase64FromDataUrl(input);

      expect(result).toBe(input);
    });

    it('应该处理空字符串', () => {
      const result = extractBase64FromDataUrl('');

      expect(result).toBe('');
    });
  });

  describe('getMimeTypeFromDataUrl', () => {
    it('应该从 Data URL 中提取 MIME 类型', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

      const result = getMimeTypeFromDataUrl(dataUrl);

      expect(result).toBe('image/png');
    });

    it('应该处理不同的 MIME 类型', () => {
      const dataUrl = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';

      const result = getMimeTypeFromDataUrl(dataUrl);

      expect(result).toBe('text/plain');
    });

    it('应该处理无效的 Data URL', () => {
      const result = getMimeTypeFromDataUrl('invalid-data-url');

      expect(result).toBe('');
    });
  });

  describe('isValidBase64', () => {
    it('应该验证有效的 Base64 字符串', () => {
      const validBase64 = 'SGVsbG8sIFdvcmxkIQ==';

      const result = isValidBase64(validBase64);

      expect(result).toBe(true);
    });

    it('应该验证有效的 Data URL', () => {
      const validDataUrl = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';

      const result = isValidBase64(validDataUrl);

      expect(result).toBe(true);
    });

    it('应该拒绝无效的 Base64 字符串', () => {
      const invalidBase64 = 'This is not base64!@#$%';

      const result = isValidBase64(invalidBase64);

      expect(result).toBe(false);
    });

    it('应该处理空字符串', () => {
      const result = isValidBase64('');

      expect(result).toBe(true); // 空字符串是有效的 Base64
    });
  });

  describe('getBase64Size', () => {
    it('应该计算 Base64 字符串的大小', () => {
      // "Hello, World!" 的 Base64 编码是 "SGVsbG8sIFdvcmxkIQ=="
      // 原始大小是 13 字节
      const base64 = 'SGVsbG8sIFdvcmxkIQ==';

      const result = getBase64Size(base64);

      expect(result).toBe(13);
    });

    it('应该计算 Data URL 的大小', () => {
      const dataUrl = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';

      const result = getBase64Size(dataUrl);

      expect(result).toBe(13);
    });

    it('应该处理没有填充的 Base64', () => {
      const base64 = 'SGVsbG8'; // "Hello" 的 Base64 编码（无填充）

      const result = getBase64Size(base64);

      expect(result).toBe(5);
    });

    it('应该处理空字符串', () => {
      const result = getBase64Size('');

      expect(result).toBe(0);
    });
  });

  describe('formatFileSize', () => {
    it('应该格式化字节为 Bytes', () => {
      const result = formatFileSize(100);

      expect(result).toBe('100 Bytes');
    });

    it('应该格式化字节为 KB', () => {
      const result = formatFileSize(1024);

      expect(result).toBe('1 KB');
    });

    it('应该格式化字节为 MB', () => {
      const result = formatFileSize(1024 * 1024);

      expect(result).toBe('1 MB');
    });

    it('应该格式化字节为 GB', () => {
      const result = formatFileSize(1024 * 1024 * 1024);

      expect(result).toBe('1 GB');
    });

    it('应该支持自定义小数位数', () => {
      const result = formatFileSize(1536, 3);

      expect(result).toBe('1.5 KB');
    });

    it('应该处理 0 字节', () => {
      const result = formatFileSize(0);

      expect(result).toBe('0 Bytes');
    });

    it('应该正确格式化小数', () => {
      const result = formatFileSize(1536); // 1.5 KB

      expect(result).toBe('1.5 KB');
    });
  });
});
