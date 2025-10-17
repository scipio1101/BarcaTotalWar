const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        },
        backgroundColor: '#1a1a1a',
        title: '第二次布匿战争 - 战略游戏',
        autoHideMenuBar: false,
        frame: true
    });

    // 加载游戏主页面
    mainWindow.loadFile('index.html');

    // 创建菜单
    const menuTemplate = [
        {
            label: '游戏',
            submenu: [
                {
                    label: '重新加载',
                    accelerator: 'F5',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: '开发者工具',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '全屏',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                {
                    label: '放大',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                    }
                },
                {
                    label: '缩小',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
                    }
                },
                {
                    label: '重置缩放',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.setZoomLevel(0);
                    }
                }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '游戏规则',
                    click: () => {
                        // 可以打开规则文档
                        require('electron').shell.openPath(path.join(__dirname, '游戏机制规则文档.md'));
                    }
                },
                {
                    label: '关于',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: '第二次布匿战争 - 战略游戏',
                            detail: '版本: 1.0.0\n看海版单机AI版\n\n一款基于历史的回合制大战略游戏',
                            buttons: ['确定']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // 窗口关闭时的处理
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 防止外部链接在应用内打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // 开发环境下自动打开开发者工具（可选）
    // mainWindow.webContents.openDevTools();
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，
        // 通常会重新创建一个窗口
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
    // 在 macOS 上，应用通常会保持活动状态，直到用户明确退出
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 禁用硬件加速（如果遇到图形问题可以启用）
// app.disableHardwareAcceleration();

// 设置应用名称
app.setName('第二次布匿战争');
