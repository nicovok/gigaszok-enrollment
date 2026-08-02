const secret = process.argv[2];
if (!secret) {
  console.error("Usage: bun test-webhook.ts <webhook-secret>");
  process.exit(1);
}

const res = await fetch("https://prfs87j9-3000.euw.devtunnels.ms/webhooks/beiratkozas2627", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Secret": secret,
  },
  body: JSON.stringify({
    child_name: "Kovács Péter",
    parent_name: "Kovács János",
    email: "kovacs@example.com",
    form_data: { submission_id: 999, form_title: "Beiratkozás teszt" },
  }),
});

const data = await res.json();
console.log(res.status, data);
