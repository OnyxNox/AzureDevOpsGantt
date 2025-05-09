require(["./ts/settings"], async function (settingsModule) {
    await settingsModule.Settings.initialize();

    window.updateSetting = settingsModule.Settings.updateSetting;
});