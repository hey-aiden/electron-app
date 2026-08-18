import { app, ipcMain } from 'electron'
import os from 'node:os'

export function InitCpuStats(): void {
    ipcMain.handle('get-cpu-stats', () => {
        return getCpuInfo()
    })
    ipcMain.handle('get-cpu-status', () => {
        return getCpuStatus()
    })
}

function getCpuInfo() {
    const metrics = app.getAppMetrics()
    const summary = metrics.map((p) => ({
        type: p.type, // 'Browser' | 'Renderer' | 'GPU' | 'Utility'
        pid: p.pid,
        cpu: p.cpu.percentCPUUsage,
        memory: (p.memory.workingSetSize / 1024 / 1024).toFixed(1) + ' MB'
    }))
    return JSON.stringify(summary)
}

function getCpuStatus() {
    const cpuType = os.type()
    const cpuInfo = os.cpus()

    const status = {
        length: cpuInfo.length,
        model: cpuInfo[0].model,
        type: cpuType,
        arch: os.arch(),
        platform: os.platform(),
        time: os.uptime(),
        memory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) + 'GB'
    }
    return JSON.stringify(status)
}
