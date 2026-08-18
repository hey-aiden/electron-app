import { app, BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from 'electron'

export function createMenu() {
    const isMac = process.platform === 'darwin'

    const template = [
        // macOS 应用菜单（Auto-updated by Electron）
        ...(isMac
            ? [
                  {
                      label: app.name,
                      submenu: [
                          { role: 'about' },
                          { type: 'separator' },
                          { role: 'services' },
                          { type: 'separator' },
                          { role: 'hide' },
                          { role: 'hideOthers' },
                          { role: 'unhide' },
                          { type: 'separator' },
                          { role: 'quit' }
                      ]
                  }
              ]
            : []),

        // 文件菜单
        // TODO: 下面的 menu:new-file / menu:open-file / menu:save-file / menu:save-as
        // 在 renderer/preload 里还没有 ipcRenderer.on 监听，点击目前是静默 no-op，待补监听。
        {
            label: '文件',
            submenu: [
                {
                    label: '新建',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        BrowserWindow.getFocusedWindow()?.webContents.send('menu:new-file')
                    }
                },
                {
                    label: '打开...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        BrowserWindow.getFocusedWindow()?.webContents.send('menu:open-file')
                    }
                },
                { type: 'separator' },
                {
                    label: '保存',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        BrowserWindow.getFocusedWindow()?.webContents.send('menu:save-file')
                    }
                },
                {
                    label: '另存为...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        BrowserWindow.getFocusedWindow()?.webContents.send('menu:save-as')
                    }
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        // 编辑菜单
        {
            label: '编辑',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac
                    ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }]
                    : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
            ]
        },
        // 视图菜单
        {
            label: '视图',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        // 窗口菜单
        {
            label: '窗口',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac
                    ? [
                          { type: 'separator' },
                          { role: 'front' },
                          { type: 'separator' },
                          { role: 'window' }
                      ]
                    : [{ role: 'close' }])
            ]
        },
        // 帮助菜单
        {
            role: 'help',
            submenu: [
                {
                    label: '了解更多',
                    click: async () => {
                        await shell.openExternal('https://www.electronjs.org/docs')
                    }
                },
                {
                    label: '关于',
                    click: () => {
                        // TODO: 内联 require 与顶部 ESM import 混用，建议把 dialog 加进顶部 import
                        const { dialog } = require('electron')
                        dialog.showMessageBox({
                            type: 'info',
                            title: '关于',
                            message: `My App v${app.getVersion()}`,
                            detail: 'Built with Electron + React' // TODO: 项目是 Vue，文案误写成 React，待改
                        })
                    }
                }
            ]
        }
    ]

    // ...(isMac ? [...] : []) 展开/三元会打断上下文推断，导致 role/type 被拓宽成 string，
    // 故在 buildFromTemplate 处显式断言为 MenuItemConstructorOptions[]。
    const menu = Menu.buildFromTemplate(template as MenuItemConstructorOptions[])
    Menu.setApplicationMenu(menu)
}
