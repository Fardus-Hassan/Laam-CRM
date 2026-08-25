# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hold-flow-ui.spec.ts >> Hold workflow — browser UI >> login → create Hold order → follow-up queue → cancel closes follow-up
- Location: e2e\hold-flow-ui.spec.ts:28:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for locator('[data-radix-popper-content-wrapper]').last().locator('button').filter({ hasText: /^Hold$/i }).first()

```

# Page snapshot

```yaml
- generic:
  - generic [ref=e5] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e6]:
      - img [ref=e7]
    - generic [ref=e10]:
      - button "Open issues overlay" [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: "1"
          - generic [ref=e14]: "2"
        - generic [ref=e15]:
          - text: Issue
          - generic [ref=e16]: s
      - button "Collapse issues badge" [ref=e17]:
        - img [ref=e18]
  - alert
  - generic:
    - generic:
      - generic:
        - generic:
          - generic:
            - link:
              - /url: /dashboard
              - img
          - generic:
            - generic:
              - generic:
                - list:
                  - listitem:
                    - link:
                      - /url: /dashboard
                      - img
                      - generic: Dashboard
                  - listitem:
                    - link:
                      - /url: /dashboard/orders
                      - img
                      - generic: All Orders
            - generic:
              - generic: Operations
              - generic:
                - list:
                  - listitem:
                    - button [expanded]:
                      - img
                      - generic: Pending Orders
                      - img
                    - generic:
                      - list:
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/new
                            - generic: Create New
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=hold
                            - generic: On Hold
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=hold_followup
                            - generic: Hold Followup
                            - generic: "3"
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=pending
                            - generic: Pending
                            - generic: "1"
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/queues/pendings
                            - generic: Call confirm
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/queues/followups
                            - generic: Followups
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=confirm_order
                            - generic: Confirm Order
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/failed
                            - generic: Failed Orders
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/tools/bulk-print
                            - generic: Bulk Print
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/tools/send-courier-barcode
                            - generic: Send Courier by Barcode
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/payments
                            - generic: Payments
                  - listitem:
                    - button [expanded]:
                      - img
                      - generic: Confirmed Orders
                      - img
                    - generic:
                      - list:
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=confirmed
                            - generic: Confirmed
                  - listitem:
                    - button [expanded]:
                      - img
                      - generic: Courier & Delivery
                      - img
                    - generic:
                      - list:
                        - listitem:
                          - link:
                            - /url: /dashboard/courier
                            - generic: Courier Dashboard
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=rts_pathao
                            - generic: RTS Pathao
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=rts_carrybee
                            - generic: RTS Carrybee
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=in_courier
                            - generic: In Courier
                  - listitem:
                    - button:
                      - img
                      - generic: Task & Followup
                      - img
                  - listitem:
                    - button:
                      - img
                      - generic: Inventory
                      - img
                  - listitem:
                    - button:
                      - img
                      - generic: People Management
                      - img
            - generic:
              - generic: Growth
              - generic:
                - list:
                  - listitem:
                    - button:
                      - img
                      - generic: Marketing
                      - img
                  - listitem:
                    - button:
                      - img
                      - generic: Customers
                      - img
            - generic:
              - generic: Business
              - generic:
                - list:
                  - listitem:
                    - button:
                      - img
                      - generic: Finance
                      - img
                  - listitem:
                    - button:
                      - img
                      - generic: HRM & Payroll
                      - img
                  - listitem:
                    - button:
                      - img
                      - generic: Reports
                      - img
                  - listitem:
                    - button [expanded]:
                      - img
                      - generic: Workspace
                      - img
                    - generic:
                      - list:
                        - listitem:
                          - link:
                            - /url: /dashboard/followups
                            - generic: Follow ups
                            - generic: "3"
                        - listitem:
                          - link:
                            - /url: /dashboard/notifications
                            - generic: Notifications
                        - listitem:
                          - link:
                            - /url: /dashboard/tasks
                            - generic: Tasks
                        - listitem:
                          - link:
                            - /url: /dashboard/incentive
                            - generic: Incentive & KPI
                        - listitem:
                          - link:
                            - /url: /dashboard/calendar
                            - generic: Calendar
                        - listitem:
                          - link:
                            - /url: /dashboard/automations
                            - generic: Automations
                        - listitem:
                          - link:
                            - /url: /dashboard/knowledge
                            - generic: Knowledge base
                        - listitem:
                          - link:
                            - /url: /dashboard/courier
                            - generic: Courier Dashboard
                        - listitem:
                          - link:
                            - /url: /dashboard/support
                            - generic: Support
                            - generic: "1"
                        - listitem:
                          - link:
                            - /url: /dashboard/coupons
                            - generic: Coupons
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/new
                            - generic: Create New
                        - listitem:
                          - link:
                            - /url: /dashboard/orders
                            - generic: All Orders
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/queues/pendings
                            - generic: Call confirm
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/queues/followups
                            - generic: Followups
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=confirm_order
                            - generic: Confirm Order
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=confirmed
                            - generic: Confirmed
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=incomplete
                            - generic: Incomplete Orders
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=good_but_no_response
                            - generic: Good But No Response
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=no_response
                            - generic: No Response
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=advanced_payment
                            - generic: Advanced Payment
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=pre_order
                            - generic: Pre Order
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=in_courier
                            - generic: In Courier
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=variation_1
                            - generic: Variation 1
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=variation_2
                            - generic: Variation 2
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=variation_3
                            - generic: Variation 3
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=hold
                            - generic: On Hold
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=partial_delivered
                            - generic: Partial Delivered
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=rts_pathao
                            - generic: RTS Pathao
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=rts_carrybee
                            - generic: RTS Carrybee
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=hold_followup
                            - generic: Hold Followup
                            - generic: "3"
                        - listitem:
                          - link:
                            - /url: /dashboard/orders?status=pending
                            - generic: Pending
                            - generic: "1"
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/failed
                            - generic: Failed Orders
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/tools/bulk-print
                            - generic: Bulk Print
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/tools/send-courier-barcode
                            - generic: Send Courier by Barcode
                        - listitem:
                          - link:
                            - /url: /dashboard/orders/payments
                            - generic: Payments
                        - listitem:
                          - link:
                            - /url: /dashboard/leads
                            - generic: Leads
                        - listitem:
                          - generic:
                            - generic:
                              - link:
                                - /url: /dashboard/customers
                                - generic: All Customers
                              - button:
                                - img
                        - listitem:
                          - link:
                            - /url: /dashboard/contacts?segment=supplier
                            - generic: Suppliers & partners
            - generic:
              - generic: Administration
              - generic:
                - list:
                  - listitem:
                    - button:
                      - img
                      - generic: Settings
                      - img
                  - listitem:
                    - button:
                      - img
                      - generic: Support
                      - img
          - generic:
            - list:
              - listitem:
                - button:
                  - generic:
                    - generic: EO
                  - generic:
                    - generic: E2E Org Admin
                    - generic: Org Admin
                  - img
          - button
    - main:
      - generic:
        - generic:
          - generic:
            - button:
              - img
              - generic: Toggle Sidebar
            - navigation:
              - list:
                - generic:
                  - listitem:
                    - link:
                      - /url: /dashboard
                      - text: Dashboard
                  - listitem:
                    - img
                - generic:
                  - listitem:
                    - link:
                      - /url: /dashboard/orders
                      - text: Orders
                  - listitem:
                    - img
                - generic:
                  - listitem:
                    - link [disabled]: Create
          - generic:
            - button:
              - img
              - generic: Search orders…
              - generic: Ctrl+K
            - link:
              - /url: /dashboard/orders/new
              - img
              - generic: Create order
            - button:
              - img
            - button:
              - img
              - generic: 9+
            - button:
              - img
            - button:
              - img
            - button:
              - generic:
                - generic: EO
              - generic:
                - generic: E2E Org Admin
                - generic: Org Admin
              - img
        - generic:
          - generic:
            - generic:
              - generic:
                - generic:
                  - paragraph: Courier success rate
                  - paragraph: Network delivery history for this phone
                - button:
                  - img
                  - text: Refresh
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - img
                      - generic: Overall
                    - generic:
                      - generic: Shop 0
                      - generic: ·
                      - generic: Done 0
                    - generic:
                      - paragraph: No data
                    - generic:
                      - generic:
                        - paragraph: Total
                        - paragraph: "0"
                      - generic:
                        - paragraph: Success
                        - paragraph: "0"
                      - generic:
                        - paragraph: Cancel
                        - paragraph: "0"
                - paragraph: Updated 25 Aug 2026, 5:50 pm · live
            - navigation:
              - link:
                - /url: "#create-order-customer"
                - generic: "1"
                - text: Customer
              - link:
                - /url: "#create-order-products"
                - generic: "2"
                - text: Products
              - link:
                - /url: "#create-order-payment"
                - generic: "3"
                - text: Payment
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: Customer Information
                    - generic:
                      - generic:
                        - generic:
                          - generic:
                            - generic:
                              - text: Mobile Number
                              - generic: "*"
                          - generic:
                            - textbox:
                              - /placeholder: 01XXXXXXXXX
                              - text: "01758616203"
                            - button:
                              - img
                            - button:
                              - img
                            - button:
                              - img
                            - button:
                              - img
                        - generic:
                          - generic:
                            - generic: Alternative Number
                          - textbox:
                            - /placeholder: 01XXXXXXXXX
                        - generic:
                          - generic:
                            - generic:
                              - text: Name
                              - generic: "*"
                          - textbox: UI Hold 1787658616203
                        - generic:
                          - generic:
                            - generic: Email
                          - textbox
                      - generic:
                        - generic:
                          - generic:
                            - generic:
                              - text: Address
                              - generic: "*"
                            - generic:
                              - generic:
                                - button: Clear
                                - button: Change location
                          - textbox:
                            - /placeholder: Full delivery address
                            - text: UI test address, Dhaka
                          - paragraph: Address ready for courier booking. Pick location again to replace, or edit manually.
                        - generic:
                          - generic:
                            - generic: Customer Note
                          - textbox:
                            - /placeholder: Customer preferences, allergies, delivery instructions…
                      - generic:
                        - generic:
                          - generic:
                            - generic: District
                          - button:
                            - generic: Search District
                            - img
                        - generic:
                          - generic:
                            - generic: Order Source
                          - button:
                            - generic: Facebook Ad
                            - img
                        - generic:
                          - generic:
                            - generic: Order Tag
                          - button:
                            - generic: Select tag
                            - img
                        - generic:
                          - generic:
                            - generic: Customer Tag
                          - textbox:
                            - /placeholder: e.g. VIP, Repeat buyer
                - generic:
                  - generic:
                    - generic:
                      - generic: Sales assignment
                    - generic:
                      - paragraph: Sales KPI credit follows this assignee. Courier / logistic assignment is set later at booking. Website ingest uses Settings → Assignment routing; manual CRM orders default to you.
                      - generic:
                        - generic:
                          - generic:
                            - generic: Routing
                          - button:
                            - generic: Me (creator)
                            - img
                          - paragraph: Assigns to E2E Org Admin for KPI credit. Website orders use Settings → Assignment routing instead.
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic: Listed Products
                      - generic:
                        - generic:
                          - table:
                            - rowgroup:
                              - row:
                                - columnheader: Name
                                - columnheader: Variation
                                - columnheader: Unit Price
                                - columnheader: Qty
                                - columnheader: Discount
                                - columnheader: Subtotal
                                - columnheader
                            - rowgroup:
                              - row:
                                - cell:
                                  - generic:
                                    - generic: A2Z Product 1787658187049
                                - cell: Default
                                - cell: ৳ 500
                                - cell:
                                  - spinbutton: "1"
                                - cell:
                                  - spinbutton: "0"
                                - cell: ৳ 500
                                - cell:
                                  - button:
                                    - img
                        - generic:
                          - generic:
                            - generic:
                              - generic:
                                - text: Order Status
                                - generic: "*"
                            - button [expanded] [active]:
                              - generic: Select status
                              - img
                            - dialog [ref=e20]:
                              - generic [ref=e22]:
                                - img
                                - textbox "Search status…" [ref=e23]
                              - generic [ref=e24]:
                                - button "RTS Carrybee" [ref=e25]:
                                  - generic [ref=e26]: RTS Carrybee
                                - button "Variation 1" [ref=e27]:
                                  - generic [ref=e28]: Variation 1
                                - button "No Response" [ref=e29]:
                                  - generic [ref=e30]: No Response
                                - button "Fardus" [ref=e31]:
                                  - generic [ref=e32]: Fardus
                                - button "RTS Pathao" [ref=e33]:
                                  - generic [ref=e34]: RTS Pathao
                                - button "Variation 2" [ref=e35]:
                                  - generic [ref=e36]: Variation 2
                                - button "Partial Delivered" [ref=e37]:
                                  - generic [ref=e38]: Partial Delivered
                                - button "Confirm Order" [ref=e39]:
                                  - generic [ref=e40]: Confirm Order
                                - button "Pre Order" [ref=e41]:
                                  - generic [ref=e42]: Pre Order
                                - button "Variation 3" [ref=e43]:
                                  - generic [ref=e44]: Variation 3
                                - button "Incomplete Orders" [ref=e45]:
                                  - generic [ref=e46]: Incomplete Orders
                                - button "Advanced Payment" [ref=e47]:
                                  - generic [ref=e48]: Advanced Payment
                                - button "Pending" [ref=e49]:
                                  - generic [ref=e50]: Pending
                                - button "Good But No Response" [ref=e51]:
                                  - generic [ref=e52]: Good But No Response
                                - button "Pending 2" [ref=e53]:
                                  - generic [ref=e54]: Pending 2
                                - button "Pending 3" [ref=e55]:
                                  - generic [ref=e56]: Pending 3
                                - button "Confirmed" [ref=e57]:
                                  - generic [ref=e58]: Confirmed
                                - button "On Hold" [ref=e59]:
                                  - generic [ref=e60]: On Hold
                                - button "Processing" [ref=e61]:
                                  - generic [ref=e62]: Processing
                                - button "In Courier" [ref=e63]:
                                  - generic [ref=e64]: In Courier
                                - button "Delivered" [ref=e65]:
                                  - generic [ref=e66]: Delivered
                                - button "Completed" [ref=e67]:
                                  - generic [ref=e68]: Completed
                                - button "Cancelled" [ref=e69]:
                                  - generic [ref=e70]: Cancelled
                                - button "Bappy" [ref=e71]:
                                  - generic [ref=e72]: Bappy
                                - button "Confirmed 2" [ref=e73]:
                                  - generic [ref=e74]: Confirmed 2
                                - button "Hold Followup" [ref=e75]:
                                  - generic [ref=e76]: Hold Followup
                                - button "Hand Delivery" [ref=e77]:
                                  - generic [ref=e78]: Hand Delivery
                                - button "Pending Returned" [ref=e79]:
                                  - generic [ref=e80]: Pending Returned
                                - button "Returned" [ref=e81]:
                                  - generic [ref=e82]: Returned
                                - button "Return Collection" [ref=e83]:
                                  - generic [ref=e84]: Return Collection
                                - button "Special" [ref=e85]:
                                  - generic [ref=e86]: Special
                                - button "Convert" [ref=e87]:
                                  - generic [ref=e88]: Convert
                          - generic:
                            - generic:
                              - generic:
                                - text: Payment Method
                                - generic: "*"
                            - button:
                              - generic: Select payment
                              - img
                        - generic:
                          - generic:
                            - generic: Attachments
                          - button
                        - generic:
                          - generic:
                            - generic:
                              - generic: Package weight (kg)
                            - spinbutton
                          - generic:
                            - generic:
                              - generic: Delivery type
                            - combobox
                          - generic:
                            - generic:
                              - generic: Courier Note
                            - textbox:
                              - /placeholder: Shown as special instruction on Pathao / Carrybee
                              - text: এটি একটি টেস্ট অর্ডার, ইগনোর করুন, কোনো অর্ডার গ্রহণ করবেন না প্লিজ, এই অ্যাকাউন্টটি শুধু অর্ডার টেস্ট করার জন্য ব্যবহার করা হচ্ছে, একটি থার্ড পার্টি সফটওয়্যার থেকে কুরিয়ার ইন্টিগ্রেশন করা হচ্ছে
                          - generic:
                            - generic:
                              - generic: Packing Note
                            - textbox
                        - generic:
                          - generic:
                            - generic: Order Note
                          - textbox
                    - generic:
                      - generic:
                        - generic: Product catalog
                        - paragraph: Search and filter by category — live inventory
                      - generic:
                        - generic:
                          - generic:
                            - generic:
                              - generic: Category
                            - button:
                              - generic: All categories
                              - img
                          - generic:
                            - generic:
                              - generic: Search products
                            - textbox:
                              - /placeholder: Search by name or SKU
                        - generic:
                          - generic:
                            - button:
                              - generic:
                                - paragraph: A2Z Product 1787658187049
                                - paragraph: A2Z-1787658187049 · Default · from ৳ 500
                            - button:
                              - img
                          - generic:
                            - button:
                              - generic:
                                - paragraph: A2Z Product 1787658106464
                                - paragraph: A2Z-1787658106464 · Default · from ৳ 500
                            - button:
                              - img
                          - generic:
                            - button:
                              - generic:
                                - paragraph: A2Z Product 1787658023308
                                - paragraph: A2Z-1787658023308 · Default · from ৳ 500
                            - button:
                              - img
                          - generic:
                            - button:
                              - generic:
                                - paragraph: A2Z Product 1787657937606
                                - paragraph: A2Z-1787657937606 · Default · from ৳ 500
                            - button:
                              - img
                          - generic:
                            - button:
                              - generic:
                                - paragraph: E2E Reports Honey
                                - paragraph: E2E-REP-HONEY-1787041557907 · Standard · from ৳ 510
                            - button:
                              - img
                          - generic:
                            - button:
                              - generic:
                                - paragraph: E2E P2B Raw Honey
                                - paragraph: E2E-P2B-RAW-1787041556739 · Standard · from ৳ 380
                            - button:
                              - img
                          - generic:
                            - button:
                              - generic:
                                - paragraph: E2E P2B Honey
                                - paragraph: E2E-P2B-HONEY-1787041556739 · Standard · from ৳ 500
                            - button:
                              - img
                          - generic:
                            - button:
                              - img
                              - generic:
                                - paragraph: kalo jira
                                - paragraph: KALO-JIRA · KG · from ৳ 100
                            - button:
                              - img
                          - generic:
                            - button:
                              - img
                              - generic:
                                - paragraph: Jafran
                                - paragraph: JP-4R · Standard · from ৳ 12,000
                            - button:
                              - img
                          - generic:
                            - button:
                              - img
                              - generic:
                                - paragraph: Modhu
                                - paragraph: MOD_39 · Standard · from ৳ 1,000
                            - button:
                              - img
                          - generic:
                            - button:
                              - img
                              - generic:
                                - paragraph: Garlic
                                - paragraph: GARLIC-KG-1 · Standard · from ৳ 120
                            - button:
                              - img
                          - generic:
                            - button:
                              - img
                              - generic:
                                - paragraph: Modho kalo Jira
                                - paragraph: FG43 · 500 gm / 1 kg · from ৳ 990
                            - button:
                              - img
                        - paragraph: Showing 12 of 12 · tap + or a row to add
                - generic:
                  - generic:
                    - button [expanded]:
                      - generic: Other Information
                      - img
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: Manually track ad information for this order (optional). Stored as URL parameters, just like website orders.
                          - generic:
                            - generic:
                              - generic:
                                - generic: UTM Source
                              - textbox:
                                - /placeholder: e.g. fb
                            - generic:
                              - generic:
                                - generic: UTM ID
                              - textbox
                            - generic:
                              - generic:
                                - generic: UTM Content
                              - textbox
                            - generic:
                              - generic:
                                - generic: UTM Campaign
                              - textbox
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: Summary
                    - generic:
                      - generic:
                        - generic:
                          - generic:
                            - text: Date
                            - generic: "*"
                        - button:
                          - img
                          - text: 25/08/2026
                      - generic:
                        - generic:
                          - generic: Reference No
                        - textbox:
                          - /placeholder: Optional reference
                      - generic:
                        - generic:
                          - generic: Subtotal (Tk)
                          - generic: ৳ 500
                        - generic:
                          - generic:
                            - generic:
                              - text: Discount/Less
                              - generic: "*"
                          - generic:
                            - generic:
                              - generic:
                                - button: ৳
                                - button: "%"
                            - spinbutton: "0"
                        - generic:
                          - generic: After Discount (Tk)
                          - generic: ৳ 500
                        - generic:
                          - generic:
                            - generic:
                              - text: Shipping (Tk)
                              - generic: "*"
                          - generic:
                            - spinbutton: "120"
                            - button:
                              - img
                          - paragraph: Delivery charge added to the customer's payable total.
                        - generic:
                          - generic: Grand Total (Tk)
                          - generic: ৳ 620
                        - generic:
                          - generic:
                            - generic: Advance Payment
                          - spinbutton: "0"
                        - generic:
                          - generic: Due (Tk)
                          - generic: ৳ 620
                        - generic:
                          - generic:
                            - generic: Courier Charged to me
                          - generic:
                            - spinbutton: "0"
                            - button:
                              - img
                      - generic:
                        - button: Apply Coupon
                      - generic:
                        - generic:
                          - checkbox
                          - generic: Skip Followup
                        - button: Submit
                        - link:
                          - /url: /dashboard/orders
                          - text: Cancel
                      - paragraph: "NB: * marked are required field."
      - button [ref=e90]:
        - img
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const WEB = process.env.E2E_WEB_URL ?? 'http://laam.localhost:3000';
  4  | const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
  5  | const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
  6  | const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';
  7  | const STAMP = Date.now();
  8  | 
  9  | async function pickComboboxOption(page: Page, triggerId: string, label: RegExp) {
  10 |   await page.locator(`#${triggerId}`).click();
  11 |   const menu = page.locator('[data-radix-popper-content-wrapper]').last();
> 12 |   await menu.locator('button').filter({ hasText: label }).first().click();
     |                                                                   ^ Error: locator.click: Test timeout of 180000ms exceeded.
  13 | }
  14 | 
  15 | async function login(page: Page) {
  16 |   await page.goto(`${WEB}/login`);
  17 |   await page.evaluate((deviceId) => {
  18 |     localStorage.setItem('laam_device_id', deviceId);
  19 |   }, DEVICE_ID);
  20 | 
  21 |   await page.getByPlaceholder('you@company.com').fill(EMAIL);
  22 |   await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  23 |   await page.getByRole('button', { name: /^Sign in$/i }).click();
  24 |   await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
  25 | }
  26 | 
  27 | test.describe('Hold workflow — browser UI', () => {
  28 |   test('login → create Hold order → follow-up queue → cancel closes follow-up', async ({ page }) => {
  29 |     const phone = `017${String(STAMP).slice(-8)}`;
  30 |     const customerName = `UI Hold ${STAMP}`;
  31 | 
  32 |     await login(page);
  33 | 
  34 |     await page.goto(`${WEB}/dashboard/orders/new`);
  35 |     await expect(page.locator('#mobile')).toBeVisible({ timeout: 45_000 });
  36 | 
  37 |     await page.locator('#mobile').fill(phone);
  38 |     await page.locator('#name').fill(customerName);
  39 |     await page.locator('#address').fill('UI test address, Dhaka');
  40 | 
  41 |     await page.waitForTimeout(1200);
  42 | 
  43 |     const addProduct = page.getByRole('button', { name: /^Add /i }).first();
  44 |     await expect(addProduct).toBeVisible({ timeout: 45_000 });
  45 |     await addProduct.click();
  46 |     await expect(page.getByText('No products added')).not.toBeVisible({ timeout: 15_000 });
  47 | 
  48 |     await pickComboboxOption(page, 'orderSource', /phone|website|facebook|manual/i);
  49 |     await pickComboboxOption(page, 'orderStatus', /^Hold$/i);
  50 |     await expect(page.getByText('Hold follow-up date')).toBeVisible();
  51 | 
  52 |     const paymentLabel = (await page.locator('#paymentMethod').textContent())?.trim() ?? '';
  53 |     if (!paymentLabel || paymentLabel.toLowerCase().includes('select')) {
  54 |       await pickComboboxOption(page, 'paymentMethod', /cod|cash on delivery/i);
  55 |     }
  56 | 
  57 |     await page.getByRole('button', { name: /^Submit$/i }).click();
  58 | 
  59 |     const createdToast = page.getByText(/Order .+ created/i);
  60 |     await expect(createdToast).toBeVisible({ timeout: 60_000 });
  61 |     const toastText = (await createdToast.textContent()) ?? '';
  62 |     const orderNumber = toastText.match(/Order ([^\s]+) created/)?.[1];
  63 |     expect(orderNumber).toBeTruthy();
  64 | 
  65 |     const orderUrl = `${WEB}/dashboard/orders/${orderNumber}`;
  66 | 
  67 |     await page.goto(`${WEB}/dashboard/orders/queues/followups`);
  68 |     await page.getByPlaceholder(/search by order id, customer, phone/i).fill(phone);
  69 |     await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 30_000 });
  70 | 
  71 |     await page.goto(orderUrl);
  72 |     await page.getByRole('button', { name: /^Status$/i }).click();
  73 | 
  74 |     const dialog = page.getByRole('dialog');
  75 |     await expect(dialog).toBeVisible();
  76 |     await dialog.locator('button').filter({ hasText: /hold|pending|confirmed|search/i }).first().click();
  77 |     await dialog.getByPlaceholder(/search or create/i).fill('cancel');
  78 |     await dialog.getByRole('button', { name: 'Canceled', exact: true }).click();
  79 |     await dialog.getByRole('button', { name: 'Update status' }).click();
  80 | 
  81 |     await expect(page.getByText(/cancel/i).first()).toBeVisible({ timeout: 30_000 });
  82 | 
  83 |     await page.goto(`${WEB}/dashboard/orders/queues/followups`);
  84 |     await page.getByPlaceholder(/search by order id, customer, phone/i).fill(phone);
  85 |     await expect(page.getByText(customerName)).toHaveCount(0, { timeout: 30_000 });
  86 |   });
  87 | });
  88 | 
```