/**
 * main/index.ts: 构建 Electron 应用主进程
 *
 * ELECTRON_RENDERER_URL:
 *   - electron-vite dev 启动时，会自动启动 renderer 的 Vite dev server，并把该 server 的地址（形如 http://localhost:5173）写进 process.env['ELECTRON_RENDERER_URL']，
 *   - 然后才启动 Electron 主进程
 *
 * 文件操作
 */

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { InitCountManage } from './countManage'

app.setPath("userData", join(__dirname, '../temp'))

InitCountManage()

function createWindow(): void {
    console.log('用户目录：', app.getPath('userData'))
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    /**
     * 窗口初始化阶段: 窗口内容首次渲染完成时触发,此时页面已经加载并绘制完成，用户可以立即看到完整界面
     * 1. Electron 默认创建的窗口是隐藏的，需要通过 show() 方法显式显示；
     *
     */
    mainWindow.on('ready-to-show', () => {
        mainWindow.setTitle('应用已就绪')
        mainWindow.show()
    })

    /**
     * 拦截渲染进程「打开新窗口」的请求(如 <a target="_blank">、window.open())
     * 1. shell.openExternal(details.url) 把链接交给系统默认浏览器打开；
     * 2. 返回 { action: 'deny' } 阻止 Electron 自己创建新的 BrowserWindow，
     *    从而保证应用内只有主窗口，外部网页统一走系统浏览器。
     */
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    // // 开发环境加载 Vite dev server，生产环境加载打包后的文件
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
/**
 * Chromium 初始化完成
 */
app.whenReady().then(() => {
    // Set app user model id for windows
    /**
     * 针对 windows 平台的设置
     * Windows 用这个 ID 把「应用进程 / 任务栏图标 / 开始菜单磁贴 / 系统通知(Toast)」关联到一起。如果没设置，Electron 应用在 Windows 上会出现一些奇怪的现象：
     *   - 任务栏图标和通知无法正确关联（通知可能不显示，或归到错误的程序名下）
     *   - 任务栏图标可能显示成 Electron 默认图标
     *   - 通知的图标、分组、跳转行为不正常
     */
    electronApp.setAppUserModelId('com.aiden.electron-app')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    /**
     * browser-window-created 是 Electron 主进程的一个全局事件，任何 BrowserWindow 创建时都会触发（不管是你的 createWindow() 还是以后新增的窗口）
     *   -  一处配置，覆盖所有窗口——不用在 createWindow() 里逐个手动调
     *   - 因为 watchWindowShortcuts 本身需要在窗口创建后、有 webContents 之后才能绑定输入事件
     * 它本质是 @electron-toolkit/utils 提供的一个「开箱即用的快捷键治理」工具函数，内部通过监听该窗口 webContents 的 before-input-event 来实现。
     * 配合外层： app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })
     * ——保证每个新建窗口都自动套上这套规则，不用在 createWindow() 里手动写一遍。
     */
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    createWindow()

    /**
     * macOS 点击 Dock 图标且无窗口, 此事件只会在macos触发
     * 这是 macOS 的交互习惯导致的：
     *   - 在 macOS 上，点 Dock 图标「激活」应用是常态操作；而且 macOS 应用关闭所有窗口后，应用进程并不会退出（仍驻留在 Dock 里）。
     *   - 所以 Electron 提供了 activate 事件：当用户点 Dock 图标、而应用当前没有任何窗口时触发。
     *
     * - macOS：关掉窗口不退出，进程留着 → 用户再点 Dock 图标时触发 activate → 判断没窗口就 createWindow() 补一个。
     *
     * - Windows / Linux：关掉最后一个窗口 → 应用直接退出（app.quit()）。既然进程都没了，自然不会有 activate。
     *
     * - 执行 createWindow() 创建的是应用唯一的那个主窗口
     */
    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        // macOS 点 Dock 图标且无窗口时，重新创建一个窗口
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
/**
 * 所有窗口关闭（macOS 不触发)
 */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
