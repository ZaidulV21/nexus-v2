"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const razorpay_1 = __importDefault(require("razorpay"));
const r = new razorpay_1.default({ key_id: "k", key_secret: "s" });
const p = r.payments;
const x = p.refund("pay_1", { amount: 100 });
x.then((rr) => rr.id);
