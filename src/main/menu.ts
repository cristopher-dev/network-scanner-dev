import { app, Menu, shell, MenuItemConstructorOptions } from 'electron';

// URLs constantes
const URLS = {
  GITHUB_PROFILE: 'https://github.com/AjayKanniyappan',
  REPO_URL: 'https://github.com/AjayKanniyappan/react-electron-template',
  DOCS_URL: 'https://github.com/AjayKanniyappan/react-electron-template#readme',
} as const;

// Funciones auxiliares
const openExternal = (url: string) => () => shell.openExternal(url);

// Definición de menús
const menuTemplate: MenuItemConstructorOptions[] = [
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
      {
        label: 'Más',
        click: openExternal(URLS.GITHUB_PROFILE),
      },
    ],
  },
  {
    label: 'Ayuda',
    submenu: [
      {
        label: 'Aprende Más',
        click: openExternal(URLS.REPO_URL),
      },
      {
        label: 'Documentación',
        accelerator: 'F1',
        click: openExternal(URLS.DOCS_URL),
      },
    ],
  },
];

// Exportar una función que crea el menú
export function createMenu(): Menu {
  return Menu.buildFromTemplate(menuTemplate);
}
