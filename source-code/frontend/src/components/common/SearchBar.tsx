/**
 * 搜索栏组件
 * 
 * 提供搜索类型选择和搜索输入功能
 * 支持实时搜索（防抖）和手动查询
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

export type SearchType = 'plugin' | 'package'

export interface SearchBarProps {
  searchType: SearchType
  searchQuery: string
  onSearchTypeChange: (type: SearchType) => void
  onSearchQueryChange: (query: string) => void
  onSearch?: () => void
  disabled?: boolean
  enableLiveSearch?: boolean
  debounceDelay?: number
}

export function SearchBar({
  searchType,
  searchQuery,
  onSearchTypeChange,
  onSearchQueryChange,
  onSearch,
  disabled = false,
  enableLiveSearch = true,
  debounceDelay = 300
}: SearchBarProps) {
  const { t } = useTranslation()
  const [localQuery, setLocalQuery] = useState(searchQuery)

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (!enableLiveSearch) {
      return
    }

    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchQueryChange(localQuery)
      }
    }, debounceDelay)

    return () => clearTimeout(timer)
  }, [localQuery, searchQuery, onSearchQueryChange, enableLiveSearch, debounceDelay])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch()
    }
  }, [onSearch])

  const handleSearchClick = useCallback(() => {
    if (localQuery !== searchQuery) {
      onSearchQueryChange(localQuery)
    }
    onSearch?.()
  }, [localQuery, searchQuery, onSearchQueryChange, onSearch])

  return (
    <div className="flex items-center gap-3">
      <Select
        value={searchType}
        onValueChange={(value) => onSearchTypeChange(value as SearchType)}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="package">{t('dependency.packageName')}</SelectItem>
          <SelectItem value="plugin">{t('dependency.pluginName')}</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
        <Input
          type="text"
          placeholder={t("common.placeholder.searchPackageOrPlugin", { type: searchType === "package" ? t('dependency.packageName') : t('dependency.pluginName') })}
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      {onSearch && !enableLiveSearch && (
        <Button
          onClick={handleSearchClick}
          disabled={disabled}
          variant="default"
          size="default"
        >
          {t('common.search')}
        </Button>
      )}
    </div>
  )
}

export default SearchBar
