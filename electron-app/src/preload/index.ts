/**
 * 【预加载脚本】—— 在这里暴露 API
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    getCount: (): Promise<number> => ipcRenderer.invoke('get-count'),
    setCount: (count: number): Promise<number> => ipcRenderer.invoke('set-count', count),
    getCpuStats: (): Promise<string> => ipcRenderer.invoke('get-cpu-stats'),
    getCpuStatus: (): Promise<string> => ipcRenderer.invoke('get-cpu-status'),
    onInitData: (cb: (data: ElectronUser) => void) => {
        ipcRenderer.on('init-data', (_e, data) => cb(data))
    }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('electronAPI', api)
        console.log('注册IPC执行函数')
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.electronAPI = api
}
