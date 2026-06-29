/**
 * 自定义 ESLint 规则：检测 JSX 中的硬编码中文文本
 * 用于确保所有用户可见文本都通过 i18n 进行国际化
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: '检测 JSX 中的硬编码中文文本，建议使用 t() 函数进行国际化',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      chineseText: '检测到硬编码中文文本 "{{text}}"，建议使用 t() 函数进行国际化',
    },
    schema: [
      {
        type: 'object',
        properties: {
          excludePatterns: {
            type: 'array',
            items: { type: 'string' },
          },
          minLength: {
            type: 'number',
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const excludePatterns = options.excludePatterns || [];
    const minLength = options.minLength || 2;

    const chineseRegex = /[\u4e00-\u9fa5]+/;

    const shouldExclude = (text) => {
      return excludePatterns.some((pattern) => new RegExp(pattern).test(text));
    };

    return {
      JSXText(node) {
        const text = node.value.trim();
        if (
          chineseRegex.test(text) &&
          text.length >= minLength &&
          !shouldExclude(text)
        ) {
          context.report({
            node,
            messageId: 'chineseText',
            data: {
              text:
                text.substring(0, 20) + (text.length > 20 ? '...' : ''),
            },
          });
        }
      },

      JSXAttribute(node) {
        if (
          node.value &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          const text = node.value.value.trim();
          if (
            chineseRegex.test(text) &&
            text.length >= minLength &&
            !shouldExclude(text)
          ) {
            const excludedAttrs = [
              'className',
              'id',
              'name',
              'type',
              'key',
              'data-testid',
            ];
            if (!excludedAttrs.includes(node.name.name)) {
              context.report({
                node,
                messageId: 'chineseText',
                data: {
                  text:
                    text.substring(0, 20) + (text.length > 20 ? '...' : ''),
                },
              });
            }
          }
        }
      },
    };
  },
};
