# Backend 测试运行脚本 (PowerShell)
#
# 使用方法:
#   .\run_tests.ps1 --all              # 运行所有测试
#   .\run_tests.ps1 --unit             # 仅运行单元测试
#   .\run_tests.ps1 --integration      # 仅运行集成测试
#   .\run_tests.ps1 --properties       # 仅运行属性测试
#   .\run_tests.ps1 --manual           # 仅运行手动测试
#   .\run_tests.ps1 --diagnostic       # 仅运行诊断测试
#   .\run_tests.ps1 --verbose          # 显示详细输出
#   .\run_tests.ps1 --coverage         # 生成覆盖率报告

param(
    [switch]$all,
    [switch]$unit,
    [switch]$integration,
    [switch]$properties,
    [switch]$manual,
    [switch]$diagnostic,
    [switch]$verbose,
    [switch]$coverage,
    [switch]$help
)

# 显示帮助信息
if ($help) {
    Write-Host "Backend 测试运行脚本" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor Yellow
    Write-Host "  .\run_tests.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:" -ForegroundColor Yellow
    Write-Host "  -all           运行所有测试（默认）"
    Write-Host "  -unit          仅运行单元测试"
    Write-Host "  -integration   仅运行集成测试"
    Write-Host "  -properties    仅运行属性测试"
    Write-Host "  -manual        仅运行手动测试"
    Write-Host "  -diagnostic    仅运行诊断测试"
    Write-Host "  -verbose       显示详细输出"
    Write-Host "  -coverage      生成覆盖率报告"
    Write-Host "  -help          显示此帮助信息"
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "  .\run_tests.ps1 -unit -verbose"
    Write-Host "  .\run_tests.ps1 -all -coverage"
    exit 0
}

# 检查虚拟环境
$venvPaths = @(
    "..\..venv",
    "..\.venv",
    ".venv",
    "venv"
)

$venvPath = $null
foreach ($path in $venvPaths) {
    if (Test-Path $path) {
        $venvPath = $path
        break
    }
}

if (-not $venvPath) {
    Write-Host "⚠️  警告：未找到虚拟环境" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "建议：" -ForegroundColor Yellow
    Write-Host "  1. 创建虚拟环境：python -m venv .venv"
    Write-Host "  2. 激活虚拟环境：.venv\Scripts\Activate.ps1"
    Write-Host "  3. 安装测试依赖：pip install -r requirements-test.txt"
    Write-Host ""
    $continue = Read-Host "是否继续？(y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
    $pythonExe = "python"
} else {
    $pythonExe = Join-Path $venvPath "Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) {
        Write-Host "✗ 虚拟环境中未找到 Python" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 使用虚拟环境: $venvPath" -ForegroundColor Green
}

# 构建参数
$testArgs = @()

# 确定测试类型
if ($unit) {
    $testArgs += "--unit"
} elseif ($integration) {
    $testArgs += "--integration"
} elseif ($properties) {
    $testArgs += "--properties"
} elseif ($manual) {
    $testArgs += "--manual"
} elseif ($diagnostic) {
    $testArgs += "--diagnostic"
} else {
    $testArgs += "--all"
}

# 添加其他选项
if ($verbose) {
    $testArgs += "--verbose"
}

if ($coverage) {
    $testArgs += "--coverage"
}

# 运行测试
Write-Host ""
Write-Host "运行测试..." -ForegroundColor Cyan
Write-Host "命令: $pythonExe run_tests.py $($testArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

& $pythonExe run_tests.py @testArgs

$exitCode = $LASTEXITCODE

# 显示结果
Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✓ 测试完成" -ForegroundColor Green
} else {
    Write-Host "✗ 测试失败 (退出码: $exitCode)" -ForegroundColor Red
}

exit $exitCode
