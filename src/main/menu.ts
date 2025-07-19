import { app, Menu, shell } from 'electron';

const menu = [
  {
    label: 'Archivo',
    submenu: [
      {
        label: 'Salir',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
        click: () => app.quit(),
      },
    ],
  },
  {
    label: 'Acerca de',
    submenu: [
      { label: 'Más', click: () => shell.openExternal('https://github.com/AjayKanniyappan') },
    ],
  },
  {
    label: 'Ayuda',
    submenu: [
      {
        label: 'Aprende Más',
        click: () =>
          shell.openExternal('https://github.com/AjayKanniyappan/react-electron-template'),
      },
      {
        label: 'Documentación',
        accelerator: 'F1',
        click: () =>
          shell.openExternal('https://github.com/AjayKanniyappan/react-electron-template#readme'),
      },
    ],
  },
];

export function createMenu() {
  return Menu.buildFromTemplate(menu);
}
