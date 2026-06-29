"""
HTML 处理工具

用于翻译前后的 HTML 内容处理，确保翻译后保持格式。
"""

import re
from typing import Tuple, List, Optional
from backend.src.utils.logger import app_logger as logger


def format_github_link(url: str) -> Tuple[str, bool]:
    """
    格式化 GitHub 链接为简短显示文本
    
    Args:
        url: GitHub URL
        
    Returns:
        (显示文本, 是否为GitHub链接)
    """
    pr_match = re.match(r'https?://github\.com/[^/]+/[^/]+/pull/(\d+)', url)
    if pr_match:
        return f'#{pr_match.group(1)}', True
    
    issue_match = re.match(r'https?://github\.com/[^/]+/[^/]+/issues/(\d+)', url)
    if issue_match:
        return f'#{issue_match.group(1)}', True
    
    commit_match = re.match(r'https?://github\.com/[^/]+/[^/]+/commit/([a-f0-9]+)', url, re.IGNORECASE)
    if commit_match:
        short_hash = commit_match.group(1)[:7]
        return short_hash, True
    
    return url, False


class HTMLProcessor:
    """
    HTML 处理器
    
    用于翻译前后的 HTML 内容处理：
    1. 提取纯文本内容用于翻译
    2. 保留 HTML 结构信息
    3. 翻译后重建 HTML 结构
    """
    
    PLACEHOLDER_PREFIX = "\x00HTML_TAG_"
    PLACEHOLDER_SUFFIX = "\x00"
    
    def __init__(self):
        self.tag_counter = 0
        self.tag_map: dict = {}
    
    def _reset(self):
        """重置状态"""
        self.tag_counter = 0
        self.tag_map = {}
    
    def _create_placeholder(self, tag_content: str) -> str:
        """
        创建占位符
        
        Args:
            tag_content: 标签内容
            
        Returns:
            占位符字符串
        """
        placeholder = f"{self.PLACEHOLDER_PREFIX}{self.tag_counter}{self.PLACEHOLDER_SUFFIX}"
        self.tag_map[placeholder] = tag_content
        self.tag_counter += 1
        return placeholder
    
    def extract_text_for_translation(self, html: str) -> str:
        """
        从 HTML 中提取纯文本用于翻译
        
        将 HTML 标签替换为占位符，保留结构信息
        
        Args:
            html: HTML 内容
            
        Returns:
            可翻译的纯文本
        """
        self._reset()
        
        if not html:
            return ""
        
        result = html
        
        block_tags = [
            r'<h1[^>]*>(.*?)</h1>',
            r'<h2[^>]*>(.*?)</h2>',
            r'<h3[^>]*>(.*?)</h3>',
            r'<h4[^>]*>(.*?)</h4>',
            r'<p[^>]*>(.*?)</p>',
            r'<li[^>]*>(.*?)</li>',
            r'<pre[^>]*>(.*?)</pre>',
            r'<blockquote[^>]*>(.*?)</blockquote>',
        ]
        
        for pattern in block_tags:
            result = re.sub(
                pattern,
                lambda m: self._process_block_tag(m),
                result,
                flags=re.DOTALL | re.IGNORECASE
            )
        
        inline_tags = [
            r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>',
            r'<code[^>]*>(.*?)</code>',
            r'<strong[^>]*>(.*?)</strong>',
            r'<b[^>]*>(.*?)</b>',
            r'<em[^>]*>(.*?)</em>',
            r'<i[^>]*>(.*?)</i>',
        ]
        
        for pattern in inline_tags:
            result = re.sub(
                pattern,
                lambda m: self._process_inline_tag(m, pattern),
                result,
                flags=re.DOTALL | re.IGNORECASE
            )
        
        result = re.sub(r'<br\s*/?>', '\n', result, flags=re.IGNORECASE)
        result = re.sub(r'</ul>', '\n', result, flags=re.IGNORECASE)
        result = re.sub(r'</ol>', '\n', result, flags=re.IGNORECASE)
        result = re.sub(r'<ul[^>]*>', '\n', result, flags=re.IGNORECASE)
        result = re.sub(r'<ol[^>]*>', '\n', result, flags=re.IGNORECASE)
        result = re.sub(r'<div[^>]*>', '\n', result, flags=re.IGNORECASE)
        result = re.sub(r'</div>', '\n', result, flags=re.IGNORECASE)
        
        result = re.sub(r'<[^>]+>', '', result)
        
        result = re.sub(r'\n\s*\n', '\n\n', result)
        result = re.sub(r'^\s+|\s+$', '', result, flags=re.MULTILINE)
        
        return result.strip()
    
    def _process_block_tag(self, match: re.Match) -> str:
        """处理块级标签"""
        full_match = match.group(0)
        return self._create_placeholder(full_match) + '\n'
    
    def _process_inline_tag(self, match: re.Match, pattern: str) -> str:
        """处理内联标签"""
        full_match = match.group(0)
        return self._create_placeholder(full_match)
    
    def restore_html_structure(self, translated_text: str) -> str:
        """
        恢复 HTML 结构
        
        将占位符替换回原始 HTML 标签
        
        Args:
            translated_text: 翻译后的文本
            
        Returns:
            恢复 HTML 结构后的内容
        """
        result = translated_text
        
        for placeholder, original_tag in self.tag_map.items():
            result = result.replace(placeholder, original_tag)
        
        result = re.sub(r'\n\s*\n\s*\n', '\n\n', result)
        
        return result
    
    def process_for_translation(self, html: str) -> Tuple[str, dict]:
        """
        处理 HTML 用于翻译
        
        Args:
            html: 原始 HTML
            
        Returns:
            (纯文本, 标签映射)
        """
        text = self.extract_text_for_translation(html)
        return text, self.tag_map.copy()
    
    def process_after_translation(self, translated_text: str, tag_map: dict) -> str:
        """
        处理翻译后的文本
        
        Args:
            translated_text: 翻译后的文本
            tag_map: 标签映射
            
        Returns:
            恢复 HTML 结构的内容
        """
        self.tag_map = tag_map
        return self.restore_html_structure(translated_text)


def convert_html_to_readable_text(html: str) -> str:
    """
    将 HTML 转换为可读的纯文本格式
    
    用于翻译，保持内容的可读性和结构
    
    Args:
        html: HTML 内容
        
    Returns:
        可读的纯文本
    """
    if not html:
        return ""
    
    text = html
    
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n## \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n#### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'\n##### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', text, flags=re.DOTALL | re.IGNORECASE)
    
    def _process_link_tag(match):
        url = match.group(1)
        link_text = match.group(2)
        display_text, is_github = format_github_link(url)
        if is_github:
            return f'[{display_text}]({url})'
        else:
            return f'{link_text} ({url})'
    
    text = re.sub(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>(.*?)</a>', _process_link_tag, text, flags=re.DOTALL | re.IGNORECASE)
    
    text = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', text, flags=re.DOTALL | re.IGNORECASE)
    
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</ul>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</ol>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<ul[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<ol[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<p[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<div[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</div>', '\n', text, flags=re.IGNORECASE)
    
    text = re.sub(r'<[^>]+>', '', text)
    
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&quot;', '"', text)
    
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)
    
    return text.strip()


def convert_text_to_html(text: str) -> str:
    """
    将纯文本转换为 HTML
    
    识别 Markdown 风格的格式并转换为 HTML
    
    Args:
        text: 纯文本内容
        
    Returns:
        HTML 内容
    """
    if not text:
        return ""
    
    lines = text.split('\n')
    html_parts: List[str] = []
    in_list = False
    in_code_block = False
    code_block_content: List[str] = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if stripped.startswith('```'):
            if in_code_block:
                code_html = '<pre><code>' + '\n'.join(code_block_content) + '</code></pre>'
                html_parts.append(code_html)
                code_block_content = []
                in_code_block = False
            else:
                if in_list:
                    html_parts.append('</ul>')
                    in_list = False
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            code_block_content.append(line)
            i += 1
            continue
        
        if not stripped:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            i += 1
            continue
        
        if stripped.startswith('#### '):
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append(f'<h4>{stripped[5:]}</h4>')
        elif stripped.startswith('### '):
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append(f'<h3>{stripped[4:]}</h3>')
        elif stripped.startswith('## '):
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append(f'<h2>{stripped[3:]}</h2>')
        elif stripped.startswith('# '):
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            html_parts.append(f'<h1>{stripped[2:]}</h1>')
        elif stripped.startswith('- ') or stripped.startswith('* '):
            if not in_list:
                html_parts.append('<ul>')
                in_list = True
            content = stripped[2:]
            content = _process_inline_formatting(content)
            html_parts.append(f'<li>{content}</li>')
        elif stripped.startswith(('1. ', '2. ', '3. ', '4. ', '5. ', '6. ', '7. ', '8. ', '9. ')):
            if not in_list:
                html_parts.append('<ol>')
                in_list = True
            content = stripped[3:]
            content = _process_inline_formatting(content)
            html_parts.append(f'<li>{content}</li>')
        else:
            if in_list:
                html_parts.append('</ul>')
                in_list = False
            content = _process_inline_formatting(stripped)
            html_parts.append(f'<p>{content}</p>')
        
        i += 1
    
    if in_list:
        html_parts.append('</ul>')
    
    return ''.join(html_parts)


def _process_inline_formatting(text: str) -> str:
    """
    处理内联格式
    
    Args:
        text: 文本内容
        
    Returns:
        处理后的 HTML
    """
    text = re.sub(r'\[#(\d+)\]\((https?://github\.com/[^/]+/[^/]+/(?:pull|issues)/\d+)\)', 
                  r'<a href="\2" target="_blank" class="text-primary hover:underline">#\1</a>', text)
    
    text = re.sub(r'\[([a-f0-9]{7})\]\((https?://github\.com/[^/]+/[^/]+/commit/[a-f0-9]+)\)', 
                  r'<a href="\2" target="_blank" class="text-primary hover:underline">\1</a>', text, flags=re.IGNORECASE)
    
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    text = re.sub(r'\[(.+?)\]\((https?://[^\s]+)\)', r'<a href="\2" target="_blank" class="text-primary hover:underline">\1</a>', text)
    text = re.sub(r'(.+?)\s*\((https?://[^\s]+)\)', r'<a href="\2" target="_blank" class="text-primary hover:underline">\1</a>', text)
    
    return text
