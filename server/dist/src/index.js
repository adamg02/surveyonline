"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const port = process.env.PORT || 4000;
(0, app_1.createApp)().listen(port, () => {
    console.log(`SurveyOnline server running on port ${port}`);
});
