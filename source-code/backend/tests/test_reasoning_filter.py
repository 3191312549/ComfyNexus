"""
测试 reasoning_content 过滤逻辑

模拟不同模型的响应格式，验证过滤逻辑是否正确
"""


def test_filter_logic():
    """测试过滤逻辑"""
    
    # 模拟不同的响应格式
    test_cases = [
        {
            "name": "标准模型（只有 content）",
            "content": "这是答案",
            "reasoning_content": "",
        },
        {
            "name": "GLM-4.5（先 reasoning，后 content）",
            "content": "2",
            "reasoning_content": "首先，1+1是基本的数学问题...",
        },
        {
            "name": "纯思考模型（只有 reasoning）",
            "content": "",
            "reasoning_content": "让我思考一下...",
        },
        {
            "name": "空响应",
            "content": "",
            "reasoning_content": "",
        },
    ]
    
    print("=== 测试 reasoning_content 过滤逻辑 ===\n")
    
    for case in test_cases:
        print(f"场景: {case['name']}")
        print(f"  content: {repr(case['content'])}")
        print(f"  reasoning_content: {repr(case['reasoning_content'])}")
        
        # 深度思考关闭
        deep_thinking = False
        text = case['content']
        print(f"  深度思考关闭: {repr(text)} {'✅' if text else '❌ 无输出'}")
        
        # 深度思考开启
        deep_thinking = True
        text = case['content'] or case['reasoning_content']
        print(f"  深度思考开启: {repr(text)} {'✅' if text else '❌ 无输出'}")
        
        print()


if __name__ == "__main__":
    test_filter_logic()
