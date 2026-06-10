"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const scheduler_1 = require("./scheduler");
dotenv_1.default.config();
(0, scheduler_1.startScanner)().catch((error) => {
    console.error('Scanner failed to start:', error);
    process.exit(1);
});
