# HLX Labs payment backend

New checkout uses Cleffo through the Supabase `cleffo-payments` function.
See [CLEFFO-INTEGRATION.md](CLEFFO-INTEGRATION.md) for configuration and testing.

`tagada-webhook` and `tagada-to-tideco` return HTTP 410 and do not process payment events or submit fulfillment requests.
Historical orders and payment records remain available for reconciliation and customer order history.
