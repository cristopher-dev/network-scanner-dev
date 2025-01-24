# React Electron Template

The Complete Electron, React Template for Robust Multi-Platform Apps in Production

## Getting Started

### Prerequisites

- Node.js >= 14.x
- npm >= 6.x

### Installation

```bash
npm install
```

### Development

```bash
npm run start
```

### Production

```bash
npm run prod
```

### Building

```bash
npm run build
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

### License

This project is licensed under the MIT License.

## 🚀 Características

- ⚡️ **Electron 21** y **React 18** para una experiencia moderna.
- 💪 **TypeScript** para un desarrollo más seguro y escalable.
- 🛠 **Webpack 5** configurado para entornos de producción y desarrollo.
- 🔥 **Hot Reload** para un desarrollo rápido y eficiente.
- 📦 Empaquetado con **electron-builder**.
- 🎯 **Optimización en producción** con minimización y compilación avanzada.
- 🔒 **Control de calidad** con ESLint y Prettier.
- 🎨 Soporte para **SASS/SCSS** para estilos avanzados.
- 🔄 **Actualizaciones automáticas** integradas.
- 💾 Almacenamiento persistente con **electron-store**.

## 📋 Pre-requisitos

- **Node.js** >= 14.x
- **npm** >= 6.x

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/react-electron-base

# Navegar al directorio del proyecto
cd react-electron-base

# Instalar dependencias
npm install
```

## 🚀 Comandos Disponibles

### Iniciar en Modo Desarrollo

```bash
npm start
```

### Compilar para Producción

```bash
npm run build
```

### Generar Ejecutable

- **Windows**

  ```bash
  npm run make:win
  ```

- **macOS**

  ```bash
  npm run make:mac
  ```

- **Linux**

  ```bash
  npm run make:linux
  ```

### Ejecutar Linter

```bash
npm run lint
```

## 📁 Estructura del Proyecto

```
├── app/             # Carpeta de la aplicación compilada
├── assets/          # Recursos estáticos como imágenes y íconos
├── configs/         # Configuraciones de Webpack y otros scripts
├── src/
│   ├── main/        # Código del proceso principal de Electron
│   └── renderer/    # Código del proceso de renderizado (Front-end)
├── package.json     # Archivo de configuración de npm
└── tsconfig.json    # Configuración de TypeScript
```

## 🧰 Scripts Disponibles en package.json

- **build:debug**: Limpia la compilación, inicia en modo debug y construye con electron-builder.
- **build:main**: Compila el proceso principal para producción.
- **build:renderer**: Compila el proceso de renderizado para producción.
- **build**: Limpia la distribución y compila tanto el proceso principal como el de renderizado.
- **clean:build**: Ejecuta el script de limpieza para la construcción.
- **clean:dist**: Ejecuta el script de limpieza para la distribución.
- **clean**: Ejecuta el script de limpieza general.
- **debug**: Inicia en modo debug con compilación concurrente de procesos principales y de renderizado.
- **lint**: Corre ESLint con corrección automática.
- **make:linux/make:mac/make:win**: Genera ejecutables para cada plataforma.
- **prepare**: Instala Husky para hooks de git.
- **prod:debug**: Limpia la distribución, inicia en modo debug y ejecuta la aplicación.
- **prod**: Compila para producción y ejecuta la aplicación.
- **start:main**: Inicia el proceso principal en modo desarrollo.
- **start:preload**: Compila el script de preload para desarrollo.
- **start:renderer**: Inicia el servidor de desarrollo de Webpack para el renderizado.
- **start**: Verifica el puerto y ejecuta concurrentemente los scripts de preload y renderizado.

## 📖 Guía de Desarrollo

1. **Iniciar el Servidor de Desarrollo**:

   ```bash
   npm start
   ```

   Esto iniciará tanto el proceso principal como el de renderizado con **Hot Reload**.

2. **Agregar Nuevas Dependencias**:

   Utiliza `npm install <paquete> --save` para agregar dependencias de producción o `--save-dev` para dependencias de desarrollo.

3. **Estructura del Código**:

   - **Main**: Ubicado en `src/main/`, maneja el ciclo de vida de la aplicación Electron.
   - **Renderer**: Ubicado en `src/renderer/`, contiene el código React para la interfaz de usuario.

## 📦 Construcción y Distribución

Para compilar la aplicación para producción y crear los ejecutables para diferentes plataformas, utiliza los siguientes comandos:

- **Producción General**:

  ```bash
  npm run build
  ```

- **Generar Ejecutable para una Plataforma Específica**:

  - **Windows**:

    ```bash
    npm run make:win
    ```

  - **macOS**:

    ```bash
    npm run make:mac
    ```

  - **Linux**:

    ```bash
    npm run make:linux
    ```

## 🤝 Contribuciones

¡Contribuciones son bienvenidas! Por favor, sigue estos pasos para contribuir:

1. **Fork** el repositorio.
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-feature`).
3. **Commit** tus cambios (`git commit -m 'Añadir nueva feature'`).
4. **Push** a la rama (`git push origin feature/nueva-feature`).
5. **Abre un Pull Request**.

## 📄 Licencia

Este proyecto está licenciado bajo la [Licencia MIT](./LICENSE).

## 📝 Información Adicional

- **Configuraciones de Electronmon**: Definidas en `package.json` para monitorear cambios en el proceso principal.
- **Almacenamiento Persistente**: Gestionado por **electron-store** para guardar configuraciones y datos del usuario.
- **ESLint y Prettier**: Configurados para mantener la calidad y consistencia del código.
- **SASS/SCSS**: Soporte integrado para estilos avanzados.

Para más información, visita la [documentación oficial](https://www.electronjs.org/docs).
