# electron-multi-tabs-demo

use BrowserView to serve two different types of renderer views (shell/app)
- shell will be used for rendering tabs
- app is a normal app that should render main biz-logic

![image](https://user-images.githubusercontent.com/584378/235633613-6d05c366-681b-4e2f-bab7-eb777dd6becd.png)

Some other features:
- Electron APIs definitions exposed via preload are generated from handlers in main. You can jump to the real definition easily.
- Experiment UtilityProcess to offload heavy computation off main process
- Using https://github.com/Jack-Works/async-call-rpc#builtin-channels to sync events between helper process & renderer
