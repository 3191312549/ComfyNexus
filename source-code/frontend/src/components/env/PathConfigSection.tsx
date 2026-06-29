import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FolderOpen, FileCode } from 'lucide-react'
import type { PathConfigSectionProps } from '@/types/environment'

export function PathConfigSection({ config, onConfigChange }: PathConfigSectionProps) {
  const { t } = useTranslation()

  const handleSelectDirectory = async (type: 'comfyui' | 'python' | 'pip') => {
    console.log('[PathConfigSection] 开始选择，类型:', type)
    
    try {
      let response
      
      // ComfyUI 选择目录，Python 和 pip 选择文件
      if (type === 'comfyui') {
        // 检查 select_directory API 是否可用
        if (!window.pywebview?.api?.select_directory) {
          console.warn('[PathConfigSection] select_directory API not available')
          return
        }
        
        console.log('[PathConfigSection] 调用 select_directory API...')
        response = await window.pywebview.api.select_directory()
      } else {
        // Python 和 pip 选择 .exe 文件
        if (!window.pywebview?.api?.select_file) {
          console.warn('[PathConfigSection] select_file API not available')
          return
        }
        
        // 定义文件类型过滤器
        // 注意：pywebview 要求格式为 "描述 (*.扩展名)"
        const fileTypes = ['Executable files (*.exe)', 'All files (*.*)']
        
        console.log('[PathConfigSection] 调用 select_file API，文件类型:', fileTypes)
        response = await window.pywebview.api.select_file(fileTypes)
      }
      
      console.log('[PathConfigSection] API 返回结果:', response)
      console.log('[PathConfigSection] response 类型:', typeof response)
      
      if (!response) {
        console.error('[PathConfigSection] API 返回了空值 (undefined 或 null)')
        return
      }
      
      if (response.success && response.path) {
        const path = response.path
        console.log('[PathConfigSection] 选择成功，路径:', path, '类型:', type)
        
        // 验证文件名是否正确
        if (type === 'python') {
          if (!path.toLowerCase().endsWith('python.exe')) {
            console.warn('[PathConfigSection] 选择的不是 python.exe 文件:', path)
            alert(t('env.pathConfig.selectPython'))
            return
          }
        } else if (type === 'pip') {
          if (!path.toLowerCase().endsWith('pip.exe')) {
            console.warn('[PathConfigSection] 选择的不是 pip.exe 文件:', path)
            alert(t('env.pathConfig.selectPip'))
            return
          }
        }
        
        if (type === 'comfyui') {
          console.log('[PathConfigSection] 更新 comfyuiPath')
          onConfigChange({ comfyuiPath: path })
        } else if (type === 'python') {
          console.log('[PathConfigSection] 更新 pythonPath')
          onConfigChange({ pythonPath: path })
        } else if (type === 'pip') {
          console.log('[PathConfigSection] 更新 pipPath')
          onConfigChange({ pipPath: path })
        }
      } else {
        console.log('[PathConfigSection] 用户取消选择或选择失败')
      }
    } catch (error) {
      console.error('[PathConfigSection] 选择失败:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('env.general.coreConfig')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
        {/* ComfyUI目录 - 横向布局 */}
        <div className="flex items-center gap-4">
          <label className="min-w-[120px] text-sm font-medium text-foreground">
            {t('env.general.comfyuiPath')}
          </label>
          <div className="flex-1">
            <Input
              value={config.comfyuiPath}
              onChange={(e) => onConfigChange({ comfyuiPath: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => handleSelectDirectory('comfyui')}
          >
            <FolderOpen size={16} className="mr-1" />
            {t('common.browse')}
          </Button>
        </div>

        {/* Python目录 - 横向布局 */}
        <div className="flex items-center gap-4">
          <label className="min-w-[120px] text-sm font-medium text-foreground">
            {t('env.general.pythonPath')}
          </label>
          <div className="flex-1">
            <Input
              value={config.pythonPath}
              onChange={(e) => onConfigChange({ pythonPath: e.target.value })}
              placeholder="C:\Python\python.exe"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => handleSelectDirectory('python')}
          >
            <FileCode size={16} className="mr-1" />
            {t('common.browse')}
          </Button>
        </div>

        {/* pip目录 - 横向布局 */}
        <div className="flex items-center gap-4">
          <label className="min-w-[120px] text-sm font-medium text-foreground">
            {t('env.general.pipPath')}
          </label>
          <div className="flex-1">
            <Input
              value={config.pipPath}
              onChange={(e) => onConfigChange({ pipPath: e.target.value })}
              placeholder="C:\Python\Scripts\pip.exe"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => handleSelectDirectory('pip')}
          >
            <FileCode size={16} className="mr-1" />
            {t('common.browse')}
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  )
}
