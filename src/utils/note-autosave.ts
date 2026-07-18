export type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'offline'

export interface NoteSnapshot {
  title: string
  content: string
  folderId: string | null
  tagIds: string[]
}

export interface NoteAutosaveController {
  schedule(snapshot: NoteSnapshot): void
  flush(): Promise<void>
  retry(): Promise<void>
  destroy(): void
}

export interface NoteAutosaveOptions {
  noteId: string
  save: (snapshot: NoteSnapshot) => Promise<void>
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

interface VersionedSnapshot {
  revision: number
  snapshot: NoteSnapshot
}

const DEBOUNCE_DELAY = 1500

/**
 * 创建笔记自动保存调度器。
 *
 * :param options: 笔记标识、保存函数和缓存存储。
 * :return: 自动保存控制器。
 */
export function createNoteAutosave(options: NoteAutosaveOptions): NoteAutosaveController {
  const cacheKey = `noteContentCache_${options.noteId}`
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let pendingSnapshot: VersionedSnapshot | undefined
  let failedSnapshot: VersionedSnapshot | undefined
  let activeSnapshot: VersionedSnapshot | undefined
  let activeSave: Promise<void> | undefined
  let latestRevision = 0
  let destroyed = false

  /**
   * 复制快照，避免调用方随后修改数组影响待保存内容。
   *
   * :param snapshot: 原始笔记快照。
   * :return: 可安全保存的笔记快照。
   */
  function cloneSnapshot(snapshot: NoteSnapshot): NoteSnapshot {
    return { ...snapshot, tagIds: [...snapshot.tagIds] }
  }

  /**
   * 写入当前未保存快照的本地缓存。
   *
   * :param snapshot: 需要恢复的笔记快照。
   * :return: 无返回值。
   */
  function cacheSnapshot(snapshot: NoteSnapshot): void {
    options.storage.setItem(cacheKey, JSON.stringify(snapshot))
  }

  /**
   * 清除等待中的防抖计时器。
   *
   * :return: 无返回值。
   */
  function clearDebounceTimer(): void {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
  }

  /**
   * 保存当前等待中的快照；同一时间仅允许一个请求执行。
   *
   * :return: 当前保存任务。
   */
  function savePendingSnapshot(): Promise<void> {
    if (activeSave) {
      return activeSave
    }

    const versionedSnapshot = pendingSnapshot
    if (!versionedSnapshot || destroyed) {
      return Promise.resolve()
    }

    pendingSnapshot = undefined
    activeSnapshot = versionedSnapshot
    activeSave = Promise.resolve()
      .then(() => options.save(versionedSnapshot.snapshot))
      .then(() => {
        if (versionedSnapshot.revision === latestRevision && !pendingSnapshot) {
          failedSnapshot = undefined
          options.storage.removeItem(cacheKey)
        }
      })
      .catch(() => {
        if (versionedSnapshot.revision === latestRevision && !pendingSnapshot) {
          failedSnapshot = versionedSnapshot
          cacheSnapshot(versionedSnapshot.snapshot)
        }
      })
      .finally(() => {
        activeSave = undefined
        activeSnapshot = undefined
        if (pendingSnapshot && !destroyed) {
          void savePendingSnapshot()
        }
      })

    return activeSave
  }

  /**
   * 等待当前请求完成，并立即提交所有等待中的快照。
   *
   * :return: 所有当前待保存快照完成后的 Promise。
   */
  async function flush(): Promise<void> {
    clearDebounceTimer()

    while (!destroyed && (pendingSnapshot || activeSave)) {
      await savePendingSnapshot()
    }
  }

  return {
    /**
     * 安排保存最新笔记快照。
     *
     * :param snapshot: 需要保存的笔记快照。
     * :return: 无返回值。
     */
    schedule(snapshot: NoteSnapshot): void {
      if (destroyed) {
        return
      }

      latestRevision += 1
      pendingSnapshot = { revision: latestRevision, snapshot: cloneSnapshot(snapshot) }
      failedSnapshot = undefined
      cacheSnapshot(pendingSnapshot.snapshot)
      clearDebounceTimer()
      if (activeSnapshot) {
        return
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = undefined
        void savePendingSnapshot()
      }, DEBOUNCE_DELAY)
    },

    flush,

    /**
     * 重试当前版本最后一次失败的保存。
     *
     * :return: 重试完成后的 Promise。
     */
    async retry(): Promise<void> {
      if (destroyed || !failedSnapshot || failedSnapshot.revision !== latestRevision || pendingSnapshot || activeSnapshot) {
        return
      }

      pendingSnapshot = failedSnapshot
      failedSnapshot = undefined
      await flush()
    },

    /**
     * 停止后续网络请求并保留最后一份本地缓存。
     *
     * :return: 无返回值。
     */
    destroy(): void {
      destroyed = true
      clearDebounceTimer()
    }
  }
}
