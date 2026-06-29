/**
 * 工作流错误处理工具
 * 
 * 将后端返回的错误码映射到前端翻译键
 */

import type { TFunction } from 'i18next'

export type WorkflowErrorCode =
  | 'WORKFLOW_CONTROLLER_NOT_INITIALIZED'
  | 'WORKFLOW_DIRECTORY_NOT_SET'
  | 'WORKFLOW_NOT_FOUND'
  | 'WORKFLOW_INVALID_FOLDER_NAME'
  | 'WORKFLOW_FOLDER_ALREADY_EXISTS'
  | 'WORKFLOW_PARENT_FOLDER_NOT_FOUND'
  | 'WORKFLOW_FOLDER_ALREADY_EXISTS_SAME_NAME'
  | 'WORKFLOW_FOLDER_NOT_EMPTY'
  | 'WORKFLOW_METADATA_NOT_FOUND'
  | 'WORKFLOW_INVALID_PREVIEW_INDEX'
  | 'WORKFLOW_IMAGE_DIRECTORY_NOT_SET'
  | 'WORKFLOW_INVALID_FOLDER_ID'
  | 'WORKFLOW_NO_UPDATES_PROVIDED'
  | 'WORKFLOW_FOLDER_NOT_FOUND_IN_FILESYSTEM'
  | 'WORKFLOW_TARGET_LOCATION_EXISTS'
  | 'WORKFLOW_FOLDER_NOT_FOUND'
  | 'WORKFLOW_MOVE_FAILED'
  | 'WORKFLOW_DELETE_FAILED'
  | 'WORKFLOW_UPLOAD_PREVIEW_FAILED'
  | 'WORKFLOW_DELETE_PREVIEW_FAILED'

export interface WorkflowErrorResponse {
  success: false
  error_code?: WorkflowErrorCode
  error: string
}

const ERROR_CODE_TO_I18N_KEY: Record<WorkflowErrorCode, string> = {
  WORKFLOW_CONTROLLER_NOT_INITIALIZED: 'workflow.errors.controllerNotInitialized',
  WORKFLOW_DIRECTORY_NOT_SET: 'workflow.errors.workflowDirectoryNotSet',
  WORKFLOW_NOT_FOUND: 'workflow.errors.workflowNotFound',
  WORKFLOW_INVALID_FOLDER_NAME: 'workflow.errors.invalidFolderName',
  WORKFLOW_FOLDER_ALREADY_EXISTS: 'workflow.errors.folderAlreadyExists',
  WORKFLOW_PARENT_FOLDER_NOT_FOUND: 'workflow.errors.parentFolderNotFound',
  WORKFLOW_FOLDER_ALREADY_EXISTS_SAME_NAME: 'workflow.errors.folderAlreadyExistsSameName',
  WORKFLOW_FOLDER_NOT_EMPTY: 'workflow.errors.folderNotEmpty',
  WORKFLOW_METADATA_NOT_FOUND: 'workflow.errors.metadataNotFound',
  WORKFLOW_INVALID_PREVIEW_INDEX: 'workflow.errors.invalidPreviewIndex',
  WORKFLOW_IMAGE_DIRECTORY_NOT_SET: 'workflow.errors.imageDirectoryNotSet',
  WORKFLOW_INVALID_FOLDER_ID: 'workflow.errors.invalidFolderId',
  WORKFLOW_NO_UPDATES_PROVIDED: 'workflow.errors.noUpdatesProvided',
  WORKFLOW_FOLDER_NOT_FOUND_IN_FILESYSTEM: 'workflow.errors.folderNotFoundInFilesystem',
  WORKFLOW_TARGET_LOCATION_EXISTS: 'workflow.errors.targetLocationExists',
  WORKFLOW_FOLDER_NOT_FOUND: 'workflow.errors.folderNotFound',
  WORKFLOW_MOVE_FAILED: 'workflow.errors.moveWorkflowFailed',
  WORKFLOW_DELETE_FAILED: 'workflow.errors.deleteWorkflowFailed',
  WORKFLOW_UPLOAD_PREVIEW_FAILED: 'workflow.errors.uploadPreviewFailed',
  WORKFLOW_DELETE_PREVIEW_FAILED: 'workflow.errors.deletePreviewFailed',
}

export function getWorkflowErrorMessage(
  response: WorkflowErrorResponse,
  t: TFunction
): string {
  if (response.error_code && ERROR_CODE_TO_I18N_KEY[response.error_code]) {
    return t(ERROR_CODE_TO_I18N_KEY[response.error_code])
  }
  return response.error || t('workflow.errors.unknown')
}

export function isWorkflowErrorResponse(
  response: unknown
): response is WorkflowErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response
  )
}
