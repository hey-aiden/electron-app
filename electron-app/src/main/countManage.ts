import { app, ipcMain } from 'electron'
import { mkdir, access, constants, open } from 'fs/promises'
import { join } from 'path'

/**
 * app.getPath("userData"):
 * macOs: /Users/aiden/Library/Application Support/electron-app
 */

// 注意：路径不能在模块顶层求值 —— 否则会早于任何 app.setPath 覆盖，拿到默认值后就「冻结」了。
// 改成惰性求值，每次调用时实时读取 app.getPath('userData')。
function getDataDir(): string {
    return join(app.getPath('userData'), 'data')
}

function getFilePath(): string {
    return join(getDataDir(), 'count.json')
}

export function InitCountManage(): void {
    console.log('创建count-mange')

    /**
     * 注册IPC通信函数 - ipcMain.handle 是异步的，会自动返回 Promise
     */
    ipcMain.handle('get-count', () => {
        return loadCount()
    })

    ipcMain.handle('set-count', async (_e, count) => {
        await setCount(count)
        return count
    })
}

async function checkDir(dirPath: string): Promise<boolean> {
    try {
        await access(dirPath, constants.F_OK)
        return true
    } catch {
        return false
    }
}

async function createDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true })
}

async function writeLocalFile(file: string, params: fileWriteOpt): Promise<void> {
    // 会创建不存在的文件，但如果文件已经存在，会直接截断（清空）文件 - 这种写法是合理的，本身就是用新 JSON 覆盖旧 JSON
    const fileHandle = await open(file, 'w')
    try {
        await fileHandle.writeFile(params.buf, params.encoding)
    } finally {
        await fileHandle.close()
    }
}

/**
 *
 * @param count 写入count
 */
export async function setCount(count: number): Promise<void> {
    try {
        const dataDir = getDataDir()

        const existDir = await checkDir(dataDir)

        if (!existDir) {
            await createDir(dataDir)
        }

        const data = { count, updateAt: new Date().toISOString() }

        const writeParam: fileWriteOpt = {
            buf: JSON.stringify(data, null, 2),
            encoding: 'utf8'
        }

        await writeLocalFile(getFilePath(), writeParam)
    } catch (e) {
        console.log(e, '文件写入失败')
    }
}

/**
 * 获取 count
 */
export async function loadCount(): Promise<number> {
    const filePath = getFilePath()

    try {
        const fileHandle = await open(filePath)
        try {
            const raw = await fileHandle.readFile('utf-8')
            const content = JSON.parse(raw)
            console.log(raw, content)
            return content.count
        } finally {
            await fileHandle.close()
        }
    } catch (e) {
        // 文件不存在（首次运行）或内容损坏时，返回默认值 0
        console.log('读取 count 失败，返回默认值 0：', e)
        return 0
    }
}
