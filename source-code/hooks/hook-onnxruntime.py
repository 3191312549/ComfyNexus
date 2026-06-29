# PyInstaller hook for onnxruntime
# 只收集推理运行时必需的文件，排除 transformers/quantization/tools 等

from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

# 收集 capi 下的 dll 和核心 Python 文件
datas = collect_data_files('onnxruntime', includes=['capi/**', 'LICENSE', 'Privacy.md', 'ThirdPartyNotices.txt'])

# 收集动态链接库
binaries = collect_dynamic_libs('onnxruntime')

# 只导入推理必需的子模块
hiddenimports = [
    'onnxruntime',
    'onnxruntime.capi',
    'onnxruntime.capi._pybind_state',
    'onnxruntime.capi.onnxruntime_inference_collection',
    'onnxruntime.capi.onnxruntime_validation',
    'onnxruntime.capi.onnxruntime_collect_build_info',
]
