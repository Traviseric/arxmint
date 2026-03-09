/**
 * ArxMint Zapier App Definition
 *
 * Connects ArxMint Lightning payments to 5000+ apps.
 * Triggers: payment_received, merchant_signup
 * Actions:  create_invoice
 * Searches: find_merchant
 */
"use strict";

const { version } = require("zapier-platform-core");
const paymentReceivedTrigger = require("./triggers/payment_received");
const merchantSignupTrigger = require("./triggers/merchant_signup");
const createInvoiceAction = require("./creates/create_invoice");
const findMerchantSearch = require("./searches/find_merchant");

const App = {
  version: require("./package.json").version,
  platformVersion: version,

  authentication: {
    type: "custom",
    test: {
      url: "https://arxmint.com/api/health",
      method: "GET",
    },
    fields: [
      {
        key: "api_key",
        label: "ArxMint API Key",
        required: true,
        type: "password",
        helpText:
          "Find your API key in the [ArxMint merchant dashboard](https://arxmint.com/dashboard).",
      },
      {
        key: "merchant_id",
        label: "Merchant ID",
        required: true,
        type: "string",
        helpText: "Your ArxMint merchant slug (e.g. `my-store`).",
      },
      {
        key: "base_url",
        label: "Base URL (optional)",
        required: false,
        type: "string",
        default: "https://arxmint.com",
        helpText:
          "Override for testnet. Leave blank for production: https://arxmint.com",
      },
    ],
    connectionLabel: "{{bundle.authData.merchant_id}}",
  },

  beforeRequest: [
    (request, z, bundle) => {
      request.headers["Authorization"] = `Bearer ${bundle.authData.api_key}`;
      request.headers["Content-Type"] = "application/json";
      return request;
    },
  ],

  triggers: {
    [paymentReceivedTrigger.key]: paymentReceivedTrigger,
    [merchantSignupTrigger.key]: merchantSignupTrigger,
  },

  creates: {
    [createInvoiceAction.key]: createInvoiceAction,
  },

  searches: {
    [findMerchantSearch.key]: findMerchantSearch,
  },
};

module.exports = App;
