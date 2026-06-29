/**
 * 文件验证工具单元测试
 * 
 * 测试文件类型、大小、数量等验证功能
 */

import { describe, it, expect } from 'vitest';
import {
  validateFileType,
  validateFileSize,
  validateTotalSize,
  validateFileCount,
  validateFile,
  validateFiles,
  isImageFile,
  isDocumentFile,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  MAX_FILE_COUNT,
  type FileInfo,
} from '../fileValidator';

// 辅助函数：创建模拟文件
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

// 辅助函数：创建文件信息
function createFileInfo(
  name: string,
  size: number,
  type: string
): FileInfo {
  return { name, size, type };
}

describe('文件验证工具', () => {
  describe('validateFileType - 文件类型验证', () => {
    it('应该接受支持的图片格式（MIME类型）', () => {
      const imageTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
      ];

      imageTypes.forEach(type => {
        const file = createMockFile('test.jpg', 1000, type);
        const result = validateFileType(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.warning).toBeUndefined();
      });
    });

    it('应该接受支持的图片格式（文件扩展名）', () => {
      const imageExtensions = [
        'test.jpg',
        'test.jpeg',
        'test.png',
        'test.gif',
        'test.webp',
        'test.bmp',
      ];

      imageExtensions.forEach(name => {
        const file = createMockFile(name, 1000, '');
        const result = validateFileType(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.warning).toBeUndefined();
      });
    });

    it('应该接受支持的文档格式（MIME类型）', () => {
      const documentTypes = [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'text/csv',
      ];

      documentTypes.forEach(type => {
        const file = createMockFile('test.pdf', 1000, type);
        const result = validateFileType(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.warning).toBeUndefined();
      });
    });

    it('应该接受支持的文档格式（文件扩展名）', () => {
      const documentExtensions = [
        'test.pdf',
        'test.txt',
        'test.md',
        'test.json',
        'test.xml',
        'test.csv',
        'test.log',
        'test.docx',
        'test.xlsx',
        'test.py',
        'test.js',
        'test.ts',
      ];

      documentExtensions.forEach(name => {
        const file = createMockFile(name, 1000, '');
        const result = validateFileType(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.warning).toBeUndefined();
      });
    });

    it('不支持的格式应该返回警告但允许上传', () => {
      const file = createMockFile('test.exe', 1000, 'application/x-msdownload');
      const result = validateFileType(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('可能不被支持');
    });

    it('应该不区分大小写', () => {
      const file1 = createMockFile('TEST.JPG', 1000, 'IMAGE/JPEG');
      const file2 = createMockFile('test.jpg', 1000, 'image/jpeg');
      
      const result1 = validateFileType(file1);
      const result2 = validateFileType(file2);
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  describe('validateFileSize - 单个文件大小验证', () => {
    it('小于20MB的文件应该通过验证', () => {
      const file = createMockFile('test.jpg', 10 * 1024 * 1024, 'image/jpeg'); // 10MB
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('恰好20MB的文件应该通过验证', () => {
      const file = createMockFile('test.jpg', MAX_FILE_SIZE, 'image/jpeg');
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('超过20MB的文件应该拒绝', () => {
      const file = createMockFile('test.jpg', MAX_FILE_SIZE + 1, 'image/jpeg');
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('超过了');
      expect(result.error).toContain('20MB');
    });

    it('错误消息应该包含文件名和大小', () => {
      const file = createMockFile('large.pdf', 25 * 1024 * 1024, 'application/pdf');
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('large.pdf');
      expect(result.error).toContain('25');
    });
  });

  describe('validateTotalSize - 总文件大小验证', () => {
    it('总大小小于50MB应该通过验证', () => {
      const existingFiles: FileInfo[] = [
        createFileInfo('file1.jpg', 10 * 1024 * 1024, 'image/jpeg'),
        createFileInfo('file2.jpg', 10 * 1024 * 1024, 'image/jpeg'),
      ];
      const newFile = createMockFile('file3.jpg', 10 * 1024 * 1024, 'image/jpeg');
      
      const result = validateTotalSize(existingFiles, newFile);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('总大小恰好50MB应该通过验证', () => {
      const existingFiles: FileInfo[] = [
        createFileInfo('file1.jpg', 30 * 1024 * 1024, 'image/jpeg'),
      ];
      const newFile = createMockFile('file2.jpg', 20 * 1024 * 1024, 'image/jpeg');
      
      const result = validateTotalSize(existingFiles, newFile);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('总大小超过50MB应该拒绝', () => {
      const existingFiles: FileInfo[] = [
        createFileInfo('file1.jpg', 30 * 1024 * 1024, 'image/jpeg'),
      ];
      const newFile = createMockFile('file2.jpg', 21 * 1024 * 1024, 'image/jpeg');
      
      const result = validateTotalSize(existingFiles, newFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('超过了');
      expect(result.error).toContain('50MB');
    });

    it('空文件列表应该正常工作', () => {
      const existingFiles: FileInfo[] = [];
      const newFile = createMockFile('file.jpg', 10 * 1024 * 1024, 'image/jpeg');
      
      const result = validateTotalSize(existingFiles, newFile);
      
      expect(result.valid).toBe(true);
    });

    it('不传入新文件时应该只验证现有文件', () => {
      const existingFiles: FileInfo[] = [
        createFileInfo('file1.jpg', 40 * 1024 * 1024, 'image/jpeg'),
      ];
      
      const result = validateTotalSize(existingFiles);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFileCount - 文件数量验证', () => {
    it('少于10个文件应该通过验证', () => {
      const result = validateFileCount(5, 1);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('恰好10个文件应该通过验证', () => {
      const result = validateFileCount(9, 1);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('超过10个文件应该拒绝', () => {
      const result = validateFileCount(10, 1);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('超过了');
      expect(result.error).toContain('10');
    });

    it('应该支持批量添加多个文件', () => {
      const result = validateFileCount(8, 3);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('11');
    });

    it('默认新增文件数量应该为1', () => {
      const result = validateFileCount(9);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFile - 综合文件验证', () => {
    it('有效的文件应该通过所有验证', () => {
      const existingFiles: FileInfo[] = [
        createFileInfo('file1.jpg', 5 * 1024 * 1024, 'image/jpeg'),
      ];
      const newFile = createMockFile('file2.jpg', 5 * 1024 * 1024, 'image/jpeg');
      
      const result = validateFile(newFile, existingFiles);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('文件类型不支持应该返回警告', () => {
      const existingFiles: FileInfo[] = [];
      const newFile = createMockFile('file.exe', 1000, 'application/x-msdownload');
      
      const result = validateFile(newFile, existingFiles);
      
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
    });

    it('文件过大应该拒绝', () => {
      const existingFiles: FileInfo[] = [];
      const newFile = createMockFile('large.jpg', MAX_FILE_SIZE + 1, 'image/jpeg');
      
      const result = validateFile(newFile, existingFiles);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('超过了');
    });

    it('文件数量超限应该拒绝', () => {
      const existingFiles: FileInfo[] = Array(10).fill(null).map((_, i) =>
        createFileInfo(`file${i}.jpg`, 1000, 'image/jpeg')
      );
      const newFile = createMockFile('file11.jpg', 1000, 'image/jpeg');
      
      const result = validateFile(newFile, existingFiles);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('文件数量');
    });

    it('总大小超限应该拒绝', () => {
      const existingFiles: FileInfo[] = [
        createFileInfo('file1.jpg', 40 * 1024 * 1024, 'image/jpeg'),
      ];
      const newFile = createMockFile('file2.jpg', 15 * 1024 * 1024, 'image/jpeg');
      
      const result = validateFile(newFile, existingFiles);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('总文件大小');
    });
  });

  describe('validateFiles - 批量文件验证', () => {
    it('应该验证多个文件', () => {
      const existingFiles: FileInfo[] = [];
      const newFiles = [
        createMockFile('file1.jpg', 5 * 1024 * 1024, 'image/jpeg'),
        createMockFile('file2.jpg', 5 * 1024 * 1024, 'image/jpeg'),
      ];
      
      const results = validateFiles(newFiles, existingFiles);
      
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('应该累积计算文件大小', () => {
      const existingFiles: FileInfo[] = [];
      const newFiles = [
        createMockFile('file1.jpg', 15 * 1024 * 1024, 'image/jpeg'), // 15MB
        createMockFile('file2.jpg', 20 * 1024 * 1024, 'image/jpeg'), // 20MB，总大小35MB，通过
        createMockFile('file3.jpg', 20 * 1024 * 1024, 'image/jpeg'), // 20MB，总大小55MB，超过50MB限制
      ];
      
      const results = validateFiles(newFiles, existingFiles);
      
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(false);
      expect(results[2].error).toContain('总文件大小');
    });

    it('验证失败后不应该影响后续文件的验证', () => {
      const existingFiles: FileInfo[] = [];
      const newFiles = [
        createMockFile('file1.jpg', MAX_FILE_SIZE + 1, 'image/jpeg'), // 单个文件过大
        createMockFile('file2.jpg', 5 * 1024 * 1024, 'image/jpeg'),
      ];
      
      const results = validateFiles(newFiles, existingFiles);
      
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(false);
      expect(results[1].valid).toBe(true);
    });

    it('应该正确处理空文件列表', () => {
      const existingFiles: FileInfo[] = [];
      const newFiles: File[] = [];
      
      const results = validateFiles(newFiles, existingFiles);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('isImageFile - 图片文件检测', () => {
    it('应该正确识别图片文件（MIME类型）', () => {
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');
      expect(isImageFile(file)).toBe(true);
    });

    it('应该正确识别图片文件（扩展名）', () => {
      const file = createMockFile('test.png', 1000, '');
      expect(isImageFile(file)).toBe(true);
    });

    it('应该正确识别非图片文件', () => {
      const file = createMockFile('test.pdf', 1000, 'application/pdf');
      expect(isImageFile(file)).toBe(false);
    });

    it('应该支持FileInfo接口', () => {
      const fileInfo = createFileInfo('test.jpg', 1000, 'image/jpeg');
      expect(isImageFile(fileInfo)).toBe(true);
    });
  });

  describe('isDocumentFile - 文档文件检测', () => {
    it('应该正确识别文档文件（MIME类型）', () => {
      const file = createMockFile('test.pdf', 1000, 'application/pdf');
      expect(isDocumentFile(file)).toBe(true);
    });

    it('应该正确识别文档文件（扩展名）', () => {
      const file = createMockFile('test.txt', 1000, '');
      expect(isDocumentFile(file)).toBe(true);
    });

    it('应该正确识别非文档文件', () => {
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');
      expect(isDocumentFile(file)).toBe(false);
    });

    it('应该支持FileInfo接口', () => {
      const fileInfo = createFileInfo('test.pdf', 1000, 'application/pdf');
      expect(isDocumentFile(fileInfo)).toBe(true);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理0字节文件', () => {
      const file = createMockFile('empty.txt', 0, 'text/plain');
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(true);
    });

    it('应该处理没有扩展名的文件', () => {
      const file = createMockFile('noextension', 1000, 'image/jpeg');
      const result = validateFileType(file);
      
      expect(result.valid).toBe(true);
    });

    it('应该处理没有MIME类型的文件', () => {
      const file = createMockFile('test.jpg', 1000, '');
      const result = validateFileType(file);
      
      expect(result.valid).toBe(true);
    });

    it('应该处理特殊字符文件名', () => {
      const file = createMockFile('文件 (1) [测试].jpg', 1000, 'image/jpeg');
      const result = validateFileType(file);
      
      expect(result.valid).toBe(true);
    });
  });
});
