require(["./ts/settings", "./ts/mermaid_js_service"], async function (settingsModule, mermaidJsServiceModule) {
    await settingsModule.Settings.initialize();

    window.showWorkItemInfo = mermaidJsServiceModule.MermaidJsService.showWorkItemInfo;
    window.updateSetting = settingsModule.Settings.updateSetting;
});