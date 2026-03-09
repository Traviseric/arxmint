/**
 * Trigger: Merchant Signup
 *
 * Fires when a new merchant joins the ArxMint network (pledge submitted).
 */
"use strict";

const subscribeHook = async (z, bundle) => {
  const data = {
    url: bundle.targetUrl,
    event: "merchant.created",
  };

  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/webhooks`,
    method: "POST",
    body: data,
  });

  return response.data;
};

const unsubscribeHook = async (z, bundle) => {
  const webhookId = bundle.subscribeData.id;

  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/webhooks/${webhookId}`,
    method: "DELETE",
  });

  return response.data;
};

const getMerchants = async (z, bundle) => {
  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/pledge`,
    params: {
      limit: 3,
      orderBy: "created_at",
      order: "desc",
    },
  });

  const merchants = response.data.merchants || [];

  if (merchants.length === 0) {
    return [
      {
        id: "merchant_sample_001",
        name: "Sample Coffee Shop",
        slug: "sample-coffee",
        city: "Austin",
        category: "food_beverage",
        createdAt: new Date().toISOString(),
        status: "active",
      },
    ];
  }

  return merchants;
};

module.exports = {
  key: "merchant_signup",
  noun: "Merchant",

  display: {
    label: "New Merchant Signup",
    description:
      "Triggers when a new merchant joins the ArxMint Citadel pilot and submits a Bitcoin pledge.",
    important: false,
  },

  operation: {
    type: "hook",
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: (z, bundle) => [bundle.cleanedRequest],
    performList: getMerchants,

    sample: {
      id: "merchant_xyz789",
      name: "The Bitcoin Café",
      slug: "bitcoin-cafe",
      city: "Austin",
      state: "TX",
      category: "food_beverage",
      bitcoinAccepted: true,
      lightningEnabled: true,
      createdAt: "2026-03-09T09:00:00Z",
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
      { key: "createdAt", label: "Signed Up At", type: "datetime" },
      { key: "status", label: "Status" },
    ],
  },
};
