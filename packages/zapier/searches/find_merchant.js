/**
 * Search: Find Merchant
 *
 * Looks up an ArxMint merchant by ID or name.
 * Use in multi-step Zaps where you need merchant details before creating an invoice.
 */
"use strict";

const findMerchant = async (z, bundle) => {
  const query = bundle.inputData.query;

  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/pledge`,
    params: {
      q: query,
      limit: 5,
    },
  });

  const merchants = response.data.merchants || [];

  // Zapier searches must return an empty array (not error) when nothing is found
  return merchants;
};

module.exports = {
  key: "find_merchant",
  noun: "Merchant",

  display: {
    label: "Find Merchant",
    description:
      "Finds an ArxMint merchant by name, slug, or city. Returns merchant details including their Lightning endpoint.",
    important: false,
  },

  operation: {
    perform: findMerchant,

    inputFields: [
      {
        key: "query",
        label: "Search Query",
        type: "string",
        required: true,
        helpText:
          "Search by merchant name, slug, or city (e.g. 'glacier', 'bitcoin-cafe', 'Austin').",
      },
    ],

    sample: {
      id: "merchant_xyz789",
      name: "Glacier Brewing",
      slug: "glacier",
      city: "Whitefish",
      state: "MT",
      category: "food_beverage",
      bitcoinAccepted: true,
      lightningEnabled: true,
      checkoutUrl: "https://arxmint.com/pay/glacier",
      status: "active",
    },

    outputFields: [
      { key: "id", label: "Merchant ID" },
      { key: "name", label: "Business Name" },
      { key: "slug", label: "Merchant Slug" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "category", label: "Category" },
      { key: "bitcoinAccepted", label: "Bitcoin Accepted", type: "boolean" },
      { key: "lightningEnabled", label: "Lightning Enabled", type: "boolean" },
      { key: "checkoutUrl", label: "Checkout URL" },
      { key: "status", label: "Status" },
    ],
  },
};
