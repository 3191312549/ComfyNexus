# Frontend 测试运行脚本 (PowerShell)
#
# 使用方法:
#   .\run_tests.ps1 -all              # 运行所有测试
#   .\run_tests.ps1 -unit             # 仅运行单元测试
#   .\run_tests.ps1 -integration      # 仅运行集成测试
#   .\run_tests.ps1 -properties       # 仅运行属性测试
#   .\run_tests.ps1 -ui               # UI 模式
#   .\run_tests.ps1 -coverage         # 生成覆盖率报告

param(
    [switch]$all,
    [switch]$unit,
    [switch]$integration,
    [switch]$properties,
    [switch]$ui,
    [switch]$coverage,
    [switch]$help
)

# 显示帮助信息
if ($help) {
    Write-Host "Frontend 测试运行脚本" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor Yellow
    Write-Host "  .\run_tests.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:" -ForegroundColor Yellow
    Write-Host "  -all           运行所有测试（默认）"
    Write-Host "  -unit          仅运行单元测试"
    Write-Host "  -integration   仅运行集成测试"
    Write-Host "  -properties    仅运行属性测试"
    Write-Host "  -ui            UI 模式"
    Write-Host "  -coverage      生成覆盖率报告"
    Write-Host "  -help          显示此帮助信息"
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "  .\run_tests.ps1 -unit"
    Write-Host "  .\run_tests.ps1 -all -coverage"
    Write-Host "  .\run_tests.ps1 -ui"
    exit 0
}

# 检查 node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "✗ node_modules 不存在" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装依赖：" -ForegroundColor Yellow
    Write-Host "  npm install"
    Write-Host ""
    exit 1
}

Write-Host "✓ 依赖已安装" -ForegroundColor Green

# 构建 npm 命令
$npmCommand = "test"
$testArgs = @()

# UI 模式
if ($ui) {
    $npmCommand = "test:ui"
    Write-Host ""
    Write-Host "启动 Vitest UI..." -ForegroundColor Cyan
    npm run $npmCommand
    exit $LASTEXITCODE
}

# 覆盖率
if ($coverage) {
    $npmCommand = "test:coverage"
} else {
    $npmCommand = "test:run"
}

# 测试路径过滤
if ($unit) {
    $testArgs += "src/__tests__/unit"
    $testArgs += "src/**/__ tests__"
} elseif ($integration) {
    $testArgs += "src/__tests__/integration"
} elseif ($properties) {
    $testArgs += "src/__tests__/properties"
    $testArgs += "src/**/__properties__"
}

# 运行测试
Write-Host ""
Write-Host "运行测试..." -ForegroundColor Cyan

if ($testArgs.Count -gt 0) {
    Write-Host "测试路径: $($testArgs -join ', ')" -ForegroundColor Gray
    $env:VITEST_FILTER = $testArgs -join "|"
}

Write-Host "命令: npm run $npmCommand" -ForegroundColor Gray
Write-Host ""

npm run $npmCommand

$exitCode = $LASTEXITCODE

# 显示结果
Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✓ 测试完成" -ForegroundColor Green
    
    if ($coverage) {
        $coveragePath = Join-Path $PSScriptRoot "coverage\index.html"
        if (Test-Path $coveragePath) {
            Write-Host ""
            Write-Host "覆盖率报告: $coveragePath" -ForegroundColor Cyan
            Write-Host "在浏览器中打开查看详细覆盖率信息" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "✗ 测试失败 (退出码: $exitCode)" -ForegroundColor Red
}

exit $exitCode
