# Firestore Zero-Trust Security Specification

## 1. Data Invariants
1. **Public Storefront Configuration (`site_settings/public`)**: Must be publicly readable (`get`) so visitors see live branding, site title, packages, FAQs, footer, and currency rates without signing in, and MUST NEVER contain secret keys (Paystack secret keys, Brevo API keys, or password hashes). Writes (`create`, `update`) are strictly restricted to the verified administrator (`baffourgideon05@gmail.com` with `email_verified == true` or document in `/admins/{uid}`).
2. **Orders (`orders/{orderId}`)**: An order is private PII (`customerName`, `customerEmail`, `customerPhone`). Unauthenticated users cannot read/list existing orders. Authenticated customers may only read (`get`/`list`) orders whose `customerEmail` matches their verified token email (`request.auth.token.email`) or `ownerUid == request.auth.uid`. Customers cannot self-mark `paymentStatus = 'PAID'` or alter `paymentTotal`; only verified Admin (`isAdmin()`) or server verification may settle or update campaign telemetry. Completed orders (`campaignStatus == 'COMPLETED'`) are terminally locked except for `isAdmin()`.
3. **Users (`users/{userId}`)**: Users can only read/create/update their own profile document (`userId == request.auth.uid`). On create, `role` MUST be `'customer'` (self-assigned `'admin'` is strictly blocked). Users cannot elevate `role` or `status` on update. Only `isAdmin()` can list users.
4. **Admins (`admins/{adminId}`)**: Strictly read-only to verified admin; client-side self-promotion writes are completely denied (`allow write: if false`).
5. **Password Reset Requests (`password_resets/{requestId}`)**: Strictly isolated; only `isAdmin()` can list/read/resolve requests. Anyone creating a request must enforce `status == 'pending'`.

## 2. Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on Site Settings**: `{ branding: {...}, isAdmin: true, secretBackdoor: "x" }` -> Rejected by `.keys().hasOnly(...)`.
2. **Oversized String Exhaustion on Site Title**: `{ branding: { siteTitle: "<2KB string>" } }` -> Rejected by `.size() <= 160`.
3. **Spoofed Admin Email Without Verification**: `request.auth.token.email == 'baffourgideon05@gmail.com'` with `email_verified: false` -> Rejected by `isVerifiedAdminEmail()`.
4. **Self-Assigned Admin Role on User Creation**: `users/uid123` create with `{ uid: "uid123", email: "attacker@evil.com", role: "admin" }` -> Rejected by `data.role == 'customer'`.
5. **Role Escalation on User Update**: `users/uid123` update changing `role` from `'customer'` to `'admin'` -> Rejected by `affectedKeys().hasOnly(...)` & `isAdmin()` exclusion.
6. **PII Cross-Tenant Read on Orders**: Signed-in user `alice@test.com` calling `get` or `list` on order owned by `bob@test.com` -> Rejected by `resource.data.customerEmail == request.auth.token.email`.
7. **Unscoped Collection Scrape on Orders**: Signed-in customer calling `collection('orders')` without `.where('customerEmail', '==', ...)` -> Rejected by `allow list` evaluating `resource.data`.
8. **Fake Payment Settlement by Customer**: Customer creating or updating an order with `paymentStatus: 'PAID'` or `receiptNumber: 'REC-FAKE'` -> Rejected by `incoming().paymentStatus == 'PENDING'` on customer create and `isAdmin()` gate on status transitions.
9. **Terminal State Tampering**: Customer updating `campaignBrief` on an order where `existing().campaignStatus == 'COMPLETED'` -> Rejected by Terminal State Lock.
10. **Malicious ID Poisoning**: Document ID `../../etc/passwd` or 500-char string -> Rejected by `isValidId(id)` matching `^[a-zA-Z0-9_\-]+$` and `size() <= 128`.
11. **Value Type Poisoning on Package Array**: Writing `{ packages: "not-a-list" }` or oversized array `size() > 25` -> Rejected by `is list && size() <= 25`.
12. **Client Timestamp Forgery**: Setting `updatedAt` to a past timestamp instead of `request.time` -> Rejected by `incoming().updatedAt == request.time`.
