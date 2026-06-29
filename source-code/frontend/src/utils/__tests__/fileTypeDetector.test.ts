/**
 * 文件类型检测工具单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  FileType,
  FileCategory,
  FileIcon,
  detectFileType,
  getFileIcon,
  getFileCategory,
  getFileDisplayName,
  isImageFile,
  isDocumentFile,
  isCodeFile,
} from '../fileTypeDetector';

describe('fileTypeDetector', () => {
  describe('detectFileType', () => {
    it('应该根据MIME类型检测图片文件', () => {
      const file = { name: 'test.jpg', type: 'image/jpeg' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.IMAGE_JPEG);
      expect(result.category).toBe(FileCategory.IMAGE);
      expect(result.icon).toBe(FileIcon.IMAGE);
      expect(result.displayName).toBe('JPEG 图片');
    });

    it('应该根据MIME类型检测PNG图片', () => {
      const file = { name: 'test.png', type: 'image/png' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.IMAGE_PNG);
      expect(result.category).toBe(FileCategory.IMAGE);
      expect(result.icon).toBe(FileIcon.IMAGE);
    });

    it('应该根据MIME类型检测PDF文档', () => {
      const file = { name: 'test.pdf', type: 'application/pdf' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.PDF);
      expect(result.category).toBe(FileCategory.DOCUMENT);
      expect(result.icon).toBe(FileIcon.PDF);
      expect(result.displayName).toBe('PDF 文档');
    });

    it('应该根据MIME类型检测文本文件', () => {
      const file = { name: 'test.txt', type: 'text/plain' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.TEXT);
      expect(result.category).toBe(FileCategory.DOCUMENT);
      expect(result.icon).toBe(FileIcon.TEXT);
    });

    it('应该根据MIME类型检测代码文件', () => {
      const file = { name: 'test.py', type: 'text/x-python' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.PYTHON);
      expect(result.category).toBe(FileCategory.CODE);
      expect(result.icon).toBe(FileIcon.PYTHON);
      expect(result.displayName).toBe('Python 代码');
    });

    it('应该根据扩展名检测文件类型（当MIME类型为空时）', () => {
      const file = { name: 'test.jpg', type: '' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.IMAGE_JPEG);
      expect(result.category).toBe(FileCategory.IMAGE);
      expect(result.icon).toBe(FileIcon.IMAGE);
    });

    it('应该根据扩展名检测PDF文件', () => {
      const file = { name: 'document.pdf', type: '' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.PDF);
      expect(result.category).toBe(FileCategory.DOCUMENT);
      expect(result.icon).toBe(FileIcon.PDF);
    });

    it('应该根据扩展名检测Markdown文件', () => {
      const file = { name: 'readme.md', type: '' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.MARKDOWN);
      expect(result.category).toBe(FileCategory.DOCUMENT);
      expect(result.icon).toBe(FileIcon.MARKDOWN);
    });

    it('应该根据扩展名检测TypeScript文件', () => {
      const file = { name: 'app.ts', type: '' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.TYPESCRIPT);
      expect(result.category).toBe(FileCategory.CODE);
      expect(result.icon).toBe(FileIcon.TYPESCRIPT);
    });

    it('应该处理大小写不敏感的扩展名', () => {
      const file1 = { name: 'test.JPG', type: '' };
      const file2 = { name: 'test.Jpg', type: '' };
      
      expect(detectFileType(file1).type).toBe(FileType.IMAGE_JPEG);
      expect(detectFileType(file2).type).toBe(FileType.IMAGE_JPEG);
    });

    it('应该处理大小写不敏感的MIME类型', () => {
      const file1 = { name: 'test.jpg', type: 'IMAGE/JPEG' };
      const file2 = { name: 'test.jpg', type: 'Image/Jpeg' };
      
      expect(detectFileType(file1).type).toBe(FileType.IMAGE_JPEG);
      expect(detectFileType(file2).type).toBe(FileType.IMAGE_JPEG);
    });

    it('应该处理未知文件类型', () => {
      const file = { name: 'test.xyz', type: 'application/unknown' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.UNKNOWN);
      expect(result.category).toBe(FileCategory.UNKNOWN);
      expect(result.icon).toBe(FileIcon.UNKNOWN);
      expect(result.displayName).toBe('未知文件');
    });

    it('应该处理没有扩展名的文件', () => {
      const file = { name: 'README', type: '' };
      const result = detectFileType(file);
      
      expect(result.type).toBe(FileType.UNKNOWN);
      expect(result.category).toBe(FileCategory.UNKNOWN);
    });

    it('应该处理Office文档', () => {
      const docx = { 
        name: 'document.docx', 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      };
      const xlsx = { 
        name: 'spreadsheet.xlsx', 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      };
      
      const docxResult = detectFileType(docx);
      const xlsxResult = detectFileType(xlsx);
      
      expect(docxResult.icon).toBe(FileIcon.WORD);
      expect(xlsxResult.icon).toBe(FileIcon.EXCEL);
    });

    it('应该处理各种代码文件扩展名', () => {
      const files = [
        { name: 'app.js', type: '', expected: FileIcon.JAVASCRIPT },
        { name: 'app.jsx', type: '', expected: FileIcon.JAVASCRIPT },
        { name: 'app.ts', type: '', expected: FileIcon.TYPESCRIPT },
        { name: 'app.tsx', type: '', expected: FileIcon.TYPESCRIPT },
        { name: 'main.py', type: '', expected: FileIcon.PYTHON },
        { name: 'Main.java', type: '', expected: FileIcon.JAVA },
        { name: 'main.c', type: '', expected: FileIcon.C },
        { name: 'main.cpp', type: '', expected: FileIcon.CPP },
        { name: 'main.go', type: '', expected: FileIcon.GO },
        { name: 'main.rs', type: '', expected: FileIcon.RUST },
      ];
      
      files.forEach(({ name, type, expected }) => {
        const result = detectFileType({ name, type });
        expect(result.icon).toBe(expected);
        expect(result.category).toBe(FileCategory.CODE);
      });
    });

    it('应该处理模糊匹配的图片MIME类型', () => {
      const file = { name: 'test.img', type: 'image/x-custom' };
      const result = detectFileType(file);
      
      // 应该识别为图片类型（模糊匹配）
      expect(result.category).toBe(FileCategory.IMAGE);
    });

    it('应该处理模糊匹配的文本MIME类型', () => {
      const file = { name: 'test.txt', type: 'text/x-custom' };
      const result = detectFileType(file);
      
      // 应该识别为文本类型（模糊匹配）
      expect(result.category).toBe(FileCategory.DOCUMENT);
    });
  });

  describe('getFileIcon', () => {
    it('应该返回正确的图片图标', () => {
      const file = { name: 'test.jpg', type: 'image/jpeg' };
      expect(getFileIcon(file)).toBe(FileIcon.IMAGE);
    });

    it('应该返回正确的PDF图标', () => {
      const file = { name: 'test.pdf', type: 'application/pdf' };
      expect(getFileIcon(file)).toBe(FileIcon.PDF);
    });

    it('应该返回正确的代码图标', () => {
      const file = { name: 'test.py', type: 'text/x-python' };
      expect(getFileIcon(file)).toBe(FileIcon.PYTHON);
    });

    it('应该返回未知图标', () => {
      const file = { name: 'test.xyz', type: '' };
      expect(getFileIcon(file)).toBe(FileIcon.UNKNOWN);
    });
  });

  describe('getFileCategory', () => {
    it('应该返回图片类别', () => {
      const file = { name: 'test.png', type: 'image/png' };
      expect(getFileCategory(file)).toBe(FileCategory.IMAGE);
    });

    it('应该返回文档类别', () => {
      const file = { name: 'test.pdf', type: 'application/pdf' };
      expect(getFileCategory(file)).toBe(FileCategory.DOCUMENT);
    });

    it('应该返回代码类别', () => {
      const file = { name: 'test.js', type: 'text/javascript' };
      expect(getFileCategory(file)).toBe(FileCategory.CODE);
    });

    it('应该返回未知类别', () => {
      const file = { name: 'test.xyz', type: '' };
      expect(getFileCategory(file)).toBe(FileCategory.UNKNOWN);
    });
  });

  describe('getFileDisplayName', () => {
    it('应该返回正确的显示名称', () => {
      expect(getFileDisplayName({ name: 'test.jpg', type: 'image/jpeg' }))
        .toBe('JPEG 图片');
      expect(getFileDisplayName({ name: 'test.pdf', type: 'application/pdf' }))
        .toBe('PDF 文档');
      expect(getFileDisplayName({ name: 'test.py', type: 'text/x-python' }))
        .toBe('Python 代码');
      expect(getFileDisplayName({ name: 'test.xyz', type: '' }))
        .toBe('未知文件');
    });
  });

  describe('isImageFile', () => {
    it('应该正确识别图片文件', () => {
      expect(isImageFile({ name: 'test.jpg', type: 'image/jpeg' })).toBe(true);
      expect(isImageFile({ name: 'test.png', type: 'image/png' })).toBe(true);
      expect(isImageFile({ name: 'test.gif', type: 'image/gif' })).toBe(true);
    });

    it('应该正确识别非图片文件', () => {
      expect(isImageFile({ name: 'test.pdf', type: 'application/pdf' })).toBe(false);
      expect(isImageFile({ name: 'test.txt', type: 'text/plain' })).toBe(false);
      expect(isImageFile({ name: 'test.py', type: 'text/x-python' })).toBe(false);
    });
  });

  describe('isDocumentFile', () => {
    it('应该正确识别文档文件', () => {
      expect(isDocumentFile({ name: 'test.pdf', type: 'application/pdf' })).toBe(true);
      expect(isDocumentFile({ name: 'test.txt', type: 'text/plain' })).toBe(true);
      expect(isDocumentFile({ name: 'test.md', type: 'text/markdown' })).toBe(true);
    });

    it('应该正确识别非文档文件', () => {
      expect(isDocumentFile({ name: 'test.jpg', type: 'image/jpeg' })).toBe(false);
      expect(isDocumentFile({ name: 'test.py', type: 'text/x-python' })).toBe(false);
    });
  });

  describe('isCodeFile', () => {
    it('应该正确识别代码文件', () => {
      expect(isCodeFile({ name: 'test.py', type: 'text/x-python' })).toBe(true);
      expect(isCodeFile({ name: 'test.js', type: 'text/javascript' })).toBe(true);
      expect(isCodeFile({ name: 'test.ts', type: 'text/typescript' })).toBe(true);
    });

    it('应该正确识别非代码文件', () => {
      expect(isCodeFile({ name: 'test.jpg', type: 'image/jpeg' })).toBe(false);
      expect(isCodeFile({ name: 'test.pdf', type: 'application/pdf' })).toBe(false);
    });
  });

  describe('边界条件', () => {
    it('应该处理空文件名', () => {
      const file = { name: '', type: 'image/jpeg' };
      const result = detectFileType(file);
      expect(result.type).toBe(FileType.IMAGE_JPEG);
    });

    it('应该处理只有点的文件名', () => {
      const file = { name: '.', type: '' };
      const result = detectFileType(file);
      expect(result.type).toBe(FileType.UNKNOWN);
    });

    it('应该处理以点结尾的文件名', () => {
      const file = { name: 'test.', type: '' };
      const result = detectFileType(file);
      expect(result.type).toBe(FileType.UNKNOWN);
    });

    it('应该处理多个点的文件名', () => {
      const file = { name: 'test.backup.jpg', type: '' };
      const result = detectFileType(file);
      expect(result.type).toBe(FileType.IMAGE_JPEG);
    });

    it('应该处理MIME类型中的空格', () => {
      const file = { name: 'test.jpg', type: '  image/jpeg  ' };
      const result = detectFileType(file);
      expect(result.type).toBe(FileType.IMAGE_JPEG);
    });
  });
});
