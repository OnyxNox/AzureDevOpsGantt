require(["./ts/settings"], function (settingsModule) {
    settingsModule.Settings.loadSettingsFromLocalStorage();

    window.updateSetting = settingsModule.Settings.updateSetting;
});