import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
    interface Window {
        electron: ElectronAPI
        electronAPI: {
            getCount: () => Promise<number>
            setCount: (count: number) => Promise<number>
            getCpuStats: () => Promise<string>
            getCpuStatus: () => Promise<string>
            onInitData: (callback: (data: ElectronUser) => void) => void
        }
    }
}
