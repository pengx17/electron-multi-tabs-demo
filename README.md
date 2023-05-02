# electron-multi-tabs-demo

use BrowserView to serve two different types of renderer views (shell/app)
- shell will be used for rendering tabs
- app is a normal app that should render main biz-logic

Some other features:
- Electron APIs definitions exposed via preload are generated from handlers in main. You can jump to the real definition easily.
