/**
 * LoRA管理页面
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Trash2, RefreshCw, FolderOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Table } from '@/components/ui'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { useModelStore } from '@/stores/useModelStore'
import { modelCategories } from '@/mocks/model'

export default function ModelManagePage() {
  const { t } = useTranslation()
  const { models, downloads, selectedCategory, setSelectedCategory, addDownload, removeDownload, deleteModel, refreshModels } = useModelStore()
  const [civitaiUrl, setCivitaiUrl] = useState('')
  const [downloadCategory, setDownloadCategory] = useState('checkpoints')

  const filteredModels = selectedCategory === 'all' 
    ? models 
    : models.filter(m => m.category === selectedCategory)

  const handleDownload = () => {
    if (civitaiUrl.trim()) {
      addDownload(civitaiUrl, downloadCategory)
      setCivitaiUrl('')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'downloading': return 'text-blue-600'
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* 下载LoRA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5" />
            下载LoRA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder={t("common.placeholder.civitaiUrl")}
              value={civitaiUrl}
              onChange={(e) => setCivitaiUrl(e.target.value)}
              className="flex-1"
            />
            <NativeSelect
              value={downloadCategory}
              onValueChange={(value) => setDownloadCategory(value)}
              className="w-48"
            >
              {modelCategories.filter(c => c.value !== 'all').map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </NativeSelect>
            <Button onClick={handleDownload}>
              {t('common.download')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 下载列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("model.downloadList")}</CardTitle>
        </CardHeader>
        <CardContent>
          {downloads.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t("model.progress")}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.size')}</th>
                  <th>{t('common.action')}</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((download) => (
                  <tr key={download.id}>
                    <td className="font-medium">{download.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-200 h-2 flex-1 overflow-hidden rounded-full">
                          <div 
                            className="bg-blue-600 h-full transition-all"
                            style={{ width: `${download.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{download.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={getStatusColor(download.status)}>
                        {t(`model.${download.status}`)}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {formatSize(download.downloadedSize)} / {formatSize(download.size)}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDownload(download.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* LoRA列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="size-5" />
              LoRA列表
            </CardTitle>
            <div className="flex items-center gap-4">
              <NativeSelect
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value)}
                className="w-48"
              >
                {modelCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </NativeSelect>
              <Button variant="outline" size="sm" onClick={refreshModels}>
                <RefreshCw className="mr-2 size-4" />
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredModels.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t("model.type")}</th>
                  <th>{t("model.category")}</th>
                  <th>{t('common.size')}</th>
                  <th>{t('common.action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model) => (
                  <tr key={model.id}>
                    <td className="font-medium">{model.name}</td>
                    <td>{model.type}</td>
                    <td>
                      <span className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-sm">
                        {model.category}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{formatSize(model.size)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteModel(model.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
